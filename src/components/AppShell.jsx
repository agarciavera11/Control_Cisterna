import { BarChart3, Beaker, Droplets, History, Menu, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { useCisterna } from '../context/CisternaContext'

const nav = [
  { id: 'dashboard', label: 'Resumen', icon: BarChart3 },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'simulation', label: 'Simulación', icon: Beaker },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

export default function AppShell({ page, setPage, children }) {
  const [open, setOpen] = useState(false)
  const { config, runtime } = useCisterna()
  const live = config.dataMode === 'live'
  const navigate = (id) => { setPage(id); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-black/[.05] bg-white/85 px-5 py-7 backdrop-blur-xl lg:flex">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-3 px-2 text-left" aria-label="Ir al resumen">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white"><Droplets className="h-5 w-5" /></span>
          <span><strong className="block text-sm tracking-tight">Cisterna</strong><small className="text-[11px] text-muted">Monitoreo inteligente</small></span>
        </button>
        <nav className="mt-12 space-y-2" aria-label="Navegación principal">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navigate(id)} className={`nav-item ${page === id ? 'nav-item-active' : ''}`} aria-current={page === id ? 'page' : undefined}>
              <Icon className="h-[18px] w-[18px]" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl bg-aqua-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-aqua-800">
            <span className={`h-2 w-2 rounded-full ${live ? (runtime.connected ? 'animate-pulse-soft bg-emerald-500' : 'bg-rose-500') : 'animate-pulse-soft bg-aqua-500'}`} />
            {live ? (runtime.connected ? 'ESP32 en línea' : 'ESP32 sin señal') : 'Modo demostración'}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-aqua-800/70">{live ? 'Lecturas en tiempo real desde Firebase.' : 'Los datos son simulados y se guardan solo en este dispositivo.'}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[.05] bg-canvas/90 px-5 backdrop-blur-xl lg:hidden">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white"><Droplets className="h-4 w-4" /></span> Cisterna</button>
        <button onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </header>
      {open && <div className="fixed inset-x-4 top-20 z-50 rounded-3xl bg-white p-3 shadow-float lg:hidden">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`nav-item ${page === id ? 'nav-item-active' : ''}`}><Icon className="h-5 w-5" />{label}</button>)}</div>}

      <main className="min-w-0 pb-28 lg:ml-[248px] lg:pb-10">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/60 bg-white/90 p-1.5 shadow-float backdrop-blur-xl lg:hidden" aria-label="Navegación inferior">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${page === id ? 'bg-ink text-white' : 'text-muted'}`}><Icon className="h-4 w-4" /><span className="truncate">{label}</span></button>)}
      </nav>
    </div>
  )
}
