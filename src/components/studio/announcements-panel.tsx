"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LoaderCircle, Pencil, Send, Trash2 } from "lucide-react";
import { clearAnnouncementSendKey, getAnnouncementSendKey } from "@/lib/messaging";
import { ApiError } from "@/services/api";
import { createAnnouncement, deleteAnnouncement, getOwnerAnnouncements, sendAnnouncement, updateAnnouncement } from "@/services/messaging";
import { getMyVideos } from "@/services/videos";
import type { Announcement } from "@/types/api";

export function AnnouncementsPanel({ token, userId, enabled }: { token: string; userId: number; enabled: boolean }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState({ title: "", body: "", video_id: 0 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const announcements = useInfiniteQuery({
    queryKey: ["owner-announcements", userId],
    queryFn: ({ pageParam }) => getOwnerAnnouncements(token, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
  });
  const videos = useQuery({ queryKey: ["my-videos", userId, "announcement"], queryFn: () => getMyVideos(token, 100) });
  const eligibleVideos = videos.data?.data.filter((video) => video.processing_state === "ready" && video.publication_state === "published" && video.visibility === "public") ?? [];
  const refresh = () => client.invalidateQueries({ queryKey: ["owner-announcements", userId] });
  const create = useMutation({
    mutationFn: () => createAnnouncement({ title: draft.title.trim(), body: draft.body.trim(), ...(draft.video_id ? { video_id: draft.video_id } : {}) }, token),
    onSuccess: () => { setDraft({ title: "", body: "", video_id: 0 }); setError(""); setNotice("Announcement draft saved."); void refresh(); },
    onError: (caught) => setError(errorMessage(caught, "Could not save the announcement draft.")),
  });
  const rows = announcements.data?.pages.flatMap((page) => page.data) ?? [];

  function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); create.mutate();
  }

  return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Fan updates</h2><p className="mt-1 text-sm text-[var(--muted)]">Plain-text updates go only to separately opted-in, eligible recipients. Audience details remain aggregate.</p></div>{!enabled && <Link href="/pricing" className="text-sm font-bold text-[var(--royal)]">Artist Pro required for new sends</Link>}</div>
    {!enabled && <div className="mt-5 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">History and draft deletion remain available after downgrade. Creating, editing and sending require current eligibility.</div>}
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl bg-[var(--surface)] p-4"><div className="grid gap-3 sm:grid-cols-2"><input disabled={!enabled} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder="Update title" className="studio-input" required /><select disabled={!enabled} value={draft.video_id} onChange={(event) => setDraft({ ...draft, video_id: Number(event.target.value) })} className="studio-input"><option value={0}>No release attached</option>{eligibleVideos.map((video) => <option value={video.id} key={video.id}>{video.caption || `Release #${video.id}`}</option>)}</select></div><textarea disabled={!enabled} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} maxLength={2000} rows={4} placeholder="Share a plain-text update without markup or external links…" className="studio-input h-auto py-3" required /><div className="flex items-center justify-between gap-3"><span className="text-xs text-[var(--muted)]">{draft.title.length}/120 · {draft.body.length}/2000</span><button disabled={!enabled || create.isPending} className="primary-button">{create.isPending && <LoaderCircle size={15} className="animate-spin" />} Save draft</button></div></form>
    {error && <p role="alert" className="mt-4 rounded-xl bg-pink-500/10 p-3 text-sm text-pink-300">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-emerald-400">{notice}</p>}
    <div className="mt-6 space-y-3">{announcements.isPending && <p className="py-8 text-center text-sm text-[var(--muted)]">Loading update history…</p>}{rows.map((announcement) => <AnnouncementCard key={`${announcement.id}-${announcement.version}`} announcement={announcement} token={token} userId={userId} enabled={enabled} videos={eligibleVideos.map((video) => ({ id: video.id, title: video.caption || `Release #${video.id}` }))} onChanged={() => void refresh()} />)}{!announcements.isPending && !rows.length && <div className="py-10 text-center"><Bell size={28} className="mx-auto text-[var(--muted)]" /><p className="mt-3 text-sm text-[var(--muted)]">No announcement drafts or deliveries yet.</p></div>}</div>
    {announcements.hasNextPage && <button type="button" disabled={announcements.isFetchingNextPage} onClick={() => void announcements.fetchNextPage()} className="mt-5 h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{announcements.isFetchingNextPage ? "Loading…" : "Load more history"}</button>}
  </section>;
}

function AnnouncementCard({ announcement, token, userId, enabled, videos, onChanged }: { announcement: Announcement; token: string; userId: number; enabled: boolean; videos: Array<{ id: number; title: string }>; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: announcement.title, body: announcement.body, video_id: announcement.video_id ?? 0 });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const isDraft = (announcement.status ?? "draft") === "draft" && !announcement.accepted_at;

  async function save() {
    setBusy("save"); setError("");
    try {
      await updateAnnouncement(announcement.id, { version: announcement.version, title: draft.title.trim(), body: draft.body.trim(), video_id: draft.video_id || null }, token);
      setEditing(false); onChanged();
    } catch (caught) { setError(errorMessage(caught, "Could not update the draft.")); }
    finally { setBusy(""); }
  }
  async function remove() {
    if (!confirm(`Delete “${announcement.title}”?`)) return;
    setBusy("delete"); setError("");
    try { await deleteAnnouncement(announcement.id, token); onChanged(); }
    catch (caught) { setError(errorMessage(caught, "Could not delete the draft.")); }
    finally { setBusy(""); }
  }
  async function send() {
    setBusy("send"); setError("");
    const key = getAnnouncementSendKey(userId, announcement.id, announcement.version);
    try {
      await sendAnnouncement(announcement.id, announcement.version, key, token);
      clearAnnouncementSendKey(userId, announcement.id, announcement.version);
      onChanged();
    } catch (caught) { setError(errorMessage(caught, "Send status is uncertain. Retry keeps the same operation key.")); }
    finally { setBusy(""); }
  }

  return <article className="rounded-2xl border border-[var(--line)] p-4">{editing ? <div className="grid gap-3"><input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="studio-input" /><textarea value={draft.body} maxLength={2000} rows={4} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="studio-input h-auto py-3" /><select value={draft.video_id} onChange={(event) => setDraft({ ...draft, video_id: Number(event.target.value) })} className="studio-input"><option value={0}>No release attached</option>{videos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}</select><div className="flex gap-2"><button type="button" disabled={busy !== ""} onClick={() => void save()} className="primary-button">Save changes</button><button type="button" onClick={() => setEditing(false)} className="h-10 px-3 text-sm font-semibold">Cancel</button></div></div> : <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{announcement.title}</h3><span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-bold uppercase">{announcement.status ?? "draft"}</span></div><p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{announcement.body}</p><p className="mt-3 text-xs text-[var(--muted)]">Estimate {announcement.recipient_estimate ?? 0} · accepted {announcement.recipient_count ?? 0} · delivered {announcement.delivered_count ?? 0} · suppressed {announcement.suppressed_count ?? 0} · v{announcement.version}</p></div><div className="flex shrink-0 gap-2">{isDraft && enabled && <button type="button" disabled={busy !== ""} onClick={() => setEditing(true)} className="icon-button" aria-label="Edit announcement"><Pencil size={16} /></button>}{isDraft && enabled && <button type="button" disabled={busy !== ""} onClick={() => void send()} className="icon-button text-[var(--royal)]" aria-label="Send announcement">{busy === "send" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}</button>}{isDraft && <button type="button" disabled={busy !== ""} onClick={() => void remove()} className="icon-button text-pink-400" aria-label="Delete announcement"><Trash2 size={16} /></button>}</div></div>}{error && <p role="alert" className="mt-3 rounded-lg bg-pink-500/10 p-3 text-xs text-pink-300">{error}</p>}</article>;
}

function errorMessage(caught: unknown, fallback: string) {
  if (!(caught instanceof ApiError)) return caught instanceof Error ? caught.message : fallback;
  if (caught.status === 429) return "The paid-period announcement quota is exhausted. This send was not retried automatically.";
  if (caught.status === 422 && caught.message.toLowerCase().includes("recipient")) return "The eligible audience is larger than the current delivery limit. No quota was used.";
  if (caught.status === 409) return "This draft changed or was already accepted. Reload the latest version before continuing.";
  return caught.message;
}
