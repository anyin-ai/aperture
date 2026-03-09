import { useEffect, useState } from 'react'
import { getBrands, createBrand, deleteBrand, addCompetitor, deleteCompetitor } from '../api'
import type { Brand } from '../types'
import Card from '../components/Card'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', description: '', is_own_brand: true })
  const [compForm, setCompForm] = useState<{ [brandId: number]: { name: string; domain: string } }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = () => getBrands().then(setBrands).finally(() => setLoading(false))

  useEffect(() => { reload() }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await createBrand({ ...form, competitors: [] })
    setForm({ name: '', domain: '', description: '', is_own_brand: true })
    setShowForm(false)
    setSaving(false)
    reload()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this brand and all its data?')) return
    await deleteBrand(id)
    reload()
  }

  const handleAddCompetitor = async (brandId: number) => {
    const f = compForm[brandId]
    if (!f?.name?.trim()) return
    await addCompetitor(brandId, { name: f.name, domain: f.domain })
    setCompForm(prev => ({ ...prev, [brandId]: { name: '', domain: '' } }))
    reload()
  }

  const handleDeleteCompetitor = async (brandId: number, compId: number) => {
    await deleteCompetitor(brandId, compId)
    reload()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your brand and competitor profiles</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Brand
        </button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Brand</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Acme Corp"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="acme.com"
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description of the brand"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="own-brand"
                checked={form.is_own_brand}
                onChange={e => setForm(f => ({ ...f, is_own_brand: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="own-brand" className="text-sm text-gray-700">This is my brand</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Brand'}
            </button>
            <button
              onClick={() => setShowForm(false)}
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
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === brand.id ? null : brand.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{brand.name}</p>
                    {brand.domain && (
                      <p className="text-xs text-gray-400">{brand.domain}</p>
                    )}
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
                  {brand.description && (
                    <p className="text-sm text-gray-600 mb-4">{brand.description}</p>
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
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Competitor name"
                      value={compForm[brand.id]?.name ?? ''}
                      onChange={e => setCompForm(prev => ({ ...prev, [brand.id]: { ...prev[brand.id], name: e.target.value } }))}
                    />
                    <input
                      className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="domain.com"
                      value={compForm[brand.id]?.domain ?? ''}
                      onChange={e => setCompForm(prev => ({ ...prev, [brand.id]: { ...prev[brand.id], domain: e.target.value } }))}
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
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
