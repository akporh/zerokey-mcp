import { useEffect, useState } from 'react'

const C = {
  bg:      '#0a0f1e',
  card:    '#0f172a',
  border:  '#1e2d45',
  cyan:    '#38bdf8',
  muted:   '#64748b',
  text:    '#f8fafc',
  green:   '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  input:   '#1e293b',
}

function Badge({ set }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      backgroundColor: set ? '#0a1a12' : '#1a0c0c',
      color: set ? C.green : C.red,
    }}>
      {set ? '● set' : '○ not set'}
    </span>
  )
}

function ToolRow({ tool, onSave }) {
  const [price, setPrice]   = useState(String(tool.price_hbar))
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    const body = {}
    const parsedPrice = parseFloat(price)
    if (!isNaN(parsedPrice) && parsedPrice !== tool.price_hbar) body.price_hbar = parsedPrice
    if (apiKey.trim()) body.api_key_value = apiKey.trim()
    if (!Object.keys(body).length) { setSaving(false); setMsg({ ok: true, text: 'Nothing changed' }); return }

    try {
      const res = await fetch(`/admin/registry/${tool.name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Error')
      setApiKey('')
      setMsg({ ok: true, text: 'Saved' })
      onSave()
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: '10px 12px', color: C.cyan, fontFamily: 'monospace', fontSize: 12 }}>
        {tool.name}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input
          type="number" step="0.01" min="0"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{ width: 70, backgroundColor: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 6px', fontFamily: 'monospace', fontSize: 12 }}
        />
      </td>
      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', color: C.muted }}>
        {tool.required_env_key || '—'}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <Badge set={tool.api_key_set} />
      </td>
      <td style={{ padding: '10px 12px' }}>
        {tool.required_env_key ? (
          <input
            type="password" placeholder="new key value"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ width: 140, backgroundColor: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 6px', fontFamily: 'monospace', fontSize: 12 }}
          />
        ) : (
          <span style={{ color: C.muted, fontSize: 11 }}>—</span>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <button
          onClick={handleSave} disabled={saving}
          style={{ backgroundColor: C.cyan, color: '#000', border: 'none', borderRadius: 4, padding: '4px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '…' : 'Save'}
        </button>
        {msg && (
          <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace', color: msg.ok ? C.green : C.red }}>
            {msg.text}
          </span>
        )}
      </td>
    </tr>
  )
}

export default function RegistryPanel() {
  const [tools, setTools]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  async function fetchTools() {
    try {
      const res = await fetch('/admin/registry')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTools(data.tools)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTools() }, [])

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'monospace', color: C.text, maxWidth: 900 }}>
      <h2 style={{ color: C.cyan, margin: '0 0 4px', fontSize: 16, fontWeight: 800, letterSpacing: '0.04em' }}>
        Registry Admin
      </h2>
      <p style={{ color: C.muted, margin: '0 0 20px', fontSize: 12 }}>
        Live tool registry — price and API key changes take effect immediately.
      </p>

      {loading && <p style={{ color: C.muted, fontSize: 12 }}>Loading…</p>}
      {error   && <p style={{ color: C.red,   fontSize: 12 }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1526', borderBottom: `1px solid ${C.border}` }}>
                {['Tool', 'Price (HBAR)', 'Env Key', 'Key Status', 'New Key Value', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '0.06em' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tools.map(tool => (
                <ToolRow key={tool.path} tool={tool} onSave={fetchTools} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
