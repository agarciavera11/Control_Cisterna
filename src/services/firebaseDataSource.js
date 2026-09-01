import { clamp } from '../utils/calculations'

/*
  ================================================================
  Fuente de datos en vivo: Firebase Realtime Database <- ESP32
  ================================================================

  El ESP32 sube una lectura cada ~5 s. En /lecturas conviven DOS formatos
  (según si el ESP tenía hora NTP al momento de escribir):

   A) Anidado por fecha/hora (sketch actual, con NTP):
        "2026-08-28": {
          "17-50-19": {
            "distancia_cm": 60.0,     // sensor -> superficie del agua (o null si timeout)
            "flujo_lmin": 0.853,      // caudal de salida instantáneo (sin calibrar)
            "litros_totales": 0.071,  // acumulado del caudalímetro desde que arrancó el ESP
            "frecuencia_hz": 6.4,
            "pulsos_flujo": 32,
            "fecha": "2026-08-28",
            "hora": "17-50-19",
            "timestamp": 1787957419939
          }, ...
        }

   B) Plano con push key (fallback sin NTP, corridas viejas):
        "-P09Z27fGwNoDsQI2f_x": {
          "flujo_lmin": 0.8, "frecuencia_hz": 6.0, "litros_totales": 0.069,
          "pulsos_flujo": 30, "timestamp": 1787957359147
        }

  Este módulo aplana ambos, agrupa por día y resume cada día al formato que
  ya consume la UI:
    history = [{ date, consumption, minLevel, maxLevel, hourly[24], averageFlow }]
    runtime = { volume, flowRate, connected, lastUpdated, continuousFlowSeconds, ... }
*/

const CACHE_KEY = 'cisterna-live-cache-v1'
const MAX_GAP_MIN = 2 // pausa máxima entre lecturas para seguir integrando el caudal

const pad = (n) => String(n).padStart(2, '0')

export const dateKeyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const isDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k)

// distancia (cm) del sensor al agua  ->  porcentaje de llenado (0..100)
// lleno = sensorFullCm (poca distancia) · vacío = sensorEmptyCm (mucha distancia)
export function levelPercentFromDistance(distanciaCm, { sensorFullCm, sensorEmptyCm }) {
  if (distanciaCm == null || Number.isNaN(Number(distanciaCm))) return null
  const full = Number(sensorFullCm)
  const empty = Number(sensorEmptyCm)
  const span = empty - full
  if (!(span > 0)) return null
  return clamp(((empty - Number(distanciaCm)) / span) * 100, 0, 100)
}

const normalizeHost = (h) => String(h || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Firebase respondió HTTP ${res.status}`)
  return res.json()
}

export function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}
  } catch {
    return {}
  }
}

export function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* almacenamiento lleno o no disponible: no es crítico */
  }
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

// Convierte un objeto-lectura crudo de Firebase en una fila normalizada.
function toRow(raw, fallbackKey) {
  const ts = Number(raw?.timestamp) || null
  const date = raw?.fecha && isDateKey(raw.fecha)
    ? raw.fecha
    : ts
      ? dateKeyOf(new Date(ts))
      : null
  return {
    key: raw?.hora || fallbackKey || '',
    ts,
    date,
    dist: raw?.distancia_cm == null ? null : Number(raw.distancia_cm),
    flow: Number(raw?.flujo_lmin) || 0,
    total: raw?.litros_totales == null ? null : Number(raw.litros_totales),
  }
}

// Aplana /lecturas (formato A anidado + formato B plano) a una lista de filas con fecha.
function flatten(lecturas) {
  const rows = []
  if (!lecturas || typeof lecturas !== 'object') return rows
  for (const [key, value] of Object.entries(lecturas)) {
    if (!value || typeof value !== 'object') continue
    if (isDateKey(key) && typeof Object.values(value)[0] === 'object') {
      // Nodo de fecha: sus hijos son lecturas.
      for (const [hora, reading] of Object.entries(value)) {
        if (reading && typeof reading === 'object') {
          const row = toRow(reading, hora)
          if (!row.date) row.date = key
          rows.push(row)
        }
      }
    } else {
      // Lectura suelta con push key.
      rows.push(toRow(value, key))
    }
  }
  return rows.filter((r) => r.date)
}

function hourOfRow(row) {
  if (row.ts) return new Date(row.ts).getHours()
  const m = /^(\d{2})[-:]/.exec(row.key || '')
  return m ? Math.min(23, Math.max(0, Number(m[1]))) : 0
}

// Resume un día completo (filas ya ordenadas por tiempo) al formato de la UI.
export function aggregateDay(date, dayRows, config) {
  const rows = [...dayRows].sort((a, b) => (a.ts && b.ts ? a.ts - b.ts : String(a.key).localeCompare(String(b.key))))
  const hourly = Array(24).fill(0)
  const maxStep = Number(config.maxFlowLpm) || 30
  let consumption = 0
  let minLevel = null
  let maxLevel = null
  let flowSum = 0
  let flowCount = 0

  rows.forEach((row, i) => {
    const lvl = levelPercentFromDistance(row.dist, config)
    if (lvl != null) {
      minLevel = minLevel == null ? lvl : Math.min(minLevel, lvl)
      maxLevel = maxLevel == null ? lvl : Math.max(maxLevel, lvl)
    }
    if (row.flow > 0.01) {
      flowSum += row.flow
      flowCount += 1
    }

    if (i === 0) return
    const prev = rows[i - 1]
    const dtMin = prev.ts && row.ts ? (row.ts - prev.ts) / 60000 : null

    // Consumo del paso: se prefiere la diferencia de litros_totales (ya integrada
    // por el ESP). Si es negativa (el ESP se reinició) o poco plausible, se cae a
    // caudal x tiempo. Si el hueco entre lecturas es enorme, se ignora el paso.
    const byTotal = prev.total != null && row.total != null ? row.total - prev.total : null
    const plausibleMax = dtMin != null ? maxStep * dtMin * 1.5 : Infinity
    let litros = 0
    if (byTotal != null && byTotal >= 0 && byTotal <= plausibleMax) {
      litros = byTotal
    } else if (dtMin != null && dtMin > 0 && dtMin <= MAX_GAP_MIN) {
      litros = Math.min(row.flow, maxStep) * dtMin
    }
    if (litros > 0) {
      consumption += litros
      hourly[hourOfRow(row)] += litros
    }
  })

  return {
    date,
    consumption: Number(consumption.toFixed(2)),
    minLevel: minLevel == null ? null : Number(minLevel.toFixed(1)),
    maxLevel: maxLevel == null ? null : Number(maxLevel.toFixed(1)),
    hourly: hourly.map((v) => Number(v.toFixed(2))),
    averageFlow: flowCount ? Number((flowSum / flowCount).toFixed(2)) : 0,
    samples: rows.length,
  }
}

const emptyDay = (date) => ({
  date,
  consumption: 0,
  minLevel: null,
  maxLevel: null,
  hourly: Array(24).fill(0),
  averageFlow: 0,
  samples: 0,
})

/*
  Lee todo lo necesario para pintar el dashboard.
  - config: configuración vigente (host, calibración, capacidad, etc.)
  - prevVolume: último volumen conocido (fallback si aún no hay distancia válida)
*/
export async function loadLive({ config, prevVolume = 0 }) {
  const host = normalizeHost(config.firebaseHost)
  if (!host) throw new Error('Falta el host de Firebase (configúralo en Ajustes).')

  const today = dateKeyOf()
  const wantDays = Math.max(1, Number(config.historyDays) || 45)
  const capacity = Number(config.tankCapacityLiters) || 0
  // Tope de lecturas que se traen por consulta (las push keys y las fechas quedan
  // ordenadas cronológicamente, así que limitToLast siempre devuelve lo más nuevo).
  const readLimit = clamp(wantDays * 3000, 5000, 60000)

  const lecturas = await getJson(`https://${host}/lecturas.json?orderBy=${encodeURIComponent('"$key"')}&limitToLast=${readLimit}`)
  const allRows = flatten(lecturas)
  if (!allRows.length) {
    return {
      history: [emptyDay(today)],
      runtime: {
        volume: clamp(Number(prevVolume) || 0, 0, capacity || Number.MAX_SAFE_INTEGER),
        flowRate: 0,
        connected: false,
        isRunning: false,
        lastUpdated: new Date().toISOString(),
        continuousFlowSeconds: 0,
      },
      liveStatus: { loading: false, error: null, lastSync: Date.now(), latestTs: null, days: 0, currentPercent: null, samples: 0 },
    }
  }

  // Agrupar por día.
  const byDay = new Map()
  for (const row of allRows) {
    if (!byDay.has(row.date)) byDay.set(row.date, [])
    byDay.get(row.date).push(row)
  }

  const dates = [...byDay.keys()].sort().slice(-wantDays)
  const cache = loadCache()
  const nextCache = {}

  let history = dates.map((date) => {
    const dayRows = byDay.get(date)
    // Los días pasados no cambian: se cachea el resumen por (fecha + nº de muestras).
    if (date !== today) {
      const hit = cache[date]
      if (hit && hit.samples === dayRows.length) {
        nextCache[date] = hit
        return hit
      }
      const agg = aggregateDay(date, dayRows, config)
      nextCache[date] = agg
      return agg
    }
    return aggregateDay(date, dayRows, config)
  })
  saveCache(nextCache)

  history = history.sort((a, b) => a.date.localeCompare(b.date))

  // "Hoy" siempre debe ser el último registro del historial.
  if (history[history.length - 1].date !== today) history = [...history, emptyDay(today)]

  // Lectura más reciente de todo el conjunto.
  const latest = allRows.reduce((best, row) => {
    if (!row.ts) return best
    return !best || row.ts > best.ts ? row : best
  }, null)

  let flowRate = 0
  let latestTs = null
  let connected = false
  let continuousFlowSeconds = 0
  let volume = clamp(Number(prevVolume) || 0, 0, capacity || Number.MAX_SAFE_INTEGER)
  let currentPercent = capacity > 0 ? (volume / capacity) * 100 : null

  if (latest) {
    latestTs = latest.ts
    flowRate = Math.max(0, latest.flow)

    const pct = levelPercentFromDistance(latest.dist, config)
    if (pct != null) {
      currentPercent = pct
      const v = (pct / 100) * capacity
      if (Number.isFinite(v)) volume = v
    }

    const staleMs = (Number(config.staleAfterSeconds) || 30) * 1000
    connected = Date.now() - latestTs < staleMs

    // Flujo continuo: se recorren hacia atrás las lecturas mientras el caudal siga
    // siendo > 0 y sin huecos grandes entre muestras.
    const ordered = allRows
      .filter((r) => r.ts)
      .sort((a, b) => a.ts - b.ts)
    for (let i = ordered.length - 1; i > 0; i -= 1) {
      if (!(ordered[i].flow > 0.01)) break
      const dt = (ordered[i].ts - ordered[i - 1].ts) / 1000
      if (dt <= 0 || dt > MAX_GAP_MIN * 60) break
      continuousFlowSeconds += dt
    }
  }

  return {
    history,
    runtime: {
      volume: Number.isFinite(volume) ? volume : 0,
      flowRate,
      connected,
      isRunning: false,
      lastUpdated: latestTs ? new Date(latestTs).toISOString() : new Date().toISOString(),
      continuousFlowSeconds,
    },
    liveStatus: {
      loading: false,
      error: null,
      lastSync: Date.now(),
      latestTs,
      days: history.length,
      currentPercent,
      samples: allRows.length,
    },
  }
}
