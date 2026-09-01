import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'

const tones = {
  aqua: 'bg-aqua-50 text-aqua-700',
  blue: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
}

export default function MetricCard({ title, value, subtitle, icon: Icon, tone = 'aqua', trend, tooltip, delay = 0 }) {
  const positive = trend?.direction === 'down'
  return (
    <article className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <span>{title}</span>
          {tooltip && (
            <span className="group relative cursor-help" tabIndex="0" aria-label={tooltip}>
              <Info className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute left-0 top-6 z-30 hidden w-64 rounded-xl bg-ink p-3 text-xs font-normal leading-5 text-white shadow-float group-hover:block group-focus:block">{tooltip}</span>
            </span>
          )}
        </div>
        {Icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>}
      </div>
      <div className="mt-5 text-[1.8rem] font-semibold tracking-[-0.045em] text-ink md:text-[2rem]">{value}</div>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted">
        {trend && (
          <span className={`inline-flex items-center gap-1 font-semibold ${positive ? 'text-emerald-700' : trend.direction === 'up' ? 'text-amber-700' : 'text-muted'}`}>
            {trend.direction === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : trend.direction === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
            {trend.label}
          </span>
        )}
        {subtitle && <span>{subtitle}</span>}
      </div>
    </article>
  )
}
