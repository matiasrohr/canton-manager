import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import RFQs from './pages/RFQs'
import Proveedores from './pages/Proveedores'
import Agenda from './pages/Agenda'
import Configuracion from './pages/Configuracion'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'rfqs', label: 'RFQs' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'config', label: 'Configuración' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-900 text-lg tracking-tight">CantonManager</span>
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-blue-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'rfqs' && <RFQs />}
        {tab === 'proveedores' && <Proveedores />}
        {tab === 'agenda' && <Agenda />}
        {tab === 'config' && <Configuracion />}
      </main>
    </div>
  )
}
