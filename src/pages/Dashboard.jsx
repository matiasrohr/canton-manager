import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ rfqs: 0, proveedores: 0, pendientes: 0, visitados: 0 })
  const [rfqsSinProveedor, setRfqsSinProveedor] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ count: rfqs }, { count: proveedores }, { count: pendientes }, { count: visitados }, { data: rfqsData }] = await Promise.all([
        supabase.from('rfqs').select('*', { count: 'exact', head: true }),
        supabase.from('proveedores').select('*', { count: 'exact', head: true }),
        supabase.from('proveedores').select('*', { count: 'exact', head: true }).eq('estado_visita', 'Pendiente'),
        supabase.from('proveedores').select('*', { count: 'exact', head: true }).eq('estado_visita', 'Visitado'),
        supabase.from('rfqs').select('id, rfq_code, producto, fase').in('fase', ['3-En búsqueda feria', '2-Brief armado']),
      ])
      setStats({ rfqs: rfqs || 0, proveedores: proveedores || 0, pendientes: pendientes || 0, visitados: visitados || 0 })

      // RFQs sin ningún proveedor asignado
      if (rfqsData?.length) {
        const { data: asignados } = await supabase.from('rfq_proveedores').select('rfq_id')
        const asignadosSet = new Set((asignados || []).map(r => r.rfq_id))
        setRfqsSinProveedor(rfqsData.filter(r => !asignadosSet.has(r.id)))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'RFQs', value: stats.rfqs, color: 'blue' },
          { label: 'Proveedores', value: stats.proveedores, color: 'indigo' },
          { label: 'Visitas pendientes', value: stats.pendientes, color: 'orange' },
          { label: 'Visitados', value: stats.visitados, color: 'green' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-800">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {rfqsSinProveedor.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="font-semibold text-amber-800 mb-2">
            ⚠ {rfqsSinProveedor.length} RFQ{rfqsSinProveedor.length > 1 ? 's' : ''} en búsqueda sin proveedor asignado
          </div>
          <ul className="space-y-1">
            {rfqsSinProveedor.map(r => (
              <li key={r.id} className="text-sm text-amber-700">
                <span className="font-mono">{r.rfq_code}</span> — {r.producto}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => onNavigate('proveedores')} className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800">
          + Nuevo proveedor
        </button>
        <button onClick={() => onNavigate('rfqs')} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
          Importar RFQs
        </button>
        <button onClick={() => onNavigate('agenda')} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">
          Ver agenda del día
        </button>
      </div>
    </div>
  )
}
