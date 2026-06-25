'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';

const navItems = [
  { label: 'الرئيسية', href: '/' },
  { label: 'الألعاب', href: '/games' },
  { label: 'الفئات', href: '/categories' },
  { label: 'AI', href: '/admin/ai-generator' },
];

const adminItems = [
  { label: 'Admin', href: '/admin' },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const visibleItems = isAdmin
    ? [...navItems, ...adminItems]
    : navItems.filter((item) => item.href !== '/admin/ai-generator');

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-4">
      <div className="container glass-panel flex min-h-16 items-center justify-between gap-4 rounded-full px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-2xl shadow-lg shadow-primary/20">
              🍉
            </span>
            <span className="hidden text-xl font-black tracking-wide sm:block">
              Lammah
            </span>
          </Link>
        </div>

        <nav className="flex max-w-[46vw] items-center gap-2 overflow-x-auto md:max-w-none">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition-all hover:bg-white/10 hover:text-primary',
                pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-muted-foreground sm:inline">
                {user?.fullName || 'لاعب'}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                خروج
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-primary">
                دخول
              </Link>
              <Link href="/register">
                <Button size="sm">حساب جديد</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
