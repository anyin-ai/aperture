export interface Brand {
  id: number
  name: string
  domain?: string
  description?: string
  is_own_brand: boolean
  aliases: string[]
  created_at: string
  competitors: Competitor[]
}

export interface Competitor {
  id: number
  brand_id: number
  name: string
  domain?: string
  aliases: string[]
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
  success_count: number
  error_count: number
  mention_rate?: number
  error?: string
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

export interface ProviderInfo {
  id: string
  label: string
  models: string[]
  default_model: string
}

export type AnswerPart =
  | { type: 'kpi'; data: VisibilityOverview }
  | { type: 'sov'; data: ShareOfVoice }
  | { type: 'trend'; data: MentionTrend }
  | { type: 'query_result'; data: QueryResultPart }
  | { type: 'raw_response'; data: RawResponsePart }

export interface VisibilityOverview {
  mention_rate?: number
  previous_mention_rate?: number
  delta?: number
  provider: string
  model: string
  audit_run_id: number
  completed_queries: number
  measured_at: string
}

export interface ShareOfVoice {
  provider: string
  audit_run_id: number
  responses_measured: number
  ranked: { name: string; count: number; pct: number; you: boolean }[]
}

export interface MentionTrend {
  weeks: number
  points: TrendPoint[]
}

export interface QueryResultPart {
  search: string
  items: {
    result_id: number
    query_id: number
    query: string
    provider: string
    model: string
    brand_mentioned: boolean
    mention_count: number
    has_response: boolean
    error?: string
    measured_at: string
  }[]
}

export interface RawResponsePart {
  result_id: number
  query: string
  provider: string
  model: string
  response_text: string
}

export interface AskResponse {
  answer_text: string
  grounded: boolean
  refusal?: string
  parts: AnswerPart[]
  suggested_followups: string[]
  tool_trace: string[]
}

export interface Evidence {
  result_id: number
  brand_id: number
  query: string
  provider: string
  model: string
  response_text: string
  brand_name: string
  competitor_names: string[]
}
