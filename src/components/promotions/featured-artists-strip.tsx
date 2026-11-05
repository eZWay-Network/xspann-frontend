"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgeCheck, Sparkles } from "lucide-react";
import { getFeaturedArtists } from "@/services/promotions";

export function FeaturedArtistsStrip() {
  const featured = useInfiniteQuery({ queryKey: ["featured-artists"], queryFn: ({ pageParam }) => getFeaturedArtists(pageParam), initialPageParam: null as string | null, getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined, staleTime: 60_000 });
  const rows = featured.data?.pages.flatMap((page) => page.data) ?? [];
  if (!rows.length) return null;
  return <section className="mb-7" aria-labelledby="featured-artists-title"><div className="mb-3 flex items-center gap-2"><Sparkles size={17} className="text-[var(--royal)]" /><div><h2 id="featured-artists-title" className="text-sm font-semibold">Featured artists</h2><p className="text-xs text-[var(--muted)]">Capacity-limited complimentary pilot placements.</p></div></div><div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">{rows.map((placement) => <Link key={placement.id} href={`/artists/${placement.artist.slug}`} className="w-56 shrink-0 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4"><p className="flex items-center gap-1 truncate font-semibold">{placement.artist.name}<BadgeCheck size={14} className="text-[var(--royal)]" /></p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--royal)]">{placement.disclosure}</p><p className="mt-2 text-xs text-[var(--muted)]">Featured through {new Date(placement.ends_at).toLocaleDateString()}</p></Link>)}</div>{featured.hasNextPage && <button type="button" onClick={() => void featured.fetchNextPage()} className="mt-2 text-xs font-bold text-[var(--royal)]">Load more featured artists</button>}</section>;
}
