import { useState } from 'react'

export default function Configuracion() {
  const [url, setUrl] = useState(localStorage.getItem('cm_supabase_url') || '')
  const [key, setKey] = useState(localStorage.getItem('cm_supabase_key') || '')
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('cm_supabase_url', url.trim())
    localStorage.setItem('cm_supabase_key', key.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    window.location.reload()
  }

  function exportDB() {
    // TODO: export full DB as JSON
    alert('Export no implementado aún')
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Supabase</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Project URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Anon Key</label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          onClick={save}
          className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800"
        >
          {saved ? '✓ Guardado' : 'Guardar y recargar'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-gray-700">Backup</h2>
        <button onClick={exportDB} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
          Exportar toda la base como JSON
        </button>
      </div>
    </div>
  )
}
