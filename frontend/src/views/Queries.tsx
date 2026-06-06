'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrands, getQueries, createQuery, updateQuery, deleteQuery } from '../api'
import type { Brand, Query } from '../types'
import Card from '../components/Card'
import { useToast, parseApiError } from '../hooks/useToast'
import { Plus, Trash2, Pencil } from 'lucide-react'

const LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh']
const CATEGORIES = ['product discovery', 'brand comparison', 'how-to', 'recommendation', 'other']

interface EditState {
  text: string
  language: string
  category: string
}

export default function Queries() {
  const { pushToast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ brand_id: 0, text: '', language: 'en', category: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditState>({ text: '', language: 'en', category: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = () => {
    setLoading(true)
    getQueries(selectedBrand).then(setQueries).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    getBrands().then(b => {
      setBrands(b)
      if (b.length > 0 && !form.brand_id) setForm(f => ({ ...f, brand_id: b[0].id }))
    }).catch(() => {})
  }, [])

  useEffect(() => { reload() }, [selectedBrand])

  const handleCreate = async () => {
    setFormError(null)
    if (!form.text.trim() || !form.brand_id) return
    setSaving(true)
    try {
      await createQuery(form)
      pushToast('Query added', 'success')
      setForm(f => ({ ...f, text: '', category: '' }))
      setShowForm(false)
      reload()
    } catch (err) {
      setFormError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (q: Query) => {
    setEditingId(q.id)
    setEditForm({ text: q.text, language: q.language, category: q.category ?? '' })
    setFormError(null)
  }

  const handleUpdate = async () => {
    if (editingId == null || !editForm.text.trim()) return
    setSaving(true)
    try {
      await updateQuery(editingId, editForm)
      pushToast('Query updated', 'success')
      setEditingId(null)
      reload()
    } catch (err) {
      setFormError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this query?')) return
    try {
      await deleteQuery(id)
      reload()
    } catch { /* interceptor toasted */ }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the queries you send to AI engines</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Query
        </button>
      </div>

      <div className="mb-5">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedBrand ?? ''}
          onChange={e => setSelectedBrand(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {brands.length === 0 && !loading && (
        <Card className="p-8 text-center text-gray-400 text-sm mb-6">
          You need a brand first —{' '}
          <Link href="/brands" className="text-indigo-600 hover:underline font-medium">add a brand</Link>.
        </Card>
      )}

      {showForm && brands.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Query</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.brand_id}
                onChange={e => setForm(f => ({ ...f, brand_id: Number(e.target.value) }))}
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Query Text *</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                placeholder="e.g. What are the best project management tools?"
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">— none —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Query'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="text-sm text-gray-600 px-4 py-2 rounded-lg border border-gray-300 transition-colors hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : queries.length === 0 ? (
        <Card className="p-8 text-center text-gray-400 text-sm">
          No queries yet. Add your first query above.
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {queries.map(q => {
              const brand = brands.find(b => b.id === q.brand_id)
              if (editingId === q.id) {
                return (
                  <div key={q.id} className="px-6 py-4 space-y-3">
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[64px]"
                      value={editForm.text}
                      onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))}
                    />
                    <div className="flex gap-3 flex-wrap items-center">
                      <select
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editForm.language}
                        onChange={e => setEditForm(f => ({ ...f, language: e.target.value }))}
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                      </select>
                      <select
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editForm.category}
                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      >
                        <option value="">— none —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setFormError(null) }}
                        className="text-xs text-gray-600 px-3 py-1.5 rounded-lg border border-gray-300 hover:text-gray-900 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                  </div>
                )
              }
              return (
                <div key={q.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{q.text}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {brand && (
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {brand.name}
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {q.language.toUpperCase()}
                      </span>
                      {q.category && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {q.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => startEdit(q)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
