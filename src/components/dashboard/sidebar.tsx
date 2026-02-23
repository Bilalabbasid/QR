'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Lightbulb,
  Bell,
  Users,
  Settings,
  CreditCard,
  Star,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types/database'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/reviews', icon: MessageSquare, label: 'Reviews', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/insights', icon: Lightbulb, label: 'AI Insights', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alerts', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/team', icon: Users, label: 'Team', roles: ['owner', 'manager'] },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['owner', 'manager', 'staff'] },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing', roles: ['owner'] },
]

interface DashboardSidebarProps {
  userRole: UserRole
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(userRole)
  )

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4 h-16 border-b border-slate-200 dark:border-slate-800', collapsed && 'justify-center')}>
        <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 shrink-0" />
        {!collapsed && (
          <span className="font-bold text-slate-900 dark:text-white text-lg">ReviewIQ</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                collapsed && 'justify-center'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4.5 w-4.5 shrink-0 h-5 w-5" />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400',
            collapsed ? 'px-0 justify-center' : 'justify-start'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-slate-400',
            collapsed ? 'px-0 justify-center' : 'justify-end'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
