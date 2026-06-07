import axios from 'axios'
import type { AuditRun, Brand, DashboardStats, ProviderInfo, Query, Setting, TrendPoint } from '../types'
import { emitToast, parseApiError } from '../hooks/useToast'

const api = axios.create({ baseURL: '/api' })

// Surface every failed request as a toast, then re-reject so per-call catch
// blocks still run (forms can keep their state, etc.).
api.interceptors.response.use(
  r => r,
  err => {
    emitToast(parseApiError(err), 'error')
    return Promise.reject(err)
  },
)

interface BrandPayload {
  name: string
  domain?: string
  description?: string
  is_own_brand?: boolean
  aliases?: string[]
  competitors?: { name: string; domain?: string; aliases?: string[] }[]
}

// Brands
export const getBrands = () => api.get<Brand[]>('/brands/').then(r => r.data)
export const createBrand = (data: BrandPayload) =>
  api.post<Brand>('/brands/', data).then(r => r.data)
export const updateBrand = (id: number, data: BrandPayload) =>
  api.put<Brand>(`/brands/${id}`, data).then(r => r.data)
export const deleteBrand = (id: number) => api.delete(`/brands/${id}`)
export const addCompetitor = (brandId: number, data: { name: string; domain?: string; aliases?: string[] }) =>
  api.post(`/brands/${brandId}/competitors`, data).then(r => r.data)
export const deleteCompetitor = (brandId: number, competitorId: number) =>
  api.delete(`/brands/${brandId}/competitors/${competitorId}`)

// Queries
export const getQueries = (brandId?: number) =>
  api.get<Query[]>('/queries/', { params: brandId ? { brand_id: brandId } : {} }).then(r => r.data)
export const createQuery = (data: { brand_id: number; text: string; language?: string; category?: string }) =>
  api.post<Query>('/queries/', data).then(r => r.data)
export const updateQuery = (id: number, data: Partial<Query>) =>
  api.put<Query>(`/queries/${id}`, data).then(r => r.data)
export const deleteQuery = (id: number) => api.delete(`/queries/${id}`)

// Audits
export const getAudits = (brandId?: number) =>
  api.get<AuditRun[]>('/audits/', { params: brandId ? { brand_id: brandId } : {} }).then(r => r.data)
export const createAudit = (data: { brand_id: number; query_ids: number[]; provider: string; model: string }) =>
  api.post<AuditRun>('/audits/', data).then(r => r.data)
export const getAudit = (id: number) => api.get<AuditRun>(`/audits/${id}`).then(r => r.data)
export const deleteAudit = (id: number) => api.delete(`/audits/${id}`)

// Providers (single source of truth for the model dropdowns)
export const getProviders = () => api.get<ProviderInfo[]>('/providers/').then(r => r.data)

// Results
export const getDashboard = (brandId?: number) =>
  api.get<DashboardStats>('/results/dashboard', { params: brandId ? { brand_id: brandId } : {} }).then(r => r.data)
export const getTrends = (brandId: number) =>
  api.get<TrendPoint[]>('/results/trends', { params: { brand_id: brandId } }).then(r => r.data)

// Settings
export const getSettings = () => api.get<Setting[]>('/settings/').then(r => r.data)
export const upsertSetting = (key: string, value: string) =>
  api.put<Setting>('/settings/', { key, value }).then(r => r.data)
