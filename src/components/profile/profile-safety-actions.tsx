"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Flag,
  LoaderCircle,
  MoreHorizontal,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { useTheme } from "@/components/common/theme-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cx } from "@/lib/format";
import { ApiError } from "@/services/api";
import { blockUser, reportUser, unblockUser } from "@/services/safety";
import type { Profile } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";

const REPORT_REASONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Impersonation",
  "Hate speech or abusive content",
  "Inappropriate content",
  "Other",
] as const;

type ProfileSafetyActionsProps = {
  profile: Profile;
  token: string | null;
  authenticated: boolean;
  blocked: boolean;
  onBlockedChange: (blocked: boolean) => void;
};

export function ProfileSafetyActions({
  profile,
  token,
  authenticated,
  blocked,
  onBlockedChange,
}: ProfileSafetyActionsProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = theme === "dark";
  const [actionOpen, setActionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState<"report" | "block" | "unblock" | null>(null);
  const [error, setError] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const softButtonClass = isDark
    ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]"
    : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-violet-50";
  const mutedClass = isDark ? "text-violet-100/55" : "text-zinc-500";
  const optionClass = isDark
    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
    : "border-zinc-200 bg-white hover:bg-violet-50";

  function clearError() {
    setError("");
  }

  function openReport() {
    setActionOpen(false);
    setReportSubmitted(false);
    clearError();
    setReportOpen(true);
  }

  function openBlock() {
    setActionOpen(false);
    clearError();
    setBlockOpen(true);
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitting("report");
    clearError();

    try {
      await reportUser(profile.id, { reason, details: details.trim() }, token);
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

    setSubmitting(blocked ? "unblock" : "block");
    clearError();

    try {
      if (blocked) {
        await unblockUser(profile.id, token);
      } else {
        await blockUser(profile.id, token);
      }

      onBlockedChange(!blocked);
      setBlockOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      void queryClient.invalidateQueries({ queryKey: ["discover-videos"] });

      if (blocked) {
        void queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
        void queryClient.invalidateQueries({ queryKey: ["user-videos", profile.username] });
      }
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : `Could not ${blocked ? "unblock" : "block"} this account.`);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          clearError();
          setActionOpen(true);
        }}
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 transition",
          isDark
            ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
            : "bg-violet-50 text-violet-950 ring-violet-200 hover:bg-violet-100",
        )}
        aria-label={`More actions for @${profile.username}`}
      >
        <MoreHorizontal size={20} />
      </button>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-16">
            <DialogTitle>Account actions</DialogTitle>
            <DialogDescription>Choose an action for @{profile.username}.</DialogDescription>
          </DialogHeader>

          {!authenticated ? (
            <div className="px-6 py-7 text-center">
              <ShieldAlert className="mx-auto mb-3 text-[var(--royal)]" size={34} />
              <p className="font-bold">Log in to use safety tools</p>
              <p className={cx("mt-2 text-sm leading-6", mutedClass)}>Reporting and blocking are available to signed-in members.</p>
              <Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-md bg-[var(--royal)] px-5 text-sm font-bold text-white">
                Log in
              </Link>
            </div>
          ) : blocked ? (
            <div className="p-4">
              <button
                type="button"
                onClick={openBlock}
                className={cx("flex w-full items-center gap-3 rounded-lg border p-4 text-left transition", optionClass)}
              >
                <Undo2 className="text-[var(--royal)]" size={20} />
                <span>
                  <span className="block font-bold">Unblock @{profile.username}</span>
                  <span className={cx("mt-1 block text-sm", mutedClass)}>Allow this account to appear again.</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="grid gap-2 p-4">
              <button
                type="button"
                onClick={openReport}
                className={cx("flex items-center gap-3 rounded-lg border p-4 text-left transition", optionClass)}
              >
                <Flag className="text-amber-500" size={20} />
                <span>
                  <span className="block font-bold">Report account</span>
                  <span className={cx("mt-1 block text-sm", mutedClass)}>Tell us about a safety or policy concern.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={openBlock}
                className={cx("flex items-center gap-3 rounded-lg border p-4 text-left transition", optionClass)}
              >
                <Ban className="text-rose-500" size={20} />
                <span>
                  <span className="block font-bold text-rose-500">Block @{profile.username}</span>
                  <span className={cx("mt-1 block text-sm", mutedClass)}>Hide each other&apos;s profiles and activity.</span>
                </span>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg p-0">
          {reportSubmitted ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={42} />
              <DialogTitle>Report submitted</DialogTitle>
              <DialogDescription className="mx-auto mt-3 max-w-sm leading-6">
                Thanks for letting us know. Your report is open for review.
              </DialogDescription>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="mt-6 h-10 rounded-md bg-[var(--royal)] px-6 text-sm font-bold text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submitReport}>
              <DialogHeader className="border-b border-[var(--line)] px-6 py-5 pr-16">
                <DialogTitle>Report @{profile.username}</DialogTitle>
                <DialogDescription>Select the reason that best describes the issue.</DialogDescription>
              </DialogHeader>

              <div className="modern-scrollbar max-h-[58vh] overflow-y-auto px-6 py-5">
                <fieldset className="grid gap-2">
                  <legend className="sr-only">Report reason</legend>
                  {REPORT_REASONS.map((reportReason) => (
                    <label key={reportReason} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition", optionClass)}>
                      <input
                        type="radio"
                        name="report-reason"
                        value={reportReason}
                        checked={reason === reportReason}
                        onChange={() => setReason(reportReason)}
                        className="h-4 w-4 accent-violet-600"
                      />
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
                <button type="button" onClick={() => setReportOpen(false)} className={cx("h-10 rounded-md border px-5 text-sm font-bold transition", softButtonClass)}>
                  Cancel
                </button>
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
            <div className={cx("mb-3 grid h-11 w-11 place-items-center rounded-full", blocked ? "bg-violet-500/10 text-[var(--royal)]" : "bg-rose-500/10 text-rose-500")}>
              {blocked ? <Undo2 size={22} /> : <Ban size={22} />}
            </div>
            <DialogTitle>{blocked ? `Unblock @${profile.username}?` : `Block @${profile.username}?`}</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              {blocked
                ? "They will be able to find your profile and interact with you again. Previous follows will not be restored."
                : "You will no longer see each other's profiles, posts, comments, or interactions. Any follows between you will be removed."}
            </DialogDescription>
          </DialogHeader>

          {error && <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500">{error}</p>}

          <DialogFooter className="mt-6">
            <button type="button" onClick={() => setBlockOpen(false)} className={cx("h-10 rounded-md border px-5 text-sm font-bold transition", softButtonClass)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitBlock()}
              disabled={submitting === "block" || submitting === "unblock"}
              className={cx(
                "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white disabled:opacity-50",
                blocked ? "bg-[var(--royal)]" : "bg-rose-600 hover:bg-rose-500",
              )}
            >
              {(submitting === "block" || submitting === "unblock") && <LoaderCircle className="animate-spin" size={16} />}
              {blocked ? "Unblock" : "Block"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
