import { useState } from 'react'
import { AlertTriangle, Check, Database, DollarSign, Droplets, RadioTower, RefreshCw, Ruler, RotateCcw, Save, Wifi, WifiOff } from 'lucide-react'
import { useCisterna } from '../context/CisternaContext'
import { formatLiters, relativeTime } from '../utils/formatters'

function Field({ label, hint, suffix, children }) {
  return <label className="block"><span className="text-sm font-medium text-ink">{label}</span>{hint && <span className="ml-2 text-[11px] text-muted">{hint}</span>}<div className="field mt-2">{children}{suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}</div></label>
}

function SettingsCard({ icon: Icon, eyebrow, title, description, children }) {
  return <section className="card overflow-hidden"><header className="flex gap-4 border-b border-black/[.05] p-6 md:p-8"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-aqua-50 text-aqua-700"><Icon className="h-5 w-5" /></span><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}</div></header><div className="p-6 md:p-8">{children}</div></section>
}

export default function Settings() {
  const { config, runtime, setConfig, updateRuntime, resetAll, liveStatus, refreshLive } = useCisterna()
  const [saved, setSaved] = useState(false)
  const live = config.dataMode === 'live'
  const numberUpdate = (key) => (event) => setConfig({ [key]: Math.max(0, Number(event.target.value)) })
  const dimensionsCapacity = config.tankLengthMeters * config.tankWidthMeters * config.tankHeightMeters * 1000
  const saveFeedback = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  const applyDimensions = () => setConfig({ tankCapacityLiters: Math.round(dimensionsCapacity) })

  return (
    <div className="page-shell">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Preferencias</p><h1 className="page-title mt-2">Configuración</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Adapta el sistema a tu cisterna. Los cambios se guardan automáticamente en este dispositivo.</p></div><button onClick={saveFeedback} className="button-primary">{saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? 'Guardado' : 'Guardar cambios'}</button></header>

      <div className="mt-8 space-y-5">
        <SettingsCard icon={RadioTower} eyebrow="ESP32 + Firebase" title="Conexión en tiempo real" description="La app reconstruye cada tarjeta con las lecturas que el ESP32 sube a Firebase Realtime Database.">
          <div>
            <p className="text-sm font-medium">Origen de los datos</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5 sm:max-w-xs">
              <button className={`tank-switch ${live ? 'active' : ''}`} onClick={() => setConfig({ dataMode: 'live' })}>En vivo</button>
              <button className={`tank-switch ${!live ? 'active' : ''}`} onClick={() => setConfig({ dataMode: 'demo' })}>Simulación</button>
            </div>
            <p className="mt-2 text-[11px] text-muted">{live ? 'Se lee Firebase cada pocos segundos. La página Simulación queda como referencia.' : 'Motor de simulación local, sin conexión a Firebase.'}</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Host de Firebase" hint="sin https:// ni / final"><input value={config.firebaseHost} onChange={(event) => setConfig({ firebaseHost: event.target.value.trim() })} aria-label="Host de Firebase" /></Field>
            <Field label="Intervalo de lectura" suffix="s"><input type="number" min="2" value={config.livePollSeconds} onChange={numberUpdate('livePollSeconds')} /></Field>
            <Field label="Distancia con tanque lleno" hint="sensor → agua" suffix="cm"><input type="number" min="0" step="0.5" value={config.sensorFullCm} onChange={numberUpdate('sensorFullCm')} /></Field>
            <Field label="Distancia con tanque vacío" hint="sensor → fondo" suffix="cm"><input type="number" min="1" step="0.5" value={config.sensorEmptyCm} onChange={numberUpdate('sensorEmptyCm')} /></Field>
            <Field label="Marcar “sin conexión” tras" suffix="s"><input type="number" min="5" value={config.staleAfterSeconds} onChange={numberUpdate('staleAfterSeconds')} /></Field>
            <Field label="Días de historial" suffix="días"><input type="number" min="1" max="120" value={config.historyDays} onChange={numberUpdate('historyDays')} /></Field>
          </div>

          {config.sensorEmptyCm <= config.sensorFullCm && <div className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> La distancia con el tanque vacío debe ser mayor que con el tanque lleno.</div>}

          <div className="mt-4 rounded-2xl bg-canvas p-4 text-xs leading-5 text-muted">
            Nivel&nbsp;% = (vacío − distancia medida) ÷ (vacío − lleno) × 100 &nbsp;·&nbsp; Agua disponible = nivel % × capacidad total. El consumo diario sale de <code>litros_totales</code> del caudalímetro (o del caudal × tiempo si el ESP se reinició).
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 rounded-3xl border border-black/[.055] p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              {live && runtime.connected ? <Wifi className="h-5 w-5 text-emerald-600" /> : <WifiOff className="h-5 w-5 text-rose-600" />}
              <div>
                <p className="text-sm font-semibold">{!live ? 'Lectura en vivo desactivada' : liveStatus.error ? 'Error de lectura' : runtime.connected ? 'Recibiendo lecturas' : 'Sin lecturas recientes'}</p>
                <p className="mt-1 text-xs text-muted">
                  {liveStatus.error
                    ? liveStatus.error
                    : liveStatus.lastSync
                      ? `Última sincronización ${relativeTime(new Date(liveStatus.lastSync).toISOString()).toLowerCase()}`
                      : 'Aún no se ha sincronizado.'}
                </p>
              </div>
            </div>
            <button className="button-secondary" onClick={refreshLive} disabled={!live}><RefreshCw className="h-4 w-4" /> Actualizar ahora</button>
          </div>
        </SettingsCard>

        <SettingsCard icon={Droplets} eyebrow="Datos principales" title="Cisterna" description="Define el nombre, las dimensiones y la capacidad útil del tanque.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nombre del tanque"><input value={config.tankName} onChange={(event) => setConfig({ tankName: event.target.value })} aria-label="Nombre del tanque" /></Field>
            <Field label="Capacidad total" suffix="litros"><input type="number" min="1" value={config.tankCapacityLiters} onChange={numberUpdate('tankCapacityLiters')} aria-label="Capacidad total en litros" /></Field>
          </div>
          <div className="mt-7 flex items-center gap-2"><Ruler className="h-4 w-4 text-muted" /><h3 className="text-sm font-semibold">Dimensiones</h3><span className="text-[11px] text-muted">en metros</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Largo" suffix="m"><input type="number" min="0" step="0.1" value={config.tankLengthMeters} onChange={numberUpdate('tankLengthMeters')} /></Field><Field label="Ancho" suffix="m"><input type="number" min="0" step="0.1" value={config.tankWidthMeters} onChange={numberUpdate('tankWidthMeters')} /></Field><Field label="Altura útil" suffix="m"><input type="number" min="0" step="0.1" value={config.tankHeightMeters} onChange={numberUpdate('tankHeightMeters')} /></Field></div>
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-canvas p-4 sm:flex-row sm:items-center"><div><p className="text-xs text-muted">Capacidad calculada según dimensiones</p><p className="mt-1 font-semibold">{formatLiters(dimensionsCapacity)}</p></div><button className="button-secondary" onClick={applyDimensions}>Usar esta capacidad</button></div>
        </SettingsCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <SettingsCard icon={AlertTriangle} eyebrow="Avisos" title="Umbrales de nivel" description="Recibirás una alerta visual al alcanzar estos valores.">
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Nivel bajo" suffix="%"><input type="number" min="1" max="99" value={config.lowLevelThreshold} onChange={numberUpdate('lowLevelThreshold')} /></Field><Field label="Nivel crítico" suffix="%"><input type="number" min="0" max="98" value={config.criticalLevelThreshold} onChange={numberUpdate('criticalLevelThreshold')} /></Field></div>
            {config.criticalLevelThreshold >= config.lowLevelThreshold && <div className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> El nivel crítico debe ser menor que el nivel bajo.</div>}
          </SettingsCard>

          <SettingsCard icon={DollarSign} eyebrow="Estimaciones" title="Tarifa y meta" description="Se utilizan para calcular costos y ahorro, no una factura real.">
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Tarifa de agua" suffix="USD / m³"><input type="number" min="0" step="0.01" value={config.waterRatePerM3} onChange={numberUpdate('waterRatePerM3')} /></Field><Field label="Meta mensual" suffix="litros"><input type="number" min="0" step="100" value={config.monthlyGoalLiters} onChange={numberUpdate('monthlyGoalLiters')} /></Field></div>
            <div className="mt-5"><p className="text-sm font-medium">Referencia de ahorro</p><div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5"><button className={`tank-switch ${config.savingsMode === 'previous' ? 'active' : ''}`} onClick={() => setConfig({ savingsMode: 'previous' })}>Mes anterior</button><button className={`tank-switch ${config.savingsMode === 'goal' ? 'active' : ''}`} onClick={() => setConfig({ savingsMode: 'goal' })}>Meta mensual</button></div></div>
          </SettingsCard>
        </div>

        <SettingsCard icon={Database} eyebrow="Presentación" title="Datos de demostración" description="Usa un recipiente pequeño para que los cambios sean más visibles durante una exposición.">
          <div className="grid gap-5 md:grid-cols-3"><Field label="Capacidad demo" suffix="litros"><input type="number" min="1" value={config.demoCapacityLiters} onChange={numberUpdate('demoCapacityLiters')} /></Field><Field label="Nivel inicial" suffix="litros"><input type="number" min="0" max={config.demoCapacityLiters} value={config.demoInitialLiters} onChange={numberUpdate('demoInitialLiters')} /></Field><Field label="Caudal máximo" suffix="L/min"><input type="number" min="1" value={config.maxFlowLpm} onChange={numberUpdate('maxFlowLpm')} /></Field></div>
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-3xl border border-black/[.055] p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3">{runtime.connected ? <Wifi className="h-5 w-5 text-emerald-600" /> : <WifiOff className="h-5 w-5 text-rose-600" />}<div><p className="text-sm font-semibold">Simular conexión del sistema</p><p className="mt-1 text-xs text-muted">Permite probar el estado “Sin conexión”.</p></div></div><button role="switch" aria-checked={runtime.connected} onClick={() => updateRuntime({ connected: !runtime.connected })} className={`switch ${runtime.connected ? 'switch-on' : ''}`}><span /></button></div>
        </SettingsCard>

        <SettingsCard icon={RotateCcw} eyebrow="Mantenimiento" title="Restablecer demostración" description="Elimina la configuración y el historial guardados en este navegador.">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><p className="max-w-xl text-sm leading-6 text-muted">Volverás a los valores y datos simulados originales. Esta acción no afecta ningún sistema externo.</p><button className="button-danger" onClick={() => { if (window.confirm('¿Restablecer todos los datos de la demostración?')) resetAll() }}><RotateCcw className="h-4 w-4" /> Restablecer datos</button></div>
        </SettingsCard>
      </div>
    </div>
  )
}
