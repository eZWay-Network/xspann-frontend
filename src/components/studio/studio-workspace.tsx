"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarClock, Camera, CheckCircle2, ExternalLink, FolderPlus, Globe2, GripVertical, Link2, ListMusic, LoaderCircle, Lock, MapPin, Megaphone, Music2, Pencil, Plus, Rocket, Settings2, Trash2, Users } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnouncementsPanel } from "@/components/studio/announcements-panel";
import { PromotionsPanel } from "@/components/studio/promotions-panel";
import { ReleasesPanel } from "@/components/studio/releases-panel";
import { ApiError } from "@/services/api";
import { createPlaylist, deletePlaylist, getArtistAnalytics, getArtistTaxonomy, getFanSummary, getMyArtist, getMyPlaylist, getMyPlaylists, replacePlaylistItems, saveArtistLinks, saveMyArtist, updatePlaylist, uploadArtistImage } from "@/services/artists";
import { getEntitlements } from "@/services/billing";
import { getMyVideos } from "@/services/videos";
import { buildArtistProfilePayload, buildUtcDailySeries, FREE_ARTIST_CAPABILITIES, normalizeArtistSlug, sameOrderedIds } from "@/lib/artists";
import type { Artist, ArtistCapabilities, ArtistPlaylist, Video } from "@/types/api";

type Tab = "overview" | "profile" | "releases" | "playlists" | "announcements" | "promotions";
const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "overview", label: "Overview", icon: BarChart3 }, { id: "profile", label: "Artist profile", icon: Settings2 },
  { id: "releases", label: "Releases", icon: CalendarClock }, { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "announcements", label: "Fan updates", icon: Megaphone }, { id: "promotions", label: "Promotions", icon: Rocket },
];

export function StudioWorkspace() {
  const { token, user } = useAuth();
  const search = useSearchParams();
  const initialReleaseId = Number(search.get("release"));
  const [tab, setTab] = useState<Tab>(() => initialReleaseId > 0 ? "releases" : "overview");
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
    <div className="mt-6">{tab === "overview" && <Overview artist={artist} token={token!} />}{tab === "profile" && <ProfileEditor artist={artist} token={token!} userId={user!.id} capabilities={capabilities} />}{tab === "releases" && <ReleasesPanel token={token!} userId={user!.id} username={user?.username} canSchedule={capabilities.release_scheduling} initialSelectedId={initialReleaseId > 0 ? initialReleaseId : undefined} />}{tab === "playlists" && <PlaylistsPanel token={token!} userId={user!.id} limit={capabilities.playlists} reportedUsage={playlistUsage} />}{tab === "announcements" && <AnnouncementsPanel token={token!} userId={user!.id} enabled={capabilities.fan_announcements > 0} />}{tab === "promotions" && <PromotionsPanel token={token!} userId={user!.id} />}</div>
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
  const profileName = draft.stage_name.trim() || (artist ? "Your artist profile" : "New artist");
  const selectedGenreCount = draft.genre_ids.length;

  return (
    <div className={artist ? "" : "page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"}>
      <form onSubmit={submit} className={artist ? "w-full space-y-5" : "mx-auto max-w-5xl space-y-5"}>
        <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-sm">
          <div className="h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.42),transparent_58%),linear-gradient(120deg,rgba(124,58,237,.12),rgba(244,63,94,.08),transparent)]" />
          <div className="relative -mt-14 flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
            {artist ? (
              <label className="group relative block h-28 w-28 shrink-0 cursor-pointer" aria-label="Update artist image">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={imageUpload.isPending}
                  onChange={(event) => event.target.files?.[0] && imageUpload.mutate(event.target.files[0])}
                />
                <span className="relative block h-full w-full overflow-hidden rounded-3xl border-4 border-[var(--panel)] bg-[var(--surface)] shadow-lg">
                  {imagePreview ? (
                    <Image src={imagePreview} alt={profileName} fill sizes="112px" className="object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="grid h-full place-items-center bg-[linear-gradient(145deg,#7c3aed,#4c1d95)] text-white"><Music2 size={34} /></span>
                  )}
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                </span>
                <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-4 border-[var(--panel)] bg-violet-600 text-white shadow-md transition group-hover:bg-violet-500">
                  {imageUpload.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <Camera size={17} />}
                </span>
              </label>
            ) : (
              <span className="grid h-28 w-28 shrink-0 place-items-center rounded-3xl border-4 border-[var(--panel)] bg-[linear-gradient(145deg,#7c3aed,#4c1d95)] text-white shadow-lg"><Music2 size={34} /></span>
            )}

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">{artist ? "Public identity" : "Artist enrollment"}</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{profileName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5"><Globe2 size={14} /> /artists/{draft.slug || "your-slug"}</span>
                {draft.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {draft.location}</span>}
                <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${draft.listed ? "bg-emerald-400" : "bg-zinc-400"}`} />{draft.listed ? "Visible in directory" : "Unlisted"}</span>
              </div>
            </div>

            {artist && <Link href={`/artists/${artist.slug}`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)]">Preview profile <ExternalLink size={15} /></Link>}
          </div>
          <div className="border-t border-[var(--line)] bg-[var(--surface)]/55 px-5 py-3 text-xs text-[var(--muted)] sm:px-7">
            {artist ? "Click the artist image to replace it. Changes become public after you save the profile." : "Create the profile first, then add an artist image and external links."}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(290px,.75fr)]">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
            <ProfileSectionHeading icon={Pencil} title="Profile details" description="The information fans see first on your artist page." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <StudioField label="Stage name">
                <input required maxLength={120} value={draft.stage_name} onChange={(event) => setDraft({ ...draft, stage_name: event.target.value })} className="studio-input" />
                {fieldErrors.stage_name?.[0] && <FieldError message={fieldErrors.stage_name[0]} />}
              </StudioField>
              <StudioField label="Public slug">
                <div className="flex h-10 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] focus-within:border-[var(--royal)] focus-within:ring-2 focus-within:ring-violet-500/20">
                  <span className="grid place-items-center border-r border-[var(--line)] px-3 text-xs text-[var(--muted)]">/artists/</span>
                  <input required minLength={3} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: normalizeArtistSlug(event.target.value) })} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
                </div>
                {fieldErrors.slug?.[0] && <FieldError message={fieldErrors.slug[0]} />}
              </StudioField>
            </div>
            <div className="mt-4">
              <StudioField label="Bio">
                <textarea rows={5} maxLength={2000} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="Tell listeners about your sound, story, and latest work." className="studio-input h-auto resize-y py-3 leading-6" />
                <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{draft.bio.length}/2000</p>
              </StudioField>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
            <ProfileSectionHeading icon={Globe2} title="Discovery" description="Control how listeners find and feature you." />
            <div className="mt-5 space-y-4">
              <StudioField label="Location">
                <div className="relative"><MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input maxLength={120} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="City or region" className="studio-input pl-9" /></div>
              </StudioField>
              {artist && (capabilities.featured_release || draft.featured_video_id) && (
                <StudioField label="Featured release">
                  <select disabled={!capabilities.featured_release} value={draft.featured_video_id ?? 0} onChange={(event) => setDraft({ ...draft, featured_video_id: Number(event.target.value) || null })} className="studio-input">
                    <option value={0}>No featured release</option>
                    {ownedVideos.data?.data.filter((video) => video.status === "published" && video.visibility === "public" && video.moderation_status === "approved").map((video) => <option key={video.id} value={video.id}>{video.caption || `Video #${video.id}`}</option>)}
                  </select>
                  {!capabilities.featured_release && <p className="mt-2 text-xs text-amber-300">Your saved selection is retained but hidden on this plan. <Link href="/pricing" className="font-bold underline">Update plan</Link></p>}
                </StudioField>
              )}
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
                <span><span className="block text-sm font-semibold">Artist directory</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Your public link works even when discovery is off.</span></span>
                <input type="checkbox" checked={draft.listed} onChange={(event) => setDraft({ ...draft, listed: event.target.checked })} className="sr-only" />
                <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition ${draft.listed ? "bg-violet-600" : "bg-zinc-400/45"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${draft.listed ? "left-6" : "left-1"}`} /></span>
              </label>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><ProfileSectionHeading icon={Music2} title="Genres" description="Choose up to five styles that best describe your music." /><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-[var(--royal)]">{selectedGenreCount}/5 selected</span></div>
          <div className="mt-5 flex flex-wrap gap-2">{taxonomy.data?.data.genres.map((genre) => { const selected = draft.genre_ids.includes(genre.id); const atLimit = !selected && selectedGenreCount >= 5; return <button type="button" key={genre.id} disabled={atLimit} aria-pressed={selected} onClick={() => setDraft({ ...draft, genre_ids: selected ? draft.genre_ids.filter((id) => id !== genre.id) : [...draft.genre_ids, genre.id] })} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-violet-500 bg-violet-600 text-white shadow-sm" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-violet-400 hover:text-[var(--foreground)]"}`}>{selected && <CheckCircle2 size={13} className="mr-1.5 inline" />}{genre.name}</button>; })}</div>
        </section>

        {artist && (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><ProfileSectionHeading icon={Link2} title="Links" description="Connect fans to your music and official channels." /><span className="text-xs font-semibold text-[var(--muted)]">{links.length}/{capabilities.links}</span></div>
            {linksOverLimit && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300"><span>These saved links exceed your current plan limit. Remove extras before editing links.</span><Link href="/pricing" className="font-bold underline">Update plan</Link></div>}
            <div className="mt-4 space-y-3">
              {links.map((link, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-[120px_130px_1fr_40px]">
                  <input value={link.label} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Label" className="studio-input bg-[var(--panel)]" required />
                  <select value={link.type} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as typeof link.type } : item))} className="studio-input bg-[var(--panel)]">{taxonomy.data?.data.link_types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                  <input type="url" pattern="https://.*" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://" className="studio-input bg-[var(--panel)]" required />
                  <button type="button" aria-label={`Remove ${link.label || "link"}`} onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="icon-button text-pink-400"><Trash2 size={16} /></button>
                </div>
              ))}
              {!links.length && <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">No links added yet.</p>}
            </div>
            {links.length < capabilities.links && <button type="button" onClick={() => setLinks((current) => [...current, { label: "", type: "website", url: "https://" }])} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]"><Plus size={15} /> Add link</button>}
          </section>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">{status ? <p role={mutation.isError || imageUpload.isError || (linksDirty && linksOverLimit) ? "alert" : "status"} className={mutation.isError || imageUpload.isError || (linksDirty && linksOverLimit) ? "text-sm text-pink-400" : "text-sm text-emerald-400"}>{status}</p> : <p className="text-sm text-[var(--muted)]">Review your profile, then publish the latest changes.</p>}</div>
          <div className="flex shrink-0 items-center gap-3">{!artist && <Link href="/feed" className="text-sm font-bold text-[var(--muted)]">Continue to feed</Link>}<button disabled={mutation.isPending || imageUpload.isPending} className="primary-button min-w-36">{mutation.isPending && <LoaderCircle size={16} className="animate-spin" />}{artist ? "Save profile" : "Create profile"}</button></div>
        </div>
      </form>
    </div>
  );
}

function ProfileSectionHeading({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number }>; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--royal)]"><Icon size={17} /></span><span><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{description}</span></span></div>;
}

function ArtistCreated({ artist, onOpenWorkspace }: { artist: Artist; onOpenWorkspace: () => void }) {
  return <section className="page-content grid h-full place-items-center overflow-y-auto px-5"><div className="w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center sm:p-10"><CheckCircle2 size={48} className="mx-auto text-emerald-400" /><p className="mt-5 text-sm font-bold uppercase tracking-[.16em] text-[var(--royal)]">Artist profile created</p><h1 className="mt-2 text-3xl font-semibold">Welcome, {artist.stage_name}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Your free artist workspace is ready. Add an image, link or playlist now—or return to the community and finish later.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href={`/artists/${artist.slug}`} className="primary-button">View artist page <ExternalLink size={16} /></Link><button type="button" onClick={onOpenWorkspace} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Open workspace</button><Link href="/upload" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Create a video</Link><Link href="/feed" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Continue to feed</Link></div></div></section>;
}

function PlaylistsPanel({ token, userId, limit, reportedUsage }: { token: string; userId: number; limit: number; reportedUsage?: number }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["my-playlists", userId], queryFn: () => getMyPlaylists(token) });
  const taxonomy = useQuery({ queryKey: ["artist-taxonomy"], queryFn: getArtistTaxonomy, staleTime: 60 * 60_000 });
  const playlistCount = Math.max(reportedUsage ?? 0, query.data?.meta.total ?? query.data?.data.length ?? 0);
  const limitReached = !query.isPending && playlistCount >= limit;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => createPlaylist({ title, category: category || taxonomy.data?.data.playlist_categories[0] || "release", visibility }, token),
    onSuccess: (response) => {
      setTitle("");
      setCategory("");
      setVisibility("public");
      setCreateOpen(false);
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

  const usagePercent = limit > 0 ? Math.min(100, playlistCount / limit * 100) : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex flex-col gap-5 border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.16),transparent_48%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,.24)]"><ListMusic size={23} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Your catalog</p><h2 className="mt-1 text-2xl font-semibold">Playlists</h2><p className="mt-1 text-sm text-[var(--muted)]">Curate releases into collections your fans can explore.</p></div>
        </div>
        {limitReached ? <Link href="/pricing" className="primary-button shrink-0">Upgrade plan <ExternalLink size={14} /></Link> : <button type="button" disabled={query.isPending} onClick={() => { setError(""); setCreateOpen(true); }} className="primary-button shrink-0"><Plus size={16} /> New playlist</button>}
      </div>

      <div className="p-5 sm:p-7">
        <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">Playlist usage</span><span className="text-[var(--muted)]">{playlistCount} of {limit}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]"><span className={`block h-full rounded-full ${limitReached ? "bg-amber-400" : "bg-violet-600"}`} style={{ width: `${usagePercent}%` }} /></div>
          </div>
          <span className="justify-self-start rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] sm:justify-self-end">{Math.max(0, limit - playlistCount)} available</span>
        </div>

        {limitReached && <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"><Rocket size={18} className="mt-0.5 shrink-0 text-amber-400" /><div><p className="font-semibold text-amber-300">Playlist limit reached</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Your existing playlists remain available. Upgrade your plan or remove one before creating another.</p></div></div>}
        {error && <InlineError message={error} />}
        {query.isPending && <div className="grid min-h-52 place-items-center"><XpnLoader compact label="Loading playlists…" /></div>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{query.data?.data.map((playlist) => <PlaylistSummaryCard key={playlist.id} playlist={playlist} selected={selectedId === playlist.id} onEdit={() => setSelectedId(selectedId === playlist.id ? null : playlist.id)} onDelete={() => void remove(playlist)} />)}</div>
        {!query.isPending && !query.data?.data.length && <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/45 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-[var(--royal)]"><FolderPlus size={26} /></span><h3 className="mt-4 font-semibold">Create your first playlist</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Group releases, live sessions, or behind-the-scenes videos into a collection.</p>{!limitReached && <button type="button" onClick={() => setCreateOpen(true)} className="primary-button mt-5"><Plus size={16} /> New playlist</button>}</div>}
        {selectedId && <PlaylistEditor key={selectedId} id={selectedId} token={token} userId={userId} categories={taxonomy.data?.data.playlist_categories ?? []} genres={taxonomy.data?.data.genres ?? []} onClose={() => setSelectedId(null)} />}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!create.isPending) setCreateOpen(open); }}>
        <DialogContent className="max-w-lg p-0">
          <form onSubmit={(event) => { event.preventDefault(); setError(""); create.mutate(); }}>
            <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-16">
              <DialogTitle>Create a playlist</DialogTitle>
              <DialogDescription>Start with the basics. You can add and reorder releases next.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 py-5">
              <StudioField label="Playlist title"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Live from Dhaka" required maxLength={120} className="studio-input" /></StudioField>
              <div className="grid gap-4 sm:grid-cols-2">
                <StudioField label="Category"><select value={category || taxonomy.data?.data.playlist_categories[0] || "release"} onChange={(event) => setCategory(event.target.value)} className="studio-input">{(taxonomy.data?.data.playlist_categories ?? ["release"]).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></StudioField>
                <StudioField label="Visibility"><select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="studio-input"><option value="public">Public</option><option value="private">Private</option></select></StudioField>
              </div>
              {error && <InlineError message={error} />}
            </div>
            <DialogFooter className="border-t border-[var(--line)] px-6 py-4"><button type="button" disabled={create.isPending} onClick={() => setCreateOpen(false)} className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Cancel</button><button disabled={create.isPending || !title.trim()} className="primary-button">{create.isPending && <LoaderCircle size={15} className="animate-spin" />} Create playlist</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PlaylistSummaryCard({ playlist, selected, onEdit, onDelete }: { playlist: ArtistPlaylist; selected: boolean; onEdit: () => void; onDelete: () => void }) {
  const category = playlist.category.replaceAll("_", " ");
  return (
    <article className={`group relative min-w-0 rounded-xl p-2.5 transition ${selected ? "bg-violet-500/10 ring-2 ring-violet-400/45" : "hover:bg-[var(--surface)]"}`}>
      <button type="button" onClick={onEdit} aria-pressed={selected} aria-label={`${selected ? "Close" : "Edit"} ${playlist.title}`} className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
        <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-zinc-900 shadow-md">
          {playlist.cover_url ? (
            <Image src={playlist.cover_url} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <span className="absolute inset-0 grid place-items-center overflow-hidden bg-[linear-gradient(145deg,#7c3aed,#4c1d95_58%,#18181b)] text-white">
              <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
              <span className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10" />
              <ListMusic size={32} className="relative" />
            </span>
          )}
          <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">{category}</span>
          <span className={`absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition duration-200 ${selected ? "scale-100 opacity-100" : "translate-y-1 scale-90 opacity-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"}`}><Pencil size={16} /></span>
        </span>
        <span className="block px-0.5 pb-1 pt-3">
          <span className="flex min-w-0 items-center gap-1.5"><span className="block min-w-0 flex-1 truncate text-sm font-semibold">{playlist.title}</span>{playlist.read_only && <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">Read only</span>}</span>
          <span className="mt-1 block truncate text-[11px] text-[var(--muted)]">{playlist.description || "A collection of your releases."}</span>
          <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium capitalize text-[var(--muted)]">{playlist.visibility === "public" ? <Globe2 size={11} /> : <Lock size={11} />}{playlist.visibility}<span>·</span><span>{playlist.videos_count} {playlist.videos_count === 1 ? "video" : "videos"}</span>{selected && <span className="ml-auto font-bold text-[var(--royal)]">Editing</span>}</span>
        </span>
      </button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${playlist.title}`} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-70 backdrop-blur transition hover:bg-pink-600 group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-0"><Trash2 size={13} /></button>
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

function StudioField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>; }
function InlineError({ message }: { message: string }) { return <p role="alert" className="mb-4 rounded-xl border border-pink-500/20 bg-pink-500/10 p-3 text-sm text-pink-300">{message}</p>; }
function FieldError({ message }: { message: string }) { return <p role="alert" className="mt-1.5 text-xs font-medium text-pink-400">{message}</p>; }
function WorkspaceError({ retry }: { retry: () => void }) { return <div className="page-content px-6 text-center"><h1 className="text-2xl font-semibold">Workspace unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">We could not load your artist workspace.</p><button onClick={retry} className="primary-button mt-5">Try again</button></div>; }
