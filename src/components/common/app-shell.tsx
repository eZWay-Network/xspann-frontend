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
    <div className={cx(
      "min-h-screen overflow-hidden transition-colors duration-200",
      isDark
        ? "bg-[radial-gradient(circle_at_24%_10%,rgba(91,33,182,0.34),transparent_26%),radial-gradient(circle_at_76%_18%,rgba(168,85,247,0.18),transparent_24%),linear-gradient(135deg,#05010a,#10051f_44%,#07020f)] text-white"
        : "bg-white text-zinc-950",
    )}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <MobileMenu
        authenticated={authenticated}
        isDark={isDark}
        logout={logout}
        pathname={pathname}
        profileHref={authenticated && user ? `/profile/${user.username}` : "/login"}
        setTheme={setTheme}
      />
      <div className="fixed right-5 top-4 z-30 hidden lg:block">
        {!loading && authenticated && user ? (
          <div className="flex items-center gap-2">
            <Link href={`/profile/${user.username}`} className={cx("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold backdrop-blur-xl transition", isDark ? "border-violet-200/14 bg-violet-950/55 text-white hover:bg-violet-800/55" : "border-violet-200 bg-white/82 text-zinc-950 shadow-sm hover:bg-violet-50")}>
              <UserRound size={16} /> @{user.username}
            </Link>
            <button type="button" onClick={() => void logout()} className={cx("inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition", isDark ? "border-violet-200/14 bg-violet-950/55 text-violet-100/80 hover:bg-violet-800/55 hover:text-white" : "border-violet-200 bg-white/82 text-zinc-700 shadow-sm hover:bg-violet-50 hover:text-zinc-950")} aria-label="Log out" title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-5 text-sm font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.46)] ring-1 ring-violet-200/20">
            <LogIn size={16} /> Log in
          </Link>
        )}
      </div>
      <main className={cx("h-screen overflow-hidden transition-[margin] duration-200", sidebarCollapsed ? "md:ml-[76px]" : "md:ml-[236px]")}>{children}</main>
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
          className={cx("fixed right-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-full border shadow-sm backdrop-blur-xl transition md:hidden", isDark ? "border-violet-200/14 bg-violet-950/55 text-white hover:bg-violet-800/55" : "border-zinc-200 bg-white/92 text-zinc-900 hover:bg-zinc-50")}
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cx("flex flex-col p-0", isDark ? "border-violet-200/10 bg-[#090313] text-white" : "border-zinc-200 bg-white text-zinc-950")}
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
        <Icon size={22} strokeWidth={active ? 3 : 2.2} fill={active ? "currentColor" : "none"} />
        <span>{label}</span>
      </Link>
    </SheetClose>
  );
}
