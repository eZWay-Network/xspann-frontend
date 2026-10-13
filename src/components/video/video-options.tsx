"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Bookmark,
  CheckCircle2,
  Eye,
  Flag,
  Heart,
  Info,
  LoaderCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Music,
} from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compactNumber, cx } from "@/lib/format";
import { ApiError } from "@/services/api";
import { saveVideo, unsaveVideo } from "@/services/saves";
import { blockUser, reportVideo } from "@/services/safety";
import type { Video } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";

const VIDEO_REPORT_REASONS = [
  "Spam or misleading",
  "Hate speech or abusive content",
  "Harassment or bullying",
  "Violence or dangerous behavior",
  "Nudity or sexual content",
  "Copyright infringement",
  "Other",
] as const;

type VideoOptionsProps = {
  video: Video;
  onSaveChange: (videoId: number, saved: boolean, savesCount: number) => void;
  onCreatorBlocked: (userId: number) => void;
};

export function VideoOptions({ video, onSaveChange, onCreatorBlocked }: VideoOptionsProps) {
  const { authenticated, token, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";
  const isOwnVideo = user?.id === video.user.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reason, setReason] = useState<(typeof VIDEO_REPORT_REASONS)[number]>(VIDEO_REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState<"save" | "report" | "block" | null>(null);
  const [error, setError] = useState("");

  const mutedClass = isDark ? "text-violet-100/55" : "text-zinc-500";
  const softButtonClass = isDark
    ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]"
    : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-violet-50";
  const optionClass = isDark
    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
    : "border-zinc-200 bg-white hover:bg-violet-50";

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuWithEscape);
    };
  }, [menuOpen]);

  function requireAuthentication() {
    if (authenticated && token) return true;
    router.push(`/login?next=${encodeURIComponent(`/video/${video.id}`)}`);
    return false;
  }

  function openInfo() {
    setMenuOpen(false);
    setInfoOpen(true);
  }

  function openReport() {
    if (!requireAuthentication()) return;
    setMenuOpen(false);
    setError("");
    setReportSubmitted(false);
    setReportOpen(true);
  }

  function openBlock() {
    if (!requireAuthentication()) return;
    setMenuOpen(false);
    setError("");
    setBlockOpen(true);
  }

  async function toggleSave() {
    if (!requireAuthentication() || !token) return;

    const wasSaved = video.viewer.saved;
    const previousCount = video.stats.saves;
    const optimisticCount = Math.max(0, previousCount + (wasSaved ? -1 : 1));
    setSubmitting("save");
    setError("");
    onSaveChange(video.id, !wasSaved, optimisticCount);

    try {
      const response = wasSaved ? await unsaveVideo(video.id, token) : await saveVideo(video.id, token);
      onSaveChange(video.id, response.data.saved, response.data.saves_count);
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["saved-videos"] });
    } catch (caughtError) {
      onSaveChange(video.id, wasSaved, previousCount);
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not update this saved video.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitting("report");
    setError("");

    try {
      await reportVideo(video.id, { reason, details: details.trim() }, token);
      setReportSubmitted(true);
      setDetails("");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not submit this report.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitBlock() {
    if (!token) return;

    setSubmitting("block");
    setError("");

    try {
      await blockUser(video.user.id, token);
      setBlockOpen(false);
      onCreatorBlocked(video.user.id);
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      void queryClient.invalidateQueries({ queryKey: ["discover-videos"] });
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not block this creator.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <div ref={menuRef} className="absolute right-3 top-3 z-30 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={() => {
            setError("");
            setMenuOpen((open) => !open);
          }}
          aria-label="Video options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/60"
        >
          <MoreHorizontal size={22} />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2 text-[var(--foreground)] shadow-2xl">
            <VideoMenuItem icon={<Info size={18} />} label="Video info & description" onClick={openInfo} />
            <VideoMenuItem
              icon={submitting === "save" ? <LoaderCircle className="animate-spin" size={18} /> : <Bookmark size={18} fill={video.viewer.saved ? "currentColor" : "none"} />}
              label={video.viewer.saved ? "Remove from saved" : "Save video"}
              onClick={() => void toggleSave()}
              disabled={submitting === "save"}
            />
            {!isOwnVideo && (
              <>
                <div className="my-1 h-px bg-[var(--line)]" />
                <VideoMenuItem icon={<Flag size={18} />} label="Report video" onClick={openReport} />
                <VideoMenuItem icon={<Ban size={18} />} label={`Block @${video.user.username}`} onClick={openBlock} danger />
              </>
            )}
            {error && <p className="m-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">{error}</p>}
          </div>
        )}
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-16">
            <DialogTitle>Video information</DialogTitle>
            <DialogDescription>Details provided with this video.</DialogDescription>
          </DialogHeader>

          <div className="modern-scrollbar max-h-[68vh] overflow-y-auto px-6 py-5">
            <Link href={`/profile/${video.user.username}`} onClick={() => setInfoOpen(false)} className={cx("flex items-center gap-3 rounded-lg border p-3 transition", optionClass)}>
              <UserAvatar src={video.user.avatar} size={44} className="h-11 w-11" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">@{video.user.username}</p>
                {video.user.name && <p className={cx("truncate text-sm", mutedClass)}>{video.user.name}</p>}
              </div>
            </Link>

            <section className="mt-5">
              <h3 className="text-sm font-bold">Description</h3>
              <p className={cx("mt-2 whitespace-pre-wrap text-sm leading-6", video.caption ? "text-[var(--foreground)]" : mutedClass)}>
                {video.caption?.trim() || "No description was added."}
              </p>
              {video.tags.length > 0 && (
                <p className="mt-3 text-sm font-semibold text-[var(--royal)]">{video.tags.map((tag) => `#${tag.replace("#", "")}`).join(" ")}</p>
              )}
            </section>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <VideoStat icon={<Eye size={16} />} label="Views" value={video.stats.views} />
              <VideoStat icon={<Heart size={16} />} label="Likes" value={video.stats.likes} />
              <VideoStat icon={<MessageCircle size={16} />} label="Comments" value={video.stats.comments} />
              <VideoStat icon={<Bookmark size={16} />} label="Saves" value={video.stats.saves} />
            </div>

            <dl className="mt-5 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] px-4">
              <VideoDetail label="Published" value={formatVideoDate(video.created_at)} />
              <VideoDetail label="Visibility" value={capitalize(video.visibility)} />
              {video.duration !== null && <VideoDetail label="Duration" value={formatDuration(video.duration)} />}
              {video.location_name && <VideoDetail label="Location" value={video.location_name} icon={<MapPin size={15} />} />}
              <VideoDetail label="Sound" value={video.music} icon={<Music size={15} />} />
            </dl>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg p-0">
          {reportSubmitted ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={42} />
              <DialogTitle>Report submitted</DialogTitle>
              <DialogDescription className="mx-auto mt-3 max-w-sm leading-6">Thanks for letting us know. Your report is open for review.</DialogDescription>
              <button type="button" onClick={() => setReportOpen(false)} className="mt-6 h-10 rounded-md bg-[var(--royal)] px-6 text-sm font-bold text-white">Done</button>
            </div>
          ) : (
            <form onSubmit={submitReport}>
              <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-16">
                <DialogTitle>Report this video</DialogTitle>
                <DialogDescription>Select the reason that best describes the problem.</DialogDescription>
              </DialogHeader>

              <div className="modern-scrollbar max-h-[58vh] overflow-y-auto px-6 py-5">
                <fieldset className="grid gap-2">
                  <legend className="sr-only">Report reason</legend>
                  {VIDEO_REPORT_REASONS.map((reportReason) => (
                    <label key={reportReason} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition", optionClass)}>
                      <input type="radio" name="video-report-reason" value={reportReason} checked={reason === reportReason} onChange={() => setReason(reportReason)} className="h-4 w-4 accent-violet-600" />
                      {reportReason}
                    </label>
                  ))}
                </fieldset>

                <label className="mt-5 block">
                  <span className="text-sm font-bold">More details <span className={mutedClass}>(optional)</span></span>
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value.slice(0, 2000))}
                    maxLength={2000}
                    rows={4}
                    placeholder="Share anything that may help us review this report."
                    className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-violet-500"
                  />
                  <span className={cx("mt-1 block text-right text-xs", mutedClass)}>{details.length}/2000</span>
                </label>

                {error && <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500">{error}</p>}
              </div>

              <DialogFooter className="border-t border-[var(--line)] px-6 py-4">
                <button type="button" onClick={() => setReportOpen(false)} className={cx("h-10 rounded-md border px-5 text-sm font-bold transition", softButtonClass)}>Cancel</button>
                <button type="submit" disabled={submitting === "report"} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--royal)] px-5 text-sm font-bold text-white disabled:opacity-50">
                  {submitting === "report" && <LoaderCircle className="animate-spin" size={16} />}
                  Submit report
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-rose-500/10 text-rose-500"><Ban size={22} /></div>
            <DialogTitle>Block @{video.user.username}?</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              You will no longer see each other&apos;s profiles, videos, comments, or interactions. Any follows between you will be removed.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500">{error}</p>}
          <DialogFooter className="mt-6">
            <button type="button" onClick={() => setBlockOpen(false)} className={cx("h-10 rounded-md border px-5 text-sm font-bold transition", softButtonClass)}>Cancel</button>
            <button type="button" onClick={() => void submitBlock()} disabled={submitting === "block"} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50">
              {submitting === "block" && <LoaderCircle className="animate-spin" size={16} />}
              Block
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoMenuItem({ icon, label, onClick, danger = false, disabled = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition disabled:opacity-50", danger ? "text-rose-500 hover:bg-rose-500/10" : "hover:bg-[var(--surface)]")}>
      <span className="grid w-5 shrink-0 place-items-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function VideoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-2 py-3 text-center">
      <span className="mx-auto mb-1 flex items-center justify-center text-[var(--muted)]">{icon}</span>
      <strong className="block text-sm">{compactNumber(value)}</strong>
      <span className="text-[10px] text-[var(--muted)]">{label}</span>
    </div>
  );
}

function VideoDetail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="flex max-w-[65%] items-center gap-1.5 text-right font-semibold">{icon}{value}</dd>
    </div>
  );
}

function formatVideoDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
