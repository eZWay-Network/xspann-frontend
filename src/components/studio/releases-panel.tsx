"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ExternalLink, FileVideo2, LoaderCircle, Music2, PauseCircle, Play, Plus, RefreshCw } from "lucide-react";
import { XpnLoader } from "@/components/common/xpn-loader";
import { formatReleaseInstant, isStaleRightsError, scheduleInstantFromLocal } from "@/lib/releases";
import { ApiError, apiMediaBlob } from "@/services/api";
import { getPolicies } from "@/services/auth";
import { cancelReleaseSchedule, getRelease, getReleases, publishRelease, retryRelease, scheduleRelease } from "@/services/releases";
import { getMyVideos } from "@/services/videos";
import type { Release } from "@/types/api";

export function ReleasesPanel({ token, userId, username, canSchedule, initialSelectedId }: { token: string; userId: number; username?: string; canSchedule: boolean; initialSelectedId?: number }) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId ?? null);
  const releases = useInfiniteQuery({
    queryKey: ["releases", userId],
    queryFn: ({ pageParam }) => getReleases(token, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
  });
  const ownedVideos = useQuery({
    queryKey: ["my-videos", userId, "release-thumbnails"],
    queryFn: () => getMyVideos(token, 50),
    staleTime: 20_000,
  });
  const rows = releases.data?.pages.flatMap((page) => page.data) ?? [];
  const thumbnailById = useMemo(() => new Map(ownedVideos.data?.data.map((video) => [video.id, video.thumbnail_url] as const) ?? []), [ownedVideos.data]);
  const detail = useQuery({
    queryKey: ["release", selectedId, userId],
    enabled: selectedId !== null,
    queryFn: () => getRelease(selectedId!, token),
  });
  const refreshLists = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["releases", userId] }),
      client.invalidateQueries({ queryKey: ["my-videos", userId] }),
      ...(username ? [client.invalidateQueries({ queryKey: ["user-videos", username] })] : []),
    ]);
  };
  const installRelease = (release: Release) => {
    client.setQueryData(["release", release.id, userId], { data: release });
    void refreshLists();
  };
  const publishedCount = rows.filter((release) => release.publication_state === "published").length;
  const scheduledCount = rows.filter((release) => release.publication_state === "scheduled").length;
  const draftCount = rows.filter((release) => release.publication_state === "draft").length;

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex flex-col gap-5 border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.18),transparent_50%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,.24)]"><CalendarClock size={23} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Release catalog</p><h2 className="mt-1 text-2xl font-semibold">Releases</h2><p className="mt-1 text-sm text-[var(--muted)]">Prepare, schedule, and publish your music videos.</p></div>
        </div>
        <Link href="/upload?intent=draft" className="primary-button shrink-0"><Plus size={16} /> New private draft</Link>
      </div>

      <div className="p-5 sm:p-7">
        {!releases.isPending && !releases.isError && rows.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ReleaseMetric label="Loaded" value={rows.length} icon={FileVideo2} />
            <ReleaseMetric label="Published" value={publishedCount} icon={CheckCircle2} tone="success" />
            <ReleaseMetric label="Scheduled" value={scheduledCount} icon={CalendarClock} tone="royal" />
            <ReleaseMetric label="Drafts" value={draftCount} icon={Music2} />
          </div>
        )}

        {releases.isPending ? (
          <div className="grid min-h-52 place-items-center"><XpnLoader compact label="Loading releases…" /></div>
        ) : releases.isError ? (
          <div className="rounded-2xl border border-pink-500/20 bg-pink-500/10 p-5"><InlineError message="Releases could not be loaded." /><button type="button" onClick={() => void releases.refetch()} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]"><RefreshCw size={14} /> Try again</button></div>
        ) : rows.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{rows.map((release) => <ReleaseCard key={release.id} release={release} token={token} thumbnailUrl={thumbnailById.get(release.id)} selected={selectedId === release.id} onOpen={() => setSelectedId(selectedId === release.id ? null : release.id)} />)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/45 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-[var(--royal)]"><FileVideo2 size={27} /></span><h3 className="mt-4 font-semibold">No releases yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Upload a video as a private draft, review it, then publish immediately or schedule it.</p><Link href="/upload?intent=draft" className="primary-button mt-5"><Plus size={16} /> Create draft</Link></div>
        )}

        {releases.hasNextPage && <button type="button" disabled={releases.isFetchingNextPage} onClick={() => void releases.fetchNextPage()} className="mx-auto mt-6 flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{releases.isFetchingNextPage && <LoaderCircle size={15} className="animate-spin" />}{releases.isFetchingNextPage ? "Loading…" : "Load more releases"}</button>}
        {selectedId && <div className="mt-7">{detail.isPending ? <div className="grid min-h-36 place-items-center"><XpnLoader compact label="Opening release…" /></div> : detail.data ? <ReleaseEditor key={`${detail.data.data.id}-${detail.data.data.version}`} release={detail.data.data} thumbnailUrl={thumbnailById.get(detail.data.data.id)} token={token} userId={userId} canSchedule={canSchedule} onClose={() => setSelectedId(null)} onRefresh={detail.refetch} onChanged={installRelease} /> : <InlineError message="Release detail could not be loaded." />}</div>}
      </div>
    </section>
  );
}

function ReleaseCard({ release, token, thumbnailUrl, selected, onOpen }: { release: Release; token: string; thumbnailUrl?: string | null; selected: boolean; onOpen: () => void }) {
  const stateTone = release.publication_state === "published" ? "bg-emerald-500/90" : release.publication_state === "scheduled" ? "bg-violet-600/90" : "bg-black/65";
  return (
    <article className={`group min-w-0 rounded-xl p-2.5 transition ${selected ? "bg-violet-500/10 ring-2 ring-violet-400/45" : "hover:bg-[var(--surface)]"}`}>
      <button type="button" onClick={onOpen} aria-pressed={selected} aria-label={`${selected ? "Close" : "Manage"} ${release.caption || "untitled release"}`} className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
        <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-zinc-950 shadow-md">
          <ReleaseThumbnail release={release} token={token} thumbnailUrl={thumbnailUrl} />
          <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur ${stateTone}`}>{release.publication_state}</span>
          <span className={`absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition duration-200 ${selected ? "scale-100 opacity-100" : "translate-y-1 scale-90 opacity-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"}`}><CalendarClock size={16} /></span>
        </span>
        <span className="block px-0.5 pb-1 pt-3">
          <span className="block truncate text-sm font-semibold">{release.caption || "Untitled release"}</span>
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] capitalize text-[var(--muted)]"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${release.processing_state === "ready" ? "bg-emerald-400" : release.processing_state === "failed" ? "bg-rose-400" : "bg-amber-400"}`} /><span className="truncate">{release.processing_state} · {release.moderation_status.replaceAll("_", " ")}</span><span className="ml-auto shrink-0">v{release.version}</span></span>
          {release.publish_at && release.timezone && <span className="mt-1.5 flex items-center gap-1 truncate text-[10px] font-medium text-[var(--royal)]"><CalendarClock size={11} className="shrink-0" /> <span className="truncate">{formatReleaseInstant(release.publish_at, release.timezone)}</span></span>}
          {release.paused_reason && <span className="mt-1.5 block truncate text-[10px] text-amber-300">Paused: {release.paused_reason}</span>}
        </span>
      </button>
    </article>
  );
}

function ReleaseThumbnail({ release, token, thumbnailUrl }: { release: Release; token: string; thumbnailUrl?: string | null }) {
  const publicThumbnail = release.thumbnail_url ?? thumbnailUrl;
  const previewPath = release.preview?.thumbnail;
  const [previewResult, setPreviewResult] = useState<{ path: string; url?: string; failed?: boolean } | null>(null);
  const currentResult = previewResult?.path === previewPath ? previewResult : null;
  const privateUrl = currentResult?.url ?? "";
  const loading = Boolean(!publicThumbnail && previewPath && !currentResult);

  useEffect(() => {
    if (publicThumbnail || !previewPath) return;

    const controller = new AbortController();
    let active = true;
    let objectUrl = "";

    void apiMediaBlob(previewPath, token, controller.signal)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewResult({ path: previewPath, url: objectUrl });
      })
      .catch(() => {
        if (active && !controller.signal.aborted) setPreviewResult({ path: previewPath, failed: true });
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewPath, publicThumbnail, token]);

  if (publicThumbnail) {
    return <Image src={publicThumbnail} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />;
  }

  if (privateUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={privateUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
    );
  }

  return <span className="absolute inset-0 grid place-items-center overflow-hidden bg-[linear-gradient(145deg,#312e81,#18181b)] text-violet-100"><span className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/10" /><span className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-violet-400/10" />{loading ? <LoaderCircle size={26} className="relative animate-spin" /> : <Music2 size={38} className="relative" />}</span>;
}

function ReleaseMetric({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; tone?: "neutral" | "success" | "royal" }) {
  const iconClass = tone === "success" ? "bg-emerald-500/10 text-emerald-400" : tone === "royal" ? "bg-violet-500/10 text-[var(--royal)]" : "bg-[var(--surface)] text-[var(--muted)]";
  return <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClass}`}><Icon size={17} /></span><span><span className="block text-lg font-semibold leading-none">{value}</span><span className="mt-1 block text-[11px] text-[var(--muted)]">{label}</span></span></div>;
}

function ReleaseEditor({ release, thumbnailUrl, token, userId, canSchedule, onClose, onRefresh, onChanged }: { release: Release; thumbnailUrl?: string | null; token: string; userId: number; canSchedule: boolean; onClose: () => void; onRefresh: () => void; onChanged: (release: Release) => void }) {
  const client = useQueryClient();
  const policies = useQuery({ queryKey: ["policies"], queryFn: getPolicies, staleTime: 5 * 60_000 });
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [rightsRefreshRequired, setRightsRefreshRequired] = useState(false);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const ready = release.processing_state === "ready";

  async function run(action: string, work: () => Promise<{ data: Release }>) {
    setBusy(action); setError(""); setNotice("");
    try {
      const response = await work();
      onChanged(response.data);
      setNotice("Release updated.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) setError("This release changed in another tab. Reload the latest version before applying your change again.");
      else setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "The release could not be updated.");
      if (isStaleRightsError(caught)) setRightsRefreshRequired(true);
      if (caught instanceof ApiError && caught.status === 403) void client.invalidateQueries({ queryKey: ["entitlements", userId] });
    } finally { setBusy(""); }
  }

  function applySchedule() {
    setError("");
    if (!canSchedule) { setError("Release scheduling is not available on the current plan."); return; }
    if (!ready) { setError("The release must finish processing before it can be scheduled."); return; }
    if (rightsRefreshRequired && !rightsAccepted) { setError("Confirm the current rights declaration before scheduling again."); return; }
    let publishAt: string;
    try { publishAt = scheduleInstantFromLocal(scheduleLocal, timeZone); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Choose a valid schedule."); return; }
    void run("schedule", () => scheduleRelease(release.id, {
      version: release.version,
      publish_at: publishAt,
      timezone: timeZone,
      ...(rightsRefreshRequired && policies.data ? { rights_confirmed: true as const, rights_version: policies.data.data.rights_version } : {}),
    }, token));
  }

  return <section className="rounded-2xl border border-violet-500/25 bg-[var(--background)] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Release controls</p><h3 className="mt-1 text-xl font-semibold">{release.caption || `Release #${release.id}`}</h3><p className="mt-1 text-xs capitalize text-[var(--muted)]">{release.processing_state} · {release.publication_state} · {release.moderation_status.replaceAll("_", " ")} · version {release.version}</p></div><button type="button" onClick={onClose} className="text-sm font-bold text-[var(--muted)]">Close</button></div>
    {release.paused_reason && <div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300"><p className="font-semibold">Schedule returned to draft</p><p className="mt-1">{release.paused_reason}</p><p className="mt-2 text-xs">Resolve the issue, then explicitly publish or choose a new schedule.</p></div>}
    {release.error_code && <InlineError message={`Processing failure: ${release.error_code}`} />}
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]"><PrivateReleasePreview release={release} thumbnailUrl={thumbnailUrl} token={token} onRefresh={onRefresh} /><div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"><p className="font-semibold">Video details are managed separately</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Caption, visibility, location, reuse settings, and video deletion belong to the video manager. This workspace only controls processing and publication.</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[var(--muted)]">Visibility</dt><dd className="mt-1 font-semibold capitalize">{release.visibility}</dd></div><div><dt className="text-[var(--muted)]">Location</dt><dd className="mt-1 truncate font-semibold">{release.location_name || "Not set"}</dd></div></dl><Link href="/posts" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--royal)]">Open video manager <ExternalLink size={14} /></Link></div></div>
    <div className="mt-6 border-t border-[var(--line)] pt-5"><div className="flex flex-wrap items-end gap-3"><Field label={`${release.publication_state === "scheduled" ? "New publication time" : "Publication time"} (${timeZone})`}><input type="datetime-local" value={scheduleLocal} onChange={(event) => setScheduleLocal(event.target.value)} className="studio-input min-w-64" /></Field><button type="button" disabled={!canSchedule || !ready || !scheduleLocal || busy !== ""} onClick={applySchedule} className="primary-button">{busy === "schedule" && <LoaderCircle size={15} className="animate-spin" />} {release.publication_state === "scheduled" ? "Reschedule" : "Schedule release"}</button>{!canSchedule && <Link href="/pricing" className="inline-flex h-10 items-center gap-2 text-sm font-bold text-[var(--royal)]">Scheduling requires Artist Pro <ExternalLink size={14} /></Link>}</div>{scheduleLocal && <SchedulePreview value={scheduleLocal} timeZone={timeZone} />}{release.publish_at && release.timezone && <p className="mt-3 text-sm text-[var(--muted)]">Confirmed instant: <b className="text-[var(--foreground)]">{formatReleaseInstant(release.publish_at, release.timezone)}</b> · {new Date(release.publish_at).toISOString()}</p>}{rightsRefreshRequired && <label className="mt-4 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-sm"><input type="checkbox" checked={rightsAccepted} onChange={(event) => setRightsAccepted(event.target.checked)} className="mt-1 accent-violet-600" /><span><b>Rights confirmation required</b><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{policies.data?.data.rights_declaration ?? "Load the current policy before rescheduling."}</span></span></label>}</div>
    {error && <div className="mt-5"><InlineError message={error} />{error.includes("another tab") && <button type="button" onClick={onRefresh} className="text-sm font-bold text-[var(--royal)]"><RefreshCw size={14} className="mr-1 inline" /> Reload latest release</button>}</div>}{notice && <p role="status" className="mt-5 text-sm text-[var(--muted)]">{notice}</p>}
    <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">{release.processing_state === "failed" && <ActionButton disabled={busy !== ""} onClick={() => void run("retry", () => retryRelease(release.id, token))}><RefreshCw size={15} /> Retry processing</ActionButton>}{release.publication_state === "draft" && ready && <ActionButton disabled={busy !== ""} onClick={() => void run("publish", () => publishRelease(release.id, release.version, token))}><Play size={15} /> Publish now</ActionButton>}{release.publication_state === "scheduled" && <ActionButton disabled={busy !== ""} onClick={() => void run("cancel", () => cancelReleaseSchedule(release.id, release.version, token))}><PauseCircle size={15} /> Cancel schedule</ActionButton>}</div>
  </section>;
}

function PrivateReleasePreview({ release, thumbnailUrl, token, onRefresh }: { release: Release; thumbnailUrl?: string | null; token: string; onRefresh: () => void }) {
  const [urls, setUrls] = useState<{ video?: string; thumbnail?: string; audio?: string }>({});
  const [loading, setLoading] = useState(() => Boolean(release.preview?.video || release.preview?.thumbnail || release.preview?.original_audio));
  const [error, setError] = useState("");
  const refreshedFor = useRef("");

  useEffect(() => {
    const preview = release.preview;
    if (!preview?.video && !preview?.thumbnail && !preview?.original_audio) return;
    const controller = new AbortController();
    const created: string[] = [];
    let active = true;
    const load = async (kind: "video" | "thumbnail" | "audio", path: string) => {
      const blob = await apiMediaBlob(path, token, controller.signal);
      const url = URL.createObjectURL(blob);
      created.push(url);
      return [kind, url] as const;
    };
    void Promise.all([
      preview.video ? load("video", preview.video) : null,
      preview.thumbnail ? load("thumbnail", preview.thumbnail) : null,
      preview.original_audio ? load("audio", preview.original_audio) : null,
    ]).then((entries) => {
      if (!active) return;
      const next: { video?: string; thumbnail?: string; audio?: string } = {};
      entries.forEach((entry) => { if (entry) next[entry[0]] = entry[1]; });
      setUrls(next);
    }).catch((caught) => {
      if (!active || controller.signal.aborted) return;
      setError(caught instanceof ApiError ? caught.message : "Private preview could not be loaded.");
      const refreshKey = `${release.id}:${release.version}:${preview.video ?? ""}`;
      if (caught instanceof ApiError && caught.status === 404 && refreshedFor.current !== refreshKey) { refreshedFor.current = refreshKey; onRefresh(); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); created.forEach((url) => URL.revokeObjectURL(url)); };
  }, [onRefresh, release.id, release.preview, release.version, token]);

  return <div><div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">{urls.video ? <video controls playsInline preload="metadata" src={urls.video} poster={urls.thumbnail ?? thumbnailUrl ?? undefined} className="h-full w-full object-contain" /> : urls.thumbnail ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${urls.thumbnail}")` }} /> : thumbnailUrl ? <Image src={thumbnailUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 420px" className="object-cover" /> : <div className="grid h-full place-items-center text-center text-sm text-zinc-500"><span>{loading ? <><LoaderCircle size={24} className="mx-auto mb-2 animate-spin" />Loading owner preview…</> : release.processing_state === "processing" ? "Preview will be issued after processing." : "No private preview is currently available."}</span></div>}</div>{urls.audio && <audio controls preload="metadata" src={urls.audio} className="mt-3 w-full" />}{error && <p role="status" className={`mt-2 text-xs ${thumbnailUrl ? "text-[var(--muted)]" : "text-pink-400"}`}>{thumbnailUrl ? "Video preview is unavailable; showing the generated thumbnail." : error}</p>}<p className="mt-2 text-xs leading-5 text-[var(--muted)]">Private media is fetched with the owner session and held only in a temporary browser object URL.</p></div>;
}

function SchedulePreview({ value, timeZone }: { value: string; timeZone: string }) {
  let instant: string;
  try {
    instant = scheduleInstantFromLocal(value, timeZone, new Date(0));
  } catch { return null; }
  return <p className="mt-3 text-xs text-[var(--muted)]">Will submit <code>{instant}</code> with time zone <code>{timeZone}</code>.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold disabled:opacity-50">{children}</button>; }
function InlineError({ message }: { message: string }) { return <p role="alert" className="mt-4 rounded-xl border border-pink-500/20 bg-pink-500/10 p-3 text-sm text-pink-300">{message}</p>; }
