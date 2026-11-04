"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Flag, LoaderCircle, Music2, Pause, Pencil, Play, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { XpnLoader } from "@/components/common/xpn-loader";
import { ApiError } from "@/services/api";
import { deleteAudio, getAudio, getAudioVideos, saveAudio, unsaveAudio, updateAudio } from "@/services/audio";
import { reportTarget } from "@/services/safety";

const reportReasons = ["copyright", "harassment", "hate", "violence", "spam", "other"];

export function SoundProfile({ id }: { id: number }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [reuseAllowed, setReuseAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("copyright");
  const [reportDetails, setReportDetails] = useState("");

  const sound = useQuery({
    queryKey: ["audio", id, user?.id ?? "guest"],
    enabled: id > 0,
    queryFn: () => getAudio(id, token),
  });
  const videos = useQuery({
    queryKey: ["audio-videos", id, user?.id ?? "guest", page],
    enabled: id > 0 && sound.data?.data.status === "ready" && sound.data.data.reuse_allowed,
    queryFn: () => getAudioVideos(id, page, token),
  });
  const audio = sound.data?.data;
  const isOwner = Boolean(audio && user?.id === audio.creator.id);

  const save = useMutation({
    mutationFn: async () => {
      if (!audio || !token) throw new Error("Sign in to save this sound.");
      return audio.viewer.saved ? unsaveAudio(audio.id, token) : saveAudio(audio.id, token);
    },
    onSuccess: () => {
      setMessage(audio?.viewer.saved ? "Removed from saved sounds." : "Saved to your sound library.");
      void Promise.all([
        sound.refetch(),
        client.invalidateQueries({ queryKey: ["saved-audios", user?.id] }),
      ]);
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : "The sound could not be saved."),
  });

  const update = useMutation({
    mutationFn: () => updateAudio(id, { title: title.trim(), reuse_allowed: reuseAllowed }, token!),
    onSuccess: (response) => {
      client.setQueryData(["audio", id, user?.id ?? "guest"], response);
      setEditing(false);
      setMessage("Sound details updated.");
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The sound could not be updated."),
  });

  async function removeSound() {
    if (!token || !confirm("Delete this sound? It will no longer be available for new videos.")) return;
    setError("");
    try {
      await deleteAudio(id, token);
      router.replace("/feed");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The sound could not be deleted.");
    }
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/sounds/${id}`)}`);
      return;
    }
    setError("");
    try {
      const response = await reportTarget({ audio_id: id }, { reason: reportReason, details: reportDetails }, token);
      setMessage(`Report #${response.data.id} submitted.`);
      setReportOpen(false);
      setReportDetails("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The report could not be submitted.");
    }
  }

  if (sound.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Loading sound…" /></div>;
  if (!audio || sound.isError) return <UnavailableSound />;

  const canUse = audio.status === "ready" && audio.reuse_allowed;
  const useHref = token ? `/upload?audio=${audio.id}` : `/login?next=${encodeURIComponent(`/upload?audio=${audio.id}`)}`;

  return (
    <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8">
      <div className="mx-auto max-w-6xl pb-14">
        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
          <div className="bg-[radial-gradient(circle_at_top_left,#7c3aed45,transparent_55%)] p-6 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-3xl bg-[linear-gradient(145deg,#7c3aed,#4c1d95_58%,#18181b)] text-white shadow-xl"><Music2 size={54} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--royal)]">XPN sound</p>
                <h1 className="mt-2 break-words text-3xl font-semibold sm:text-4xl">{audio.title}</h1>
                <Link href={`/profile/${audio.creator.username}`} className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><UserAvatar src={audio.creator.avatar} size={30} /> @{audio.creator.username}</Link>
                <p className="mt-3 text-sm text-[var(--muted)]">{audio.videos_count} {audio.videos_count === 1 ? "video" : "videos"} · {audio.origin} · {audio.status}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end">
                {canUse && <Link href={useHref} className="primary-button"><Music2 size={16} /> Use this sound</Link>}
                <button disabled={save.isPending} onClick={() => token ? save.mutate() : router.push(`/login?next=${encodeURIComponent(`/sounds/${audio.id}`)}`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold"><Bookmark size={16} fill={audio.viewer.saved ? "currentColor" : "none"} /> {audio.viewer.saved ? "Saved" : "Save"}</button>
                <button onClick={() => setReportOpen((value) => !value)} className="icon-button" aria-label="Report sound"><Flag size={17} /></button>
              </div>
            </div>

            {audio.audio_url && <div className="mt-7 flex items-center gap-3 rounded-2xl bg-black/20 p-3 backdrop-blur"><button type="button" onClick={(event) => { const player = event.currentTarget.parentElement?.querySelector("audio"); if (!player) return; if (player.paused) void player.play(); else player.pause(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-violet-800" aria-label={playing ? "Pause sound" : "Play sound"}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><audio src={audio.audio_url} controls preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="h-10 min-w-0 flex-1" /></div>}
            {!canUse && <p className="mt-6 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">This sound is unavailable for new videos. Previously rendered videos keep their embedded soundtrack.</p>}
          </div>
        </div>

        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-pink-500/10 p-4 text-sm text-pink-300">{error}</p>}

        {reportOpen && <form onSubmit={submitReport} className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:grid-cols-[180px_1fr_auto]"><select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="studio-input">{reportReasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</select><input value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} placeholder="Optional details" className="studio-input" /><button className="primary-button">Submit report</button></form>}

        {isOwner && <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Manage your sound</h2><p className="mt-1 text-sm text-[var(--muted)]">Change its title or stop future reuse without affecting rendered videos.</p></div><button onClick={() => { setTitle(audio.title); setReuseAllowed(audio.reuse_allowed); setEditing((value) => !value); }} className="icon-button" aria-label="Edit sound"><Pencil size={17} /></button></div>{editing && <form onSubmit={(event) => { event.preventDefault(); setError(""); update.mutate(); }} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="studio-input" /><label className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-4 text-sm font-semibold"><input type="checkbox" checked={reuseAllowed} onChange={(event) => setReuseAllowed(event.target.checked)} className="accent-violet-600" /> Allow reuse</label><button disabled={update.isPending} className="primary-button">{update.isPending && <LoaderCircle size={15} className="animate-spin" />} Save</button></form>}<button onClick={() => void removeSound()} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pink-400"><Trash2 size={15} /> Delete sound</button></section>}

        <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Videos using this sound</h2><p className="mt-1 text-sm text-[var(--muted)]">Only videos visible to you are shown.</p></div>{videos.data && videos.data.meta.last_page > 1 && <div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-9 rounded-lg border border-[var(--line)] px-3 text-sm disabled:opacity-40">Previous</button><button disabled={page >= videos.data.meta.last_page} onClick={() => setPage((value) => value + 1)} className="h-9 rounded-lg border border-[var(--line)] px-3 text-sm disabled:opacity-40">Next</button></div>}</div>{videos.isPending ? <div className="grid min-h-48 place-items-center"><XpnLoader compact label="Loading videos…" /></div> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{videos.data?.data.map((video) => <Link key={video.id} href={`/video/${video.id}`} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">{video.thumbnail_url ? <Image src={video.thumbnail_url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition group-hover:scale-[1.02]" /> : <span className="absolute inset-0 grid place-items-center"><UserRound size={28} className="text-[var(--muted)]" /></span>}<span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white"><Play size={15} fill="currentColor" /></span></div><p className="mt-2 line-clamp-2 text-sm font-medium">{video.caption || "Untitled video"}</p><p className="mt-1 text-xs text-[var(--muted)]">@{video.user.username}</p></Link>)}</div>}{!videos.isPending && !videos.data?.data.length && <p className="mt-5 rounded-xl bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--muted)]">No visible videos are using this sound yet.</p>}</section>
      </div>
    </section>
  );
}

function UnavailableSound() {
  return <section className="page-content grid h-full place-items-center px-5"><div className="max-w-md text-center"><Music2 size={44} className="mx-auto text-[var(--muted)]" /><h1 className="mt-4 text-2xl font-semibold">Sound unavailable</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">It may still be processing, withdrawn, restricted, or unavailable to this viewer.</p><Link href="/feed" className="primary-button mt-6">Back to browsing</Link></div></section>;
}
