"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ExternalLink, LoaderCircle, MapPin, Music2, Play, Users } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { XpnLoader } from "@/components/common/xpn-loader";
import { followArtist, getArtistBySlug, getArtistFollowers, getArtistPlaylists, getArtistVideos, unfollowArtist } from "@/services/artists";
import { getUpdateSubscription, setUpdateSubscription } from "@/services/messaging";
import type { Artist, UserSummary } from "@/types/api";

const RELEASES_PAGE_SIZE = 12;
const PLAYLISTS_PAGE_SIZE = 5;

export function ArtistProfile({ slug }: { slug: string }) {
  const { token, user } = useAuth();
  const client = useQueryClient();
  const artistQuery = useQuery({ queryKey: ["artist", slug, user?.id ?? "guest"], queryFn: () => getArtistBySlug(slug, token) });
  const artist = artistQuery.data?.data;
  const videos = useInfiniteQuery({ queryKey: ["artist-videos", artist?.id, user?.id ?? "guest", RELEASES_PAGE_SIZE], enabled: Boolean(artist), queryFn: ({ pageParam }) => getArtistVideos(artist!.id, token, pageParam, RELEASES_PAGE_SIZE), initialPageParam: 1, getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined });
  const playlists = useInfiniteQuery({ queryKey: ["artist-playlists", artist?.id, user?.id ?? "guest", PLAYLISTS_PAGE_SIZE], enabled: Boolean(artist), queryFn: ({ pageParam }) => getArtistPlaylists(artist!.id, token, pageParam, PLAYLISTS_PAGE_SIZE), initialPageParam: 1, getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined });
  const followers = useQuery({ queryKey: ["artist-followers", artist?.id, user?.id ?? "guest"], enabled: Boolean(artist), queryFn: () => getArtistFollowers(artist!.id, token) });
  const videoResults = videos.data?.pages.flatMap((page) => page.data) ?? [];
  const playlistResults = playlists.data?.pages.flatMap((page) => page.data) ?? [];
  const follow = useMutation({
    mutationFn: () => artist!.viewer.following ? unfollowArtist(artist!.id, token!) : followArtist(artist!.id, token!),
    onSuccess: (response) => {
      client.setQueryData<{ data: Artist }>(["artist", slug, user?.id ?? "guest"], (current) => current ? { data: { ...current.data, followers_count: response.data.followers_count, viewer: { ...current.data.viewer, following: response.data.following } } } : current);
      void client.invalidateQueries({ queryKey: ["profile"] });
      void client.invalidateQueries({ queryKey: ["artists"] });
      void client.invalidateQueries({ queryKey: ["artist-followers", artist!.id] });
    },
  });

  if (artistQuery.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Loading artist…" /></div>;
  if (!artist) return <div className="page-content px-6 text-center"><h1 className="text-2xl font-semibold">Artist unavailable</h1><Link href="/artists" className="mt-4 inline-block font-bold text-[var(--royal)]">Browse artists</Link></div>;

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]"><div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,#7c3aed55,transparent_58%)]" /><div className="relative flex flex-col gap-6 p-6 pt-20 sm:flex-row sm:items-end sm:p-9 sm:pt-24">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--panel)] bg-[var(--surface)]">{artist.image_url ? <Image src={artist.image_url} alt={artist.stage_name} fill sizes="128px" className="object-cover" /> : <div className="grid h-full place-items-center"><Music2 size={38} className="text-[var(--muted)]" /></div>}</div>
      <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--royal)]">Artist profile</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{artist.stage_name}</h1><div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]"><span className="inline-flex items-center gap-1.5"><Users size={16} /> {artist.followers_count} followers</span>{artist.location && <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {artist.location}</span>}</div></div>
      {user?.id !== artist.user_id && <div className="flex max-w-sm flex-col items-end gap-2">{token && user && <FanSubscription key={`${artist.id}-${user.id}`} artistId={artist.id} userId={user.id} token={token} />}{token ? <button disabled={follow.isPending} onClick={() => follow.mutate()} className="primary-button">{follow.isPending && <LoaderCircle className="animate-spin" size={15} />}{artist.viewer.following ? "Following" : "Follow"}</button> : <Link href={`/login?next=${encodeURIComponent(`/artists/${slug}`)}`} className="primary-button">Sign in to follow</Link>}</div>}
    </div></div>
    {artist.featured_release && <Link href={`/video/${artist.featured_release.id}`} className="mt-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-violet-500/25 bg-[linear-gradient(110deg,#7c3aed18,var(--panel))] p-5 sm:flex-row sm:items-center"><div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[var(--surface)] sm:w-52">{artist.featured_release.thumbnail_url && <Image src={artist.featured_release.thumbnail_url} alt="" fill sizes="208px" className="object-cover" />}<span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white"><Play size={17} fill="currentColor" /></span></span></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Featured release</p><h2 className="mt-2 text-xl font-semibold">{artist.featured_release.caption || "Featured video"}</h2><p className="mt-2 text-sm text-[var(--muted)]">Selected by {artist.stage_name}</p></div></Link>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]"><div><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><h2 className="text-lg font-semibold">About</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--muted)]">{artist.bio || "This artist has not added a bio yet."}</p><div className="mt-4 flex flex-wrap gap-2">{artist.genres.map((genre) => <span key={genre.id} className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-[var(--royal)]">{genre.name}</span>)}</div></section>
      <section className="mt-6"><h2 className="text-xl font-semibold">Releases</h2><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{videoResults.map((video) => <Link key={video.id} href={`/video/${video.id}`} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">{video.thumbnail_url && <Image src={video.thumbnail_url} alt="" fill sizes="33vw" className="object-cover transition group-hover:scale-[1.02]" />}<span className="absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Play size={15} fill="currentColor" /></span></div><p className="mt-2 line-clamp-2 text-sm font-medium">{video.caption || "Untitled release"}</p></Link>)}</div>{videos.hasNextPage && <button type="button" disabled={videos.isFetchingNextPage} onClick={() => void videos.fetchNextPage()} className="mt-5 h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Load more releases</button>}</section></div>
      <aside className="space-y-5"><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><h2 className="font-semibold">Listen & connect</h2><div className="mt-3 space-y-2">{artist.links.map((link) => <a key={`${link.type}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-3 py-3 text-sm font-medium"><span>{link.label}</span><ExternalLink size={14} className="text-[var(--muted)]" /></a>)}{!artist.links.length && <p className="text-sm text-[var(--muted)]">No links yet.</p>}</div></section><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><h2 className="font-semibold">Playlists</h2><div className="modern-scrollbar mt-3 max-h-[30.25rem] overflow-y-auto pr-1"><div className="space-y-3">{playlistResults.map((playlist) => <Link href={`/artists/${artist.slug}/playlists/${playlist.id}`} key={playlist.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface)] p-2.5 transition hover:bg-[var(--surface-hover)]"><span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-900">{playlist.cover_url ? <Image src={playlist.cover_url} alt="" fill sizes="48px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-violet-950"><Music2 size={17} className="text-violet-200" /></span>}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{playlist.title}</span><span className="mt-1 block text-xs text-[var(--muted)]">{playlist.videos_count} releases · {playlist.category.replaceAll("_", " ")}</span></span></Link>)}{!playlistResults.length && <p className="text-sm text-[var(--muted)]">No public playlists.</p>}{playlists.hasNextPage && <button type="button" disabled={playlists.isFetchingNextPage} onClick={() => void playlists.fetchNextPage()} className="w-full rounded-lg py-2 text-xs font-bold text-[var(--royal)] disabled:opacity-60">{playlists.isFetchingNextPage ? "Loading…" : "Load more playlists"}</button>}</div></div></section><FollowersCard followers={followers.data?.data} loading={followers.isPending} total={artist.followers_count} /></aside>
    </div>
  </div></section>;
}

function FanSubscription({ artistId, userId, token }: { artistId: number; userId: number; token: string }) {
  const client = useQueryClient();
  const key = ["artist-updates", artistId, userId];
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  const query = useQuery({ queryKey: key, queryFn: () => getUpdateSubscription(artistId, token) });
  const consent = query.data?.data;
  const update = useMutation({
    mutationFn: (subscribe: boolean) => setUpdateSubscription(artistId, subscribe
      ? { subscribed: true, consent_version: consent!.current_consent_version }
      : { subscribed: false }, token),
    onSuccess: (response) => { client.setQueryData(key, response); setAcceptedVersion(null); },
  });

  if (!consent) return query.isError ? <button onClick={() => void query.refetch()}>Retry loading fan updates</button> : null;
  const needsConsent = !consent.subscribed || consent.consent_version !== consent.current_consent_version;
  const checked = acceptedVersion === consent.current_consent_version;

  return <div className="w-full rounded-xl border border-[var(--line)] p-3 text-sm">
    <p className="font-semibold">Fan updates</p>
    {!consent.artist_updates_enabled && <p className="mt-1 text-xs text-[var(--muted)]">Artist updates are paused in your communication preferences.</p>}
    {needsConsent && (consent.wording ? <>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={checked} disabled={!consent.artist_updates_enabled || update.isPending} onChange={(event) => setAcceptedVersion(event.target.checked ? consent.current_consent_version : null)} className="mt-1 accent-violet-600" />{consent.wording}</label>
      <button disabled={!checked || update.isPending || !consent.artist_updates_enabled} onClick={() => update.mutate(true)} className="primary-button mt-2 w-full"><Bell size={15} />{consent.subscribed ? "Renew consent" : "Get artist updates"}</button>
    </> : <p className="mt-1 text-xs text-[var(--muted)]">Consent wording is currently unavailable.</p>)}
    {consent.subscribed && <button disabled={update.isPending} onClick={() => update.mutate(false)} className="mt-2 text-xs font-semibold text-[var(--royal)]">Stop updates from this artist</button>}
    {update.isError && <p role="alert" className="mt-2 text-xs text-pink-400">{update.error.message}</p>}
  </div>;
}

function FollowersCard({ followers, loading, total }: { followers?: UserSummary[]; loading: boolean; total: number }) {
  const visibleFollowers = followers?.slice(0, 6) ?? [];

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Community</p>
          <h2 className="mt-1 font-semibold">Followers</h2>
        </div>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-[var(--royal)]">
          {total.toLocaleString()}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Loading followers">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-[var(--surface)]" />
          ))}
        </div>
      ) : visibleFollowers.length ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {visibleFollowers.map((follower) => {
              const displayName = follower.name?.trim() || `@${follower.username}`;
              return (
                <Link
                  key={follower.id}
                  href={`/profile/${follower.username}`}
                  className="group flex min-w-0 items-center gap-2 rounded-xl bg-[var(--surface)] p-2 transition hover:bg-[var(--surface-hover)]"
                  aria-label={`Open ${displayName}'s profile`}
                >
                  <UserAvatar src={follower.avatar} alt={displayName} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold group-hover:text-[var(--royal)]">{displayName}</span>
                    {follower.name && <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">@{follower.username}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
          {total > visibleFollowers.length && (
            <p className="mt-3 text-center text-[11px] font-medium text-[var(--muted)]">
              Showing {visibleFollowers.length} of {total.toLocaleString()} followers
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-center">
          <Users className="mx-auto text-[var(--muted)]" size={22} />
          <p className="mt-2 text-sm font-medium">No followers yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">New supporters will appear here.</p>
        </div>
      )}
    </section>
  );
}
