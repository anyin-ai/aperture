import { useEffect, useState } from 'react'
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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>()
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrands().then(setBrands)
  }, [])

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

  const trendData = trends.map(t => ({
    date: new Date(t.date).toLocaleDateString(),
    'Mention Rate (%)': t.mention_rate,
    provider: t.provider,
  }))

  return (
    <div className="p-8">
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
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Mention Rate']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Mention Rate (%)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
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
