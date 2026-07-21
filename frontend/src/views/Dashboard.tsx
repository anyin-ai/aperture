'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboard, getTrends, getBrands } from '../api'
import type { DashboardStats, Brand, TrendPoint } from '../types'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import AuditStatusBadge from '../components/AuditStatusBadge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>()
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(false)

  useEffect(() => {
    getBrands().then(items => {
      setBrands(items)
      if (items.length === 0) {
        router.replace('/ask')
        return
      }
      const params = new URLSearchParams(window.location.search)
      const requestedBrand = Number(params.get('brand'))
      if (requestedBrand && items.some(brand => brand.id === requestedBrand)) {
        setSelectedBrand(requestedBrand)
      }
      setOnboarded(params.get('onboarded') === '1')
    })
  }, [router])

  useEffect(() => {
    setLoading(true)
    getDashboard(selectedBrand)
      .then(setStats)
      .finally(() => setLoading(false))
    if (selectedBrand) {
      getTrends(selectedBrand).then(setTrends)
    } else {
      setTrends([])
    }
  }, [selectedBrand])

  const hasActiveRun = stats?.recent_runs.some(run => run.status === 'pending' || run.status === 'running') ?? false
  useEffect(() => {
    if (!hasActiveRun) return
    const timer = window.setInterval(() => {
      getDashboard(selectedBrand).then(setStats).catch(() => {})
    }, 3000)
    return () => window.clearInterval(timer)
  }, [hasActiveRun, selectedBrand])

  // Pivot the long-format trend rows into wide format so same-day runs don't
  // collapse and each provider/model renders as its own line.
  const SERIES_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  const seriesKeys = Array.from(new Set(trends.map(t => `${t.provider}/${t.model}`)))
  const trendData = trends.map(t => ({
    label: new Date(t.date).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
    [`${t.provider}/${t.model}`]: t.mention_rate,
  }))

  return (
    <div className="p-8">
      {onboarded && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="mt-1 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
          <div>
            <p className="font-semibold">Your first visibility scan is underway.</p>
            <p className="mt-0.5 text-xs text-amber-700">This dashboard will refresh as the measurements arrive. You can inspect the exact answers from Audits.</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">AI visibility overview across all audits</p>
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedBrand ?? ''}
          onChange={e => setSelectedBrand(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All brands</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Audits"
              value={stats.total_audits}
              sub="all time"
              color="indigo"
            />
            <StatCard
              label="Queries Run"
              value={stats.total_queries_run}
              sub="across all audits"
              color="blue"
            />
            <StatCard
              label="Avg Mention Rate"
              value={stats.avg_mention_rate != null ? `${stats.avg_mention_rate}%` : '—'}
              sub="completed audits"
              color={
                stats.avg_mention_rate == null ? 'yellow' :
                stats.avg_mention_rate >= 60 ? 'green' :
                stats.avg_mention_rate >= 30 ? 'yellow' : 'indigo'
              }
            />
          </div>

          {trendData.length > 0 && (
            <Card className="p-6 mb-8">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Mention Rate Over Time</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => [`${v}%`, name as string]} />
                  <Legend />
                  {seriesKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Recent Audit Runs</h2>
            </div>
            {stats.recent_runs.length === 0 ? (
              <div className="px-6 py-8 text-sm text-gray-400 text-center">
                No audit runs yet. Head to <strong>Audits</strong> to run your first one.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recent_runs.map(run => (
                  <div key={run.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {run.provider} / {run.model}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(run.created_at).toLocaleString()} · {run.total_queries} queries
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {run.mention_rate != null && (
                        <span className="text-sm font-semibold text-indigo-600">
                          {run.mention_rate}%
                        </span>
                      )}
                      <AuditStatusBadge run={run} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
