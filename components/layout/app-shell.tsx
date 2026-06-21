import Link from "next/link";
import { BarChart3, FolderTree, Home, Upload, WalletCards } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/transactions", label: "거래", icon: WalletCards },
  { href: "/categories", label: "카테고리", icon: FolderTree },
  { href: "/import", label: "가져오기", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Household</div>
            <div className="text-xs text-[var(--muted-foreground)]">Budget</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-[#263029] hover:bg-[var(--muted)]"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOut} className="border-t border-[var(--border)] p-3">
          <Button type="submit" variant="ghost" className="w-full justify-start">
            로그아웃
          </Button>
        </form>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 lg:hidden">
          <Link href="/dashboard" className="text-sm font-semibold">
            Household Budget
          </Link>
          <form action={signOut}>
            <Button type="submit" size="sm" variant="ghost">
              로그아웃
            </Button>
          </form>
        </header>
        <nav className="grid grid-cols-4 border-b border-[var(--border)] bg-white lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-[#263029]"
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

