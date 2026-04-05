import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabase'

const FASES = [
  '1-Lead recibido', '2-Brief armado', '3-En búsqueda feria',
  '4-Proveedores hallados', '5-Cotización enviada', '6-Cerrado ganado', '7-Cerrado perdido'
]

// Map Excel column name variants → Supabase field
const COL_MAP = {
  'rfq id': 'rfq_code', 'id rfq': 'rfq_code', 'rfq_code': 'rfq_code',
  'origen': 'origen', 'origin': 'origen',
  'fase': 'fase', 'phase': 'fase', 'status': 'fase',
  'rubro': 'rubro', 'categoria': 'rubro', 'category': 'rubro',
  'producto buscado': 'producto', 'product title': 'producto', 'producto': 'producto', 'product': 'producto',
  'cliente': 'cliente', 'client': 'cliente', 'customer': 'cliente',
  'pais destino': 'pais_destino', 'país destino': 'pais_destino', 'country': 'pais_destino',
  'especificaciones': 'especificaciones', 'specifications': 'especificaciones', 'specs': 'especificaciones',
  'moq cliente': 'moq', 'moq': 'moq', 'quantity': 'moq',
  'precio objetivo': 'precio_objetivo_usd', 'precio objetivo usd': 'precio_objetivo_usd', 'target price': 'precio_objetivo_usd',
  'incoterm': 'incoterm',
  'muestra requerida': 'muestra_requerida', 'sample required': 'muestra_requerida',
  'prioridad': 'prioridad', 'priority': 'prioridad',
  'notas internas': 'notas', 'notas': 'notas', 'notes': 'notas',
}

function normalize(s) { return String(s).toLowerCase().trim().replace(/\s+/g, ' ') }

function parseSheet(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) return []

  // Map headers
  const headerMap = {}
  Object.keys(rows[0]).forEach(h => {
    const field = COL_MAP[normalize(h)]
    if (field) headerMap[h] = field
  })

  return rows.map(row => {
    const obj = { origen: 'cliente', fase: '1-Lead recibido', incoterm: 'FOB', prioridad: 'Media' }
    Object.entries(headerMap).forEach(([h, field]) => {
      if (row[h] !== '') obj[field] = String(row[h]).trim()
    })
    return obj
  }).filter(r => r.rfq_code)
}

export default function RFQs() {
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ fase: '', prioridad: '' })
  const [preview, setPreview] = useState(null) // { toInsert, toUpdate }
  const [importing, setImporting] = useState(false)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('rfqs').select('*').order('rfq_code')
    setRfqs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const rows = parseSheet(wb)
      const { data: existing } = await supabase.from('rfqs').select('rfq_code')
      const existingSet = new Set((existing || []).map(r => r.rfq_code))
      const toInsert = rows.filter(r => !existingSet.has(r.rfq_code))
      const toUpdate = rows.filter(r => existingSet.has(r.rfq_code))
      setPreview({ rows, toInsert, toUpdate })
    }
    reader.readAsArrayBuffer(file)
  }

  async function confirmImport() {
    setImporting(true)
    const { rows } = preview
    const { error } = await supabase.from('rfqs').upsert(rows, { onConflict: 'rfq_code' })
    if (error) alert('Error: ' + error.message)
    setPreview(null)
    fileRef.current.value = ''
    await load()
    setImporting(false)
  }

  async function updateField(id, field, value) {
    await supabase.from('rfqs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    setRfqs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const filtered = rfqs.filter(r =>
    (!filter.fase || r.fase === filter.fase) &&
    (!filter.prioridad || r.prioridad === filter.prioridad)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">RFQs ({rfqs.length})</h1>
        <button onClick={() => fileRef.current.click()} className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800">
          ↑ Importar desde Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={filter.fase} onChange={e => setFilter(f => ({ ...f, fase: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todas las fases</option>
          {FASES.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={filter.prioridad} onChange={e => setFilter(f => ({ ...f, prioridad: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todas las prioridades</option>
          {['Alta', 'Media', 'Baja'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Preview de importación */}
      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="font-semibold text-blue-900">
            Preview: {preview.toInsert.length} nuevos · {preview.toUpdate.length} a actualizar
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="text-xs w-full">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="py-1 pr-3">RFQ</th><th className="pr-3">Producto</th><th className="pr-3">Fase</th><th>Acción</th>
              </tr></thead>
              <tbody>
                {preview.rows.map(r => (
                  <tr key={r.rfq_code} className="border-b border-gray-100">
                    <td className="py-1 pr-3 font-mono">{r.rfq_code}</td>
                    <td className="pr-3">{r.producto}</td>
                    <td className="pr-3">{r.fase}</td>
                    <td className={preview.toInsert.find(x => x.rfq_code === r.rfq_code) ? 'text-green-600' : 'text-amber-600'}>
                      {preview.toInsert.find(x => x.rfq_code === r.rfq_code) ? 'INSERT' : 'UPDATE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmImport} disabled={importing} className="bg-blue-900 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50">
              {importing ? 'Importando...' : 'Confirmar importación'}
            </button>
            <button onClick={() => { setPreview(null); fileRef.current.value = '' }} className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? <p className="text-gray-400 text-sm">Cargando...</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Código', 'Producto', 'Rubro', 'Cliente', 'Fase', 'Prioridad', 'Precio obj.'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r.id === selected ? null : r.id)}>
                  <td className="px-3 py-2 font-mono text-xs">{r.rfq_code}</td>
                  <td className="px-3 py-2">{r.producto}</td>
                  <td className="px-3 py-2 text-gray-500">{r.rubro}</td>
                  <td className="px-3 py-2 text-gray-500">{r.cliente || '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.fase}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateField(r.id, 'fase', e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5"
                    >
                      {FASES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.prioridad || 'Media'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateField(r.id, 'prioridad', e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5"
                    >
                      {['Alta', 'Media', 'Baja'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.precio_objetivo_usd ? `$${r.precio_objetivo_usd}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No hay RFQs</p>}
        </div>
      )}
    </div>
  )
}
