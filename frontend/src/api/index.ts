import axios from 'axios'
import type { AuditRun, Brand, DashboardStats, Query, Setting, TrendPoint } from '../types'

const api = axios.create({ baseURL: '/api' })

// Brands
export const getBrands = () => api.get<Brand[]>('/brands/').then(r => r.data)
export const createBrand = (data: Partial<Brand> & { competitors?: { name: string; domain?: string }[] }) =>
  api.post<Brand>('/brands/', data).then(r => r.data)
export const updateBrand = (id: number, data: Partial<Brand>) =>
  api.put<Brand>(`/brands/${id}`, data).then(r => r.data)
export const deleteBrand = (id: number) => api.delete(`/brands/${id}`)
export const addCompetitor = (brandId: number, data: { name: string; domain?: string }) =>
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

// Results
export const getDashboard = (brandId?: number) =>
  api.get<DashboardStats>('/results/dashboard', { params: brandId ? { brand_id: brandId } : {} }).then(r => r.data)
export const getTrends = (brandId: number) =>
  api.get<TrendPoint[]>('/results/trends', { params: { brand_id: brandId } }).then(r => r.data)

// Settings
export const getSettings = () => api.get<Setting[]>('/settings/').then(r => r.data)
export const upsertSetting = (key: string, value: string) =>
  api.put<Setting>('/settings/', { key, value }).then(r => r.data)
