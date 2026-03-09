export interface Brand {
  id: number
  name: string
  domain?: string
  description?: string
  is_own_brand: boolean
  created_at: string
  competitors: Competitor[]
}

export interface Competitor {
  id: number
  brand_id: number
  name: string
  domain?: string
  created_at: string
}

export interface Query {
  id: number
  brand_id: number
  text: string
  language: string
  category?: string
  created_at: string
}

export interface AuditResult {
  id: number
  audit_run_id: number
  query_id: number
  query_text?: string
  provider: string
  model: string
  response_text?: string
  brand_mentioned: boolean
  mention_count: number
  competitor_mentions?: string
  sources?: string
  error?: string
  latency_ms?: number
  created_at: string
}

export interface AuditRun {
  id: number
  brand_id: number
  provider: string
  model: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_queries: number
  completed_queries: number
  mention_rate?: number
  created_at: string
  completed_at?: string
  results: AuditResult[]
}

export interface DashboardStats {
  total_audits: number
  total_queries_run: number
  avg_mention_rate?: number
  recent_runs: AuditRun[]
}

export interface Setting {
  key: string
  value?: string
  updated_at: string
}

export interface TrendPoint {
  date: string
  mention_rate?: number
  provider: string
  model: string
  audit_run_id: number
}
