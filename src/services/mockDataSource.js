import { clamp } from '../utils/calculations'

export const DEFAULT_CONFIG = {
  tankName: 'Cisterna principal',
  tankLengthMeters: 2.5,
  tankWidthMeters: 2,
  tankHeightMeters: 2,
  tankCapacityLiters: 10000,
  lowLevelThreshold: 25,
  criticalLevelThreshold: 12,
  waterRatePerM3: 0.72,
  monthlyGoalLiters: 18000,
  demoCapacityLiters: 50,
  demoInitialLiters: 40,
  maxFlowLpm: 30,
  savingsMode: 'previous',
  // ===== Conexión en tiempo real con el ESP32 (Firebase Realtime Database) =====
  dataMode: 'live', // 'live' = lee de Firebase | 'demo' = motor de simulación local
  firebaseHost: 'control-cisterna-b883c-default-rtdb.firebaseio.com', // sin https:// ni / final
  sensorFullCm: 20, // distancia sensor -> agua cuando el tanque está LLENO
  sensorEmptyCm: 180, // distancia sensor -> agua (fondo) cuando el tanque está VACÍO
  livePollSeconds: 5, // cada cuánto se vuelve a leer Firebase (el ESP publica cada 5 s)
  staleAfterSeconds: 30, // sin lecturas nuevas en este tiempo => "Sin conexión"
  historyDays: 45, // días de historial que se reconstruyen desde Firebase
}

const dateKey = (date) => date.toISOString().slice(0, 10)
const seededNoise = (index) => ((index * 9301 + 49297) % 233280) / 233280

export function generateMockHistory(days = 45) {
  const result = []
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    const i = days - 1 - offset
    const weekend = [0, 6].includes(date.getDay())
    const wave = Math.sin(i * .83) * 95
    const spike = i % 11 === 3 ? 240 : i % 9 === 2 ? -140 : 0
    const consumption = Math.max(180, Math.round(480 + (weekend ? 75 : 0) + wave + spike + seededNoise(i) * 85))
    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const peak = (hour >= 6 && hour <= 8) || (hour >= 18 && hour <= 20)
      const factor = peak ? 2.2 : hour < 5 ? .28 : .75
      return Math.round((consumption / 30) * factor * (.72 + seededNoise(i * 31 + hour) * .55))
    })
    const hourlyTotal = hourly.reduce((sum, value) => sum + value, 0)
    const normalizedHourly = hourly.map((value) => Math.round(value * consumption / hourlyTotal))
    const maxLevel = clamp(Math.round(90 - seededNoise(i + 7) * 10), 60, 98)
    const minLevel = clamp(Math.round(maxLevel - consumption / 125), 8, maxLevel)
    result.push({
      date: dateKey(date),
      consumption,
      averageFlow: Number((consumption / (95 + seededNoise(i) * 30)).toFixed(1)),
      minLevel,
      maxLevel,
      hourly: normalizedHourly,
    })
  }
  return result
}

export const mockDataSource = {
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('cisterna-demo-v1'))
      // Se mezcla con DEFAULT_CONFIG para que las claves nuevas (Firebase, calibración)
      // aparezcan aunque el navegador tenga una configuración vieja guardada.
      if (saved?.config && saved?.history) return { ...saved, config: { ...DEFAULT_CONFIG, ...saved.config } }
    } catch { /* use defaults */ }
    return {
      config: DEFAULT_CONFIG,
      history: generateMockHistory(),
      runtime: {
        volume: 7840,
        flowRate: 5.6,
        isRunning: false,
        speed: 1,
        connected: true,
        demoTank: false,
        consumedSession: 0,
        continuousFlowSeconds: 0,
        lastUpdated: new Date().toISOString(),
      },
    }
  },
  save(data) {
    localStorage.setItem('cisterna-demo-v1', JSON.stringify(data))
  },
  clear() {
    localStorage.removeItem('cisterna-demo-v1')
  },
}

// Futuro contrato para ESP32/API. La UI seguirá consumiendo la misma forma normalizada.
export const apiDataSource = {
  async load() { throw new Error('La fuente API aún no está configurada.') },
  async save() { throw new Error('La fuente API aún no está configurada.') },
}
