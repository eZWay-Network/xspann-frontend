"use client";

import { LoaderCircle, Send, SmilePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
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
import { cx, shortRelativeTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/services/api";
import { createComment, deleteComment, getComments } from "@/services/comments";
import type { Comment, PaginatedResponse, Video } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function CommentsPanel({ video, open, onClose }: { video: Video; open: boolean; onClose: () => void }) {
  const { authenticated, token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [body, setBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.comments(video.id);
  const commentsQuery = useQuery({
    enabled: open,
    queryKey: commentsQueryKey,
    queryFn: () => getComments(video.id),
    staleTime: 15 * 1000,
  });
  const comments = commentsQuery.data?.data ?? [];

  const createCommentMutation = useMutation({
    mutationFn: (nextBody: string) => {
      if (!token) throw new Error("Missing auth token.");
      return createComment(video.id, nextBody, token);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<PaginatedResponse<Comment>>(commentsQueryKey, (current) => ({
        data: [response.data, ...(current?.data ?? [])],
        meta: current?.meta ?? { current_page: 1, last_page: 1, per_page: 50, total: 0 },
      }));
      setBody("");
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not post comment.");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => {
      if (!token) throw new Error("Missing auth token.");
      return deleteComment(commentId, token);
    },
    onSuccess: (_response, commentId) => {
      queryClient.setQueryData<PaginatedResponse<Comment>>(commentsQueryKey, (current) => current
        ? { ...current, data: current.data.filter((comment) => comment.id !== commentId) }
        : current);
      setDeleteTarget(null);
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not delete comment.");
    },
  });
  const deletingId = deleteCommentMutation.isPending ? deleteCommentMutation.variables ?? null : null;

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || !authenticated || !token || !user) return;

    setError("");
    createCommentMutation.mutate(body.trim());
  }

  function removeComment(commentId: number) {
    if (!authenticated || !token || deleteCommentMutation.isPending) return;
    setError("");
    deleteCommentMutation.mutate(commentId);
  }

  if (!open) return null;

  return (
    <aside className={cx("fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l p-5 backdrop-blur-2xl transition-colors duration-200 sm:w-[420px]", isDark ? "border-violet-200/10 bg-[#0b0614]/96 text-white" : "border-zinc-200 bg-white/96 text-zinc-950")}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className={cx("text-lg font-bold", isDark ? "text-white" : "text-zinc-950")}>Comments</h2>
          <p className={cx("text-sm", isDark ? "text-violet-100/55" : "text-zinc-500")}>{comments.length} comments</p>
        </div>
        <button onClick={onClose} className={cx("rounded-lg p-2 transition", isDark ? "text-violet-100/70 hover:bg-white/10" : "text-zinc-600 hover:bg-zinc-100")} aria-label="Close comments"><X size={20} /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {commentsQuery.isLoading && (
          <div className={cx("grid h-40 place-items-center text-sm font-semibold", isDark ? "text-violet-100/55" : "text-zinc-500")}>
            <LoaderCircle className="mb-2 animate-spin" size={22} />
            Loading comments
          </div>
        )}
        {!commentsQuery.isLoading && comments.map((comment) => (
          <article key={comment.id} className="flex gap-3">
            <UserAvatar src={comment.user.avatar} size={36} className="h-9 w-9" />
            <div className={cx("min-w-0 flex-1 rounded-lg p-3 ring-1", isDark ? "bg-white/[0.06] ring-violet-200/10" : "bg-zinc-50 ring-zinc-200")}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className={cx("truncate text-sm font-bold", isDark ? "text-white" : "text-zinc-950")}>@{comment.user.username}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <time className={cx("text-xs", isDark ? "text-violet-100/45" : "text-zinc-400")} dateTime={comment.created_at}>
                    {shortRelativeTime(comment.created_at)}
                  </time>
                  {user?.id === comment.user.id && (
                    <button
                      type="button"
                      disabled={deletingId === comment.id}
                      onClick={() => setDeleteTarget(comment)}
                      className={cx("grid h-7 w-7 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45", isDark ? "text-violet-100/45 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-200 hover:text-red-600")}
                      aria-label="Delete comment"
                    >
                      {deletingId === comment.id ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
              <p className={cx("text-sm leading-5", isDark ? "text-violet-50/82" : "text-zinc-700")}>{comment.body}</p>
            </div>
          </article>
        ))}
        {!commentsQuery.isLoading && !comments.length && (
          <p className={cx("pt-10 text-center text-sm font-semibold", isDark ? "text-violet-100/45" : "text-zinc-400")}>No comments yet.</p>
        )}
      </div>

      {(error || commentsQuery.isError) && <p className="mt-3 rounded-md border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-sm font-medium text-pink-100">{error || "Could not load comments."}</p>}
      {emojiOpen && (
        <div className={cx("mt-4 rounded-lg border p-3 shadow-sm", isDark ? "border-white/10 bg-[#15101f]" : "border-zinc-200 bg-white")}>
          <div className="grid grid-cols-7 gap-2">
            {commentEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                onClick={() => {
                  setBody((value) => `${value}${emoji}`);
                  setEmojiOpen(false);
                }}
                className={cx("grid h-9 w-9 place-items-center rounded-md text-[22px] transition", isDark ? "hover:bg-white/10" : "hover:bg-zinc-100")}
                aria-label={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submitComment} className="mt-3 flex items-center gap-2">
        <UserAvatar src={user?.avatar} size={36} className="h-9 w-9" />
        <div className={cx("flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-4", isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-950")}>
          <input value={body} onChange={(event) => setBody(event.target.value)} disabled={!authenticated || createCommentMutation.isPending} placeholder={authenticated ? "Add comment..." : "Log in to comment"} className={cx("min-w-0 flex-1 bg-transparent text-[15px] outline-none disabled:cursor-not-allowed disabled:opacity-60", isDark ? "placeholder:text-violet-100/42" : "placeholder:text-zinc-400")} />
          <button type="button" disabled={!authenticated || createCommentMutation.isPending} onClick={() => setEmojiOpen((value) => !value)} className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45", emojiOpen ? isDark ? "bg-white/15 text-white" : "bg-zinc-200 text-zinc-950" : isDark ? "text-white hover:bg-white/10" : "text-zinc-950 hover:bg-zinc-200")} aria-label="Add emoji" aria-expanded={emojiOpen}>
            <SmilePlus size={21} />
          </button>
        </div>
        <button disabled={!authenticated || createCommentMutation.isPending || !body.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--royal)] text-white transition hover:bg-[var(--royal-bright)] disabled:cursor-not-allowed disabled:opacity-55" aria-label="Send comment">
          {createCommentMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-0" showCloseButton={false}>
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This comment will be permanently removed from the video.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-[var(--line)] px-5 py-4">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
              className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!deleteTarget || Boolean(deletingId)}
              onClick={() => deleteTarget && removeComment(deleteTarget.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingId && <LoaderCircle className="animate-spin" size={16} />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

const commentEmojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣",
  "😂", "🙂", "😮", "😉", "😊", "😇", "😍",
  "😘", "😗", "😚", "☺️", "😋", "😛", "😜",
  "😝", "🤑", "🤗", "🤔", "😬", "😐", "😑",
  "😶", "😏", "😒", "🙄", "😯", "😟", "😌",
  "😊",
];
