import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getBrands, getQueries, getAudits, createAudit, getAudit, deleteAudit, getProviders } from '../api'
import type { Brand, Query, AuditRun, AuditResult, ProviderInfo } from '../types'
import Card from '../components/Card'
import AuditStatusBadge from '../components/AuditStatusBadge'
import { useToast, parseApiError } from '../hooks/useToast'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react'

function parseSources(raw?: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && !!s) : []
  } catch {
    return []
  }
}

function parseCompetitors(raw?: string): [string, unknown][] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? Object.entries(parsed) : []
  } catch {
    return []
  }
}

export default function Audits() {
  const { pushToast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [queries, setQueries] = useState<Query[]>([])
  const [audits, setAudits] = useState<AuditRun[]>([])
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    brand_id: 0,
    query_ids: [] as number[],
    provider: '',
    model: '',
  })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    getAudits().then(setAudits).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getBrands().then(b => {
      setBrands(b)
      if (b.length > 0) setForm(f => ({ ...f, brand_id: b[0].id }))
    }).catch(() => {})
    getProviders().then(p => {
      setProviders(p)
      if (p.length > 0) {
        setForm(f => ({ ...f, provider: f.provider || p[0].id, model: f.model || p[0].default_model }))
      }
    }).catch(() => {})
    reload()
  }, [reload])

  useEffect(() => {
    if (form.brand_id) getQueries(form.brand_id).then(setQueries).catch(() => {})
  }, [form.brand_id])

  // ── Polling (T5): subscribe once, keyed on whether any run is active. ──
  const auditsRef = useRef<AuditRun[]>(audits)
  useEffect(() => { auditsRef.current = audits }, [audits])
  const hasActive = audits.some(a => a.status === 'running' || a.status === 'pending')

  useEffect(() => {
    if (!hasActive) return
    const interval = setInterval(async () => {
      const activeIds = auditsRef.current
        .filter(a => a.status === 'running' || a.status === 'pending')
        .map(a => a.id)
      if (activeIds.length === 0) return
      const updated = await Promise.all(activeIds.map(id => getAudit(id).catch(() => null)))
      setAudits(prev => prev.map(a => updated.find(u => u?.id === a.id) ?? a))
    }, 3000)
    return () => clearInterval(interval)
  }, [hasActive])

  const activeProvider = providers.find(p => p.id === form.provider)
  const models = activeProvider?.models ?? []

  const handleCreate = async () => {
    setFormError(null)
    if (!form.brand_id || form.query_ids.length === 0) return
    setRunning(true)
    try {
      await createAudit(form)
      pushToast('Audit started', 'success')
      setShowForm(false)
      setForm(f => ({ ...f, query_ids: [] }))
      reload()
    } catch (err) {
      setFormError(parseApiError(err))
    } finally {
      setRunning(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this audit run?')) return
    try {
      await deleteAudit(id)
      reload()
    } catch {
      /* interceptor already toasted */
    }
  }

  const toggleQuery = (qid: number) => {
    setForm(f => ({
      ...f,
      query_ids: f.query_ids.includes(qid)
        ? f.query_ids.filter(id => id !== qid)
        : [...f.query_ids, qid],
    }))
  }

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

          {brands.length === 0 ? (
            <p className="text-sm text-gray-500">
              No brands yet —{' '}
              <Link to="/brands" className="text-indigo-600 hover:underline font-medium">add a brand first</Link>.
            </p>
          ) : (
            <>
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
                    onChange={e => {
                      const p = providers.find(x => x.id === e.target.value)
                      setForm(f => ({ ...f, provider: e.target.value, model: p?.default_model ?? '' }))
                    }}
                  >
                    {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
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
                  <p className="text-xs text-gray-400">
                    No queries for this brand yet —{' '}
                    <Link to="/queries" className="text-indigo-600 hover:underline">add some</Link>.
                  </p>
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

              {formError && (
                <p className="text-sm text-red-600 mb-3">{formError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={running || providers.length === 0 || form.query_ids.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {running ? 'Starting…' : providers.length === 0 ? 'Loading providers…' : 'Run Audit'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setFormError(null) }}
                  className="text-sm text-gray-600 px-4 py-2 rounded-lg border border-gray-300 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
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

              {expanded === run.id && (
                <div className="border-t border-gray-100">
                  {run.status === 'failed' && (
                    <div className="mx-6 my-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>Audit failed{run.error ? `: ${run.error}` : '. Check your API key and model.'}</span>
                    </div>
                  )}

                  {run.results.length > 0 && (
                    <div className="px-6 py-2 text-xs text-gray-500">
                      {run.results.filter(r => r.brand_mentioned && !r.error).length} mentioned ·{' '}
                      {run.results.filter(r => !r.brand_mentioned && !r.error).length} not mentioned ·{' '}
                      {run.results.filter(r => !!r.error).length} errored
                    </div>
                  )}

                  <div className="divide-y divide-gray-100">
                    {run.results.map(result => (
                      <ResultRow key={result.id} result={result} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultRow({ result }: { result: AuditResult }) {
  const sources = parseSources(result.sources)
  const competitors = parseCompetitors(result.competitor_mentions)

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 font-medium">
            {result.query_text ?? `Query #${result.query_id}`}
          </p>
          {result.response_text && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-3">{result.response_text}</p>
          )}
          {result.error && (
            <p className="text-xs text-red-600 mt-1">Error: {result.error}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {result.latency_ms != null && (
              <span className="text-xs text-gray-400">{result.latency_ms}ms</span>
            )}
            {competitors.map(([name, count]) => (
              <span key={name} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                {name}: {String(count)}
              </span>
            ))}
          </div>
          {sources.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Sources</p>
              <ul className="space-y-0.5">
                {sources.map((url, i) => (
                  <li key={`${url}-${i}`} className="flex items-center gap-1 min-w-0">
                    <ExternalLink size={11} className="text-gray-400 flex-shrink-0" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline truncate"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {result.error ? (
            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">— errored</span>
          ) : result.brand_mentioned ? (
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
  )
}
