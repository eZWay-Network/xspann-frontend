"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Heart, LoaderCircle, Send, SmilePlus, Trash2, X } from "lucide-react";
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
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getComments,
  removeCommentReaction,
  setCommentReaction,
} from "@/services/comments";
import type { Comment, PaginatedResponse, Video } from "@/types/api";

const commentEmojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣",
  "😂", "🙂", "😮", "😉", "😊", "😇", "😍",
  "😘", "😗", "😚", "☺️", "😋", "😛", "😜",
  "😝", "🤑", "🤗", "🤔", "😬", "😐", "😑",
  "😶", "😏", "😒", "🙄", "😯", "😟", "😌",
];

type ReplyTarget = { parentId: number; username: string };

export function CommentsPanel({
  video,
  open,
  onClose,
  onCommentCountChange,
}: {
  video: Video;
  open: boolean;
  onClose: () => void;
  onCommentCountChange?: (videoId: number, delta: number) => void;
}) {
  const { authenticated, token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.comments(video.id, user?.id);
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [openReplies, setOpenReplies] = useState<Record<number, boolean>>({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [error, setError] = useState("");

  const commentsQuery = useQuery({
    enabled: open,
    queryKey: commentsQueryKey,
    queryFn: () => getComments(video.id, 100, token),
    staleTime: 15_000,
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
        meta: current?.meta
          ? { ...current.meta, total: current.meta.total + 1 }
          : { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      }));
      onCommentCountChange?.(video.id, 1);
      setBody("");
      setEmojiOpen(false);
    },
    onError: (caught) => setError(errorMessage(caught, "Could not post comment.")),
  });

  const createReplyMutation = useMutation({
    mutationFn: ({ parentId, body: nextBody }: { parentId: number; body: string }) => {
      if (!token) throw new Error("Missing auth token.");
      return createComment(video.id, nextBody, token, parentId);
    },
    onSuccess: (response, { parentId }) => {
      queryClient.setQueryData<PaginatedResponse<Comment>>(commentsQueryKey, (current) => current && ({
        ...current,
        data: current.data.map((comment) => comment.id === parentId
          ? { ...comment, replies_count: (comment.replies_count ?? 0) + 1 }
          : comment),
      }));
      queryClient.setQueryData<PaginatedResponse<Comment>>(queryKeys.commentReplies(parentId, user?.id), (current) => ({
        data: [response.data, ...(current?.data ?? [])],
        meta: current?.meta
          ? { ...current.meta, total: current.meta.total + 1 }
          : { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.commentReplies(parentId, user?.id) });
      setOpenReplies((current) => ({ ...current, [parentId]: true }));
      onCommentCountChange?.(video.id, 1);
      setReplyTarget(null);
      setReplyBody("");
      setReplyEmojiOpen(false);
    },
    onError: (caught) => setError(errorMessage(caught, "Could not post reply.")),
  });

  const reactionMutation = useMutation({
    mutationFn: (comment: Comment) => {
      if (!token) throw new Error("Missing auth token.");
      return comment.viewer_reaction === "love"
        ? removeCommentReaction(comment.id, token)
        : setCommentReaction(comment.id, "love", token);
    },
    onSuccess: (response, comment) => {
      const key = comment.parent_id
        ? queryKeys.commentReplies(comment.parent_id, user?.id)
        : commentsQueryKey;
      queryClient.setQueryData<PaginatedResponse<Comment>>(key, (current) => current && ({
        ...current,
        data: current.data.map((item) => item.id === response.data.id ? response.data : item),
      }));
    },
    onError: (caught) => setError(errorMessage(caught, "Could not update reaction.")),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (comment: Comment) => {
      if (!token) throw new Error("Missing auth token.");
      return deleteComment(comment.id, token);
    },
    onSuccess: (_response, comment) => {
      if (comment.parent_id) {
        queryClient.setQueryData<PaginatedResponse<Comment>>(queryKeys.commentReplies(comment.parent_id, user?.id), (current) => current && ({
          ...current,
          data: current.data.filter((item) => item.id !== comment.id),
          meta: { ...current.meta, total: Math.max(0, current.meta.total - 1) },
        }));
        queryClient.setQueryData<PaginatedResponse<Comment>>(commentsQueryKey, (current) => current && ({
          ...current,
          data: current.data.map((item) => item.id === comment.parent_id
            ? { ...item, replies_count: Math.max(0, (item.replies_count ?? 0) - 1) }
            : item),
        }));
      } else {
        queryClient.setQueryData<PaginatedResponse<Comment>>(commentsQueryKey, (current) => current && ({
          ...current,
          data: current.data.filter((item) => item.id !== comment.id),
          meta: { ...current.meta, total: Math.max(0, current.meta.total - 1) },
        }));
      }
      onCommentCountChange?.(video.id, -1);
      setDeleteTarget(null);
    },
    onError: (caught) => setError(errorMessage(caught, "Could not delete comment.")),
  });

  function startReply(parentId: number, username: string, mention = false) {
    if (!authenticated) return;
    setError("");
    setReplyTarget({ parentId, username });
    setReplyBody(mention ? `@${username} ` : "");
    setReplyEmojiOpen(false);
    setOpenReplies((current) => ({ ...current, [parentId]: true }));
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || !authenticated || createCommentMutation.isPending) return;
    setError("");
    createCommentMutation.mutate(body.trim());
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyTarget || !replyBody.trim() || !authenticated || createReplyMutation.isPending) return;
    setError("");
    createReplyMutation.mutate({ parentId: replyTarget.parentId, body: replyBody.trim() });
  }

  function reactTo(comment: Comment) {
    if (!authenticated || reactionMutation.isPending) return;
    setError("");
    reactionMutation.mutate(comment);
  }

  if (!open) return null;

  return (
    <aside className={cx("fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] backdrop-blur-2xl sm:w-[420px] sm:p-5", isDark ? "border-violet-200/10 bg-[#0b0614]/96 text-white" : "border-zinc-200 bg-white/96 text-zinc-950")}>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold">Comments <span className="font-medium text-[var(--muted)]">{video.stats.comments}</span></h2>
        <button type="button" onClick={onClose} className={cx("grid h-8 w-8 place-items-center rounded-full transition", isDark ? "bg-white/10 text-violet-100/70 hover:bg-white/20" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200")} aria-label="Close comments"><X size={18} /></button>
      </div>

      <div className="modern-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {commentsQuery.isLoading && <p className="flex items-center gap-2 py-10 text-sm text-[var(--muted)]"><LoaderCircle size={18} className="animate-spin" /> Loading comments...</p>}
        {!commentsQuery.isLoading && comments.map((comment) => (
          <div key={comment.id} className="border-b border-[var(--line)] pb-2 last:border-b-0">
            <CommentRow
              comment={comment}
              authenticated={authenticated}
              currentUserId={user?.id}
              reactionPendingId={reactionMutation.isPending ? reactionMutation.variables?.id : null}
              onReact={reactTo}
              onReply={() => startReply(comment.id, comment.user.username)}
              onDelete={() => setDeleteTarget(comment)}
            />
            {replyTarget?.parentId === comment.id && (
              <ReplyComposer
                value={replyBody}
                username={replyTarget.username}
                isDark={isDark}
                emojiOpen={replyEmojiOpen}
                pending={createReplyMutation.isPending}
                onChange={setReplyBody}
                onEmojiToggle={() => setReplyEmojiOpen((current) => !current)}
                onCancel={() => { setReplyTarget(null); setReplyBody(""); setReplyEmojiOpen(false); }}
                onSubmit={submitReply}
              />
            )}
            {(comment.replies_count ?? 0) > 0 && (
              <button type="button" onClick={() => setOpenReplies((current) => ({ ...current, [comment.id]: !current[comment.id] }))} className="ml-12 mt-2 text-xs font-semibold text-[var(--royal)] hover:underline">
                {openReplies[comment.id] ? "Hide" : "View"} {comment.replies_count} {comment.replies_count === 1 ? "reply" : "replies"}
              </button>
            )}
            {openReplies[comment.id] && (
              <ReplyThread
                parentId={comment.id}
                authenticated={authenticated}
                currentUserId={user?.id}
                reactionPendingId={reactionMutation.isPending ? reactionMutation.variables?.id : null}
                onReact={reactTo}
                onReply={(reply) => startReply(comment.id, reply.user.username, true)}
                onDelete={setDeleteTarget}
              />
            )}
          </div>
        ))}
        {!commentsQuery.isLoading && !comments.length && !commentsQuery.isError && <p className="py-10 text-center text-sm text-[var(--muted)]">No comments yet.</p>}
      </div>

      {(error || commentsQuery.isError) && <p role="alert" className={cx("mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm", isDark ? "text-rose-300" : "text-rose-600")}>{error || "Could not load comments."}</p>}
      {emojiOpen && <EmojiPicker isDark={isDark} onChoose={(emoji) => { setBody((current) => `${current}${emoji}`); setEmojiOpen(false); }} />}
      <form onSubmit={submitComment} className="mt-3 flex shrink-0 items-center gap-2">
        <UserAvatar src={user?.avatar} size={36} className="h-9 w-9" />
        <div className={cx("flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-4", isDark ? "bg-white/10" : "bg-zinc-100")}>
          <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} disabled={!authenticated || createCommentMutation.isPending} placeholder={authenticated ? "Add comment..." : "Log in to comment"} className={cx("min-w-0 flex-1 border-0 bg-transparent text-sm outline-none disabled:cursor-not-allowed", isDark ? "placeholder:text-violet-100/45" : "placeholder:text-zinc-400")} />
          <button type="button" disabled={!authenticated || createCommentMutation.isPending} onClick={() => setEmojiOpen((current) => !current)} className="grid h-8 w-8 shrink-0 place-items-center disabled:opacity-40" aria-label="Add emoji" aria-expanded={emojiOpen}><SmilePlus size={20} /></button>
        </div>
        <button type="submit" disabled={!authenticated || createCommentMutation.isPending || !body.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--royal)] text-white disabled:opacity-45" aria-label="Send comment">
          {createCommentMutation.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </form>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-0" showCloseButton={false}>
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>This comment will be permanently removed from the video.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-[var(--line)] px-5 py-4">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteCommentMutation.isPending} className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-bold">Cancel</button>
            <button type="button" disabled={!deleteTarget || deleteCommentMutation.isPending} onClick={() => deleteTarget && deleteCommentMutation.mutate(deleteTarget)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-50">
              {deleteCommentMutation.isPending && <LoaderCircle size={16} className="animate-spin" />} Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function CommentRow({ comment, isReply = false, authenticated, currentUserId, reactionPendingId, onReact, onReply, onDelete }: {
  comment: Comment;
  isReply?: boolean;
  authenticated: boolean;
  currentUserId?: number;
  reactionPendingId?: number | null;
  onReact: (comment: Comment) => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const reactionCount = comment.reactions?.love ?? 0;
  const selected = comment.viewer_reaction === "love";
  const busy = reactionPendingId != null;
  const updatingThis = reactionPendingId === comment.id;
  const profileHref = `/profile/${encodeURIComponent(comment.user.username)}`;
  return (
    <article className="flex gap-3 py-3">
      <Link href={profileHref} aria-label={`View ${comment.user.username}'s profile`} className="h-8 w-8 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--royal)]">
        <UserAvatar src={comment.user.avatar} size={32} className="h-8 w-8" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={profileHref} className="text-sm font-semibold hover:text-[var(--royal)] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--royal)]">{comment.user.name || comment.user.username}</Link>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{comment.body}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted)]">
          <time dateTime={comment.created_at}>{shortRelativeTime(comment.created_at)}</time>
          <button type="button" onClick={onReply} disabled={!authenticated} className="font-semibold hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50">Reply</button>
          {currentUserId === comment.user.id && <button type="button" onClick={onDelete} className="hover:text-rose-500" aria-label="Delete comment"><Trash2 size={13} /></button>}
          <span className="flex-1" />
          <button type="button" onClick={() => onReact(comment)} disabled={!authenticated || busy} className={cx("inline-flex items-center gap-1 hover:text-rose-500 disabled:cursor-not-allowed", selected && "text-rose-500")} aria-label={isReply ? (selected ? "Remove love from reply" : "Love reply") : (selected ? "Remove love from comment" : "Love comment")} aria-pressed={selected}>
            {updatingThis ? <LoaderCircle size={15} className="animate-spin" /> : <Heart size={16} fill={selected ? "currentColor" : "none"} />}
            {reactionCount > 0 && <span>{reactionCount}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}

function ReplyThread({ parentId, authenticated, currentUserId, reactionPendingId, onReact, onReply, onDelete }: {
  parentId: number;
  authenticated: boolean;
  currentUserId?: number;
  reactionPendingId?: number | null;
  onReact: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}) {
  const { token, user } = useAuth();
  const repliesQuery = useQuery({
    queryKey: queryKeys.commentReplies(parentId, user?.id),
    queryFn: () => getCommentReplies(parentId, 100, token),
    staleTime: 15_000,
  });
  return (
    <div className="ml-10 border-l border-[var(--line)] pl-3">
      {repliesQuery.isLoading && <p className="py-3 text-xs text-[var(--muted)]">Loading replies...</p>}
      {repliesQuery.isError && <p className="py-3 text-xs text-rose-500">Could not load replies.</p>}
      {repliesQuery.data?.data.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          isReply
          authenticated={authenticated}
          currentUserId={currentUserId}
          reactionPendingId={reactionPendingId}
          onReact={onReact}
          onReply={() => onReply(reply)}
          onDelete={() => onDelete(reply)}
        />
      ))}
    </div>
  );
}

function ReplyComposer({ value, username, isDark, emojiOpen, pending, onChange, onEmojiToggle, onCancel, onSubmit }: {
  value: string;
  username: string;
  isDark: boolean;
  emojiOpen: boolean;
  pending: boolean;
  onChange: (value: string) => void;
  onEmojiToggle: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="ml-10 mt-2">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className={cx("flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full border px-3", isDark ? "border-white/20 bg-white/5" : "border-zinc-300 bg-zinc-50")}>
          <input autoFocus value={value} onChange={(event) => onChange(event.target.value)} maxLength={1000} disabled={pending} placeholder="Add a reply..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]" aria-label="Add a reply" />
          <button type="button" onClick={() => onChange(`${value}@${username} `)} disabled={pending} className="text-lg font-semibold disabled:opacity-50" aria-label={`Mention ${username}`}>@</button>
          <button type="button" onClick={onEmojiToggle} disabled={pending} className="disabled:opacity-50" aria-label="Add emoji to reply" aria-expanded={emojiOpen}><SmilePlus size={20} /></button>
        </div>
        <button type="submit" disabled={!value.trim() || pending} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-400 text-white disabled:opacity-45" aria-label="Send reply">
          {pending ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={18} />}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Cancel reply"><X size={18} /></button>
      </form>
      {emojiOpen && <EmojiPicker isDark={isDark} onChoose={(emoji) => { onChange(`${value}${emoji}`); onEmojiToggle(); }} />}
    </div>
  );
}

function EmojiPicker({ isDark, onChoose }: { isDark: boolean; onChoose: (emoji: string) => void }) {
  return (
    <div className={cx("mt-2 rounded-lg border p-3 shadow-sm", isDark ? "border-white/10 bg-[#15101f]" : "border-zinc-200 bg-white")}>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7 sm:gap-2">
        {commentEmojis.map((emoji, index) => (
          <button key={`${emoji}-${index}`} type="button" onClick={() => onChoose(emoji)} className="grid h-9 w-9 place-items-center rounded-md text-xl hover:bg-[var(--surface)]" aria-label={`Add ${emoji}`}>{emoji}</button>
        ))}
      </div>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
