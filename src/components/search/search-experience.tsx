"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { compactNumber, cx } from "@/lib/format";
import { trendingTags, videos } from "@/lib/mock-data";
import { getFeedVideos } from "@/services/videos";

export function SearchExperience() {
  const searchParams = useSearchParams();
  return <SearchResults key={searchParams.get("q") ?? ""} initialQuery={searchParams.get("q") ?? ""} />;
}

function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const { token, loading } = useAuth();
  const feed = useQuery({
    queryKey: ["search-discovery", token ? "auth" : "guest"],
    enabled: !loading,
    queryFn: () => getFeedVideos(40, token).then((response) => response.data),
    staleTime: 30_000,
  });
  const availableVideos = feed.data?.length ? feed.data : videos;
  const normalizedQuery = query.trim().replace(/^#/, "").toLowerCase();
  const results = availableVideos.filter((video) => [video.caption, video.user.username, ...video.tags].join(" ").toLowerCase().includes(normalizedQuery));

  return (
    <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Find your next favorite video.</p>
        <form role="search" onSubmit={(event) => event.preventDefault()} className="mt-7 flex h-12 max-w-2xl items-center gap-3 rounded-xl bg-[var(--surface)] px-4 focus-within:outline-2 focus-within:outline-[var(--royal)]">
          <Search size={20} strokeWidth={1.8} className="shrink-0 text-[var(--muted)]" />
          <input aria-label="Search videos, creators and hashtags" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]" placeholder="Search videos, creators, hashtags" />
          {query && <button type="button" onClick={() => setQuery("")} className="icon-button" aria-label="Clear search"><X size={18} /></button>}
        </form>
        <div className="my-5 flex flex-wrap gap-2" aria-label="Explore hashtags">
          {trendingTags.map((tag) => <button type="button" key={tag} onClick={() => setQuery(query === tag ? "" : tag)} aria-pressed={query === tag} className={cx("rounded-full px-3.5 py-2 text-xs font-medium transition", query === tag ? "bg-violet-500/10 text-[var(--royal)]" : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]")}>{tag}</button>)}
        </div>
        <p role="status" className="mb-4 text-xs text-[var(--muted)]">{feed.isPending ? "Finding videos…" : normalizedQuery ? `${results.length} matching ${results.length === 1 ? "video" : "videos"} in discovery` : "Explore videos"}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((video) => (
            <Link key={video.id} href={`/video/${video.id}`} className="group min-w-0 rounded-xl" aria-label={`Watch video by @${video.user.username}: ${video.caption ?? ""}`}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">
                <Image src={video.thumbnail_url ?? "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85"} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-10 text-xs font-medium text-white"><Play size={13} fill="currentColor" />{compactNumber(video.stats.views)}</div>
              </div>
              <p className="mt-2.5 truncate text-sm font-semibold">@{video.user.username}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{video.caption}</p>
            </Link>
          ))}
        </div>
        {!results.length && <div className="py-16 text-center"><Search size={32} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--muted)]" /><h2 className="font-semibold">No matching videos</h2><p className="mt-2 text-sm text-[var(--muted)]">Try a different creator, hashtag, or keyword.</p><button type="button" onClick={() => setQuery("")} className="mt-5 text-sm font-semibold text-[var(--royal)]">Explore all videos</button></div>}
      </div>
    </section>
  );
}
