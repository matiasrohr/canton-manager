import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { FASES_FERIA, ALL_RUBROS, DIAS, FASE_COLORS, faseDeRubro } from '../feriadata'

const ESTADOS = ['Pendiente', 'Visitado', 'No encontrado', 'Reagendar', 'Descartado']

function RFQSelector({ selected, onChange }) {
  const [rfqs, setRfqs] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('rfqs').select('id, rfq_code, producto').order('rfq_code').then(({ data }) => setRfqs(data || []))
  }, [])

  const filtered = rfqs.filter(r =>
    r.rfq_code.toLowerCase().includes(search.toLowerCase()) ||
    r.producto.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div className="border border-gray-300 rounded p-2 space-y-2">
      <input
        placeholder="Buscar por ID o producto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
      />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filtered.map(r => (
          <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <span className="font-mono text-xs text-gray-500">{r.rfq_code}</span>
            <span className="truncate">{r.producto}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="text-xs text-blue-700">{selected.length} RFQ{selected.length > 1 ? 's' : ''} seleccionado{selected.length > 1 ? 's' : ''}</div>
      )}
    </div>
  )
}

function ProveedorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    empresa: '', contacto_nombre: '', hall: '', zona: '', stand: '',
    wechat_email: '', productos_fabrica: '', fase_feria: '', dia_visita: '',
    prioridad_visita: 'Media', estado_visita: 'Pendiente', notas_previas: ''
  })
  const [rfqIds, setRfqIds] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial?.id) {
      supabase.from('rfq_proveedores').select('rfq_id').eq('proveedor_id', initial.id)
        .then(({ data }) => setRfqIds((data || []).map(r => r.rfq_id)))
    }
  }, [initial?.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.empresa.trim()) return alert('La empresa es obligatoria')
    setSaving(true)
    let proveedorId = initial?.id

    if (proveedorId) {
      await supabase.from('proveedores').update({ ...form, updated_at: new Date().toISOString() }).eq('id', proveedorId)
    } else {
      const { data } = await supabase.from('proveedores').insert(form).select('id').single()
      proveedorId = data.id
    }

    // Sync RFQ links
    await supabase.from('rfq_proveedores').delete().eq('proveedor_id', proveedorId)
    if (rfqIds.length) {
      await supabase.from('rfq_proveedores').insert(rfqIds.map(rfq_id => ({ rfq_id, proveedor_id: proveedorId })))
    }

    setSaving(false)
    onSave()
  }

  const F = ({ label, k, type = 'text', ...rest }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" {...rest} />
    </div>
  )

  const S = ({ label, k, options }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={form[k] || ''} onChange={e => set(k, e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
        <option value=""></option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{initial ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><F label="Empresa *" k="empresa" /></div>
          <F label="Nombre contacto" k="contacto_nombre" />
          <F label="WeChat / Email" k="wechat_email" />
          <F label="Hall" k="hall" placeholder="Ej: Hall 11" />
          <F label="Zona" k="zona" placeholder="Ej: A" />
          <F label="Stand" k="stand" placeholder="Ej: 1A15" />
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Fase de la feria</label>
            <div className="flex gap-2">
              {FASES_FERIA.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set('fase_feria', f.id)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                    form.fase_feria === f.id
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div>{f.id}</div>
                  <div className="font-normal opacity-75">{f.fechas}</div>
                </button>
              ))}
            </div>
            {form.fase_feria && (
              <div className="flex flex-wrap gap-1 mt-1">
                {FASES_FERIA.find(f => f.id === form.fase_feria)?.rubros.map(r => (
                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full ${FASE_COLORS[form.fase_feria]}`}>{r}</span>
                ))}
              </div>
            )}
          </div>
          <S label="Día de visita" k="dia_visita" options={DIAS} />
          <S label="Prioridad visita" k="prioridad_visita" options={['Alta', 'Media', 'Baja']} />
          <S label="Estado visita" k="estado_visita" options={ESTADOS} />
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Productos que fabrican</label>
            <textarea value={form.productos_fabrica || ''} onChange={e => set('productos_fabrica', e.target.value)}
              rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Notas previas</label>
            <textarea value={form.notas_previas || ''} onChange={e => set('notas_previas', e.target.value)}
              rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-2">RFQs vinculados</label>
            <RFQSelector selected={rfqIds} onChange={setRfqIds} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onCancel} className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ estado: '', dia: '', hall: '', fase: '' })
  const [form, setForm] = useState(null) // null | {} | proveedor obj
  const [detail, setDetail] = useState(null)
  const [detailRFQs, setDetailRFQs] = useState([])
  const [detailVisitas, setDetailVisitas] = useState([])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('hall').order('zona').order('stand')
    setProveedores(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openDetail(p) {
    setDetail(p)
    const [{ data: rp }, { data: vis }] = await Promise.all([
      supabase.from('rfq_proveedores').select('rfq_id, rfqs(rfq_code, producto)').eq('proveedor_id', p.id),
      supabase.from('visitas').select('*').eq('proveedor_id', p.id).order('fecha_visita', { ascending: false })
    ])
    setDetailRFQs((rp || []).map(r => r.rfqs))
    setDetailVisitas(vis || [])
  }

  const halls = [...new Set(proveedores.map(p => p.hall).filter(Boolean))].sort()
  const filtered = proveedores.filter(p =>
    (!filter.estado || p.estado_visita === filter.estado) &&
    (!filter.dia || p.dia_visita === filter.dia) &&
    (!filter.hall || p.hall === filter.hall) &&
    (!filter.fase || p.fase_feria === filter.fase)
  )

  const estadoColor = { Pendiente: 'bg-gray-100 text-gray-600', Visitado: 'bg-green-100 text-green-700', 'No encontrado': 'bg-red-100 text-red-600', Reagendar: 'bg-amber-100 text-amber-700', Descartado: 'bg-gray-200 text-gray-400' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Proveedores ({proveedores.length})</h1>
        <button onClick={() => setForm({})} className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800">
          + Nuevo proveedor
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filter.fase} onChange={e => setFilter(f => ({ ...f, fase: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todas las fases</option>
          {FASES_FERIA.map(f => <option key={f.id} value={f.id}>{f.id} ({f.fechas})</option>)}
        </select>
        <select value={filter.hall} onChange={e => setFilter(f => ({ ...f, hall: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todos los halls</option>
          {halls.map(h => <option key={h}>{h}</option>)}
        </select>
        <select value={filter.dia} onChange={e => setFilter(f => ({ ...f, dia: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todos los días</option>
          {DIAS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filter.estado} onChange={e => setFilter(f => ({ ...f, estado: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Cargando...</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Empresa', 'Fase', 'Stand', 'Día', 'Estado', 'Prioridad', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium cursor-pointer" onClick={() => openDetail(p)}>{p.empresa}</td>
                  <td className="px-3 py-2">
                    {p.fase_feria
                      ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FASE_COLORS[p.fase_feria] || 'bg-gray-100 text-gray-500'}`}>{p.fase_feria}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{[p.hall, p.zona, p.stand].filter(Boolean).join('-') || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{p.dia_visita || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[p.estado_visita] || ''}`}>{p.estado_visita}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{p.prioridad_visita}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setForm(p)} className="text-xs text-blue-700 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No hay proveedores</p>}
        </div>
      )}

      {form !== null && (
        <ProveedorForm
          initial={form.id ? form : null}
          onSave={() => { setForm(null); load() }}
          onCancel={() => setForm(null)}
        />
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold text-gray-800">{detail.empresa}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              {detail.contacto_nombre && <div><strong>Contacto:</strong> {detail.contacto_nombre}</div>}
              {detail.wechat_email && <div><strong>WeChat/Email:</strong> {detail.wechat_email}</div>}
              <div><strong>Stand:</strong> {[detail.hall, detail.zona, detail.stand].filter(Boolean).join('-') || '—'}</div>
              {detail.dia_visita && <div><strong>Día:</strong> {detail.dia_visita}</div>}
              {detail.drive_folder_url && <div><a href={detail.drive_folder_url} target="_blank" className="text-blue-600 hover:underline">Ver carpeta en Drive →</a></div>}
            </div>
            {detailRFQs.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">RFQs vinculados</div>
                <div className="flex flex-wrap gap-1">
                  {detailRFQs.map(r => <span key={r.rfq_code} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{r.rfq_code}</span>)}
                </div>
              </div>
            )}
            {detailVisitas.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Historial de visitas</div>
                {detailVisitas.map(v => (
                  <div key={v.id} className="border border-gray-200 rounded p-3 text-sm space-y-1 mb-2">
                    <div className="font-medium">{v.fecha_visita}</div>
                    {v.drive_informe_url && <a href={v.drive_informe_url} target="_blank" className="text-blue-600 hover:underline text-xs">Ver informe →</a>}
                    {v.informe_json?.evaluacion?.score && <div className="text-xs text-gray-500">Score: {v.informe_json.evaluacion.score}/5</div>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setDetail(null); setForm(detail) }} className="text-sm text-blue-700 hover:underline">Editar proveedor →</button>
          </div>
        </div>
      )}
    </div>
  )
}
