'use client'

import { X } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import type { ToastType } from '../hooks/useToast'

const STYLES: Record<ToastType, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-700',
}

export default function Toast() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-start gap-2 rounded-lg border shadow-sm px-4 py-3 text-sm ${STYLES[t.type]}`}
        >
          <span className="flex-1 break-words">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
