import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReviewIQ - AI-Powered Google Review Management',
  description:
    'Manage all your Google Business reviews, get AI-powered insights, auto-reply to customers, and monitor your reputation across all branches.',
  keywords: 'google reviews, review management, AI insights, restaurant reviews, business reputation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
