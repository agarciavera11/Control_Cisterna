import { useEffect, useState } from 'react'
import { CircleStop, Droplets, Gauge, Pause, Play, RefreshCcw, Sparkles, Waves } from 'lucide-react'
import { LiveChart } from '../components/Charts'
import FlowVisualization from '../components/FlowVisualization'
import TankVisualization from '../components/TankVisualization'
import { useCisterna } from '../context/CisternaContext'
import { levelStatus } from '../utils/calculations'
import { formatFlow, formatLiters, formatPercent } from '../utils/formatters'

export default function Simulation() {
  const { config, runtime, capacity, metrics, updateRuntime, setLevelPercent, setVolume, setFlowRate, switchTank, reset } = useCisterna()
  const [points, setPoints] = useState(() => [{ time: new Date().toLocaleTimeString('es-EC', { minute: '2-digit', second: '2-digit' }), level: metrics.currentPercent }])
  const status = levelStatus(metrics.currentPercent, config)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPoints((current) => [...current.slice(-29), { time: new Date().toLocaleTimeString('es-EC', { minute: '2-digit', second: '2-digit' }), level: Number(metrics.currentPercent.toFixed(2)) }])
    }, 0)
    return () => window.clearTimeout(timer)
  }, [metrics.currentPercent])

  const preset = (type) => {
    if (type === 'normal') { setFlowRate(Math.min(6, config.maxFlowLpm)); updateRuntime({ isRunning: true }) }
    if (type === 'high') { setFlowRate(config.maxFlowLpm * .9); updateRuntime({ isRunning: true }) }
    if (type === 'critical') { setLevelPercent(config.criticalLevelThreshold * .75); setFlowRate(0); updateRuntime({ isRunning: false }) }
  }

  return (
    <div className="page-shell">
      <header><div className="flex items-center gap-2"><span className="badge badge-demo"><Sparkles className="h-3 w-3" /> Laboratorio interactivo</span></div><h1 className="page-title mt-4">Simulación</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Controla el nivel y el caudal para ver cómo respondería el sistema real. Cada cambio actualiza el resumen, el historial y las estimaciones.</p></header>

      <section className="mt-8 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <article className="card p-6 md:p-8">
          <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Tanque activo</p><h2 className="mt-1 text-lg font-semibold">{runtime.demoTank ? 'Recipiente de demostración' : config.tankName}</h2></div><span className={`status-text status-${status.tone}`}>{status.label}</span></div>
          <div className="mt-4"><TankVisualization percent={metrics.currentPercent} liters={runtime.volume} capacity={capacity} status={status} large /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5"><button className={`tank-switch ${!runtime.demoTank ? 'active' : ''}`} onClick={() => switchTank(false)}>Cisterna real</button><button className={`tank-switch ${runtime.demoTank ? 'active' : ''}`} onClick={() => switchTank(true)}>Recipiente demo</button></div>
        </article>

        <div className="space-y-5">
          <article className="card p-6 md:p-8">
            <div className="flex items-center justify-between"><div><p className="eyebrow">Control manual</p><h2 className="mt-1 text-xl font-semibold">Nivel de agua</h2></div><span className="value-chip">{formatPercent(metrics.currentPercent)}</span></div>
            <input className="range mt-7" type="range" min="0" max="100" step="1" value={metrics.currentPercent} onChange={(event) => setLevelPercent(event.target.value)} aria-label="Nivel de agua en porcentaje" />
            <div className="mt-2 flex justify-between text-[11px] text-muted"><span>Vacío</span><span>Mitad</span><span>Lleno</span></div>
            <label className="mt-6 block text-xs font-medium text-muted" htmlFor="volume">Litros disponibles</label>
            <div className="mt-2 flex items-center rounded-2xl border border-black/10 bg-white px-4 focus-within:border-aqua-500 focus-within:ring-4 focus-within:ring-aqua-100"><input id="volume" type="number" min="0" max={capacity} value={Number(runtime.volume.toFixed(1))} onChange={(event) => setVolume(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium outline-none" /><span className="text-sm text-muted">de {formatLiters(capacity)}</span></div>
          </article>

          <article className="card p-6 md:p-8">
            <div className="grid gap-7 md:grid-cols-[1.15fr_.85fr] md:items-center"><div><div className="flex items-center justify-between"><div><p className="eyebrow">Salida de agua</p><h2 className="mt-1 text-xl font-semibold">Caudal</h2></div><span className="value-chip">{formatFlow(runtime.flowRate)}</span></div><input className="range mt-8" type="range" min="0" max={config.maxFlowLpm} step="0.5" value={runtime.flowRate} onChange={(event) => setFlowRate(event.target.value)} aria-label="Caudal de salida en litros por minuto" /><div className="mt-2 flex justify-between text-[11px] text-muted"><span>Cerrado</span><span>{formatFlow(config.maxFlowLpm)}</span></div></div><FlowVisualization compact flow={runtime.flowRate} maxFlow={config.maxFlowLpm} /></div>
          </article>

          <article className="card p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="eyebrow">Reproducción</p><h2 className="mt-1 text-xl font-semibold">Controles</h2></div><div className="period-toggle self-start">{[1, 5, 10, 60].map((speed) => <button key={speed} onClick={() => updateRuntime({ speed })} className={runtime.speed === speed ? 'active' : ''}>{speed}x</button>)}</div></div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="button-primary" onClick={() => updateRuntime({ isRunning: true })} disabled={runtime.isRunning || runtime.flowRate <= 0}><Play className="h-4 w-4" /> Iniciar</button>
              <button className="button-secondary" onClick={() => updateRuntime({ isRunning: false })} disabled={!runtime.isRunning}><Pause className="h-4 w-4" /> Pausar</button>
              <button className="button-secondary" onClick={reset}><RefreshCcw className="h-4 w-4" /> Reiniciar</button>
              <button className="button-ghost" onClick={() => setLevelPercent(100)}><Droplets className="h-4 w-4" /> Llenar</button>
              <button className="button-ghost" onClick={() => { setLevelPercent(0); updateRuntime({ isRunning: false }) }}><CircleStop className="h-4 w-4" /> Vaciar</button>
            </div>
            {runtime.flowRate <= 0 && <p className="mt-4 text-xs text-muted">Selecciona un caudal mayor que cero antes de iniciar.</p>}
          </article>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="live-metric"><Waves /><span>Nivel</span><strong>{formatPercent(metrics.currentPercent)}</strong></div>
        <div className="live-metric"><Droplets /><span>Disponible</span><strong>{formatLiters(runtime.volume)}</strong></div>
        <div className="live-metric"><Gauge /><span>Caudal</span><strong>{formatFlow(runtime.flowRate)}</strong></div>
        <div className="live-metric"><Sparkles /><span>Sesión</span><strong>{formatLiters(runtime.consumedSession, true)}</strong></div>
      </section>

      <section className="mt-5 card p-6 md:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">En tiempo real</p><h2 className="mt-1 text-xl font-semibold">Evolución de la simulación</h2></div><span className={`badge ${runtime.isRunning ? 'badge-online' : 'bg-slate-100 text-muted'}`}><span className={`h-1.5 w-1.5 rounded-full ${runtime.isRunning ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />{runtime.isRunning ? `Avanzando a ${runtime.speed}x` : 'En pausa'}</span></div><div className="mt-6"><LiveChart points={points} /></div></section>

      <section className="mt-5 card p-6 md:p-8"><p className="eyebrow">Escenarios rápidos</p><h2 className="mt-1 text-xl font-semibold">Prueba una situación</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><button className="scenario" onClick={() => preset('normal')}><span className="scenario-icon bg-aqua-50 text-aqua-700"><Droplets /></span><span><strong>Consumo normal</strong><small>Caudal moderado de 6 L/min</small></span></button><button className="scenario" onClick={() => preset('high')}><span className="scenario-icon bg-amber-50 text-amber-700"><Gauge /></span><span><strong>Consumo alto</strong><small>90 % del caudal máximo</small></span></button><button className="scenario" onClick={() => preset('critical')}><span className="scenario-icon bg-rose-50 text-rose-700"><Waves /></span><span><strong>Nivel crítico</strong><small>Activa la alerta de nivel</small></span></button></div></section>
    </div>
  )
}
