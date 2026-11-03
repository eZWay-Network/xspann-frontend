"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ListMusic, Play } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { getArtistBySlug, getArtistPlaylist } from "@/services/artists";

export function ArtistPlaylistPage({ slug, playlistId }: { slug: string; playlistId: number }) {
  const { token, user } = useAuth();
  const artist = useQuery({
    queryKey: ["artist", slug, user?.id ?? "guest"],
    queryFn: () => getArtistBySlug(slug, token),
  });
  const playlist = useQuery({
    queryKey: ["artist-playlist", artist.data?.data.id, playlistId, user?.id ?? "guest"],
    enabled: Boolean(artist.data),
    queryFn: () => getArtistPlaylist(artist.data!.data.id, playlistId, token),
  });

  if (artist.isPending || playlist.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Loading playlist…" /></div>;
  if (!artist.data || !playlist.data) return <div className="page-content px-6 text-center"><ListMusic className="mx-auto text-[var(--muted)]" size={36} /><h1 className="mt-4 text-2xl font-semibold">Playlist unavailable</h1><Link href={`/artists/${slug}`} className="mt-4 inline-block font-bold text-[var(--royal)]">Return to artist</Link></div>;

  const owner = artist.data.data;
  const collection = playlist.data.data;
  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-6xl">
    <Link href={`/artists/${slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"><ArrowLeft size={16} /> {owner.stage_name}</Link>
    <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end"><div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface)]">{collection.cover_url ? <Image src={collection.cover_url} alt="" fill sizes="160px" className="object-cover" /> : <div className="grid h-full place-items-center"><ListMusic size={40} className="text-[var(--muted)]" /></div>}</div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--royal)]">{collection.category.replaceAll("_", " ")} playlist</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{collection.title}</h1>{collection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{collection.description}</p>}<p className="mt-3 text-xs text-[var(--muted)]">{collection.videos_count} visible {collection.videos_count === 1 ? "video" : "videos"}</p></div></div>
    <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{collection.videos?.map((video) => <Link key={video.id} href={`/video/${video.id}`} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--surface)]">{video.thumbnail_url && <Image src={video.thumbnail_url} alt="" fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover transition group-hover:scale-[1.03]" />}<span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white"><Play size={16} fill="currentColor" /></span></div><p className="mt-2 line-clamp-2 text-sm font-semibold">{video.caption || "Untitled video"}</p></Link>)}</div>
    {!collection.videos?.length && <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] py-16 text-center"><ListMusic className="mx-auto text-[var(--muted)]" size={34} /><p className="mt-3 font-semibold">No visible videos</p><p className="mt-1 text-sm text-[var(--muted)]">Items may be private, unavailable, or not added yet.</p></div>}
  </div></section>;
}
