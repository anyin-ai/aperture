import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { ToastProvider } from '@/hooks/useToast'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Aperture – AI Visibility Monitoring',
  description: 'Open-source AI visibility infrastructure. Track how your brand appears across LLMs.',
  icons: { icon: '/aperture.svg' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-auto">{children}</main>
            <Toast />
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
