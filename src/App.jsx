import { useState } from 'react'
import AppShell from './components/AppShell'
import { CisternaProvider } from './context/CisternaContext'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Simulation from './pages/Simulation'
import Settings from './pages/Settings'

function Application() {
  const [page, setPage] = useState('dashboard')
  const pages = {
    dashboard: <Dashboard onSimulate={() => setPage('simulation')} />,
    history: <History />,
    simulation: <Simulation />,
    settings: <Settings />,
  }
  return <AppShell page={page} setPage={setPage}>{pages[page]}</AppShell>
}

export default function App() {
  return <CisternaProvider><Application /></CisternaProvider>
}
