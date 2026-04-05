import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const SYSTEM_PROMPT = `Sos el asistente de sourcing de la Feria de Cantón 2026. Tenés acceso a la base de datos del operador con RFQs, proveedores y visitas.

Fases de la feria:
- Phase 1: April 15-19 (Electronics & Appliance, Manufacturing, Vehicles & Two Wheels, Light & Electrical, Hardware)
- Phase 2: April 23-27 (Housewares, Gifts & Decorations, Building & Furniture)
- Phase 3: May 1-5 (Toys & Children Baby and Maternity, Fashion, Home Textiles, Stationery, Health & Recreation)

Respondé siempre en español, de forma concisa y accionable. Si el usuario pide modificar datos, confirmá la acción y describí qué harías (la app ejecuta los cambios).`

async function fetchContext() {
  const [{ data: rfqs }, { data: proveedores }, { data: visitas }] = await Promise.all([
    supabase.from('rfqs').select('rfq_code, producto, rubro, fase, cliente, prioridad, moq, precio_objetivo_usd').order('rfq_code').limit(200),
    supabase.from('proveedores').select('empresa, hall, zona, stand, fase_feria, dia_visita, estado_visita, prioridad_visita, rating, rfq_proveedores(rfqs(rfq_code))').order('empresa').limit(200),
    supabase.from('visitas').select('proveedor_id, fecha_visita, informe_json').order('created_at', { ascending: false }).limit(50),
  ])
  return { rfqs: rfqs || [], proveedores: proveedores || [], visitas: visitas || [] }
}

async function callClaude(apiKey, messages, context) {
  const contextStr = `BASE DE DATOS ACTUAL:

RFQs (${context.rfqs.length}):
${JSON.stringify(context.rfqs, null, 2)}

Proveedores (${context.proveedores.length}):
${JSON.stringify(context.proveedores, null, 2)}

Visitas recientes (${context.visitas.length}):
${JSON.stringify(context.visitas.slice(0, 10), null, 2)}`

  const response = await fetch('https://cantonmaster-proxy.matirohr.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + '\n\n' + contextStr,
      messages,
    }),
  })
  if (!response.ok) throw new Error('Error ' + response.status)
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-900 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '¿Qué proveedores tengo para Phase 1?',
  '¿Cuántos RFQs sin proveedor asignado?',
  'Mostrá la agenda de Phase 1 Día 1',
  '¿Cuáles son los proveedores de alta prioridad?',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('cc_apikey') || '')
  const [showApiKey, setShowApiKey] = useState(!localStorage.getItem('cc_apikey'))
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return
    if (!apiKey) { setShowApiKey(true); return }

    setInput('')
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const context = await fetchContext()
      const reply = await callClaude(apiKey, newMessages, context)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠ Error: ' + e.message }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function saveApiKey(key) {
    localStorage.setItem('cc_apikey', key)
    setApiKey(key)
    setShowApiKey(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Asistente de Sourcing</h1>
          <p className="text-xs text-gray-400">Consultá y gestioná tu base de datos en lenguaje natural</p>
        </div>
        <button onClick={() => setShowApiKey(v => !v)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded">
          API Key
        </button>
      </div>

      {/* API Key input */}
      {showApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <label className="block text-xs text-amber-700 mb-1 font-medium">Claude API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              defaultValue={apiKey}
              placeholder="sk-ant-..."
              className="flex-1 border border-amber-300 rounded px-2 py-1.5 text-sm font-mono"
              onKeyDown={e => e.key === 'Enter' && saveApiKey(e.target.value)}
              id="api-key-field"
            />
            <button
              onClick={() => saveApiKey(document.getElementById('api-key-field').value)}
              className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="space-y-3 mt-4">
            <p className="text-center text-sm text-gray-400">¿En qué te puedo ayudar?</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Preguntá sobre RFQs, proveedores, agenda..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-blue-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
            →
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 text-center">Enter para enviar</p>
      </div>
    </div>
  )
}
