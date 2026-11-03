"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ExternalLink, LoaderCircle, MapPin, Music2, Play, Users } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { XpnLoader } from "@/components/common/xpn-loader";
import { followArtist, getArtistBySlug, getArtistFollowers, getArtistPlaylists, getArtistVideos, unfollowArtist } from "@/services/artists";
import { getUpdateSubscription, setUpdateSubscription } from "@/services/messaging";
import type { Artist } from "@/types/api";

export function ArtistProfile({ slug }: { slug: string }) {
  const { token, user } = useAuth();
  const client = useQueryClient();
  const artistQuery = useQuery({ queryKey: ["artist", slug, user?.id ?? "guest"], queryFn: () => getArtistBySlug(slug, token) });
  const artist = artistQuery.data?.data;
  const videos = useQuery({ queryKey: ["artist-videos", artist?.id, user?.id ?? "guest"], enabled: Boolean(artist), queryFn: () => getArtistVideos(artist!.id, token) });
  const playlists = useQuery({ queryKey: ["artist-playlists", artist?.id, user?.id ?? "guest"], enabled: Boolean(artist), queryFn: () => getArtistPlaylists(artist!.id, token) });
  const followers = useQuery({ queryKey: ["artist-followers", artist?.id, user?.id ?? "guest"], enabled: Boolean(artist), queryFn: () => getArtistFollowers(artist!.id, token) });
  const subscription = useQuery({ queryKey: ["artist-updates", artist?.id, user?.id], enabled: Boolean(artist && token), queryFn: () => getUpdateSubscription(artist!.id, token!) });
  const follow = useMutation({
    mutationFn: () => artist!.viewer.following ? unfollowArtist(artist!.id, token!) : followArtist(artist!.id, token!),
    onSuccess: (response) => client.setQueryData<{ data: Artist }>(["artist", slug, user?.id ?? "guest"], (current) => current ? { data: { ...current.data, followers_count: response.data.followers_count, viewer: { ...current.data.viewer, following: response.data.following } } } : current),
  });
  const updates = useMutation({
    mutationFn: () => setUpdateSubscription(artist!.id, subscription.data?.data.subscribed ? { subscribed: false } : { subscribed: true, consent_version: subscription.data!.data.current_consent_version }, token!),
    onSuccess: () => void subscription.refetch(),
  });

  if (artistQuery.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Loading artist…" /></div>;
  if (!artist) return <div className="page-content px-6 text-center"><h1 className="text-2xl font-semibold">Artist unavailable</h1><Link href="/artists" className="mt-4 inline-block font-bold text-[var(--royal)]">Browse artists</Link></div>;

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]"><div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,#7c3aed55,transparent_58%)]" /><div className="relative flex flex-col gap-6 p-6 pt-20 sm:flex-row sm:items-end sm:p-9 sm:pt-24">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--panel)] bg-[var(--surface)]">{artist.image_url ? <Image src={artist.image_url} alt={artist.stage_name} fill sizes="128px" className="object-cover" /> : <div className="grid h-full place-items-center"><Music2 size={38} className="text-[var(--muted)]" /></div>}</div>
      <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--royal)]">Artist profile</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{artist.stage_name}</h1><div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]"><span className="inline-flex items-center gap-1.5"><Users size={16} /> {artist.followers_count} followers</span>{artist.location && <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {artist.location}</span>}</div></div>
      {user?.id !== artist.user_id && <div className="flex gap-2">{token && subscription.data?.data.wording && <button disabled={updates.isPending} onClick={() => updates.mutate()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold"><Bell size={16} /> {subscription.data.data.subscribed ? "Updates on" : "Get updates"}</button>}{token ? <button disabled={follow.isPending} onClick={() => follow.mutate()} className="primary-button">{follow.isPending && <LoaderCircle className="animate-spin" size={15} />}{artist.viewer.following ? "Following" : "Follow"}</button> : <Link href={`/login?next=${encodeURIComponent(`/artists/${slug}`)}`} className="primary-button">Sign in to follow</Link>}</div>}
    </div></div>
    {artist.featured_release && <Link href={`/video/${artist.featured_release.id}`} className="mt-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-violet-500/25 bg-[linear-gradient(110deg,#7c3aed18,var(--panel))] p-5 sm:flex-row sm:items-center"><div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[var(--surface)] sm:w-52">{artist.featured_release.thumbnail_url && <Image src={artist.featured_release.thumbnail_url} alt="" fill sizes="208px" className="object-cover" />}<span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white"><Play size={17} fill="currentColor" /></span></span></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Featured release</p><h2 className="mt-2 text-xl font-semibold">{artist.featured_release.caption || "Featured video"}</h2><p className="mt-2 text-sm text-[var(--muted)]">Selected by {artist.stage_name}</p></div></Link>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]"><div><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><h2 className="text-lg font-semibold">About</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--muted)]">{artist.bio || "This artist has not added a bio yet."}</p><div className="mt-4 flex flex-wrap gap-2">{artist.genres.map((genre) => <span key={genre.id} className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-[var(--royal)]">{genre.name}</span>)}</div></section>
      <section className="mt-6"><h2 className="text-xl font-semibold">Releases</h2><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{videos.data?.data.map((video) => <Link key={video.id} href={`/video/${video.id}`} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">{video.thumbnail_url && <Image src={video.thumbnail_url} alt="" fill sizes="33vw" className="object-cover transition group-hover:scale-[1.02]" />}<span className="absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Play size={15} fill="currentColor" /></span></div><p className="mt-2 line-clamp-2 text-sm font-medium">{video.caption || "Untitled release"}</p></Link>)}</div></section></div>
      <aside className="space-y-5"><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><h2 className="font-semibold">Listen & connect</h2><div className="mt-3 space-y-2">{artist.links.map((link) => <a key={`${link.type}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-3 py-3 text-sm font-medium"><span>{link.label}</span><ExternalLink size={14} className="text-[var(--muted)]" /></a>)}{!artist.links.length && <p className="text-sm text-[var(--muted)]">No links yet.</p>}</div></section><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><h2 className="font-semibold">Playlists</h2><div className="mt-3 space-y-3">{playlists.data?.data.map((playlist) => <Link href={`/artists/${artist.slug}/playlists/${playlist.id}`} key={playlist.id} className="block rounded-xl bg-[var(--surface)] p-3 transition hover:bg-[var(--surface-hover)]"><p className="font-medium">{playlist.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{playlist.videos_count} releases · {playlist.category.replaceAll("_", " ")}</p></Link>)}{!playlists.data?.data.length && <p className="text-sm text-[var(--muted)]">No public playlists.</p>}</div></section><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><h2 className="font-semibold">Followers</h2><div className="mt-3 flex flex-wrap gap-2">{followers.data?.data.slice(0, 8).map((follower) => <Link key={follower.id} href={`/profile/${follower.username}`} aria-label={`Open @${follower.username}`}><UserAvatar src={follower.avatar} size={36} /></Link>)}{!followers.isPending && !followers.data?.data.length && <p className="text-sm text-[var(--muted)]">No followers yet.</p>}</div></section></aside>
    </div>
  </div></section>;
}
