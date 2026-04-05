import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { FASES_FERIA, DIAS, FASE_COLORS } from '../feriadata'

const ESTADOS = ['Pendiente', 'Visitado', 'No encontrado', 'Reagendar', 'Descartado']
const estadoColor = {
  Pendiente: 'bg-gray-100 text-gray-600',
  Visitado: 'bg-green-100 text-green-700',
  'No encontrado': 'bg-red-100 text-red-600',
  Reagendar: 'bg-amber-100 text-amber-700',
  Descartado: 'bg-gray-200 text-gray-400',
}

export default function Agenda() {
  const [fase, setFase] = useState('Phase 1')
  const [dia, setDia] = useState('Día 1')
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  const faseInfo = FASES_FERIA.find(f => f.id === fase)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*, rfq_proveedores(rfq_id, rfqs(rfq_code, producto))')
      .eq('fase_feria', fase)
      .eq('dia_visita', dia)
      .order('hall').order('zona').order('stand')
    setProveedores(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [fase, dia])

  async function updateEstado(id, estado) {
    await supabase.from('proveedores').update({ estado_visita: estado, updated_at: new Date().toISOString() }).eq('id', id)
    setProveedores(prev => prev.map(p => p.id === id ? { ...p, estado_visita: estado } : p))
  }

  function exportJSON() {
    const data = proveedores.map(p => ({
      id: p.id,
      empresa: p.empresa,
      hall: p.hall, zona: p.zona, stand: p.stand,
      wechat_email: p.wechat_email,
      prioridad_visita: p.prioridad_visita,
      estado_visita: p.estado_visita,
      fase_feria: p.fase_feria,
      dia_visita: p.dia_visita,
      rfqs: (p.rfq_proveedores || []).map(r => ({ rfq_code: r.rfqs?.rfq_code, producto: r.rfqs?.producto })),
      notas_previas: p.notas_previas,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `agenda-${fase.toLowerCase().replace(' ', '')}-${dia.toLowerCase().replace(' ', '')}.json`
    a.click()
  }

  const pendientes = proveedores.filter(p => p.estado_visita === 'Pendiente').length
  const visitados = proveedores.filter(p => p.estado_visita === 'Visitado').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <button onClick={exportJSON} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
          ↓ Exportar JSON para CantonMaster
        </button>
      </div>

      {/* Selector de Fase */}
      <div className="flex gap-2">
        {FASES_FERIA.map(f => (
          <button
            key={f.id}
            onClick={() => { setFase(f.id); setDia('Día 1') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              fase === f.id
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div>{f.id}</div>
            <div className="text-xs font-normal opacity-75">{f.fechas}</div>
          </button>
        ))}
      </div>

      {/* Rubros de la fase activa */}
      {faseInfo && (
        <div className="flex flex-wrap gap-1">
          {faseInfo.rubros.map(r => (
            <span key={r} className={`text-xs px-2 py-0.5 rounded-full ${FASE_COLORS[fase]}`}>{r}</span>
          ))}
        </div>
      )}

      {/* Selector de Día */}
      <div className="flex gap-1">
        {DIAS.map(d => (
          <button
            key={d}
            onClick={() => setDia(d)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              dia === d
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{proveedores.length} proveedores</span>
          <span className="text-amber-600">{pendientes} pendientes</span>
          <span className="text-green-600">{visitados} visitados</span>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">Cargando...</p> : (
        <div className="space-y-2">
          {proveedores.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
              No hay proveedores para {fase} · {dia}
            </div>
          )}
          {proveedores.map(p => {
            const rfqs = (p.rfq_proveedores || []).map(r => r.rfqs).filter(Boolean)
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{p.empresa}</span>
                    {p.prioridad_visita === 'Alta' && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Alta</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 font-mono mb-2">
                    {[p.hall, p.zona, p.stand].filter(Boolean).join(' · ') || 'Sin ubicación'}
                  </div>
                  {rfqs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rfqs.map(r => (
                        <span key={r.rfq_code} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                          {r.rfq_code}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.notas_previas && (
                    <div className="text-xs text-gray-400 mt-1 truncate">{p.notas_previas}</div>
                  )}
                </div>
                <select
                  value={p.estado_visita}
                  onChange={e => updateEstado(p.id, e.target.value)}
                  className={`text-xs px-2 py-1 rounded border-0 font-medium cursor-pointer ${estadoColor[p.estado_visita] || ''}`}
                >
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
