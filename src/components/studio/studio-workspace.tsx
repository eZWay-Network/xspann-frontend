"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarClock, CheckCircle2, CircleDollarSign, ExternalLink, GripVertical, ListMusic, LoaderCircle, Megaphone, Music2, Pencil, Plus, Rocket, Settings2, Trash2, Users } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { ApiError } from "@/services/api";
import { createPlaylist, deletePlaylist, getArtistAnalytics, getArtistTaxonomy, getFanSummary, getMyArtist, getMyPlaylist, getMyPlaylists, replacePlaylistItems, saveArtistLinks, saveMyArtist, updatePlaylist, uploadArtistImage } from "@/services/artists";
import { getEntitlements } from "@/services/billing";
import { createAnnouncement, getOwnerAnnouncements, sendAnnouncement } from "@/services/messaging";
import { createBoost, getBoostBalance, getBoosts, getPromotionOffers, submitBoost } from "@/services/promotions";
import { cancelReleaseSchedule, getReleases, publishRelease, retryRelease, scheduleRelease } from "@/services/releases";
import { getMyVideos } from "@/services/videos";
import { buildArtistProfilePayload, buildUtcDailySeries, FREE_ARTIST_CAPABILITIES, normalizeArtistSlug, sameOrderedIds } from "@/lib/artists";
import type { Artist, ArtistCapabilities, ArtistPlaylist, Boost, Release, Video } from "@/types/api";

type Tab = "overview" | "profile" | "releases" | "playlists" | "announcements" | "promotions";
const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "overview", label: "Overview", icon: BarChart3 }, { id: "profile", label: "Artist profile", icon: Settings2 },
  { id: "releases", label: "Releases", icon: CalendarClock }, { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "announcements", label: "Fan updates", icon: Megaphone }, { id: "promotions", label: "Promotions", icon: Rocket },
];

export function StudioWorkspace() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [createdArtist, setCreatedArtist] = useState<Artist | null>(null);
  const artistQuery = useQuery({ queryKey: ["my-artist", user?.id], enabled: Boolean(token), queryFn: async () => { try { return (await getMyArtist(token!)).data; } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } } });
  const entitlements = useQuery({ queryKey: ["entitlements", user?.id], enabled: Boolean(token), queryFn: () => getEntitlements(token!), refetchOnWindowFocus: true });
  const refetchEntitlements = entitlements.refetch;

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refetchEntitlements();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [refetchEntitlements]);

  if (artistQuery.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Opening your workspace…" /></div>;
  if (artistQuery.isError) return <WorkspaceError retry={() => void artistQuery.refetch()} />;
  if (createdArtist) return <ArtistCreated artist={createdArtist} onOpenWorkspace={() => setCreatedArtist(null)} />;
  if (!artistQuery.data) return <ProfileEditor artist={null} token={token!} userId={user!.id} capabilities={FREE_ARTIST_CAPABILITIES} onCreated={setCreatedArtist} />;
  const artist = artistQuery.data;
  const capabilities = entitlements.data?.data.capabilities ?? (entitlements.isError ? artist.capabilities : undefined) ?? FREE_ARTIST_CAPABILITIES;
  const playlistUsage = entitlements.data?.data.usage?.playlists;

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-[var(--royal)]">Artist workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back, {artist.stage_name}</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage your identity, releases and fan relationships in one place.</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase text-[var(--royal)]">{entitlements.data?.data.effective_plan ?? artist.capabilities?.plan ?? "free"}</span><Link href={`/artists/${artist.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--royal)]">View public page <ExternalLink size={15} /></Link></div></div>
    <div className="mt-7 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 no-scrollbar">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${tab === item.id ? "bg-violet-600 text-white" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`}><item.icon size={16} />{item.label}</button>)}</div>
    <div className="mt-6">{tab === "overview" && <Overview artist={artist} token={token!} />}{tab === "profile" && <ProfileEditor artist={artist} token={token!} userId={user!.id} capabilities={capabilities} />}{tab === "releases" && <ReleasesPanel token={token!} userId={user!.id} canSchedule={capabilities.release_scheduling} />}{tab === "playlists" && <PlaylistsPanel token={token!} userId={user!.id} limit={capabilities.playlists} reportedUsage={playlistUsage} />}{tab === "announcements" && <AnnouncementsPanel token={token!} userId={user!.id} enabled={capabilities.fan_announcements > 0} />}{tab === "promotions" && <PromotionsPanel token={token!} userId={user!.id} />}</div>
  </div></section>;
}

function Overview({ artist, token }: { artist: Artist; token: string }) {
  const analytics = useQuery({ queryKey: ["artist-analytics", artist.id], queryFn: () => getArtistAnalytics(token) });
  const fans = useQuery({ queryKey: ["artist-fans", artist.id], queryFn: () => getFanSummary(token) });
  const totals = analytics.data?.data.totals ?? {};
  const cards = [{ label: "Followers", value: fans.data?.data.followers_count ?? artist.followers_count, icon: Users }, { label: "Views", value: totals.views ?? 0, icon: BarChart3 }, { label: "Published videos", value: totals.videos ?? 0, icon: Music2 }, { label: "Update subscribers", value: fans.data?.data.announcement_subscribers_count ?? 0, icon: Megaphone }];
  const metric = analytics.data?.data.metrics?.find((item) => item.key === "views") ?? { key: "views", label: "Recorded views" };
  const series = analytics.data ? buildUtcDailySeries(analytics.data.data.daily, analytics.data.data.data_since) : [];
  const maximum = Math.max(1, ...series.map((day) => Number(day.point?.[metric.key] ?? 0)));
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--royal)]"><card.icon size={19} /></span><p className="mt-5 text-3xl font-semibold">{card.value.toLocaleString()}</p><p className="mt-1 text-sm text-[var(--muted)]">{card.label}</p></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="text-lg font-semibold">Performance</h2><p className="mt-1 text-xs text-[var(--muted)]">{metric.label} · cumulative UTC snapshots</p></div>{analytics.data?.data.data_since && <p className="text-xs text-[var(--muted)]">Collected since {new Date(analytics.data.data.data_since).toLocaleDateString()}</p>}</div>{analytics.data?.data.trends_available ? <div className="mt-6 flex h-48 items-end gap-1" aria-label={`${metric.label} for the last ${series.length} UTC days`}>{series.map((day) => <div key={day.date} title={`${day.date}: ${day.point ? Number(day.point[metric.key] ?? 0).toLocaleString() : "No data"}`} className="flex h-full min-w-1 flex-1 items-end">{day.point && <span style={{ height: `${Math.max(3, Number(day.point[metric.key] ?? 0) / maximum * 100)}%` }} className="block w-full rounded-t bg-violet-500/70" />}</div>)}</div> : <div className="mt-5 rounded-xl bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">30-day trends become available with Artist Starter. Current totals remain visible above.</div>}</section><section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><h2 className="text-lg font-semibold">Profile readiness</h2><div className="mt-5 space-y-4"><Readiness done={Boolean(artist.image_url)} label="Artist image" /><Readiness done={Boolean(artist.bio)} label="Artist bio" /><Readiness done={artist.genres.length > 0} label="Genre selected" /><Readiness done={artist.links.length > 0} label="External link" /></div></section></div></>;
}

function Readiness({ done, label }: { done: boolean; label: string }) { return <div className="flex items-center gap-3 text-sm"><CheckCircle2 size={18} className={done ? "text-emerald-400" : "text-[var(--muted)]"} /><span className={done ? "" : "text-[var(--muted)]"}>{label}</span></div>; }

function ProfileEditor({ artist, token, userId, capabilities, onCreated }: { artist: Artist | null; token: string; userId: number; capabilities: ArtistCapabilities; onCreated?: (artist: Artist) => void }) {
  const client = useQueryClient();
  const taxonomy = useQuery({ queryKey: ["artist-taxonomy"], queryFn: getArtistTaxonomy });
  const ownedVideos = useQuery({ queryKey: ["my-videos", userId, "featured-release"], enabled: Boolean(artist), queryFn: () => getMyVideos(token, 50) });
  const [draft, setDraft] = useState({ stage_name: artist?.stage_name ?? "", slug: artist?.slug ?? "", bio: artist?.bio ?? "", location: artist?.location ?? "", listed: artist?.listed ?? true, genre_ids: artist?.genres.map((genre) => genre.id) ?? [], image: artist?.image ?? null as string | null, featured_video_id: artist?.featured_video_id ?? artist?.featured_release?.id ?? null as number | null });
  const [links, setLinks] = useState(artist?.links ?? []);
  const [imagePreview, setImagePreview] = useState(artist?.image_url ?? null);
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const linksDirty = JSON.stringify(links) !== JSON.stringify(artist?.links ?? []);
  const linksOverLimit = links.length > capabilities.links;
  const mutation = useMutation({
    mutationFn: async () => {
      const saved = await saveMyArtist(buildArtistProfilePayload(artist, draft, capabilities.featured_release), token);
      if (linksDirty) return saveArtistLinks(links, token);
      return saved;
    },
    onSuccess: (response) => {
      client.setQueryData(["my-artist", userId], response.data);
      void client.invalidateQueries({ queryKey: ["artist"] });
      void client.invalidateQueries({ queryKey: ["artists"] });
      setStatus("Artist profile saved.");
      if (!artist) onCreated?.(response.data);
    },
    onError: (error) => {
      setFieldErrors(error instanceof ApiError ? error.errors : {});
      setStatus(error instanceof ApiError ? error.message : "Could not save the artist profile.");
      if (error instanceof ApiError && error.status === 403) void client.invalidateQueries({ queryKey: ["entitlements", userId] });
    },
  });
  const imageUpload = useMutation({
    mutationFn: (file: File) => uploadArtistImage(file, token),
    onSuccess: (response) => {
      setDraft((current) => ({ ...current, image: response.data.storage_path }));
      setImagePreview(response.data.image_url);
      setStatus("Image uploaded. Save changes to apply it.");
    },
    onError: (error) => setStatus(error instanceof ApiError ? error.message : "Could not upload the artist image."),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    setFieldErrors({});
    if (linksDirty && linksOverLimit) {
      setStatus(`Your current plan allows ${capabilities.links} ${capabilities.links === 1 ? "link" : "links"}. Remove extras before saving a links change.`);
      return;
    }
    mutation.mutate();
  }
  return <div className={artist ? "" : "page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"}><div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8"><p className="text-sm font-semibold text-[var(--royal)]">{artist ? "Public identity" : "Artist enrollment"}</p><h1 className="mt-1 text-2xl font-semibold">{artist ? "Edit artist profile" : "Create your artist profile"}</h1><p className="mt-2 text-sm text-[var(--muted)]">{artist ? "Keep your directory information current. Saved paid values stay here after a downgrade even when the public page no longer presents them." : "Choose your public identity. Creating an artist profile is free and keeps your existing account, followers and videos."}</p><form onSubmit={submit} className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><StudioField label="Stage name"><input required maxLength={120} value={draft.stage_name} onChange={(event) => setDraft({ ...draft, stage_name: event.target.value })} className="studio-input" />{fieldErrors.stage_name?.[0] && <FieldError message={fieldErrors.stage_name[0]} />}</StudioField><StudioField label="Public slug"><input required minLength={3} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: normalizeArtistSlug(event.target.value) })} className="studio-input" /><p className="mt-1 text-xs text-[var(--muted)]">Your shareable page will be /artists/{draft.slug || "your-slug"}.</p>{fieldErrors.slug?.[0] && <FieldError message={fieldErrors.slug[0]} />}</StudioField></div><StudioField label="Bio"><textarea rows={5} maxLength={2000} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} className="studio-input h-auto py-3" /></StudioField><div className="grid gap-4 sm:grid-cols-2"><StudioField label="Location"><input maxLength={120} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="studio-input" /></StudioField>{artist ? <StudioField label="Artist image"><div className="flex items-center gap-3">{imagePreview && <Image src={imagePreview} alt="" width={52} height={52} className="h-13 w-13 rounded-xl object-cover" />}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => event.target.files?.[0] && imageUpload.mutate(event.target.files[0])} className="studio-input py-2" /></div><p className="mt-1 text-xs text-[var(--muted)]">JPEG, PNG or WebP, up to 5 MiB.</p></StudioField> : <div className="rounded-xl bg-[var(--surface)] p-4 text-xs leading-5 text-[var(--muted)]">Save your artist profile first, then add its image and external links.</div>}</div><StudioField label="Genres (up to 5)"><div className="flex flex-wrap gap-2">{taxonomy.data?.data.genres.map((genre) => { const selected = draft.genre_ids.includes(genre.id); return <button type="button" key={genre.id} onClick={() => setDraft({ ...draft, genre_ids: selected ? draft.genre_ids.filter((id) => id !== genre.id) : draft.genre_ids.length < 5 ? [...draft.genre_ids, genre.id] : draft.genre_ids })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected ? "bg-violet-600 text-white" : "bg-[var(--surface)] text-[var(--muted)]"}`}>{genre.name}</button>; })}</div></StudioField>{artist && <StudioField label={`Links (${links.length}/${capabilities.links})`}><div className="space-y-2">{linksOverLimit && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300"><span>These saved links are above the current plan limit. Unrelated profile edits preserve them; remove extras before changing links.</span><Link href="/pricing" className="font-bold underline">Update plan</Link></div>}{links.map((link, index) => <div key={index} className="grid gap-2 sm:grid-cols-[110px_110px_1fr_40px]"><input value={link.label} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Label" className="studio-input" required /><select value={link.type} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as typeof link.type } : item))} className="studio-input">{taxonomy.data?.data.link_types.map((type) => <option key={type} value={type}>{type}</option>)}</select><input type="url" pattern="https://.*" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://" className="studio-input" required /><button type="button" aria-label={`Remove ${link.label || "link"}`} onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="icon-button"><Trash2 size={16} /></button></div>)}{links.length < capabilities.links && <button type="button" onClick={() => setLinks((current) => [...current, { label: "", type: "website", url: "https://" }])} className="text-sm font-bold text-[var(--royal)]">+ Add link</button>}</div></StudioField>}{artist && (capabilities.featured_release || draft.featured_video_id) && <StudioField label="Featured release"><select disabled={!capabilities.featured_release} value={draft.featured_video_id ?? 0} onChange={(event) => setDraft({ ...draft, featured_video_id: Number(event.target.value) || null })} className="studio-input"><option value={0}>No featured release</option>{ownedVideos.data?.data.filter((video) => video.status === "published" && video.visibility === "public" && video.moderation_status === "approved").map((video) => <option key={video.id} value={video.id}>{video.caption || `Video #${video.id}`}</option>)}</select>{!capabilities.featured_release && <p className="mt-1 text-xs text-amber-300">Your selection remains saved, but the current plan does not present it publicly. <Link href="/pricing" className="font-bold underline">Update plan</Link></p>}</StudioField>}<label className="flex items-center gap-3 rounded-xl bg-[var(--surface)] p-4 text-sm"><input type="checkbox" checked={draft.listed} onChange={(event) => setDraft({ ...draft, listed: event.target.checked })} className="accent-violet-600" /><span><b>Show in the artist directory</b><span className="mt-1 block text-xs text-[var(--muted)]">Your public slug remains shareable when this is off.</span></span></label>{status && <p role={mutation.isError || imageUpload.isError || (linksDirty && linksOverLimit) ? "alert" : "status"} className={mutation.isError || imageUpload.isError || (linksDirty && linksOverLimit) ? "text-sm text-pink-400" : "text-sm text-[var(--muted)]"}>{status}</p>}<button disabled={mutation.isPending || imageUpload.isPending} className="primary-button">{mutation.isPending && <LoaderCircle size={16} className="animate-spin" />}{artist ? "Save changes" : "Create artist profile"}</button>{!artist && <Link href="/feed" className="ml-3 text-sm font-bold text-[var(--muted)]">Continue to feed</Link>}</form></div></div>;
}

function ArtistCreated({ artist, onOpenWorkspace }: { artist: Artist; onOpenWorkspace: () => void }) {
  return <section className="page-content grid h-full place-items-center overflow-y-auto px-5"><div className="w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center sm:p-10"><CheckCircle2 size={48} className="mx-auto text-emerald-400" /><p className="mt-5 text-sm font-bold uppercase tracking-[.16em] text-[var(--royal)]">Artist profile created</p><h1 className="mt-2 text-3xl font-semibold">Welcome, {artist.stage_name}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Your free artist workspace is ready. Add an image, link or playlist now—or return to the community and finish later.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href={`/artists/${artist.slug}`} className="primary-button">View artist page <ExternalLink size={16} /></Link><button type="button" onClick={onOpenWorkspace} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Open workspace</button><Link href="/upload" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Create a video</Link><Link href="/feed" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Continue to feed</Link></div></div></section>;
}

function ReleasesPanel({ token, userId, canSchedule }: { token: string; userId: number; canSchedule: boolean }) {
  const client = useQueryClient(); const query = useQuery({ queryKey: ["releases", userId], queryFn: () => getReleases(token) }); const videos = useQuery({ queryKey: ["my-videos", userId, "release-thumbnails"], queryFn: () => getMyVideos(token, 50) }); const [scheduleId, setScheduleId] = useState<number | null>(null); const [publishAt, setPublishAt] = useState(""); const [error, setError] = useState("");
  const thumbnailByReleaseId = new Map(videos.data?.data.map((video) => [video.id, video.thumbnail_url]));
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["releases", userId] }), client.invalidateQueries({ queryKey: ["my-videos", userId, "release-thumbnails"] })]);
  async function action(work: () => Promise<unknown>) { setError(""); try { await work(); await refresh(); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "The release could not be updated."); } }
  return <Panel title="Releases" helper="Draft, publish and schedule owned releases without exposing private media."><div className="mb-5 flex justify-end"><Link href="/upload?intent=draft" className="primary-button"><Plus size={16} /> New release</Link></div>{error && <InlineError message={error} />}{query.isPending ? <XpnLoader compact label="Loading releases…" /> : <div className="space-y-3">{query.data?.data.map((release) => <ReleaseRow key={release.id} release={release} thumbnailUrl={thumbnailByReleaseId.get(release.id) ?? null} canSchedule={canSchedule} scheduleOpen={scheduleId === release.id} publishAt={publishAt} setPublishAt={setPublishAt} onScheduleOpen={() => setScheduleId(scheduleId === release.id ? null : release.id)} onPublish={() => void action(() => publishRelease(release.id, release.version, token))} onRetry={() => void action(() => retryRelease(release.id, token))} onCancelSchedule={() => void action(() => cancelReleaseSchedule(release.id, release.version, token))} onSchedule={() => void action(() => scheduleRelease(release.id, { version: release.version, publish_at: new Date(publishAt).toISOString().replace(/\.\d{3}Z$/, "Z"), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, token))} />)}{!query.data?.data.length && <Empty icon={Music2} title="No releases yet" text="Upload a clip and save it as a private draft or post immediately." />}</div>}</Panel>;
}

function ReleaseRow({ release, thumbnailUrl, canSchedule, scheduleOpen, publishAt, setPublishAt, onScheduleOpen, onPublish, onRetry, onCancelSchedule, onSchedule }: { release: Release; thumbnailUrl: string | null; canSchedule: boolean; scheduleOpen: boolean; publishAt: string; setPublishAt: (value: string) => void; onScheduleOpen: () => void; onPublish: () => void; onRetry: () => void; onCancelSchedule: () => void; onSchedule: () => void }) {
  return <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900">{thumbnailUrl && <Image src={thumbnailUrl} alt="" fill sizes="64px" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{release.caption || "Untitled release"}</p><p className="mt-1 text-xs text-[var(--muted)]">{release.processing_state} · {release.publication_state} · v{release.version}</p>{release.error_code && <p className="mt-1 text-xs text-pink-400">{release.error_code}</p>}</div><div className="flex flex-wrap gap-2">{release.processing_state === "failed" && <SmallButton onClick={onRetry}>Retry</SmallButton>}{release.publication_state === "draft" && release.processing_state === "ready" && <SmallButton onClick={onPublish}>Publish</SmallButton>}{release.publication_state === "scheduled" && <SmallButton onClick={onCancelSchedule}>Cancel schedule</SmallButton>}{release.publication_state === "draft" && canSchedule && release.processing_state === "ready" && <SmallButton onClick={onScheduleOpen}>Schedule</SmallButton>}</div></div>{scheduleOpen && <div className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row"><input type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} className="studio-input" /><button disabled={!publishAt} onClick={onSchedule} className="primary-button">Confirm schedule</button></div>}</div>;
}

function PlaylistsPanel({ token, userId, limit, reportedUsage }: { token: string; userId: number; limit: number; reportedUsage?: number }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["my-playlists", userId], queryFn: () => getMyPlaylists(token) });
  const taxonomy = useQuery({ queryKey: ["artist-taxonomy"], queryFn: getArtistTaxonomy, staleTime: 60 * 60_000 });
  const playlistCount = Math.max(reportedUsage ?? 0, query.data?.meta.total ?? query.data?.data.length ?? 0);
  const limitReached = !query.isPending && playlistCount >= limit;
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => createPlaylist({ title, category: taxonomy.data?.data.playlist_categories[0] ?? "release", visibility: "public" }, token),
    onSuccess: (response) => {
      setTitle("");
      setSelectedId(response.data.id);
      void client.invalidateQueries({ queryKey: ["my-playlists", userId] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not create playlist.");
      if (caught instanceof ApiError && caught.status === 403) void client.invalidateQueries({ queryKey: ["entitlements", userId] });
    },
  });

  async function remove(playlist: ArtistPlaylist) {
    if (!confirm(`Delete “${playlist.title}”? Videos will be preserved.`)) return;
    setError("");
    try {
      await deletePlaylist(playlist.id, token);
      if (selectedId === playlist.id) setSelectedId(null);
      await client.invalidateQueries({ queryKey: ["my-playlists", userId] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the playlist.");
    }
  }

  return <Panel title="Playlists" helper={`Organize releases for fans. Your current plan allows ${limit}.`}>
    {limitReached ? (
      <div role="status" className="mb-5 flex flex-col gap-4 rounded-2xl border border-violet-500/25 bg-[linear-gradient(110deg,#7c3aed14,var(--surface))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-[var(--royal)]"><Rocket size={18} /></span>
          <div><p className="font-semibold">Playlist limit reached</p><p className="mt-1 text-sm leading-5 text-[var(--muted)]">You’re using {playlistCount} of {limit} available {limit === 1 ? "playlist" : "playlists"}. Upgrade your artist plan to create more.</p></div>
        </div>
        <Link href="/pricing" className="primary-button shrink-0">Upgrade plan <ExternalLink size={14} /></Link>
      </div>
    ) : (
      <form onSubmit={(event) => { event.preventDefault(); setError(""); create.mutate(); }} className="mb-5 flex gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Playlist title" required maxLength={120} className="studio-input" /><button disabled={create.isPending || query.isPending} className="primary-button"><Plus size={16} /> Create</button></form>
    )}
    {error && <InlineError message={error} />}
    <div className="grid gap-4 sm:grid-cols-2">{query.data?.data.map((playlist) => <PlaylistSummaryCard key={playlist.id} playlist={playlist} selected={selectedId === playlist.id} onEdit={() => setSelectedId(selectedId === playlist.id ? null : playlist.id)} onDelete={() => void remove(playlist)} />)}</div>
    {!query.isPending && !query.data?.data.length && <Empty icon={ListMusic} title="No playlists" text="Create a collection for your releases, live clips or behind-the-scenes posts." />}
    {selectedId && <PlaylistEditor key={selectedId} id={selectedId} token={token} userId={userId} categories={taxonomy.data?.data.playlist_categories ?? []} genres={taxonomy.data?.data.genres ?? []} onClose={() => setSelectedId(null)} />}
  </Panel>;
}

function PlaylistSummaryCard({ playlist, selected, onEdit, onDelete }: { playlist: ArtistPlaylist; selected: boolean; onEdit: () => void; onDelete: () => void }) {
  const category = playlist.category.replaceAll("_", " ");
  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface)] transition ${selected ? "border-violet-400 shadow-[0_10px_30px_rgba(124,58,237,0.12)] ring-2 ring-violet-400/15" : "border-[var(--line)] hover:border-violet-400/55 hover:shadow-sm"}`}>
      <button type="button" onClick={onEdit} aria-pressed={selected} className="flex w-full min-w-0 items-center gap-4 p-3 pr-24 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400">
        <span className="relative block h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
          {playlist.cover_url ? (
            <Image src={playlist.cover_url} alt="" fill sizes="80px" className="object-cover transition duration-300 group-hover:scale-[1.04]" />
          ) : (
            <span className="absolute inset-0 grid place-items-center overflow-hidden bg-[linear-gradient(145deg,#7c3aed,#4c1d95_58%,#18181b)] text-white">
              <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full border border-white/20" />
              <span className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-white/10" />
              <ListMusic size={25} className="relative" />
            </span>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{playlist.videos_count}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--royal)]">{category}</span>{playlist.read_only && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">Read only</span>}</span>
          <span className="mt-2 block truncate text-base font-semibold">{playlist.title}</span>
          <span className="mt-1 block truncate text-xs text-[var(--muted)]">{playlist.description || "A collection of your releases."}</span>
          <span className="mt-2 block text-xs font-medium capitalize text-[var(--muted)]">{playlist.videos_count} {playlist.videos_count === 1 ? "video" : "videos"} · {playlist.visibility}</span>
          {selected && <span className="mt-2 block text-xs font-bold text-[var(--royal)]">Currently editing</span>}
        </span>
      </button>

      <div className="absolute right-3 top-3 flex gap-1 rounded-lg bg-[var(--panel)]/90 p-1 shadow-sm backdrop-blur">
        <button type="button" onClick={onEdit} aria-label={`${selected ? "Close editor for" : "Edit"} ${playlist.title}`} className={`icon-button ${selected ? "text-[var(--royal)]" : ""}`}><Pencil size={15} /></button>
        <button type="button" onClick={onDelete} aria-label={`Delete ${playlist.title}`} className="icon-button text-pink-500"><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function PlaylistEditor({ id, token, userId, categories, genres, onClose }: { id: number; token: string; userId: number; categories: string[]; genres: Array<{ id: number; name: string }>; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["my-playlist", id], queryFn: () => getMyPlaylist(id, token) });
  const videos = useQuery({ queryKey: ["my-videos", userId, "playlist-editor"], queryFn: () => getMyVideos(token, 50) });
  if (detail.isPending) return <div className="mt-6"><XpnLoader compact label="Opening playlist…" /></div>;
  if (!detail.data) return <div className="mt-6"><InlineError message="Playlist detail could not be loaded." /></div>;
  return <PlaylistEditorForm key={`${id}-${detail.data.data.version}`} playlist={detail.data.data} availableVideos={videos.data?.data ?? []} token={token} userId={userId} categories={categories} genres={genres} onClose={onClose} onReload={() => void detail.refetch()} />;
}

function PlaylistEditorForm({ playlist, availableVideos, token, userId, categories, genres, onClose, onReload }: { playlist: ArtistPlaylist; availableVideos: Video[]; token: string; userId: number; categories: string[]; genres: Array<{ id: number; name: string }>; onClose: () => void; onReload: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState({ title: playlist.title, description: playlist.description ?? "", category: playlist.category, visibility: playlist.visibility, genre_id: playlist.genre_id });
  const [videoIds, setVideoIds] = useState(playlist.items?.map((item) => item.video_id) ?? playlist.videos?.map((video) => video.id) ?? []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const videos = Array.from(new Map([
    ...(playlist.videos ?? []),
    ...(playlist.items?.flatMap((item) => item.video ? [item.video] : []) ?? []),
    ...availableVideos,
  ].map((video) => [video.id, video])).values());

  function reorderVideo(sourceId: number, targetId: number) {
    setVideoIds((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;

      const next = [...current];
      const [movedId] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedId);
      return next;
    });
  }

  function addVideo(id: number) {
    setVideoIds((current) => current.includes(id) || current.length >= 100 ? current : [...current, id]);
  }

  function removeVideo(id: number) {
    setVideoIds((current) => current.filter((videoId) => videoId !== id));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (playlist.version === undefined) return;
    setSaving(true);
    setError("");
    setNotice("");
    setConflict(false);
    try {
      const initialVideoIds = playlist.items?.map((item) => item.video_id) ?? playlist.videos?.map((video) => video.id) ?? [];
      const metadataChanged = draft.title !== playlist.title || draft.description !== (playlist.description ?? "") || draft.category !== playlist.category || draft.visibility !== playlist.visibility || draft.genre_id !== playlist.genre_id;
      const itemsChanged = !sameOrderedIds(videoIds, initialVideoIds);
      let version = playlist.version;
      if (metadataChanged) {
        const metadata = await updatePlaylist(playlist.id, { ...draft, description: draft.description || null, version }, token);
        version = metadata.data.version ?? version + 1;
      }
      if (itemsChanged) await replacePlaylistItems(playlist.id, version, videoIds, token);
      if (!metadataChanged && !itemsChanged) {
        setNotice("No playlist changes to save.");
        return;
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-playlists", userId] }),
        client.invalidateQueries({ queryKey: ["my-playlist", playlist.id] }),
        client.invalidateQueries({ queryKey: ["artist-playlists"] }),
        client.invalidateQueries({ queryKey: ["artist-playlist"] }),
      ]);
      onReload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setConflict(true);
        setError("This playlist changed in another tab. Reload the latest version, then reapply your changes.");
      } else {
        setError(caught instanceof ApiError ? caught.message : "Could not save the playlist.");
      }
      if (caught instanceof ApiError && caught.status === 403) void client.invalidateQueries({ queryKey: ["entitlements", userId] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-2xl border border-violet-500/20 bg-[var(--background)] p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wider text-[var(--royal)]">Playlist editor</p><h3 className="mt-1 text-lg font-semibold">{playlist.title}</h3></div>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[var(--muted)]">Close</button>
      </div>

      {playlist.read_only && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-400"><span>This playlist is read-only because the current plan limit is exceeded. You can still delete it from the list above.</span><Link href="/pricing" className="font-bold underline underline-offset-4">Upgrade plan</Link></div>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StudioField label="Title"><input disabled={playlist.read_only} required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="studio-input" /></StudioField>
        <StudioField label="Visibility"><select disabled={playlist.read_only} value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })} className="studio-input"><option value="public">Public</option><option value="private">Private</option></select></StudioField>
        <StudioField label="Category"><select disabled={playlist.read_only} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="studio-input">{Array.from(new Set([playlist.category, ...categories])).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></StudioField>
        <StudioField label="Description"><input disabled={playlist.read_only} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="studio-input" /></StudioField>
        <StudioField label="Genre"><select disabled={playlist.read_only} value={draft.genre_id ?? 0} onChange={(event) => setDraft({ ...draft, genre_id: Number(event.target.value) || null })} className="studio-input"><option value={0}>No genre</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></StudioField>
      </div>

      <PlaylistVideoPicker videos={videos} videoIds={videoIds} disabled={Boolean(playlist.read_only)} onAdd={addVideo} onRemove={removeVideo} onReorder={reorderVideo} />

      {notice && <p role="status" className="mt-4 text-sm text-[var(--muted)]">{notice}</p>}
      {error && <div className="mt-4"><InlineError message={error} />{conflict && <button type="button" onClick={onReload} className="text-sm font-bold text-[var(--royal)]">Reload latest version</button>}</div>}
      <button disabled={playlist.read_only || saving} className="primary-button mt-5">{saving && <LoaderCircle size={16} className="animate-spin" />} Save playlist</button>
    </form>
  );
}

function PlaylistVideoPicker({ videos, videoIds, disabled, onAdd, onRemove, onReorder }: { videos: Video[]; videoIds: number[]; disabled: boolean; onAdd: (id: number) => void; onRemove: (id: number) => void; onReorder: (sourceId: number, targetId: number) => void }) {
  const videoById = new Map(videos.map((video) => [video.id, video]));
  const available = videos.filter((video) => !videoIds.includes(video.id));
  const maximumReached = videoIds.length >= 100;
  const [draggedVideoId, setDraggedVideoId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  function finishDrag() {
    setDraggedVideoId(null);
    setDropTargetId(null);
  }

  function handleKeyboardReorder(event: React.KeyboardEvent<HTMLElement>, videoId: number, index: number) {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowUp" && event.key !== "ArrowRight" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const targetId = videoIds[index + direction];
    if (targetId) onReorder(videoId, targetId);
  }

  return (
    <section className="mt-6 border-t border-[var(--line)] pt-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h4 className="text-sm font-semibold">Playlist order</h4><p className="mt-1 text-xs text-[var(--muted)]">Drag the cards to rearrange them. Keyboard: Alt + arrow keys.</p></div>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-[var(--royal)]">{videoIds.length}/100 selected</span>
      </div>

      {videoIds.length ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {videoIds.map((videoId, index) => {
            const video = videoById.get(videoId);
            const title = video?.caption || `Video #${videoId}`;
            return (
              <article
                key={videoId}
                draggable={!disabled}
                tabIndex={disabled ? -1 : 0}
                aria-label={`${title}, position ${index + 1} of ${videoIds.length}. Drag to reorder.`}
                onKeyDown={(event) => handleKeyboardReorder(event, videoId, index)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(videoId));
                  setDraggedVideoId(videoId);
                }}
                onDragOver={(event) => {
                  if (disabled || draggedVideoId === videoId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTargetId(videoId);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = draggedVideoId ?? Number(event.dataTransfer.getData("text/plain"));
                  if (sourceId && sourceId !== videoId) onReorder(sourceId, videoId);
                  finishDrag();
                }}
                onDragEnd={finishDrag}
                className={`flex min-w-0 items-center gap-3 rounded-xl border bg-violet-500/[0.05] p-2.5 outline-none transition ${disabled ? "border-violet-500/20" : "cursor-grab active:cursor-grabbing focus:ring-2 focus:ring-violet-400"} ${draggedVideoId === videoId ? "scale-[0.98] opacity-45" : ""} ${dropTargetId === videoId ? "border-violet-500 ring-2 ring-violet-400/45" : "border-violet-500/20"}`}
              >
                <PlaylistVideoThumbnail video={video} order={index + 1} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-1 text-xs capitalize text-[var(--muted)]">{video?.processing_state ?? video?.status ?? "Selected release"} · {video?.publication_state ?? video?.visibility ?? "owned"}</p></div>
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)]" aria-hidden="true"><GripVertical size={20} /></span>
                  <button type="button" disabled={disabled} onClick={() => onRemove(videoId)} className="icon-button text-pink-500" aria-label={`Remove ${title} from playlist`}><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-4 py-7 text-center"><ListMusic size={24} className="mx-auto text-[var(--muted)]" /><p className="mt-2 text-sm font-semibold">No releases selected</p><p className="mt-1 text-xs text-[var(--muted)]">Choose from your releases below to build this playlist.</p></div>
      )}

      <div className="mt-6"><h4 className="text-sm font-semibold">Add releases</h4><p className="mt-1 text-xs text-[var(--muted)]">Select an owned video to add it to the end of the playlist.</p></div>
      {available.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {available.map((video) => {
            const title = video.caption || `Video #${video.id}`;
            return (
              <button type="button" key={video.id} disabled={disabled || maximumReached} onClick={() => onAdd(video.id)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-left transition hover:border-violet-400 hover:bg-violet-500/[0.04] disabled:cursor-not-allowed disabled:opacity-55">
                <PlaylistVideoThumbnail video={video} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{title}</span><span className="mt-1 block text-xs capitalize text-[var(--muted)]">{video.processing_state ?? video.status} · {video.publication_state ?? video.visibility}</span></span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/10 text-[var(--royal)] transition group-hover:bg-violet-600 group-hover:text-white"><Plus size={16} /></span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-[var(--surface)] px-4 py-5 text-center text-sm text-[var(--muted)]">All available releases are already selected.</p>
      )}
      {maximumReached && <p className="mt-3 text-xs font-semibold text-amber-400">A playlist can contain up to 100 videos.</p>}
    </section>
  );
}

function PlaylistVideoThumbnail({ video, order }: { video?: Video; order?: number }) {
  return <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900">{video?.thumbnail_url ? <Image src={video.thumbnail_url} alt="" fill sizes="64px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#27272a,#18181b)] text-zinc-500"><Music2 size={20} /></span>}{order && <span className="absolute left-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-md bg-black/75 px-1 text-[10px] font-black text-white">{order}</span>}</span>;
}

function AnnouncementsPanel({ token, userId, enabled }: { token: string; userId: number; enabled: boolean }) {
  const client = useQueryClient(); const query = useQuery({ queryKey: ["owner-announcements", userId], queryFn: () => getOwnerAnnouncements(token) }); const [draft, setDraft] = useState({ title: "", body: "" }); const [error, setError] = useState("");
  const create = useMutation({ mutationFn: () => createAnnouncement(draft, token), onSuccess: () => { setDraft({ title: "", body: "" }); void client.invalidateQueries({ queryKey: ["owner-announcements", userId] }); }, onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not save the announcement.") });
  async function send(id: number, version: number) { setError(""); try { await sendAnnouncement(id, version, crypto.randomUUID(), token); await client.invalidateQueries({ queryKey: ["owner-announcements", userId] }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not queue the announcement."); } }
  return <Panel title="Fan updates" helper="Plain-text announcements are delivered only to fans who separately opted in.">{!enabled && <div className="mb-5 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">Fan announcements require Artist Pro. Existing history remains visible.</div>}<form onSubmit={(event) => { event.preventDefault(); create.mutate(); }} className="mb-6 grid gap-3 rounded-xl bg-[var(--surface)] p-4"><input disabled={!enabled} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder="Update title" className="studio-input" required /><textarea disabled={!enabled} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} maxLength={2000} rows={4} placeholder="Share an update with subscribers…" className="studio-input h-auto py-3" required /><button disabled={!enabled || create.isPending} className="primary-button w-fit">Save draft</button></form>{error && <InlineError message={error} />}<div className="space-y-3">{query.data?.data.map((item) => <div key={item.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.body}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.status} · {item.delivered_count ?? 0} delivered · {item.suppressed_count ?? 0} suppressed</p></div>{item.status === "draft" && enabled && <SmallButton onClick={() => void send(item.id, item.version)}>Send</SmallButton>}</div></div>)}</div></Panel>;
}

function PromotionsPanel({ token, userId }: { token: string; userId: number }) {
  const client = useQueryClient(); const offers = useQuery({ queryKey: ["promotion-offers"], queryFn: getPromotionOffers }); const balance = useQuery({ queryKey: ["boost-balance", userId], queryFn: () => getBoostBalance(token) }); const boosts = useQuery({ queryKey: ["boosts", userId], queryFn: () => getBoosts(token) }); const releases = useQuery({ queryKey: ["releases", userId], queryFn: () => getReleases(token) }); const [videoId, setVideoId] = useState(0); const [startsAt, setStartsAt] = useState(""); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState(""); const offer = offers.data?.data[0];
  const create = useMutation({ mutationFn: () => createBoost({ video_id: videoId, offer_id: offer!.id, starts_at: new Date(startsAt).toISOString().replace(/\.\d{3}Z$/, "Z"), rights_confirmed: true, rights_version: offer!.rights_version }, token), onSuccess: () => void client.invalidateQueries({ queryKey: ["boosts", userId] }), onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not save the campaign.") });
  async function submit(boost: Boost) { setError(""); try { await submitBoost(boost.id, boost.version, crypto.randomUUID(), token); await Promise.all([client.invalidateQueries({ queryKey: ["boosts", userId] }), client.invalidateQueries({ queryKey: ["boost-balance", userId] })]); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not submit the campaign."); } }
  return <Panel title="Promotions" helper="Book clearly labeled Sponsored placement using verified artist credit."><div className="mb-5 grid gap-3 sm:grid-cols-4">{(["available_cents", "reserved_cents", "used_cents", "held_cents"] as const).map((key) => <div key={key} className="rounded-xl bg-[var(--surface)] p-4"><p className="text-xs capitalize text-[var(--muted)]">{key.replace("_cents", "")}</p><p className="mt-1 text-xl font-semibold">${((balance.data?.data[key] ?? 0) / 100).toFixed(2)}</p></div>)}</div>{balance.data?.data.spending_held && <InlineError message="Promotion spending is currently on hold." />}{offer && <form onSubmit={(event) => { event.preventDefault(); create.mutate(); }} className="mb-6 grid gap-3 rounded-xl border border-[var(--line)] p-4 md:grid-cols-2"><div className="md:col-span-2"><p className="font-semibold">{offer.disclosure} · ${(offer.price_cents / 100).toFixed(2)} for {Math.round(offer.duration_seconds / 3600)} hours</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{offer.terms}</p></div><select value={videoId} onChange={(event) => setVideoId(Number(event.target.value))} className="studio-input" required><option value={0}>Choose a public release</option>{releases.data?.data.filter((release) => release.publication_state === "published" && release.visibility === "public").map((release) => <option value={release.id} key={release.id}>{release.caption || `Release #${release.id}`}</option>)}</select><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="studio-input" required /><label className="flex gap-2 text-xs leading-5 md:col-span-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-violet-600" /> I confirm that I own or have advertising rights for this creative ({offer.rights_version}).</label><button disabled={!offer.enabled || !offer.configured || !confirmed || !videoId || !startsAt || create.isPending} className="primary-button w-fit">Save campaign draft</button>{(!offer.enabled || !offer.configured) && <p className="self-center text-xs text-[var(--muted)]">Bookings are currently closed. You can review the offer while the organic experience remains available.</p>}</form>}{error && <InlineError message={error} />}<div className="space-y-3">{boosts.data?.data.map((boost) => <div key={boost.id} className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--royal)]"><CircleDollarSign size={19} /></span><div className="flex-1"><p className="font-semibold">Campaign #{boost.id}</p><p className="mt-1 text-xs text-[var(--muted)]">{boost.status} · starts {new Date(boost.starts_at).toLocaleString()}</p></div>{boost.status === "draft" && <SmallButton onClick={() => void submit(boost)}>Submit for review</SmallButton>}</div>)}</div></Panel>;
}

function Panel({ title, helper, children }: { title: string; helper: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{helper}</p><div className="mt-6">{children}</div></section>; }
function StudioField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>; }
function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="h-9 rounded-lg bg-violet-500/10 px-3 text-xs font-bold text-[var(--royal)] hover:bg-violet-500/20">{children}</button>; }
function InlineError({ message }: { message: string }) { return <p role="alert" className="mb-4 rounded-xl border border-pink-500/20 bg-pink-500/10 p-3 text-sm text-pink-300">{message}</p>; }
function FieldError({ message }: { message: string }) { return <p role="alert" className="mt-1.5 text-xs font-medium text-pink-400">{message}</p>; }
function Empty({ icon: Icon, title, text }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; text: string }) { return <div className="py-12 text-center"><Icon size={32} className="mx-auto text-[var(--muted)]" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{text}</p></div>; }
function WorkspaceError({ retry }: { retry: () => void }) { return <div className="page-content px-6 text-center"><h1 className="text-2xl font-semibold">Workspace unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">We could not load your artist workspace.</p><button onClick={retry} className="primary-button mt-5">Try again</button></div>; }
