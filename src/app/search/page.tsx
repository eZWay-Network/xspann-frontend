"use client";

import Image from "next/image";
import { AppShell } from "@/components/common/app-shell";
import { useTheme } from "@/components/common/theme-provider";
import { Search } from "lucide-react";
import { cx } from "@/lib/format";
import { trendingTags, videos } from "@/lib/mock-data";

export default function SearchPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="glass-panel mb-6 rounded-lg p-5">
          <label className={cx("flex h-12 items-center gap-3 rounded-lg border px-4", isDark ? "border-violet-200/10 bg-white/[0.06]" : "border-zinc-200 bg-white")}><Search size={19} /><input className={cx("w-full bg-transparent outline-none", isDark ? "text-white placeholder:text-violet-100/40" : "text-zinc-950 placeholder:text-zinc-400")} placeholder="Search creators, videos, hashtags" /></label>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">{trendingTags.map((tag) => <span key={tag} className="rounded-full bg-violet-600/30 px-4 py-2 text-sm font-bold text-violet-100 ring-1 ring-violet-300/20">{tag}</span>)}</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{videos.map((video) => <article key={video.id} className={cx("overflow-hidden rounded-lg border", isDark ? "border-violet-200/10 bg-white/[0.05]" : "border-zinc-200 bg-white shadow-sm")}><div className="relative aspect-[9/14]"><Image src={video.thumbnail_url ?? "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85"} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" /></div><p className={cx("line-clamp-2 p-3 text-sm", isDark ? "text-violet-50/80" : "text-zinc-700")}>{video.caption}</p></article>)}</div>
      </section>
    </AppShell>
  );
}
