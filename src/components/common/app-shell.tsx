"use client";

import { useState } from "react";
import {
  HelpCircle,
  Home,
  ListVideo,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PlusSquare,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  UserRoundPlus,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/common/bottom-nav";
import { Logo } from "@/components/common/logo";
import { Sidebar } from "@/components/common/sidebar";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cx } from "@/lib/format";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { authenticated, loading, logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const pathname = usePathname();

  return (
    <div className="h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <MobileMenu
        authenticated={authenticated}
        isDark={isDark}
        logout={logout}
        pathname={pathname}
        profileHref={authenticated && user ? `/profile/${user.username}` : "/login"}
        setTheme={setTheme}
      />
      <div className="fixed right-6 top-3.5 z-30 hidden md:block">
        {!loading && authenticated && user ? (
          <div className="flex items-center gap-2">
            <Link href={`/profile/${user.username}`} className="inline-flex h-10 max-w-44 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-sm font-medium">
              <UserRound size={16} /> @{user.username}
            </Link>
            <button type="button" onClick={() => void logout()} className="icon-button" aria-label="Log out" title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className="primary-button">
            <LogIn size={16} /> Log in
          </Link>
        )}
      </div>
      <main className={cx("h-dvh overflow-hidden transition-[margin] duration-200", sidebarCollapsed ? "md:ml-[76px]" : "md:ml-[236px]")}>{children}</main>
      <BottomNav />
    </div>
  );
}

function MobileMenu({
  authenticated,
  isDark,
  logout,
  pathname,
  profileHref,
  setTheme,
}: {
  authenticated: boolean;
  isDark: boolean;
  logout: () => void | Promise<void>;
  pathname: string;
  profileHref: string;
  setTheme: (theme: "dark" | "light") => void;
}) {
  const navItems = [
    { label: "For You", href: "/feed", icon: Home },
    { label: "Following", href: "/following", icon: UserRoundPlus },
    { label: "Upload", href: "/upload", icon: PlusSquare },
    { label: "Posts", href: "/posts", icon: ListVideo },
    { label: "Profile", href: profileHref, icon: UserRound },
  ];
  const otherItems = [
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "XSpann RNB Studio", href: "/posts", icon: Sparkles },
    { label: "Create effects", href: "/upload", icon: Wand2 },
    { label: "Help Center", href: "/settings", icon: HelpCircle },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="icon-button fixed right-3 top-2.5 z-40 bg-[var(--background)] md:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cx("flex flex-col p-0", isDark ? "border-[var(--line)] bg-[var(--panel)] text-white" : "border-zinc-200 bg-white text-zinc-950")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--line)] px-5">
          <Logo />
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              className={cx("grid h-9 w-9 place-items-center rounded-full transition", isDark ? "text-violet-100/75 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950")}
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <MobileMenuSection>
            {navItems.map((item) => (
              <MobileMenuLink
                key={item.label}
                active={pathname === item.href || (item.href !== "/feed" && pathname.startsWith(`${item.href}/`))}
                href={item.href}
                icon={item.icon}
                isDark={isDark}
                label={item.label}
              />
            ))}
          </MobileMenuSection>

          <MobileMenuSection title="Other">
            <div className="flex h-12 items-center justify-between rounded-md px-2 text-[16px] font-semibold">
              <span className="inline-flex items-center gap-3">
                <Moon size={21} /> Dark mode
              </span>
              <div className={cx("flex rounded-full p-1", isDark ? "bg-violet-950/55" : "bg-violet-100")}>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cx("grid h-8 w-8 place-items-center rounded-full transition", !isDark ? "bg-[var(--royal)] text-white" : "text-violet-100/45 hover:text-white")}
                  aria-label="Light mode"
                >
                  <Sun size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cx("grid h-8 w-8 place-items-center rounded-full transition", isDark ? "bg-[var(--royal)] text-white" : "text-violet-950/45 hover:text-violet-950")}
                  aria-label="Dark mode"
                >
                  <Moon size={15} />
                </button>
              </div>
            </div>
            {otherItems.map((item) => (
              <MobileMenuLink
                key={item.label}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                href={item.href}
                icon={item.icon}
                isDark={isDark}
                label={item.label}
              />
            ))}
            {authenticated ? (
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className={cx("flex h-12 w-full items-center gap-3 rounded-md px-2 text-left text-[16px] font-semibold transition", isDark ? "text-white hover:bg-violet-500/12" : "text-zinc-800 hover:bg-violet-50 hover:text-[var(--royal)]")}
                >
                  <LogOut size={21} /> Log out
                </button>
              </SheetClose>
            ) : (
              <MobileMenuLink active={pathname === "/login"} href="/login" icon={LogIn} isDark={isDark} label="Log in" />
            )}
          </MobileMenuSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileMenuSection({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="mb-6">
      {title && <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</p>}
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function MobileMenuLink({
  active,
  href,
  icon: Icon,
  isDark,
  label,
}: {
  active: boolean;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; fill?: string }>;
  isDark: boolean;
  label: string;
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className={cx(
          "flex h-12 items-center gap-3 rounded-md px-2 text-[16px] font-semibold transition",
          active
            ? "text-[var(--royal)]"
            : isDark
              ? "text-violet-50/88 hover:bg-violet-500/12 hover:text-white"
              : "text-zinc-800 hover:bg-violet-50 hover:text-[var(--royal)]",
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.3 : 1.8} fill="none" />
        <span>{label}</span>
      </Link>
    </SheetClose>
  );
}
