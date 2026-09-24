"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListVideo, Plus, UserRound, UserRoundPlus } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { cx } from "@/lib/format";

export function BottomNav() {
  const { authenticated, user } = useAuth();
  const pathname = usePathname();
  const profileHref = authenticated && user ? `/profile/${user.username}` : "/login";
  const items = [
    { label: "Home", href: "/feed", icon: Home },
    { label: "Following", href: "/following", icon: UserRoundPlus },
    { label: "Create", href: "/upload", icon: Plus },
    { label: "Posts", href: "/posts", icon: ListVideo },
    { label: "Profile", href: profileHref, icon: UserRound },
  ];

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--background)] px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={cx("flex h-[51px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition", active ? "text-[var(--royal)]" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
            {item.label === "Create" ? (
              <span className="grid h-7 w-10 place-items-center rounded-lg bg-[#7545e8] text-white"><item.icon size={22} strokeWidth={2} /></span>
            ) : <item.icon size={22} strokeWidth={active ? 2.3 : 1.8} />}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
