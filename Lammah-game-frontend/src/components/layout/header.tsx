"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import {
  adminNavigation,
  isAdminNavigationActive,
} from "@/config/admin-navigation";

const userNavItems = [
  { label: "الرئيسية", href: "/" },
  { label: "الألعاب", href: "/games" },
  { label: "ألعابي", href: "/games" },
  { label: "حسابي", href: "/#account" },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const visibleItems = isAdmin ? adminNavigation : userNavItems;
  const displayName = user?.fullName || "لاعب";
  const initial = displayName.trim().charAt(0) || "ل";

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-4">
      <div className="container flex min-h-16 items-center justify-between gap-4 rounded-[1.35rem] border border-white/[0.09] bg-[#21163f]/72 px-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-xl">
              🍉
            </span>
            <span className="hidden text-lg font-black tracking-wide sm:block">
              Lammah
            </span>
          </Link>
        </div>

        {isAuthenticated && (
          <nav className="flex max-w-[46vw] items-center gap-2 overflow-x-auto md:max-w-none">
            {visibleItems.map((item) => {
              const itemPath = item.href.split("#")[0].split("?")[0] || "/";
              const isHashLink = item.href.includes("#");
              const isActive =
                !isHashLink &&
                (isAdmin
                  ? isAdminNavigationActive(pathname, itemPath)
                  : pathname === itemPath ||
                    (itemPath === "/games" && pathname.startsWith("/games/")));

              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-bold transition-all hover:bg-white/10 hover:text-primary",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden items-center gap-3 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.045] px-3 py-2 sm:flex">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#22C55E] text-base font-black text-[#101827]">
                  {initial}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-black">
                    {displayName}
                  </span>
                  <span className="block text-xs font-bold text-muted-foreground">
                    مرحبًا بك 👋
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-primary"
              >
                خروج
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-muted-foreground hover:text-primary"
              >
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
