import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, Droplets, Gauge, Leaf, TrendingUp, Waves } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import TankVisualization from '../components/TankVisualization'
import FlowVisualization from '../components/FlowVisualization'
import { DailyConsumptionChart, TankLevelChart } from '../components/Charts'
import { useCisterna } from '../context/CisternaContext'
import { flowStatus, levelStatus, toM3 } from '../utils/calculations'
import { formatCurrency, formatDate, formatFlow, formatLiters, formatM3, formatPercent, relativeTime } from '../utils/formatters'

function SectionTitle({ eyebrow, title, action }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2></div>{action}</div>
}

function MiniMetric({ label, value, subtext, info }) {
  return <div className="rounded-2xl border border-black/[.055] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card" title={info}><p className="text-xs text-muted">{label}</p><p className="mt-2 text-lg font-semibold tracking-tight text-ink">{value}</p>{subtext && <p className="mt-1 text-[11px] text-muted">{subtext}</p>}</div>
}

export default function Dashboard({ onSimulate }) {
  const { config, history, runtime, capacity, metrics } = useCisterna()
  const [period, setPeriod] = useState(7)
  const status = levelStatus(metrics.currentPercent, config)
  const change = metrics.todayChange
  const peakHour = useMemo(() => {
    const hourly = history.at(-1)?.hourly || []
    const hour = hourly.indexOf(Math.max(...hourly))
    return `${String(hour).padStart(2, '0')}:00 – ${String((hour + 1) % 24).padStart(2, '0')}:00`
  }, [history])
  const alerts = []
  if (!runtime.connected) alerts.push({ tone: 'critical', title: 'Sin conexión', detail: `${relativeTime(runtime.lastUpdated)}. Activa la conexión desde Simulación.` })
  if (status.tone === 'critical') alerts.push({ tone: 'critical', title: 'Nivel crítico', detail: `Quedan ${formatLiters(runtime.volume)} disponibles.` })
  else if (status.tone === 'low') alerts.push({ tone: 'low', title: 'Nivel de agua bajo', detail: `El nivel está por debajo del umbral de ${formatPercent(config.lowLevelThreshold)}.` })
  if (runtime.continuousFlowSeconds >= 1800) alerts.push({ tone: 'low', title: 'Flujo continuo detectado', detail: 'El caudal ha permanecido activo durante más de 30 minutos simulados.' })
  if (runtime.flowRate >= config.maxFlowLpm * .8) alerts.push({ tone: 'low', title: 'Consumo inusualmente alto', detail: `El caudal actual es de ${formatFlow(runtime.flowRate)}.` })

  return (
    <div className="page-shell">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`badge ${config.dataMode === 'live' ? 'badge-online' : 'badge-demo'}`}>{config.dataMode === 'live' ? 'Datos en vivo · ESP32' : 'Modo demostración'}</span>
            <span className={`badge ${runtime.connected ? 'badge-online' : 'badge-offline'}`}><span className={`h-1.5 w-1.5 rounded-full ${runtime.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />{runtime.connected ? 'Sistema en línea' : 'Sin conexión'}</span>
          </div>
          <h1 className="page-title">Monitoreo de Cisterna</h1>
          <p className="mt-2 text-sm text-muted">Todo lo importante sobre tu agua, de un vistazo.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right"><p className="text-[11px] uppercase tracking-[.14em] text-muted">Última actualización</p><p className="mt-1 text-sm font-medium">{relativeTime(runtime.lastUpdated)}</p></div>
          <button onClick={onSimulate} className="button-primary hidden sm:inline-flex">Abrir simulador</button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Nivel actual" value={formatPercent(metrics.currentPercent)} subtitle={status.label} icon={Waves} tone={status.tone === 'critical' ? 'rose' : status.tone === 'low' ? 'amber' : 'aqua'} delay={0} />
        <MetricCard title="Agua disponible" value={formatLiters(runtime.volume)} subtitle={`de ${formatLiters(capacity)}`} icon={Droplets} tone="blue" delay={70} />
        <MetricCard title="Consumo de hoy" value={formatLiters(metrics.today)} icon={Activity} tone="aqua" delay={140} trend={change === null ? undefined : { direction: change < 0 ? 'down' : change > 0 ? 'up' : 'flat', label: `${Math.abs(change).toFixed(0)} % ${change < 0 ? 'menos' : change > 0 ? 'más' : 'igual'} que ayer` }} />
        <MetricCard title="Caudal actual" value={formatFlow(runtime.flowRate)} subtitle={flowStatus(runtime.flowRate, config.maxFlowLpm)} icon={Gauge} tone={runtime.flowRate >= config.maxFlowLpm * .7 ? 'amber' : 'aqua'} delay={210} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <article className="card overflow-hidden p-6 md:p-8">
          <SectionTitle eyebrow="Estado actual" title="Nivel de la cisterna" action={<span className={`status-text status-${status.tone}`}>{status.label}</span>} />
          <div className="grid items-center gap-8 sm:grid-cols-[.85fr_1.15fr]">
            <TankVisualization percent={metrics.currentPercent} liters={runtime.volume} capacity={capacity} status={status} />
            <div>
              <p className="text-sm leading-6 text-muted">La cisterna tiene <strong className="font-semibold text-ink">{formatLiters(runtime.volume)}</strong> disponibles. Faltan {formatLiters(metrics.missingLiters)} para llenarla por completo.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniMetric label="Mínimo de hoy" value={formatPercent(metrics.minLevelToday)} />
                <MiniMetric label="Máximo de hoy" value={formatPercent(metrics.maxLevelToday)} />
                <MiniMetric label="Autonomía" value={metrics.autonomy ? `≈ ${metrics.autonomy.toFixed(1)} días` : 'Sin datos'} info="Estimación de cuántos días podría durar el agua si se mantiene el consumo promedio actual." />
                <MiniMetric label="Tasa de vaciado" value={runtime.flowRate > 0 ? `−${formatLiters(runtime.flowRate * 60)}/h` : 'Sin consumo'} />
              </div>
            </div>
          </div>
        </article>
        <article className="card p-5 md:p-6"><SectionTitle eyebrow="En este momento" title="Salida de agua" /><FlowVisualization flow={runtime.flowRate} maxFlow={config.maxFlowLpm} /><div className="mt-5 rounded-2xl bg-canvas p-4 text-center text-xs leading-5 text-muted">{runtime.flowRate > 0 ? `A este ritmo salen ${formatLiters(runtime.flowRate * 60)} por hora.` : 'No hay salida de agua en este momento.'}</div></article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="card p-5 md:p-7">
          <SectionTitle eyebrow="Últimos días" title="Consumo diario" action={<div className="period-toggle">{[7, 30].map((days) => <button key={days} onClick={() => setPeriod(days)} className={period === days ? 'active' : ''}>{days} días</button>)}</div>} />
          <DailyConsumptionChart history={history} days={period} />
        </article>
        <article className="card p-5 md:p-7"><SectionTitle eyebrow="Hoy" title="Evolución del nivel" /><TankLevelChart history={history} currentPercent={metrics.currentPercent} /></article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <article className="card p-6 md:p-8">
          <SectionTitle eyebrow="Este mes" title="Consumo y ahorro" />
          <div className="grid gap-7 md:grid-cols-2">
            <div>
              <div className="flex items-end gap-3"><span className="text-4xl font-semibold tracking-[-.05em]">{formatM3(toM3(metrics.monthly))}</span><span className="mb-1 text-sm text-muted">consumidos</span></div>
              <p className="mt-2 text-sm text-muted">{formatLiters(metrics.monthly)} · {formatCurrency(metrics.monthlyCost)} estimados</p>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-aqua-500 transition-all duration-700" style={{ width: `${Math.min(100, metrics.monthly / config.monthlyGoalLiters * 100)}%` }} /></div>
              <div className="mt-2 flex justify-between text-[11px] text-muted"><span>Consumo actual</span><span>Meta {formatLiters(config.monthlyGoalLiters)}</span></div>
            </div>
            <div className="rounded-3xl bg-aqua-50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-aqua-700 shadow-sm"><Leaf className="h-5 w-5" /></div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[.15em] text-aqua-800/60">Ahorro estimado</p>
              <p className="mt-1 text-2xl font-semibold text-aqua-900">{formatLiters(metrics.savings)}</p>
              <p className="mt-2 text-xs leading-5 text-aqua-800/70">{metrics.savingsPercent !== null ? `${metrics.savingsPercent.toFixed(1)} % respecto a la referencia · ${formatCurrency(metrics.savingsMoney)}` : 'Aún no hay una referencia válida.'}</p>
            </div>
          </div>
        </article>
        <article className="card p-6 md:p-8">
          <SectionTitle eyebrow="Estimación" title="Proyección mensual" />
          <p className="text-4xl font-semibold tracking-[-.05em]">{formatLiters(metrics.projected)}</p>
          <p className="mt-2 text-sm text-muted">{formatCurrency(metrics.projectedCost)} de costo estimado al cierre</p>
          <div className="mt-7 flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-900"><TrendingUp className="mt-1 h-4 w-4 shrink-0" /><span>Calculado según el promedio diario observado. Es una estimación, no una factura real.</span></div>
        </article>
      </section>

      <section className="mt-5 card p-6 md:p-8">
        <SectionTitle eyebrow="Indicadores" title="Más información útil" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Promedio diario" value={formatLiters(metrics.dailyAverage)} subtext="Promedio de los últimos 7 días" />
          <MiniMetric label="Promedio semanal" value={formatLiters(metrics.weekly)} subtext="Total móvil de 7 días" />
          <MiniMetric label="Mes anterior" value={formatLiters(metrics.previousMonth)} subtext={metrics.monthlyChange === null ? 'Sin referencia completa' : `${Math.abs(metrics.monthlyChange).toFixed(1)} % de diferencia`} />
          <MiniMetric label="Costo estimado" value={formatCurrency(metrics.monthlyCost)} subtext={`Tarifa: ${formatCurrency(config.waterRatePerM3)}/m³`} />
          <MiniMetric label="Consumo máximo" value={formatLiters(metrics.maxDay?.consumption)} subtext={metrics.maxDay ? formatDate(metrics.maxDay.date, { day: 'numeric', month: 'long' }) : ''} />
          <MiniMetric label="Consumo mínimo" value={formatLiters(metrics.minDay?.consumption)} subtext={metrics.minDay ? formatDate(metrics.minDay.date, { day: 'numeric', month: 'long' }) : ''} />
          <MiniMetric label="Hora de mayor consumo" value={peakHour} subtext="Franja más activa de hoy" />
          <MiniMetric label="Ahorro económico" value={formatCurrency(metrics.savingsMoney)} subtext="Estimado según la referencia" />
        </div>
      </section>

      <section className="mt-5 card p-6 md:p-8">
        <SectionTitle eyebrow="Atención" title="Alertas recientes" />
        {alerts.length ? <div className="space-y-3">{alerts.map((alert) => <div key={alert.title} className={`alert alert-${alert.tone}`}><AlertTriangle className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{alert.title}</p><p className="mt-1 text-sm opacity-75">{alert.detail}</p></div></div>)}</div> : <div className="flex flex-col items-center rounded-3xl bg-emerald-50/70 px-6 py-9 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-600 shadow-sm"><Droplets className="h-5 w-5" /></span><p className="mt-3 font-semibold text-emerald-900">Todo funciona con normalidad</p><p className="mt-1 text-sm text-emerald-800/65">No hay alertas activas en este momento.</p></div>}
      </section>
    </div>
  )
}
