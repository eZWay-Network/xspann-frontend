"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ellipsis,
  HelpCircle,
  Home,
  ListVideo,
  LogOut,
  Moon,
  PanelLeft,
  PanelRight,
  PlusSquare,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  UserRoundPlus,
  Wand2,
  X,
} from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cx } from "@/lib/format";

const baseNav = [
  { label: "For You", href: "/feed", icon: Home },
  { label: "Following", href: "/following", icon: UserRoundPlus },
  // {
  //   label: "Short dramas",
  //   href: "/feed?tab=dramas",
  //   icon: Clapperboard,
  //   dot: true,
  // },
  // { label: "LIVE", href: "/feed?tab=live", icon: Radio },
  { label: "Upload", href: "/upload", icon: PlusSquare },
  { label: "Posts", href: "/posts", icon: ListVideo },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { authenticated, loading, logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isDark = theme === "dark";
  const ToggleIcon = collapsed ? PanelRight : PanelLeft;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const profileHref =
    authenticated && user ? `/profile/${user.username}` : "/login";
  const nav = [
    ...baseNav,
    { label: "Profile", href: profileHref, icon: UserRound },
  ];

  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-30 hidden overflow-y-auto bg-[var(--background)] py-6 transition-[width,padding] duration-200 md:flex md:flex-col",
        collapsed ? "w-[76px] px-3" : "w-[236px] px-4",
      )}
    >
      <div
        className={cx(
          "mb-7 flex shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && <Logo />}
        <button
          type="button"
          onClick={onToggle}
          className={cx(
            "inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-violet-500/15",
            isDark
              ? "text-violet-100/60 hover:text-white"
              : "text-violet-950/55 hover:text-violet-950",
          )}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <ToggleIcon size={21} strokeWidth={2.2} />
        </button>
      </div>

      <form action="/search" role="search" className={cx("mb-6 flex shrink-0 items-center rounded-xl bg-[var(--surface)] text-[var(--muted)] focus-within:outline-2 focus-within:outline-[var(--royal)]", collapsed ? "justify-center" : "px-3.5")}>
        {collapsed ? (
          <Link href="/search" className="icon-button" aria-label="Search"><Search size={21} strokeWidth={1.8} /></Link>
        ) : (
          <>
            <Search size={18} strokeWidth={1.8} />
            <input name="q" aria-label="Search videos and creators" className="h-11 min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-[var(--muted)]" placeholder="Search" />
          </>
        )}
      </form>

      <nav aria-label="Main navigation" className="space-y-1.5">
        {nav.map((item) => {
          const hrefPath = item.href.split("?")[0];
          const active =
            pathname === hrefPath ||
            (hrefPath !== "/feed" && pathname.startsWith(`${hrefPath}/`));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cx(
                "relative flex h-11 items-center rounded-xl text-[15px] font-medium transition",
                collapsed ? "justify-center px-0" : "gap-3.5 px-3",
                active
                  ? "bg-violet-500/8 text-[var(--royal)] font-semibold"
                  : isDark
                    ? "text-zinc-300 hover:bg-[var(--surface)] hover:text-white"
                    : "text-zinc-600 hover:bg-[var(--surface)] hover:text-zinc-950",
              )}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={23} strokeWidth={active ? 2.3 : 1.8} fill="none" />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
        <Sheet modal={false}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cx(
                "relative flex h-11 w-full items-center rounded-xl text-[15px] font-medium transition",
                isDark
                  ? "text-zinc-300 hover:bg-[var(--surface)] hover:text-white"
                  : "text-zinc-600 hover:bg-[var(--surface)] hover:text-zinc-950",
                collapsed ? "justify-center px-0" : "gap-3.5 px-3",
              )}
              aria-label="More"
              title={collapsed ? "More" : undefined}
            >
              <Ellipsis size={23} strokeWidth={1.8} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-left">More</span>
              )}

            </button>
          </SheetTrigger>
          <MoreSheetContent
            isDark={isDark}
            authenticated={authenticated}
            logout={logout}
            setTheme={setTheme}
          />
        </Sheet>
      </nav>

      {!collapsed && !loading && !authenticated && (
        <Link
          href="/login"
          className="primary-button mt-7 w-full shrink-0"
        >
          Log in
        </Link>
      )}

      {!collapsed && (
        <footer className="mt-auto pt-12 text-[11px] leading-6 text-[var(--muted)]">
          <p className="font-medium">A little inspiration. Every day.</p>
          <p>© 2026 XSpann RNB</p>
        </footer>
      )}
    </aside>
  );
}

function MoreSheetContent({
  isDark,
  authenticated,
  logout,
  setTheme,
}: {
  isDark: boolean;
  authenticated: boolean;
  logout: () => void | Promise<void>;
  setTheme: (theme: "dark" | "light") => void;
}) {
  return (
    <SheetContent
      side="left"
      showOverlay={false}
      className={cx(
        "px-6 py-5 backdrop-blur-2xl transition-colors duration-200",
        isDark
          ? "border-[var(--line)] bg-[var(--panel)] text-white"
          : "border-violet-200 bg-white/95 text-zinc-950",
      )}
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Logo />
          <SheetTitle className="text-xl font-bold">More</SheetTitle>
        </div>
        <SheetClose asChild>
          <button
            type="button"
            className={cx(
              "grid h-9 w-9 place-items-center rounded-full transition",
              isDark
                ? "bg-violet-950/55 text-violet-100/80 hover:bg-violet-800/55 hover:text-white"
                : "bg-violet-100 text-violet-950/70 hover:bg-violet-200 hover:text-violet-950",
            )}
            aria-label="Close more menu"
          >
            <X size={18} />
          </button>
        </SheetClose>
      </div>

      <div className="space-y-7">
        <section>
          <p
            className={cx(
              "mb-4 text-sm font-medium",
              isDark ? "text-violet-100/42" : "text-violet-950/48",
            )}
          >
            Settings
          </p>
          <div className="space-y-2">
            <MorePanelRow
              icon={<Settings size={19} />}
              label="General"
              href="/settings"
            />
            <div className="flex h-12 items-center justify-between rounded-md px-1 text-[16px] font-semibold">
              <span className="inline-flex items-center gap-3">
                <Moon size={19} /> Dark mode
              </span>
              <div
                className={cx(
                  "flex cursor-pointer rounded-full p-1",
                  isDark ? "bg-violet-950/55" : "bg-violet-100",
                )}
              >
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cx(
                    "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition",
                    !isDark
                      ? "bg-violet-700/75 text-white"
                      : "text-violet-100/45 hover:text-white",
                  )}
                  aria-label="Light mode"
                >
                  <Sun size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cx(
                    "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition",
                    isDark
                      ? "bg-violet-700/75 text-white"
                      : "text-violet-950/45 hover:text-violet-950",
                  )}
                  aria-label="Dark mode"
                >
                  <Moon size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className={cx(
            "border-t pt-6",
            isDark ? "border-violet-200/10" : "border-violet-200",
          )}
        >
          <p
            className={cx(
              "mb-4 text-sm font-medium",
              isDark ? "text-violet-100/42" : "text-violet-950/48",
            )}
          >
            Tools
          </p>
          <div className="space-y-2">
            <MorePanelRow
              icon={<Sparkles size={19} />}
              label="XSpann RNB Studio"
              href="/posts"
              badge
            />
            <MorePanelRow
              icon={<Wand2 size={19} />}
              label="Create XSpann RNB effects"
              href="/upload"
            />
          </div>
        </section>

        <section
          className={cx(
            "border-t pt-6",
            isDark ? "border-violet-200/10" : "border-violet-200",
          )}
        >
          <p
            className={cx(
              "mb-4 text-sm font-medium",
              isDark ? "text-violet-100/42" : "text-violet-950/48",
            )}
          >
            Other
          </p>
          <div className="space-y-2">
            <MorePanelRow
              icon={<HelpCircle size={19} />}
              label="Help Center"
              href="/settings"
            />
            {authenticated && (
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className={cx(
                    "flex h-12 w-full items-center gap-3 rounded-md px-1 text-left text-[16px] font-semibold transition",
                    isDark
                      ? "text-white hover:bg-violet-500/12"
                      : "text-violet-950 hover:bg-violet-100",
                  )}
                >
                  <LogOut size={19} /> Log out
                </button>
              </SheetClose>
            )}
          </div>
        </section>
      </div>
    </SheetContent>
  );
}

function MorePanelRow({
  icon,
  label,
  href,
  onClick,
  badge = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const content = (
    <>
      <span className="inline-flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate">{label}</span>
        {badge && (
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--pink-signal)]" />
        )}
      </span>
    </>
  );

  if (!href) {
    return (
      <button
        type="button"
        className={cx(
          "flex h-12 w-full items-center justify-between gap-3 rounded-md px-1 text-left text-[16px] font-semibold transition",
          isDark
            ? "text-white hover:bg-violet-500/12"
            : "text-violet-950 hover:bg-violet-100",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <SheetClose asChild>
      <Link
        href={href}
        onClick={onClick}
        className={cx(
          "flex h-12 items-center justify-between gap-3 rounded-md px-1 text-[16px] font-semibold transition",
          isDark
            ? "text-white hover:bg-violet-500/12"
            : "text-violet-950 hover:bg-violet-100",
        )}
      >
        {content}
      </Link>
    </SheetClose>
  );
}
