import { Droplet } from 'lucide-react'
import { flowStatus } from '../utils/calculations'
import { formatFlow } from '../utils/formatters'

export default function FlowVisualization({ flow, maxFlow = 30, compact = false }) {
  const active = flow > 0
  const duration = Math.max(.28, 1.55 - (flow / maxFlow) * 1.1)
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-50 to-aqua-50/70 ${compact ? 'p-5' : 'p-7'}`}>
      <div className="relative mx-auto h-28 max-w-sm" aria-label={`Caudal: ${formatFlow(flow)}`}>
        <div className="absolute left-[18%] top-4 h-7 w-[48%] rounded-full bg-slate-300 shadow-inner" />
        <div className="absolute left-[60%] top-4 h-16 w-7 rounded-b-xl bg-slate-300 shadow-inner" />
        <div className="absolute left-[42%] top-0 h-5 w-11 rounded-lg bg-slate-400" />
        <div className="absolute left-[38%] top-[-5px] h-2 w-20 rounded-full bg-slate-400" />
        {active && (
          <div className="absolute left-[60%] top-[70px] h-14 w-7 overflow-hidden rounded-b-[60%] bg-sky-400/20">
            {[0, 1, 2].map((item) => <Droplet key={item} className="absolute left-1 h-5 w-5 animate-flow fill-sky-400 text-sky-400" style={{ animationDuration: `${duration}s`, animationDelay: `${-item * duration / 3}s` }} />)}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Caudal actual</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatFlow(flow)}</p>
        <p className={`mt-1 text-xs font-medium ${active ? 'text-aqua-700' : 'text-muted'}`}>{flowStatus(flow, maxFlow)}</p>
      </div>
    </div>
  )
}
