'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { useRouter } from 'next/navigation'
import {
  Aperture,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  ChevronRight,
  CircleDot,
  Eye,
  Loader2,
  LockKeyhole,
  MessageCircleQuestion,
  Radar,
  Sparkles,
  X,
} from 'lucide-react'
import {
  askAperture,
  createAudit,
  createBrand,
  createQuery,
  getBrands,
  getEvidence,
  getProviders,
  upsertSetting,
} from '../api'
import type { AnswerPart, AskResponse, Brand, Evidence, ProviderInfo } from '../types'
import { parseApiError } from '../hooks/useToast'

const ASK_MODEL = 'gpt-5.6-terra'

type OnboardingStep = 'brand' | 'domain' | 'context' | 'competitors' | 'queries' | 'key' | 'launching' | 'done'
type QuestionStep = Exclude<OnboardingStep, 'launching' | 'done'>

const ONBOARDING_STEPS: QuestionStep[] = ['brand', 'domain', 'context', 'competitors', 'queries', 'key']

const prompts: Record<QuestionStep, { eyebrow: string; question: string; note: string }> = {
  brand: {
    eyebrow: 'Signal 01 · identity',
    question: 'What brand should Aperture watch?',
    note: 'Use the name a buyer would expect an AI answer to mention.',
  },
  domain: {
    eyebrow: 'Signal 02 · source',
    question: 'Where does that brand live online?',
    note: 'A domain helps separate your brand from similarly named companies.',
  },
  context: {
    eyebrow: 'Signal 03 · market',
    question: 'In one sentence, what do you help people do?',
    note: 'This becomes context for the buyer questions you monitor.',
  },
  competitors: {
    eyebrow: 'Signal 04 · field',
    question: 'Who else tends to appear on the shortlist?',
    note: 'Separate competitors with commas. Two or three is plenty to begin.',
  },
  queries: {
    eyebrow: 'Signal 05 · intent',
    question: 'What would your buyers ask an AI before choosing?',
    note: 'One question per line. These are sent as written to the monitoring model.',
  },
  key: {
    eyebrow: 'Signal 06 · connection',
    question: 'Connect OpenAI to launch the first scan.',
    note: 'Your key stays in your self-hosted Aperture database and is never returned to this screen.',
  },
}

interface OnboardingAnswers {
  brand: string
  domain: string
  context: string
  competitors: string
  queries: string
  key: string
}

const emptyAnswers: OnboardingAnswers = {
  brand: '', domain: '', context: '', competitors: '', queries: '', key: '',
}

export default function Ask() {
  const [brands, setBrands] = useState<Brand[] | null>(null)

  useEffect(() => {
    getBrands().then(setBrands).catch(() => setBrands([]))
  }, [])

  if (brands === null) {
    return (
      <div className="ask-shell ask-boot grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 size={17} className="animate-spin text-amber-400" /> Calibrating Aperture…
        </div>
      </div>
    )
  }

  return brands.length === 0 ? <ConversationalOnboarding /> : <AnswerCanvas brands={brands} />
}

function ConversationalOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('brand')
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyAnswers)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [auditId, setAuditId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const stepIndex = ONBOARDING_STEPS.indexOf(step as QuestionStep)
  const activePrompt = step === 'launching' || step === 'done' ? null : prompts[step]

  useEffect(() => {
    getProviders().then(setProviders).catch(() => {})
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  const competitors = answers.competitors.split(',').map(value => value.trim()).filter(Boolean)
  const queries = answers.queries.split('\n').map(value => value.trim()).filter(Boolean)

  const generateQueries = () => {
    if (answers.queries.trim()) return answers.queries
    const marketNeed = answers.context.trim() || `choosing ${answers.brand}`
    const rival = competitors[0] || 'other options'
    return [
      `Which companies help with this need: ${marketNeed.replace(/[.!?]+$/, '')}?`,
      `What are the best alternatives to ${rival}?`,
      `How does ${answers.brand.trim()} compare with ${rival}?`,
    ].join('\n')
  }

  const advance = async () => {
    setError(null)
    const value = answers[step as keyof OnboardingAnswers]?.trim()
    if (step === 'brand' && !value) return setError('Enter the brand name you want to monitor.')
    if (step === 'context' && !value) return setError('Add a short description so the questions stay relevant.')
    if (step === 'queries' && queries.length === 0) return setError('Add at least one buyer question.')
    if (step === 'key' && !value) return setError('An OpenAI API key is required to start the first scan.')

    const current = ONBOARDING_STEPS.indexOf(step as QuestionStep)
    const next = ONBOARDING_STEPS[current + 1]
    if (next === 'queries') {
      setAnswers(previous => ({ ...previous, queries: generateQueries() }))
    }
    if (step === 'key') {
      await launchMonitoring()
      return
    }
    setStep(next)
  }

  const launchMonitoring = async () => {
    setStep('launching')
    try {
      await upsertSetting('openai_api_key', answers.key.trim())
      await upsertSetting('ask_model', ASK_MODEL)
      const brand = await createBrand({
        name: answers.brand.trim(),
        domain: answers.domain.trim() || undefined,
        description: answers.context.trim(),
        is_own_brand: true,
        competitors: competitors.map(name => ({ name })),
      })
      const createdQueries = await Promise.all(queries.map(text => createQuery({
        brand_id: brand.id,
        text,
        language: 'en',
        category: 'buyer intent',
      })))
      const openai = providers.find(provider => provider.id === 'openai')
      const audit = await createAudit({
        brand_id: brand.id,
        query_ids: createdQueries.map(query => query.id),
        provider: 'openai',
        model: openai?.default_model || 'gpt-4o-mini',
      })
      setAuditId(audit.id)
      setStep('done')
      window.setTimeout(() => router.push(`/?brand=${brand.id}&onboarded=1`), 1800)
    } catch (caught) {
      setError(parseApiError(caught))
      setStep('key')
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void advance()
  }

  return (
    <div className="ask-shell onboarding-grid">
      <aside className="onboarding-rail" aria-label="Onboarding progress">
        <div>
          <p className="signal-label">First calibration</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-100">Turn your market into measurable signals.</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
            Six short answers are enough to launch a real visibility scan. You can refine every detail later.
          </p>
        </div>
        <div className="aperture-progress" aria-hidden="true">
          <div className="aperture-orbit">
            {[0, 1, 2].map(ring => <span key={ring} style={{ inset: `${ring * 12}px` }} />)}
            <Aperture size={42} strokeWidth={1.1} />
          </div>
          <div>
            <p className="text-3xl font-medium tabular-nums text-slate-100">
              {step === 'done' ? '06' : String(Math.max(1, stepIndex + 1)).padStart(2, '0')}<span className="text-slate-600">/06</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {step === 'done' ? 'signal acquired' : step === 'launching' ? 'opening aperture' : 'calibration points'}
            </p>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">Self-hosted · BYOK · read your own rows</p>
      </aside>

      <main className="onboarding-conversation">
        <div className="conversation-mark"><Aperture size={18} /> Aperture</div>

        {ONBOARDING_STEPS.slice(0, Math.max(0, stepIndex)).map(completed => (
          <div key={completed} className="conversation-pair is-complete">
            <div className="assistant-line"><span className="assistant-dot"><Check size={11} /></span><p>{prompts[completed].question}</p></div>
            <div className="user-answer">
              {completed === 'key' ? '••••••••' : answers[completed] || 'Skipped for now'}
            </div>
          </div>
        ))}

        {activePrompt && (
          <div className="conversation-pair is-active">
            <div className="assistant-line">
              <span className="assistant-dot"><CircleDot size={12} /></span>
              <div>
                <p className="signal-label mb-2">{activePrompt.eyebrow}</p>
                <h2 className="text-2xl font-medium tracking-[-0.025em] text-slate-100">{activePrompt.question}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{activePrompt.note}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="answer-composer">
              {step === 'queries' ? (
                <textarea
                  ref={inputRef as RefObject<HTMLTextAreaElement>}
                  aria-label="Buyer questions"
                  rows={6}
                  value={answers.queries}
                  onChange={event => setAnswers(previous => ({ ...previous, queries: event.target.value }))}
                  className="onboarding-input resize-none"
                />
              ) : (
                <input
                  ref={inputRef as RefObject<HTMLInputElement>}
                  aria-label={step === 'key' ? 'OpenAI API key' : activePrompt.question}
                  type={step === 'key' ? 'password' : 'text'}
                  autoComplete={step === 'key' ? 'off' : 'on'}
                  placeholder={step === 'brand' ? 'e.g. Aperture' : step === 'domain' ? 'e.g. aperture.dev' : step === 'context' ? 'e.g. Marketing teams understand how AI search describes their brand' : step === 'competitors' ? 'e.g. Profound, Scrunch, Peec AI' : 'sk-…'}
                  value={answers[step as keyof OnboardingAnswers]}
                  onChange={event => setAnswers(previous => ({ ...previous, [step]: event.target.value }))}
                  className="onboarding-input"
                />
              )}
              {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="hidden text-xs text-slate-600 sm:block">
                  {step === 'key' ? <span className="flex items-center gap-1.5"><LockKeyhole size={12} /> Stored locally, displayed masked</span> : step === 'queries' ? 'Review or add one question per line' : 'Press Enter to continue'}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {(step === 'domain' || step === 'competitors') && (
                    <button type="button" className="quiet-button" onClick={() => { setAnswers(previous => ({ ...previous, [step]: '' })); void advance() }}>
                      Skip
                    </button>
                  )}
                  <button type="submit" className="signal-button">
                    {step === 'key' ? 'Launch first scan' : 'Continue'} <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {step === 'launching' && (
          <div className="launch-state" role="status">
            <div className="scan-disc"><Radar size={36} /></div>
            <p className="signal-label">Opening aperture</p>
            <h2 className="mt-3 text-2xl text-slate-100">Building the monitoring field…</h2>
            <p className="mt-2 text-sm text-slate-400">Saving the brand, buyer questions, and starting the first OpenAI audit.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="launch-state" role="status">
            <div className="scan-disc is-done"><Check size={36} /></div>
            <p className="signal-label">Signal acquired</p>
            <h2 className="mt-3 text-2xl text-slate-100">Monitoring is underway.</h2>
            <p className="mt-2 text-sm text-slate-400">Audit #{auditId} is running across {queries.length} buyer questions. Taking you to the dashboard…</p>
          </div>
        )}
      </main>
    </div>
  )
}

interface ConversationEntry {
  role: 'user' | 'assistant'
  content: string
  response?: AskResponse
}

function AnswerCanvas({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState(brands.find(brand => brand.is_own_brand)?.id ?? brands[0].id)
  const [entries, setEntries] = useState<ConversationEntry[]>([])
  const [question, setQuestion] = useState('')
  const [working, setWorking] = useState(false)
  const [workingIndex, setWorkingIndex] = useState(0)
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const selectedBrand = brands.find(brand => brand.id === brandId) ?? brands[0]
  const workingMessages = ['Reading stored audit runs', 'Comparing measured mentions', 'Assembling evidence cards']

  useEffect(() => {
    if (!working) return
    const timer = window.setInterval(() => setWorkingIndex(index => (index + 1) % workingMessages.length), 900)
    return () => window.clearInterval(timer)
  }, [working, workingMessages.length])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries, working])

  const suggestions = useMemo(() => [
    `How visible is ${selectedBrand.name} overall?`,
    selectedBrand.competitors[0]
      ? `How does ${selectedBrand.name} compare with ${selectedBrand.competitors[0].name}?`
      : 'Who appears most often beside us?',
    'Which buyer questions are we missing?',
  ], [selectedBrand])

  const submitQuestion = async (text = question) => {
    const clean = text.trim()
    if (!clean || working) return
    const history = entries.map(entry => ({ role: entry.role, content: entry.content }))
    setEntries(previous => [...previous, { role: 'user', content: clean }])
    setQuestion('')
    setWorking(true)
    setWorkingIndex(0)
    try {
      const response = await askAperture(brandId, clean, history)
      setEntries(previous => [...previous, { role: 'assistant', content: response.answer_text, response }])
    } catch (caught) {
      setEntries(previous => [...previous, {
        role: 'assistant',
        content: parseApiError(caught),
        response: { answer_text: parseApiError(caught), grounded: false, parts: [], suggested_followups: [], tool_trace: [] },
      }])
    } finally {
      setWorking(false)
    }
  }

  const openEvidence = async (resultId: number) => {
    setEvidenceLoading(true)
    try {
      setEvidence(await getEvidence(brandId, resultId))
    } finally {
      setEvidenceLoading(false)
    }
  }

  return (
    <div className="ask-shell answer-canvas">
      <header className="answer-header">
        <div>
          <p className="signal-label">Answer canvas</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-100">Ask your own visibility data</h1>
        </div>
        <label className="brand-select-wrap">
          <span className="sr-only">Selected brand</span>
          <Aperture size={14} className="text-amber-400" />
          <select value={brandId} onChange={event => { setBrandId(Number(event.target.value)); setEntries([]) }}>
            {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
      </header>

      <div className="answer-thread">
        {entries.length === 0 && (
          <section className="ask-empty-state">
            <div className="ask-reticle"><Eye size={30} /></div>
            <p className="signal-label">Grounded in captured runs</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-medium tracking-[-0.035em] text-slate-100 sm:text-4xl">
              Ask what AI engines say about <span className="text-amber-300">{selectedBrand.name}</span>.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Aperture reads your stored measurements, then uses {ASK_MODEL} to explain them. Numbers always come from the cards below, never from the narration.
            </p>
            <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
              {suggestions.map(suggestion => (
                <button key={suggestion} onClick={() => void submitQuestion(suggestion)} className="prompt-card">
                  <MessageCircleQuestion size={15} />
                  <span>{suggestion}</span>
                  <ChevronRight size={14} className="ml-auto shrink-0 text-slate-600" />
                </button>
              ))}
            </div>
          </section>
        )}

        {entries.map((entry, index) => (
          <article key={`${entry.role}-${index}`} className={entry.role === 'user' ? 'thread-user' : 'thread-assistant'}>
            {entry.role === 'assistant' && <div className="assistant-avatar"><Aperture size={15} /></div>}
            <div className="min-w-0 flex-1">
              <p className="thread-role">{entry.role === 'user' ? 'You' : 'Aperture'}</p>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-200">{entry.content}</p>
              {entry.response && (
                <>
                  <div className="answer-parts">
                    {entry.response.parts.map((part, partIndex) => (
                      <AnswerPartCard key={`${part.type}-${partIndex}`} part={part} onEvidence={openEvidence} />
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {entry.response.grounded ? (
                      <span className="grounded-badge"><Check size={11} /> Grounded in your runs</span>
                    ) : (
                      <span className="refusal-badge">No supporting measurement</span>
                    )}
                    {entry.response.tool_trace.length > 0 && (
                      <span className="font-mono text-[10px] text-slate-600">read: {entry.response.tool_trace.join(' · ')}</span>
                    )}
                  </div>
                  {index === entries.length - 1 && entry.response.suggested_followups.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {entry.response.suggested_followups.map(followup => (
                        <button key={followup} onClick={() => void submitQuestion(followup)} className="followup-chip">{followup}</button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        ))}

        {working && (
          <div className="working-line" role="status">
            <span className="working-pulse" />
            <span>{workingMessages[workingIndex]}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="ask-composer" onSubmit={event => { event.preventDefault(); void submitQuestion() }}>
        <Sparkles size={17} className="shrink-0 text-amber-400" />
        <input
          aria-label="Ask Aperture"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          placeholder={`Ask about ${selectedBrand.name}'s visibility…`}
        />
        <button type="submit" disabled={!question.trim() || working} aria-label="Send question"><ArrowUp size={17} /></button>
      </form>

      {(evidence || evidenceLoading) && (
        <EvidenceDrawer evidence={evidence} loading={evidenceLoading} onClose={() => setEvidence(null)} />
      )}
    </div>
  )
}

function AnswerPartCard({ part, onEvidence }: { part: AnswerPart; onEvidence: (id: number) => void }) {
  if (part.type === 'kpi') {
    const data = part.data
    return (
      <div className="answer-card kpi-card">
        <div><p className="card-label">Mention rate · {data.provider}</p><p className="mt-2 text-4xl font-medium tabular-nums text-slate-50">{data.mention_rate ?? '—'}<span className="text-xl text-slate-500">%</span></p></div>
        <div className="text-right"><p className={`text-sm font-medium ${(data.delta ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{data.delta == null ? 'First baseline' : `${data.delta > 0 ? '+' : ''}${data.delta} pts`}</p><p className="mt-2 text-xs text-slate-500">{data.completed_queries} queries measured</p></div>
      </div>
    )
  }
  if (part.type === 'sov') {
    return (
      <div className="answer-card">
        <div className="flex items-center justify-between"><p className="card-label">Share of measured mentions</p><span className="text-xs text-slate-500">{part.data.provider}</span></div>
        <div className="mt-5 space-y-3">
          {part.data.ranked.map(item => (
            <div key={item.name}>
              <div className="mb-1.5 flex justify-between text-xs"><span className={item.you ? 'font-medium text-amber-300' : 'text-slate-400'}>{item.name}{item.you ? ' · you' : ''}</span><span className="tabular-nums text-slate-400">{item.pct}%</span></div>
              <div className="sov-track"><span className={item.you ? 'is-you' : ''} style={{ width: `${Math.max(item.pct, 1)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (part.type === 'trend') {
    const values = part.data.points.map(point => point.mention_rate ?? 0)
    const polyline = values.map((value, index) => {
      const x = values.length === 1 ? 140 : 12 + index * (256 / (values.length - 1))
      const y = 96 - value * 0.78
      return `${x},${y}`
    }).join(' ')
    return (
      <div className="answer-card">
        <div className="flex items-center justify-between"><p className="card-label">Mention trend</p><BarChart3 size={15} className="text-slate-500" /></div>
        <svg viewBox="0 0 280 108" className="mt-3 h-28 w-full" role="img" aria-label="Mention rate trend">
          {[18, 57, 96].map(y => <line key={y} x1="10" x2="270" y1={y} y2={y} stroke="#26313a" strokeWidth="1" />)}
          <polyline points={polyline} fill="none" stroke="#d6a24a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {polyline.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="3.5" fill="#10161b" stroke="#e1b15c" strokeWidth="2" /> })}
        </svg>
      </div>
    )
  }
  if (part.type === 'query_result') {
    return (
      <div className="answer-card p-0">
        <div className="border-b border-slate-800 px-5 py-4"><p className="card-label">Per-query evidence</p></div>
        <div className="divide-y divide-slate-800">
          {part.data.items.map(item => (
            <div key={item.result_id} className="flex items-start gap-4 px-5 py-4">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.error ? 'bg-slate-600' : item.brand_mentioned ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <div className="min-w-0 flex-1"><p className="text-sm leading-5 text-slate-200">{item.query}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">{item.provider} · {item.brand_mentioned ? `mentioned ${item.mention_count}×` : 'not mentioned'}</p></div>
              {item.has_response && <button onClick={() => onEvidence(item.result_id)} className="evidence-button"><Eye size={13} /> Evidence</button>}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="answer-card">
      <p className="card-label">Stored response · {part.data.provider}</p>
      <p className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-300">{part.data.response_text}</p>
    </div>
  )
}

function EvidenceDrawer({ evidence, loading, onClose }: { evidence: Evidence | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="evidence-overlay" role="dialog" aria-modal="true" aria-label="Stored response evidence" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
      <aside className="evidence-drawer">
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div><p className="signal-label">Exact stored response</p><h2 className="mt-2 max-w-md text-lg text-slate-100">{evidence?.query || 'Loading evidence…'}</h2></div>
          <button onClick={onClose} className="quiet-icon" aria-label="Close evidence"><X size={18} /></button>
        </div>
        {loading || !evidence ? (
          <div className="grid flex-1 place-items-center"><Loader2 className="animate-spin text-amber-400" /></div>
        ) : (
          <div className="overflow-y-auto p-6">
            <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span>{evidence.provider}</span><span>·</span><span>{evidence.model}</span><span>·</span><span>result #{evidence.result_id}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{evidence.response_text}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
