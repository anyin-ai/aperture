import { useEffect, useState } from 'react'
import { getSettings, upsertSetting } from '../api'
import Card from '../components/Card'
import { Save, Eye, EyeOff } from 'lucide-react'

const SETTING_DEFS = [
  {
    section: 'OpenAI (ChatGPT)',
    keys: [
      { key: 'openai_api_key', label: 'API Key', secret: true, placeholder: 'sk-...' },
      { key: 'openai_base_url', label: 'Base URL (optional)', secret: false, placeholder: 'https://api.openai.com/v1' },
    ],
  },
  {
    section: 'Perplexity',
    keys: [
      { key: 'perplexity_api_key', label: 'API Key', secret: true, placeholder: 'pplx-...' },
    ],
  },
  {
    section: 'Anthropic (Claude) — Coming Soon',
    keys: [
      { key: 'anthropic_api_key', label: 'API Key', secret: true, placeholder: 'sk-ant-...' },
    ],
  },
  {
    section: 'Google Gemini — Coming Soon',
    keys: [
      { key: 'gemini_api_key', label: 'API Key', secret: true, placeholder: 'AIza...' },
    ],
  },
]

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getSettings().then(rows => {
      const map: Record<string, string> = {}
      rows.forEach(r => { if (r.value) map[r.key] = r.value })
      setSettings(map)
    })
  }, [])

  const handleSave = async (key: string) => {
    const value = drafts[key] ?? ''
    if (!value.trim()) return
    setSaving(s => ({ ...s, [key]: true }))
    await upsertSetting(key, value)
    setSettings(s => ({ ...s, [key]: value }))
    setDrafts(d => { const n = { ...d }; delete n[key]; return n })
    setSaving(s => ({ ...s, [key]: false }))
    setSaved(s => ({ ...s, [key]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bring your own API keys (BYOK). Keys are stored locally in your database and never sent to any third party.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {SETTING_DEFS.map(({ section, keys }) => {
          const isPlanned = section.includes('Coming Soon')
          return (
            <Card key={section} className={isPlanned ? 'opacity-60' : ''}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">{section}</h2>
                {isPlanned && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Planned</span>
                )}
              </div>
              <div className="px-6 py-4 space-y-4">
                {keys.map(({ key, label, secret, placeholder }) => {
                  const currentValue = settings[key] ?? ''
                  const draft = drafts[key] ?? ''
                  const show = visible[key] ?? false

                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={secret && !show ? 'password' : 'text'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                            placeholder={currentValue ? (secret ? '••••••••' : currentValue) : placeholder}
                            value={draft}
                            onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                            disabled={isPlanned}
                          />
                          {secret && (
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))}
                            >
                              {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleSave(key)}
                          disabled={!draft.trim() || saving[key] || isPlanned}
                          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          <Save size={13} />
                          {saving[key] ? 'Saving…' : saved[key] ? 'Saved ✓' : 'Save'}
                        </button>
                      </div>
                      {currentValue && !draft && (
                        <p className="text-xs text-green-600 mt-1">✓ Configured</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}

        <Card className="p-5 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🔒 Privacy Note</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            API keys are stored in your local SQLite database and are never transmitted to any external service other than 
            the respective AI provider you are querying. Aperture is fully self-hosted — your data stays on your server.
          </p>
        </Card>
      </div>
    </div>
  )
}
