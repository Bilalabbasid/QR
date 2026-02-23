import Link from 'next/link'
import { Star } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Star className="h-6 w-6 text-primary fill-primary" />
          <span className="text-xl font-bold text-foreground">ReviewIQ</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
