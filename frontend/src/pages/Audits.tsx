import { useEffect, useState, useCallback } from 'react'
import { getBrands, getQueries, getAudits, createAudit, getAudit, deleteAudit } from '../api'
import type { Brand, Query, AuditRun } from '../types'
import Card from '../components/Card'
import AuditStatusBadge from '../components/AuditStatusBadge'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
const PERPLEXITY_MODELS = [
  'llama-3.1-sonar-small-128k-online',
  'llama-3.1-sonar-large-128k-online',
  'llama-3.1-sonar-huge-128k-online',
]

export default function Audits() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [queries, setQueries] = useState<Query[]>([])
  const [audits, setAudits] = useState<AuditRun[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    brand_id: 0,
    query_ids: [] as number[],
    provider: 'openai',
    model: 'gpt-4o-mini',
  })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    getAudits().then(setAudits).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getBrands().then(b => {
      setBrands(b)
      if (b.length > 0) setForm(f => ({ ...f, brand_id: b[0].id }))
    })
    reload()
  }, [reload])

  useEffect(() => {
    if (form.brand_id) getQueries(form.brand_id).then(setQueries)
  }, [form.brand_id])

  // Poll running audits
  useEffect(() => {
    const runningIds = audits.filter(a => a.status === 'running' || a.status === 'pending').map(a => a.id)
    if (runningIds.length === 0) return
    const interval = setInterval(async () => {
      const updated = await Promise.all(runningIds.map(id => getAudit(id).catch(() => null)))
      setAudits(prev =>
        prev.map(a => {
          const u = updated.find(u => u?.id === a.id)
          return u ?? a
        })
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [audits])

  const handleCreate = async () => {
    if (!form.brand_id || form.query_ids.length === 0) return
    setRunning(true)
    try {
      await createAudit(form)
      setShowForm(false)
      reload()
    } finally {
      setRunning(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this audit run?')) return
    await deleteAudit(id)
    reload()
  }

  const toggleQuery = (qid: number) => {
    setForm(f => ({
      ...f,
      query_ids: f.query_ids.includes(qid)
        ? f.query_ids.filter(id => id !== qid)
        : [...f.query_ids, qid],
    }))
  }

  const models = form.provider === 'openai' ? OPENAI_MODELS : PERPLEXITY_MODELS

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
          <p className="text-sm text-gray-500 mt-1">Run visibility audits across LLM providers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reload}
            className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> New Audit
          </button>
        </div>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Audit Run</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.brand_id}
                onChange={e => setForm(f => ({ ...f, brand_id: Number(e.target.value), query_ids: [] }))}
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value, model: e.target.value === 'openai' ? OPENAI_MODELS[0] : PERPLEXITY_MODELS[0] }))}
              >
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="perplexity">Perplexity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              >
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Queries * ({form.query_ids.length} selected)
            </label>
            {queries.length === 0 ? (
              <p className="text-xs text-gray-400">No queries for this brand yet. Go to Queries to add some.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {queries.map(q => (
                  <label key={q.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.query_ids.includes(q.id)}
                      onChange={() => toggleQuery(q.id)}
                    />
                    <div>
                      <p className="text-sm text-gray-800">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{q.language.toUpperCase()}{q.category ? ` · ${q.category}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={running || form.query_ids.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {running ? 'Starting…' : 'Run Audit'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-600 px-4 py-2 rounded-lg border border-gray-300 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : audits.length === 0 ? (
        <Card className="p-8 text-center text-gray-400 text-sm">
          No audit runs yet. Click <strong>New Audit</strong> to start.
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map(run => (
            <Card key={run.id}>
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {run.provider} / {run.model}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(run.created_at).toLocaleString()} · {run.total_queries} queries
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {run.status === 'running' && (
                    <span className="text-xs text-blue-600">
                      {run.completed_queries}/{run.total_queries}
                    </span>
                  )}
                  {run.mention_rate != null && (
                    <span className="text-sm font-semibold text-indigo-600">{run.mention_rate}%</span>
                  )}
                  <AuditStatusBadge run={run} />
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(run.id) }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expanded === run.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded === run.id && run.results.length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {run.results.map(result => (
                    <div key={result.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium">
                            {result.query_text ?? `Query #${result.query_id}`}
                          </p>
                          {result.response_text && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                              {result.response_text}
                            </p>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-500 mt-1">Error: {result.error}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {result.latency_ms && (
                              <span className="text-xs text-gray-400">{result.latency_ms}ms</span>
                            )}
                            {result.competitor_mentions && (() => {
                              try {
                                const m = JSON.parse(result.competitor_mentions)
                                return Object.entries(m).map(([name, count]) => (
                                  <span key={name} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                                    {name}: {String(count)}
                                  </span>
                                ))
                              } catch { return null }
                            })()}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {result.brand_mentioned ? (
                            <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                              ✓ Mentioned ({result.mention_count}×)
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full">
                              ✗ Not mentioned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
