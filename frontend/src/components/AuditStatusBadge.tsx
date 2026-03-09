import type { AuditRun } from '../types'

interface Props {
  run: AuditRun
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function AuditStatusBadge({ run }: Props) {
  const cls = statusColors[run.status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {run.status === 'running' ? (
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      ) : null}
      {run.status}
    </span>
  )
}
