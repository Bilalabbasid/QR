import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star, BarChart2, Bell, Users, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-bold">ReviewIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
          <Zap className="h-3.5 w-3.5" />
          AI-Powered Review Management
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Manage Every Google Review{' '}
          <span className="text-primary">
            Effortlessly
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
          Connect your Google Business Profile, auto-reply with AI, get deep insights across all branches,
          and never miss a negative review again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="px-8">
              Get Started Free
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="px-8">
              See Features
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Everything You Need</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Star,
              title: 'Auto-Reply with AI',
              desc: 'OpenAI generates professional, context-aware replies for every review automatically.',
            },
            {
              icon: BarChart2,
              title: 'Deep Analytics',
              desc: 'Rating trends, branch comparisons, sentiment analysis, and monthly AI summaries.',
            },
            {
              icon: Bell,
              title: 'Instant Alerts',
              desc: 'Get notified immediately when a low-rating review is posted across any branch.',
            },
            {
              icon: Users,
              title: 'Multi-Branch Support',
              desc: 'Manage 100+ locations from one dashboard with branch-level permission control.',
            },
            {
              icon: Shield,
              title: 'Enterprise Security',
              desc: 'Row-level security, multi-tenant isolation, and role-based access control.',
            },
            {
              icon: Zap,
              title: 'Real-Time Sync',
              desc: 'Reviews sync every 5 minutes via background workers. Always up to date.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="rounded-2xl border border-border bg-card p-12">
          <h2 className="text-3xl font-bold mb-4">Start Managing Reviews Today</h2>
          <p className="text-muted-foreground mb-8">
            Free 14-day trial. No credit card required.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="px-10">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} ReviewIQ. All rights reserved.
      </footer>
    </div>
  )
}
