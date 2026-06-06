'use client'

import { useEffect, useState } from 'react'
import { getBrands, createBrand, updateBrand, deleteBrand, addCompetitor, deleteCompetitor } from '../api'
import type { Brand } from '../types'
import Card from '../components/Card'
import { useToast, parseApiError } from '../hooks/useToast'
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'

const splitAliases = (s: string) => s.split(',').map(a => a.trim()).filter(Boolean)
const joinAliases = (a: string[]) => a.join(', ')

interface BrandForm {
  name: string
  domain: string
  description: string
  is_own_brand: boolean
  aliases: string
}

const EMPTY_FORM: BrandForm = { name: '', domain: '', description: '', is_own_brand: true, aliases: '' }

export default function Brands() {
  const { pushToast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<BrandForm>(EMPTY_FORM)
  const [compForm, setCompForm] = useState<{ [brandId: number]: { name: string; domain: string; aliases: string } }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = () => getBrands().then(setBrands).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { reload() }, [])

  const handleCreate = async () => {
    setFormError(null)
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await createBrand({
        name: form.name,
        domain: form.domain,
        description: form.description,
        is_own_brand: form.is_own_brand,
        aliases: splitAliases(form.aliases),
        competitors: [],
      })
      pushToast('Brand created', 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      reload()
    } catch (err) {
      setFormError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id)
    setEditForm({
      name: brand.name,
      domain: brand.domain ?? '',
      description: brand.description ?? '',
      is_own_brand: brand.is_own_brand,
      aliases: joinAliases(brand.aliases ?? []),
    })
    setFormError(null)
  }

  const handleUpdate = async () => {
    if (editingId == null || !editForm.name.trim()) return
    setSaving(true)
    try {
      await updateBrand(editingId, {
        name: editForm.name,
        domain: editForm.domain,
        description: editForm.description,
        is_own_brand: editForm.is_own_brand,
        aliases: splitAliases(editForm.aliases),
      })
      pushToast('Brand updated', 'success')
      setEditingId(null)
      reload()
    } catch (err) {
      setFormError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this brand and all its data?')) return
    try {
      await deleteBrand(id)
      reload()
    } catch { /* interceptor toasted */ }
  }

  const handleAddCompetitor = async (brandId: number) => {
    const f = compForm[brandId]
    if (!f?.name?.trim()) return
    try {
      await addCompetitor(brandId, { name: f.name, domain: f.domain, aliases: splitAliases(f.aliases ?? '') })
      setCompForm(prev => ({ ...prev, [brandId]: { name: '', domain: '', aliases: '' } }))
      reload()
    } catch { /* interceptor toasted */ }
  }

  const handleDeleteCompetitor = async (brandId: number, compId: number) => {
    try {
      await deleteCompetitor(brandId, compId)
      reload()
    } catch { /* interceptor toasted */ }
  }

  const renderFields = (state: BrandForm, set: (updater: (f: BrandForm) => BrandForm) => void, idPrefix: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Acme Corp"
          value={state.name}
          onChange={e => set(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="acme.com"
          value={state.domain}
          onChange={e => set(f => ({ ...f, domain: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Brief description of the brand"
          value={state.description}
          onChange={e => set(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Aliases (comma-separated)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Acme, ACME Inc, Acme Co"
          value={state.aliases}
          onChange={e => set(f => ({ ...f, aliases: e.target.value }))}
        />
        <p className="text-xs text-gray-400 mt-1">Name variants the AI might use — counted as mentions of this brand.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${idPrefix}-own-brand`}
          checked={state.is_own_brand}
          onChange={e => set(f => ({ ...f, is_own_brand: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor={`${idPrefix}-own-brand`} className="text-sm text-gray-700">This is my brand</label>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your brand and competitor profiles</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Brand
        </button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Brand</h2>
          {renderFields(form, setForm, 'create')}
          {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Brand'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : brands.length === 0 ? (
        <Card className="p-8 text-center text-gray-400 text-sm">
          No brands yet. Add your first brand to get started.
        </Card>
      ) : (
        <div className="space-y-3">
          {brands.map(brand => (
            <Card key={brand.id}>
              {editingId === brand.id ? (
                <div className="p-6">
                  <h2 className="text-base font-semibold text-gray-800 mb-4">Edit Brand</h2>
                  {renderFields(editForm, setEditForm, `edit-${brand.id}`)}
                  {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setFormError(null) }}
                      className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(expanded === brand.id ? null : brand.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{brand.name}</p>
                        {brand.domain && <p className="text-xs text-gray-400">{brand.domain}</p>}
                      </div>
                      {brand.is_own_brand && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          My Brand
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{brand.competitors.length} competitors</span>
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(brand) }}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(brand.id) }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      {expanded === brand.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {expanded === brand.id && (
                    <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                      {brand.description && <p className="text-sm text-gray-600 mb-4">{brand.description}</p>}
                      {brand.aliases && brand.aliases.length > 0 && (
                        <p className="text-xs text-gray-500 mb-4">
                          Aliases: {brand.aliases.join(', ')}
                        </p>
                      )}
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Competitors</h3>
                      {brand.competitors.length === 0 ? (
                        <p className="text-xs text-gray-400 mb-3">No competitors tracked yet.</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {brand.competitors.map(comp => (
                            <div key={comp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <span className="text-sm text-gray-800">{comp.name}</span>
                                {comp.domain && <span className="text-xs text-gray-400 ml-2">{comp.domain}</span>}
                                {comp.aliases && comp.aliases.length > 0 && (
                                  <span className="text-xs text-gray-400 ml-2">({comp.aliases.join(', ')})</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteCompetitor(brand.id, comp.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <input
                          className="flex-1 min-w-[8rem] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Competitor name"
                          value={compForm[brand.id]?.name ?? ''}
                          onChange={e => setCompForm(prev => ({ ...prev, [brand.id]: { ...prev[brand.id], name: e.target.value } }))}
                        />
                        <input
                          className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="domain.com"
                          value={compForm[brand.id]?.domain ?? ''}
                          onChange={e => setCompForm(prev => ({ ...prev, [brand.id]: { ...prev[brand.id], domain: e.target.value } }))}
                        />
                        <input
                          className="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="aliases, comma-sep"
                          value={compForm[brand.id]?.aliases ?? ''}
                          onChange={e => setCompForm(prev => ({ ...prev, [brand.id]: { ...prev[brand.id], aliases: e.target.value } }))}
                        />
                        <button
                          onClick={() => handleAddCompetitor(brand.id)}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
