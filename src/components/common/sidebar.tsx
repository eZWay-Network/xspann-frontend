"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleEllipsis,
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
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const showLightBorder = pathname.startsWith("/posts");
  const profileHref =
    authenticated && user ? `/profile/${user.username}` : "/login";
  const nav = [
    ...baseNav,
    { label: "Profile", href: profileHref, icon: UserRound },
  ];

  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-30 hidden py-5 backdrop-blur-2xl transition-[width,padding,background-color,border-color] duration-200 md:block",
        isDark
          ? "border-r border-violet-200/10 bg-[#090313]/94 shadow-[18px_0_70px_rgba(21,5,43,0.35)]"
          : showLightBorder
            ? "border-r border-zinc-200 bg-white/92"
            : "bg-white/92",
        collapsed ? "w-[76px] px-3" : "w-[236px] px-4",
      )}
    >
      <div
        className={cx(
          "mb-5 flex items-center",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && <Logo />}
        <button
          type="button"
          onClick={onToggle}
          className={cx("inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-violet-500/15", isDark ? "text-violet-100/60 hover:text-white" : "text-violet-950/55 hover:text-violet-950")}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <ToggleIcon size={21} strokeWidth={2.2} />
        </button>
      </div>

      {!collapsed && (
        <label className={cx("mb-4 flex h-11 items-center gap-3 rounded-full border px-4 text-sm", isDark ? "border-violet-200/10 bg-violet-950/45 text-violet-100/58" : "border-violet-200 bg-violet-50/70 text-violet-950/62")}>
          <Search size={19} />
          <input
            className={cx("min-w-0 flex-1 bg-transparent outline-none", isDark ? "placeholder:text-violet-100/42" : "placeholder:text-violet-950/38")}
            placeholder="Search"
          />
        </label>
      )}

      <nav className="space-y-1">
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
                "relative flex h-11 items-center rounded-md text-[17px] font-semibold transition",
                collapsed ? "justify-center px-0" : "gap-4 px-2",
                active
                  ? "text-[var(--royal)]"
                  : isDark
                    ? "text-violet-50/88 hover:bg-violet-500/12 hover:text-white"
                    : "text-violet-950/78 hover:bg-violet-50 hover:text-[var(--royal)]",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                size={24}
                strokeWidth={active ? 3 : 2.2}
                fill="none"
              />
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
                "relative flex h-11 w-full items-center rounded-md text-[17px] font-semibold transition",
                isDark ? "text-violet-50/88 hover:bg-violet-500/12 hover:text-white" : "text-violet-950/78 hover:bg-violet-100 hover:text-violet-950",
                collapsed ? "justify-center px-0" : "gap-4 px-2",
              )}
              title={collapsed ? "More" : undefined}
            >
              <CircleEllipsis size={24} strokeWidth={2.2} />
              {!collapsed && <span className="min-w-0 flex-1 truncate text-left">More</span>}
              <span
                className={cx(
                  "absolute h-1.5 w-1.5 rounded-full bg-[var(--pink-signal)]",
                  collapsed ? "right-3 top-2.5" : "left-8 top-2.5",
                )}
              />
            </button>
          </SheetTrigger>
          <MoreSheetContent isDark={isDark} authenticated={authenticated} logout={logout} setTheme={setTheme} />
        </Sheet>
      </nav>

      {!collapsed &&
        !loading &&
        !authenticated && (
          <Link
            href="/login"
            className="mt-6 flex h-10 items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] text-[15px] font-bold text-white shadow-[0_0_28px_rgba(139,92,246,0.42)]"
          >
            Log in
          </Link>
        )}

      {!collapsed && (
        <footer className={cx("absolute bottom-5 left-4 right-4 border-t pt-5 text-sm font-bold leading-7", isDark ? "border-violet-200/10 text-violet-100/38" : "border-violet-200 text-violet-950/38")}>
          <p>Company</p>
          <p>Program</p>
          <p>Terms & Policies</p>
          <p className="font-medium">© 2026 XSpann RNB</p>
        </footer>
      )}

    </aside>
  );
}

function MoreSheetContent({ isDark, authenticated, logout, setTheme }: { isDark: boolean; authenticated: boolean; logout: () => void | Promise<void>; setTheme: (theme: "dark" | "light") => void }) {
  return (
    <SheetContent
      side="left"
      showOverlay={false}
      className={cx(
        "px-6 py-5 backdrop-blur-2xl transition-colors duration-200",
        isDark ? "border-violet-200/10 bg-[#090313]/94 text-white" : "border-violet-200 bg-white/95 text-zinc-950",
      )}
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Logo />
          <SheetTitle className="text-xl font-bold">More</SheetTitle>
        </div>
        <SheetClose asChild>
          <button type="button" className={cx("grid h-9 w-9 place-items-center rounded-full transition", isDark ? "bg-violet-950/55 text-violet-100/80 hover:bg-violet-800/55 hover:text-white" : "bg-violet-100 text-violet-950/70 hover:bg-violet-200 hover:text-violet-950")} aria-label="Close more menu">
            <X size={18} />
          </button>
        </SheetClose>
      </div>

      <div className="space-y-7">
        <section>
          <p className={cx("mb-4 text-sm font-medium", isDark ? "text-violet-100/42" : "text-violet-950/48")}>Settings</p>
          <div className="space-y-2">
            <MorePanelRow icon={<Settings size={19} />} label="General" href="/settings" />
            <div className="flex h-12 items-center justify-between rounded-md px-1 text-[16px] font-semibold">
              <span className="inline-flex items-center gap-3">
                <Moon size={19} /> Dark mode
              </span>
              <div className={cx("flex cursor-pointer rounded-full p-1", isDark ? "bg-violet-950/55" : "bg-violet-100")}>
                <button type="button" onClick={() => setTheme("light")} className={cx("grid h-8 w-8 cursor-pointer place-items-center rounded-full transition", !isDark ? "bg-violet-700/75 text-white" : "text-violet-100/45 hover:text-white")} aria-label="Light mode">
                  <Sun size={15} />
                </button>
                <button type="button" onClick={() => setTheme("dark")} className={cx("grid h-8 w-8 cursor-pointer place-items-center rounded-full transition", isDark ? "bg-violet-700/75 text-white" : "text-violet-950/45 hover:text-violet-950")} aria-label="Dark mode">
                  <Moon size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={cx("border-t pt-6", isDark ? "border-violet-200/10" : "border-violet-200")}>
          <p className={cx("mb-4 text-sm font-medium", isDark ? "text-violet-100/42" : "text-violet-950/48")}>Tools</p>
          <div className="space-y-2">
            <MorePanelRow icon={<Sparkles size={19} />} label="XSpann RNB Studio" href="/posts" badge />
            <MorePanelRow icon={<Wand2 size={19} />} label="Create XSpann RNB effects" href="/upload" />
          </div>
        </section>

        <section className={cx("border-t pt-6", isDark ? "border-violet-200/10" : "border-violet-200")}>
          <p className={cx("mb-4 text-sm font-medium", isDark ? "text-violet-100/42" : "text-violet-950/48")}>Other</p>
          <div className="space-y-2">
            <MorePanelRow icon={<HelpCircle size={19} />} label="Help Center" href="/settings" />
            {authenticated && (
              <SheetClose asChild>
                <button type="button" onClick={() => void logout()} className={cx("flex h-12 w-full items-center gap-3 rounded-md px-1 text-left text-[16px] font-semibold transition", isDark ? "text-white hover:bg-violet-500/12" : "text-violet-950 hover:bg-violet-100")}>
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

function MorePanelRow({ icon, label, href, onClick, badge = false }: { icon: React.ReactNode; label: string; href?: string; onClick?: () => void; badge?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const content = (
    <>
      <span className="inline-flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate">{label}</span>
        {badge && <span className="h-1.5 w-1.5 rounded-full bg-[var(--pink-signal)]" />}
      </span>
    </>
  );

  if (!href) {
    return (
      <button type="button" className={cx("flex h-12 w-full items-center justify-between gap-3 rounded-md px-1 text-left text-[16px] font-semibold transition", isDark ? "text-white hover:bg-violet-500/12" : "text-violet-950 hover:bg-violet-100")}>
        {content}
      </button>
    );
  }

  return (
    <SheetClose asChild>
      <Link href={href} onClick={onClick} className={cx("flex h-12 items-center justify-between gap-3 rounded-md px-1 text-[16px] font-semibold transition", isDark ? "text-white hover:bg-violet-500/12" : "text-violet-950 hover:bg-violet-100")}>
        {content}
      </Link>
    </SheetClose>
  );
}
