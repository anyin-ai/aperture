'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AxiosError } from 'axios'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: Toast[]
  pushToast: (message: string, type?: ToastType) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Module-level sink ────────────────────────────────────────────────────────
// Lets the non-React axios interceptor emit toasts without importing React.
type Sink = (message: string, type: ToastType) => void
let sink: Sink | null = null

export function setToastSink(fn: Sink | null) {
  sink = fn
}

export function emitToast(message: string, type: ToastType = 'error') {
  sink?.(message, type)
}

/** Normalize an axios/unknown error into a human-readable message. */
export function parseApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      // FastAPI 422 validation: [{loc, msg, type}, ...]
      return detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join('; ') || err.message
    }
    return err.message || 'Network error'
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const pushToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    const timer = setTimeout(() => dismiss(id), 5000)
    timers.current.set(id, timer)
  }, [dismiss])

  // Register the module-level sink so the axios interceptor can emit toasts.
  // Idempotent under React 19 StrictMode double-invoke.
  useEffect(() => {
    setToastSink(pushToast)
    return () => setToastSink(null)
  }, [pushToast])

  // Capture the timers map for cleanup-on-unmount without re-running per render.
  const timersForCleanup = timers.current
  useEffect(() => () => {
    timersForCleanup.forEach(clearTimeout)
    timersForCleanup.clear()
  }, [timersForCleanup])

  return (
    <ToastContext.Provider value={{ toasts, pushToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
