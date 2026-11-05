"use client";

import Image from "next/image";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { LoaderCircle, MapPin, Music2, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { getArtists, getArtistTaxonomy } from "@/services/artists";

export function ArtistDirectory() {
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [genreId, setGenreId] = useState(0);
  const [sort, setSort] = useState<"latest" | "popular">("popular");
  const taxonomy = useQuery({ queryKey: ["artist-taxonomy"], queryFn: getArtistTaxonomy, staleTime: 60 * 60_000 });
  const artists = useInfiniteQuery({
    queryKey: ["artists", user?.id ?? "guest", query, genreId, sort],
    queryFn: ({ pageParam }) => getArtists({ q: query.trim(), genreId: genreId || undefined, sort, page: pageParam, limit: 30 }, token),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
  });
  const results = artists.data?.pages.flatMap((page) => page.data) ?? [];

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-[var(--royal)]">Artist community</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Find your next favorite artist</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Explore independent artists, their releases, playlists and updates.</p></div>
        {token && <Link href="/studio" className="primary-button"><Sparkles size={17} /> Artist workspace</Link>}
      </div>
      <div className="mt-8 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-[1fr_220px_160px]">
        <label className="flex h-11 items-center gap-3 rounded-xl bg-[var(--surface)] px-4"><Search size={18} className="text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search stage name or slug" /></label>
        <select value={genreId} onChange={(event) => setGenreId(Number(event.target.value))} className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"><option value={0}>All genres</option>{taxonomy.data?.data.genres.map((genre) => <option value={genre.id} key={genre.id}>{genre.name}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value as "latest" | "popular")} className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none"><option value="popular">Popular</option><option value="latest">Latest</option></select>
      </div>
      {artists.isPending && <div className="grid min-h-72 place-items-center"><XpnLoader label="Finding artists…" /></div>}
      {artists.isError && <div className="mt-8 rounded-xl border border-pink-500/20 bg-pink-500/5 p-6 text-sm">Artists could not be loaded. <button onClick={() => void artists.refetch()} className="font-bold text-[var(--royal)]">Try again</button></div>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((artist) => <Link key={artist.id} href={`/artists/${artist.slug}`} className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition hover:-translate-y-0.5 hover:border-violet-500/30">
          <div className="relative aspect-[2/1] bg-[linear-gradient(135deg,#2e1065,#18181b)]">{artist.image_url ? <Image src={artist.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="grid h-full place-items-center"><Music2 size={40} className="text-violet-300/70" /></div>}<span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">{artist.presentation.enhanced_directory_card ? "PRO ARTIST" : "ARTIST"}</span></div>
          <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{artist.stage_name}</h2><p className="mt-1 text-xs text-[var(--muted)]">@{artist.slug}</p></div><span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]"><Users size={14} /> {artist.followers_count}</span></div>{artist.bio && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{artist.bio}</p>}<div className="mt-4 flex flex-wrap gap-2">{artist.genres.slice(0, 3).map((genre) => <span key={genre.id} className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--royal)]">{genre.name}</span>)}{artist.location && <span className="inline-flex items-center gap-1 px-1 py-1 text-[11px] text-[var(--muted)]"><MapPin size={12} /> {artist.location}</span>}</div></div>
        </Link>)}
      </div>
      {artists.hasNextPage && <div className="mt-7 flex justify-center"><button type="button" disabled={artists.isFetchingNextPage} onClick={() => void artists.fetchNextPage()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{artists.isFetchingNextPage && <LoaderCircle size={16} className="animate-spin" />}Load more artists</button></div>}
      {!artists.isPending && !results.length && <div className="py-20 text-center"><Music2 className="mx-auto text-[var(--muted)]" size={36} /><h2 className="mt-4 font-semibold">No artists found</h2><p className="mt-2 text-sm text-[var(--muted)]">Try another search or genre.</p></div>}
    </div>
  </section>;
}
