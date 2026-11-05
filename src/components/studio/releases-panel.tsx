"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Music2, PauseCircle, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { XpnLoader } from "@/components/common/xpn-loader";
import { formatReleaseInstant, isStaleRightsError, scheduleInstantFromLocal } from "@/lib/releases";
import { ApiError, apiMediaBlob } from "@/services/api";
import { getPolicies } from "@/services/auth";
import { cancelReleaseSchedule, getRelease, getReleases, publishRelease, retryRelease, scheduleRelease, updateRelease } from "@/services/releases";
import { deleteVideo } from "@/services/videos";
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
  const rows = releases.data?.pages.flatMap((page) => page.data) ?? [];
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

  return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Releases</h2><p className="mt-1 text-sm text-[var(--muted)]">Private drafts, authenticated previews, immediate publishing, and entitled scheduling.</p></div><Link href="/upload?intent=draft" className="primary-button"><Plus size={16} /> New private draft</Link></div>
    <div className="mt-6">{releases.isPending ? <XpnLoader compact label="Loading releases…" /> : releases.isError ? <InlineError message="Releases could not be loaded." /> : <div className="grid gap-3 sm:grid-cols-2">{rows.map((release) => <ReleaseCard key={release.id} release={release} selected={selectedId === release.id} onOpen={() => setSelectedId(selectedId === release.id ? null : release.id)} />)}{!rows.length && <div className="col-span-full py-12 text-center"><Music2 size={32} className="mx-auto text-[var(--muted)]" /><h3 className="mt-3 font-semibold">No releases yet</h3><p className="mt-1 text-sm text-[var(--muted)]">Upload a clip and save it as a private draft or post immediately.</p></div>}</div>}{releases.hasNextPage && <button type="button" disabled={releases.isFetchingNextPage} onClick={() => void releases.fetchNextPage()} className="mt-5 h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{releases.isFetchingNextPage ? "Loading…" : "Load more releases"}</button>}</div>
    {selectedId && <div className="mt-6">{detail.isPending ? <XpnLoader compact label="Opening release…" /> : detail.data ? <ReleaseEditor key={`${detail.data.data.id}-${detail.data.data.version}`} release={detail.data.data} token={token} userId={userId} canSchedule={canSchedule} onClose={() => setSelectedId(null)} onRefresh={detail.refetch} onChanged={installRelease} onDeleted={async () => { setSelectedId(null); await refreshLists(); }} /> : <InlineError message="Release detail could not be loaded." />}</div>}
  </section>;
}

function ReleaseCard({ release, selected, onOpen }: { release: Release; selected: boolean; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} aria-pressed={selected} className={`flex min-w-0 items-center gap-4 rounded-2xl border p-3 text-left transition ${selected ? "border-violet-400 bg-violet-500/[0.06] ring-2 ring-violet-400/15" : "border-[var(--line)] bg-[var(--surface)] hover:border-violet-400/55"}`}><span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900">{release.publication_state === "published" && release.thumbnail_url ? <Image src={release.thumbnail_url} alt="" fill sizes="80px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#312e81,#18181b)]"><Music2 size={24} className="text-violet-200" /></span>}<span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold capitalize text-white">{release.publication_state}</span></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{release.caption || "Untitled release"}</span><span className="mt-1 block text-xs capitalize text-[var(--muted)]">{release.processing_state} · {release.moderation_status.replaceAll("_", " ")} · v{release.version}</span>{release.publish_at && release.timezone && <span className="mt-2 block text-xs text-[var(--royal)]">{formatReleaseInstant(release.publish_at, release.timezone)}</span>}{release.paused_reason && <span className="mt-2 block text-xs text-amber-300">Paused: {release.paused_reason}</span>}</span></button>;
}

function ReleaseEditor({ release, token, userId, canSchedule, onClose, onRefresh, onChanged, onDeleted }: { release: Release; token: string; userId: number; canSchedule: boolean; onClose: () => void; onRefresh: () => void; onChanged: (release: Release) => void; onDeleted: () => Promise<void> }) {
  const client = useQueryClient();
  const policies = useQuery({ queryKey: ["policies"], queryFn: getPolicies, staleTime: 5 * 60_000 });
  const [draft, setDraft] = useState({ caption: release.caption ?? "", location_name: release.location_name ?? "", visibility: release.visibility, high_quality_upload: release.high_quality_upload, reuse_content: release.reuse_content ?? false });
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [rightsRefreshRequired, setRightsRefreshRequired] = useState(false);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const editable = release.publication_state === "draft";
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

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!editable) { setError("Cancel the schedule before editing release details."); return; }
    const payload = {
      version: release.version,
      ...(draft.caption !== (release.caption ?? "") ? { caption: draft.caption.trim() || null } : {}),
      ...(draft.location_name !== (release.location_name ?? "") ? { location_name: draft.location_name.trim() || null } : {}),
      ...(draft.visibility !== release.visibility ? { visibility: draft.visibility } : {}),
      ...(draft.high_quality_upload !== release.high_quality_upload ? { high_quality_upload: draft.high_quality_upload } : {}),
      ...(draft.reuse_content !== (release.reuse_content ?? false) ? { reuse_content: draft.reuse_content } : {}),
    };
    if (Object.keys(payload).length === 1) { setNotice("No draft changes to save."); return; }
    void run("save", () => updateRelease(release.id, payload, token));
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

  async function remove() {
    if (!confirm(`Delete “${release.caption || `Release #${release.id}`}”? This removes the owned video, not only the schedule.`)) return;
    setBusy("delete"); setError("");
    try { await deleteVideo(release.id, token); await onDeleted(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The release could not be deleted."); }
    finally { setBusy(""); }
  }

  return <section className="rounded-2xl border border-violet-500/25 bg-[var(--background)] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--royal)]">Release editor</p><h3 className="mt-1 text-xl font-semibold">{release.caption || `Release #${release.id}`}</h3><p className="mt-1 text-xs capitalize text-[var(--muted)]">{release.processing_state} · {release.publication_state} · {release.moderation_status.replaceAll("_", " ")} · version {release.version}</p></div><button type="button" onClick={onClose} className="text-sm font-bold text-[var(--muted)]">Close</button></div>
    {release.paused_reason && <div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300"><p className="font-semibold">Schedule returned to draft</p><p className="mt-1">{release.paused_reason}</p><p className="mt-2 text-xs">Resolve the issue, then explicitly publish or choose a new schedule.</p></div>}
    {release.error_code && <InlineError message={`Processing failure: ${release.error_code}`} />}
    <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]"><PrivateReleasePreview release={release} token={token} onRefresh={onRefresh} /><form onSubmit={saveDraft} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Caption"><textarea disabled={!editable} rows={4} maxLength={4000} value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className="studio-input h-auto py-3" /></Field><div className="space-y-3"><Field label="Location"><input disabled={!editable} maxLength={120} value={draft.location_name} onChange={(event) => setDraft({ ...draft, location_name: event.target.value })} className="studio-input" /></Field><Field label="Visibility"><select disabled={!editable} value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as typeof draft.visibility })} className="studio-input"><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></Field></div></div><div className="grid gap-3 sm:grid-cols-2"><Toggle disabled={!editable} checked={draft.high_quality_upload} onChange={(value) => setDraft({ ...draft, high_quality_upload: value })} label="High-quality upload" /><Toggle disabled={!editable} checked={draft.reuse_content} onChange={(value) => setDraft({ ...draft, reuse_content: value })} label="Allow content reuse" /></div>{release.publication_state === "scheduled" && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">Cancel the schedule before editing release content.</p>}<button disabled={!editable || busy !== ""} className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{busy === "save" && <LoaderCircle size={15} className="mr-2 inline animate-spin" />}Save draft details</button></form></div>
    <div className="mt-6 border-t border-[var(--line)] pt-5"><div className="flex flex-wrap items-end gap-3"><Field label={`${release.publication_state === "scheduled" ? "New publication time" : "Publication time"} (${timeZone})`}><input type="datetime-local" value={scheduleLocal} onChange={(event) => setScheduleLocal(event.target.value)} className="studio-input min-w-64" /></Field><button type="button" disabled={!canSchedule || !ready || !scheduleLocal || busy !== ""} onClick={applySchedule} className="primary-button">{busy === "schedule" && <LoaderCircle size={15} className="animate-spin" />} {release.publication_state === "scheduled" ? "Reschedule" : "Schedule release"}</button>{!canSchedule && <Link href="/pricing" className="inline-flex h-10 items-center gap-2 text-sm font-bold text-[var(--royal)]">Scheduling requires Artist Pro <ExternalLink size={14} /></Link>}</div>{scheduleLocal && <SchedulePreview value={scheduleLocal} timeZone={timeZone} />}{release.publish_at && release.timezone && <p className="mt-3 text-sm text-[var(--muted)]">Confirmed instant: <b className="text-[var(--foreground)]">{formatReleaseInstant(release.publish_at, release.timezone)}</b> · {new Date(release.publish_at).toISOString()}</p>}{rightsRefreshRequired && <label className="mt-4 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-sm"><input type="checkbox" checked={rightsAccepted} onChange={(event) => setRightsAccepted(event.target.checked)} className="mt-1 accent-violet-600" /><span><b>Rights confirmation required</b><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{policies.data?.data.rights_declaration ?? "Load the current policy before rescheduling."}</span></span></label>}</div>
    {error && <div className="mt-5"><InlineError message={error} />{error.includes("another tab") && <button type="button" onClick={onRefresh} className="text-sm font-bold text-[var(--royal)]"><RefreshCw size={14} className="mr-1 inline" /> Reload latest release</button>}</div>}{notice && <p role="status" className="mt-5 text-sm text-[var(--muted)]">{notice}</p>}
    <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">{release.processing_state === "failed" && <ActionButton disabled={busy !== ""} onClick={() => void run("retry", () => retryRelease(release.id, token))}><RefreshCw size={15} /> Retry processing</ActionButton>}{release.publication_state === "draft" && ready && <ActionButton disabled={busy !== ""} onClick={() => void run("publish", () => publishRelease(release.id, release.version, token))}><Play size={15} /> Publish now</ActionButton>}{release.publication_state === "scheduled" && <ActionButton disabled={busy !== ""} onClick={() => void run("cancel", () => cancelReleaseSchedule(release.id, release.version, token))}><PauseCircle size={15} /> Cancel schedule</ActionButton>}<button type="button" disabled={busy !== ""} onClick={() => void remove()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-500/25 px-4 text-sm font-semibold text-pink-400"><Trash2 size={15} /> Delete release</button></div>
  </section>;
}

function PrivateReleasePreview({ release, token, onRefresh }: { release: Release; token: string; onRefresh: () => void }) {
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

  return <div><div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">{urls.video ? <video controls playsInline preload="metadata" src={urls.video} poster={urls.thumbnail} className="h-full w-full object-contain" /> : urls.thumbnail ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${urls.thumbnail}")` }} /> : <div className="grid h-full place-items-center text-center text-sm text-zinc-500"><span>{loading ? <><LoaderCircle size={24} className="mx-auto mb-2 animate-spin" />Loading owner preview…</> : release.processing_state === "processing" ? "Preview will be issued after processing." : "No private preview is currently available."}</span></div>}</div>{urls.audio && <audio controls preload="metadata" src={urls.audio} className="mt-3 w-full" />}{error && <p role="alert" className="mt-2 text-xs text-pink-400">{error}</p>}<p className="mt-2 text-xs leading-5 text-[var(--muted)]">Private media is fetched with the owner session and held only in a temporary browser object URL.</p></div>;
}

function SchedulePreview({ value, timeZone }: { value: string; timeZone: string }) {
  let instant: string;
  try {
    instant = scheduleInstantFromLocal(value, timeZone, new Date(0));
  } catch { return null; }
  return <p className="mt-3 text-xs text-[var(--muted)]">Will submit <code>{instant}</code> with time zone <code>{timeZone}</code>.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>; }
function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-3 text-sm font-semibold"><span>{label}</span><input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-violet-600" /></label>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold disabled:opacity-50">{children}</button>; }
function InlineError({ message }: { message: string }) { return <p role="alert" className="mt-4 rounded-xl border border-pink-500/20 bg-pink-500/10 p-3 text-sm text-pink-300">{message}</p>; }
