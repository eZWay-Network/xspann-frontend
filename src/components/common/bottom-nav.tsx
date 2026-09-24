"use client";

import Link from "next/link";
import { Home, ListVideo, PlusSquare, UserRound, UserRoundPlus } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { cx } from "@/lib/format";

export function BottomNav() {
  const { authenticated, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const profileHref = authenticated && user ? `/profile/${user.username}` : "/login";
  const items = [
    { label: "Home", href: "/feed", icon: Home },
    { label: "Following", href: "/following", icon: UserRoundPlus },
    { label: "Upload", href: "/upload", icon: PlusSquare },
    { label: "Posts", href: "/posts", icon: ListVideo },
    { label: "Profile", href: profileHref, icon: UserRound },
  ];

  return (
    <nav className={cx("fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t px-2 py-2 backdrop-blur-xl md:hidden", isDark ? "border-violet-200/10 bg-[#090313]/95" : "border-zinc-200 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]")}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          className={cx("grid h-11 place-items-center rounded-md px-2 transition", isDark ? "text-violet-100/72 hover:bg-violet-500/12 hover:text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950")}
        >
          <item.icon size={22} />
        </Link>
      ))}
    </nav>
  );
}
