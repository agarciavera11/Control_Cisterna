import { Droplets } from 'lucide-react'
import { formatLiters, formatPercent } from '../utils/formatters'

const toneByStatus = {
  high: 'from-cyan-400 to-aqua-500',
  normal: 'from-sky-400 to-aqua-500',
  low: 'from-amber-300 to-orange-400',
  critical: 'from-rose-400 to-orange-400',
}

export default function TankVisualization({ percent, liters, capacity, status, large = false }) {
  const fill = Math.max(0, Math.min(100, percent))
  return (
    <div className={`relative mx-auto ${large ? 'h-[390px] w-[260px]' : 'h-[320px] w-[215px]'}`} aria-label={`Cisterna al ${formatPercent(fill)}`} role="img">
      <div className="absolute -inset-x-5 bottom-0 h-8 rounded-[50%] bg-ink/5 blur-md" />
      <div className="absolute inset-x-0 bottom-3 top-0 overflow-hidden rounded-[3.25rem] border-[10px] border-white bg-slate-100 shadow-[inset_0_0_0_1px_rgba(20,35,31,.08),0_24px_55px_rgba(28,98,82,.16)]">
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-b ${toneByStatus[status.tone]} transition-[height] duration-1000 ease-out`}
          style={{ height: `${fill}%` }}
        >
          <div className="absolute -left-[12%] -top-3 h-7 w-[125%] animate-wave rounded-[48%] bg-white/25" />
          <div className="absolute -left-[4%] -top-2 h-5 w-[112%] animate-wave rounded-[50%] bg-white/20 [animation-delay:-3s]" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/15 via-transparent to-white/10" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/15" />
      </div>
      <div className="absolute inset-x-4 top-[36%] z-10 rounded-3xl bg-white/80 px-4 py-4 text-center shadow-lg backdrop-blur-md">
        <Droplets className="mx-auto mb-1 h-5 w-5 text-aqua-600" />
        <div className="text-3xl font-semibold tracking-tight text-ink">{formatPercent(fill)}</div>
        <div className="mt-1 text-xs font-medium text-muted">{formatLiters(liters)} de {formatLiters(capacity)}</div>
      </div>
    </div>
  )
}
