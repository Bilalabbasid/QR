import { Star } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-blue-950 to-slate-900 p-12 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          <span className="text-xl font-bold text-white">ReviewIQ</span>
        </Link>
        <div>
          <blockquote className="text-lg text-slate-300 leading-relaxed mb-4">
            &ldquo;ReviewIQ transformed how we manage customer feedback across our 47 restaurant locations.
            The AI auto-replies save us hours every day.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              A
            </div>
            <div>
              <p className="text-white font-medium text-sm">Ahmed Al-Rashid</p>
              <p className="text-slate-400 text-sm">COO, Al-Rashid Restaurant Group</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            <span className="text-xl font-bold text-white">ReviewIQ</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
