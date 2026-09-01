import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, Download, TrendingUp } from 'lucide-react'
import { DailyConsumptionChart, TankLevelChart, HourlyChart } from '../components/Charts'
import { useCisterna } from '../context/CisternaContext'
import { estimatedCost, percentageChange } from '../utils/calculations'
import { formatCurrency, formatDate, formatLiters, formatPercent } from '../utils/formatters'

export default function History() {
  const { config, history, metrics } = useCisterna()
  const [period, setPeriod] = useState(7)
  const [mode, setMode] = useState('consumption')
  const [descending, setDescending] = useState(true)
  const records = useMemo(() => [...history.slice(-period)].sort((a, b) => descending ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)), [history, period, descending])

  const exportCsv = () => {
    const header = 'Fecha,Consumo (L),Nivel mínimo (%),Nivel máximo (%),Costo estimado (USD)\n'
    const content = records.map((item) => `${item.date},${item.consumption.toFixed(1)},${item.minLevel.toFixed(1)},${item.maxLevel.toFixed(1)},${estimatedCost(item.consumption, config.waterRatePerM3).toFixed(2)}`).join('\n')
    const url = URL.createObjectURL(new Blob([header + content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'historial-cisterna.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-shell">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="eyebrow">{config.dataMode === 'live' ? 'Datos del ESP32' : 'Datos simulados'}</p><h1 className="page-title mt-2">Historial</h1><p className="mt-2 text-sm text-muted">Descubre cómo cambia tu consumo a lo largo del tiempo.</p></div>
        <button onClick={exportCsv} className="button-secondary"><Download className="h-4 w-4" /> Exportar CSV</button>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><CalendarDays className="h-5 w-5 text-aqua-600" /><p className="mt-5 text-xs text-muted">Consumo del periodo</p><p className="mt-1 text-2xl font-semibold tracking-tight">{formatLiters(history.slice(-period).reduce((sum, item) => sum + item.consumption, 0))}</p></div>
        <div className="card p-5"><TrendingUp className="h-5 w-5 text-sky-600" /><p className="mt-5 text-xs text-muted">Promedio diario</p><p className="mt-1 text-2xl font-semibold tracking-tight">{formatLiters(history.slice(-period).reduce((sum, item) => sum + item.consumption, 0) / period)}</p></div>
        <div className="card p-5"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">$</span><p className="mt-5 text-xs text-muted">Costo del mes</p><p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(metrics.monthlyCost)}</p></div>
      </section>

      <section className="mt-5 card p-5 md:p-7">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="period-toggle self-start"><button className={mode === 'consumption' ? 'active' : ''} onClick={() => setMode('consumption')}>Consumo</button><button className={mode === 'level' ? 'active' : ''} onClick={() => setMode('level')}>Nivel</button><button className={mode === 'hourly' ? 'active' : ''} onClick={() => setMode('hourly')}>Por hora</button></div>
          <div className="period-toggle self-start">{[7, 30].map((days) => <button key={days} className={period === days ? 'active' : ''} onClick={() => setPeriod(days)}>{days} días</button>)}</div>
        </div>
        {mode === 'consumption' ? <DailyConsumptionChart history={history} days={period} height={320} /> : mode === 'level' ? <TankLevelChart history={history} currentPercent={metrics.currentPercent} height={320} /> : <HourlyChart history={history} height={320} />}
      </section>

      <section className="mt-5 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[.05] p-6 md:px-8"><div><p className="eyebrow">Detalle diario</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Registros</h2></div><button onClick={() => setDescending(!descending)} className="button-ghost">Fecha {descending ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}</button></div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead><tr className="border-b border-black/[.05] text-[11px] uppercase tracking-[.12em] text-muted"><th className="px-8 py-4 font-medium">Fecha</th><th className="px-5 py-4 font-medium">Consumo</th><th className="px-5 py-4 font-medium">Promedio</th><th className="px-5 py-4 font-medium">Nivel mín.</th><th className="px-5 py-4 font-medium">Nivel máx.</th><th className="px-5 py-4 font-medium">Costo</th><th className="px-5 py-4 font-medium">Variación</th></tr></thead>
            <tbody>{records.map((item) => {
              const originalIndex = history.findIndex((record) => record.date === item.date)
              const previous = history[originalIndex - 1]?.consumption
              const change = percentageChange(item.consumption, previous)
              return <tr key={item.date} className="border-b border-black/[.04] text-sm last:border-0 hover:bg-canvas/70"><td className="whitespace-nowrap px-8 py-4 font-medium">{formatDate(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-5 py-4">{formatLiters(item.consumption)}</td><td className="px-5 py-4 text-muted">{formatLiters(item.consumption / 24)}/h</td><td className="px-5 py-4 text-muted">{formatPercent(item.minLevel)}</td><td className="px-5 py-4 text-muted">{formatPercent(item.maxLevel)}</td><td className="px-5 py-4 text-muted">{formatCurrency(estimatedCost(item.consumption, config.waterRatePerM3))}</td><td className="px-5 py-4">{change === null ? <span className="text-muted">—</span> : <span className={change <= 0 ? 'text-emerald-700' : 'text-amber-700'}>{change > 0 ? '+' : ''}{change.toFixed(1)} %</span>}</td></tr>
            })}</tbody>
          </table>
        </div>
        <div className="divide-y divide-black/[.05] md:hidden">{records.map((item) => <article key={item.date} className="p-5"><div className="flex items-center justify-between"><p className="font-semibold">{formatDate(item.date, { day: 'numeric', month: 'long' })}</p><span className="text-sm font-semibold text-aqua-700">{formatLiters(item.consumption)}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted">Mínimo</p><p className="mt-1 font-medium">{formatPercent(item.minLevel)}</p></div><div><p className="text-muted">Máximo</p><p className="mt-1 font-medium">{formatPercent(item.maxLevel)}</p></div><div><p className="text-muted">Costo</p><p className="mt-1 font-medium">{formatCurrency(estimatedCost(item.consumption, config.waterRatePerM3))}</p></div></div></article>)}</div>
      </section>
    </div>
  )
}
