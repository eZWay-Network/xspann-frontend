"use client";

import Link from "next/link";
import { useTheme } from "@/components/common/theme-provider";
import { cx } from "@/lib/format";

export function Logo() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link href="/feed" className="inline-flex items-center" aria-label="XSpann RNB home">
      <span className="leading-none">
        <span className={cx("block text-[22px] font-black tracking-tight", isDark ? "text-white" : "text-violet-950")}>XSpann</span>
        <span className="block text-[8px] font-bold uppercase tracking-[0.36em] text-violet-300">RNB</span>
      </span>
    </Link>
  );
}
