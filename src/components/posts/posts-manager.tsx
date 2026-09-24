"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  Bookmark,
  Download,
  ExternalLink,
  FileVideo,
  Filter,
  Hash,
  Heart,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Search,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { deleteVideo, getMyVideos, updateVideo, type UpdateVideoPayload } from "@/services/videos";
import type { PaginatedResponse, Video } from "@/types/api";
import { compactNumber, cx } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Visibility = Video["visibility"];

type EditDraft = {
  caption: string;
  visibility: Visibility;
};

const visibilityLabels: Record<Visibility, string> = {
  public: "Everyone",
  followers: "Followers",
  private: "Only you",
};
const emptyPosts: Video[] = [];

export function PostsManager() {
  const { authenticated, loading: authLoading, token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Video | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const authScope = token ? "auth" : "guest";
  const myVideosQueryKey = queryKeys.myVideos(authScope);
  const postsQuery = useQuery({
    enabled: !authLoading && authenticated && Boolean(token),
    queryKey: myVideosQueryKey,
    queryFn: () => getMyVideos(token as string, 100),
    staleTime: 20 * 1000,
  });
  const posts = postsQuery.data?.data ?? emptyPosts;
  const loading = authLoading || postsQuery.isLoading;

  const updatePostMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVideoPayload }) => {
      if (!token) throw new Error("Missing auth token.");
      return updateVideo(id, payload, token);
    },
    onSuccess: (response, variables) => {
      queryClient.setQueryData<PaginatedResponse<Video>>(myVideosQueryKey, (current) => current
        ? { ...current, data: current.data.map((post) => (post.id === variables.id ? response.data : post)) }
        : current);
      setEditing((current) => (current?.id === variables.id ? response.data : current));
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not save changes.");
    },
    onSettled: () => setSavingId(null),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error("Missing auth token.");
      return deleteVideo(id, token);
    },
    onSuccess: (_response, id) => {
      queryClient.setQueryData<PaginatedResponse<Video>>(myVideosQueryKey, (current) => current
        ? { ...current, data: current.data.filter((post) => post.id !== id) }
        : current);
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not delete post.");
    },
    onSettled: () => setSavingId(null),
  });

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? posts.filter((post) => (post.caption ?? "").toLowerCase().includes(normalizedQuery))
      : posts;

    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.pinned_at);
      const bPinned = Boolean(b.pinned_at);

      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [posts, query]);

  async function updatePost(id: number, payload: UpdateVideoPayload) {
    if (!token) return;

    setSavingId(id);
    setError("");

    await updatePostMutation.mutateAsync({ id, payload });
  }

  async function togglePinned(post: Video) {
    if (!token) return;

    setSavingId(post.id);
    setError("");
    setOpenMenuId(null);

    await updatePostMutation.mutateAsync({ id: post.id, payload: { pinned: !post.pinned_at } }).catch(() => undefined);
  }

  async function downloadPost(post: Video) {
    if (!post.video_url) return;

    setDownloadingId(post.id);
    setError("");
    setOpenMenuId(null);

    try {
      const response = await fetch(post.video_url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const extension = blob.type.includes("webm") ? "webm" : "mp4";
      const filename = `xspann-post-${post.id}.${extension}`;
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(post.video_url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }

  async function deletePost(post: Video) {
    if (!token || !window.confirm(`Delete "${post.caption || "Untitled post"}"?`)) return;

    setSavingId(post.id);
    setError("");
    setOpenMenuId(null);

    deletePostMutation.mutate(post.id);
  }

  if (!authLoading && !authenticated) {
    return (
      <section className={cx("grid h-screen place-items-center px-5", isDark ? "bg-transparent text-white" : "bg-white text-zinc-950")}>
        <div className={cx("w-full max-w-md rounded-lg border p-6 text-center shadow-sm", isDark ? "border-violet-200/10 bg-white/[0.06]" : "border-zinc-200 bg-white")}>
          <h1 className="text-xl font-black">Posts</h1>
          <p className="mt-2 text-sm text-zinc-500">Log in to manage your uploaded posts.</p>
          <Link href="/login" className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-5 text-sm font-black text-white">
            Log in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={cx("h-screen overflow-y-auto pb-24 transition-colors duration-200", isDark ? "bg-transparent text-white" : "bg-white text-zinc-950")}>
      <div className={cx("border-b px-4 py-4 sm:px-8", isDark ? "border-violet-200/10 bg-[#090313]/72" : "border-zinc-200 bg-white")}>
        <div className="min-h-10">
          <h1 className="text-xl font-black">Posts</h1>
          <p className={cx("text-xs font-medium", isDark ? "text-violet-100/52" : "text-zinc-500")}>All uploads, drafts in processing, and private posts.</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1640px] px-4 py-8 sm:px-8">
        <div className="mb-4 flex justify-end">
          <label className={cx("flex h-10 w-full items-center gap-2 rounded-md border px-3 text-sm lg:w-[360px]", isDark ? "border-violet-200/10 bg-white/[0.06] text-violet-100/60" : "border-zinc-200 bg-white text-zinc-500")}>
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cx("min-w-0 flex-1 bg-transparent outline-none", isDark ? "placeholder:text-violet-100/35" : "placeholder:text-zinc-400")}
              placeholder="Search for post description"
            />
          </label>
        </div>

        {(error || postsQuery.isError) && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error || "Could not load posts."}</div>}

        <div className={cx("rounded-lg border shadow-sm", isDark ? "border-violet-200/10 bg-white/[0.05]" : "border-zinc-200 bg-white")}>
          <div className={cx("grid min-w-[920px] grid-cols-[minmax(360px,1.8fr)_140px_110px_110px_120px_220px] border-b px-5 py-3 text-xs font-semibold", isDark ? "border-violet-200/10 text-violet-100/52" : "border-zinc-200 text-zinc-500")}>
            <span>Posts (Created on)</span>
            <span>Privacy</span>
            <span>Views</span>
            <span>Likes</span>
            <span>Comments</span>
            <span>Actions</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className={cx("grid h-44 place-items-center text-sm font-bold", isDark ? "text-violet-100/52" : "text-zinc-500")}>
                <LoaderCircle className="mb-2 animate-spin" size={22} />
                Loading posts
              </div>
            ) : visiblePosts.length ? (
              visiblePosts.map((post) => (
                <div key={post.id} className={cx("grid min-w-[920px] grid-cols-[minmax(360px,1.8fr)_140px_110px_110px_120px_220px] items-center border-b px-5 py-4 last:border-b-0", isDark ? "border-violet-200/10" : "border-zinc-100")}>
                  <PostIdentity post={post} isDark={isDark} />
                  <select
                    value={post.visibility}
                    disabled={savingId === post.id}
                    onChange={(event) => void updatePost(post.id, { visibility: event.target.value as Visibility })}
                    className={cx("h-8 w-[116px] rounded-md border px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-300", isDark ? "border-violet-200/10 bg-[#12091f] text-white" : "border-zinc-200 bg-white text-zinc-950")}
                  >
                    {Object.entries(visibilityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <Metric value={post.stats.views} isDark={isDark} />
                  <Metric value={post.stats.likes} isDark={isDark} />
                  <Metric value={post.stats.comments} isDark={isDark} />
                  <div className="flex items-center gap-2">
                    <ActionButton label="Edit post" onClick={() => setEditing(post)} icon={Pencil} isDark={isDark} />
                    <Link href={`/video/${post.id}`} className={cx("grid h-9 w-9 place-items-center rounded-full border", isDark ? "border-violet-200/10 text-violet-100/70 hover:bg-white/10" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50")} aria-label="Open post" title="Open post">
                      <ExternalLink size={16} />
                    </Link>
                    <ActionButton label="Comments" icon={MessageCircle} isDark={isDark} />
                    <PostMoreMenu
                      isDark={isDark}
                      disabled={savingId === post.id}
                      open={openMenuId === post.id}
                      pinned={Boolean(post.pinned_at)}
                      post={post}
                      downloading={downloadingId === post.id}
                      onDelete={() => void deletePost(post)}
                      onToggle={() => setOpenMenuId((current) => (current === post.id ? null : post.id))}
                      onTogglePin={() => void togglePinned(post)}
                      onDownload={() => void downloadPost(post)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className={cx("grid h-44 place-items-center px-6 text-center text-sm font-semibold", isDark ? "text-violet-100/52" : "text-zinc-500")}>
                No posts found.
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditPostModal
          post={editing}
          saving={savingId === editing.id}
          onClose={() => setEditing(null)}
          onSave={(payload) => updatePost(editing.id, payload).then(() => setEditing(null))}
        />
      )}
    </section>
  );
}

function PostIdentity({ post, isDark }: { post: Video; isDark: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className={cx("relative h-20 w-16 shrink-0 overflow-hidden rounded-md", isDark ? "bg-white/10" : "bg-zinc-100")}>
        {post.thumbnail_url ? (
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${post.thumbnail_url}")` }} aria-hidden="true" />
        ) : post.video_url ? (
          <video src={post.video_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-violet-50 text-violet-500">
            <Filter size={20} />
          </div>
        )}
        <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {formatDuration(displayDuration(post))}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className={cx("truncate text-sm font-black", isDark ? "text-white" : "text-zinc-950")}>{post.caption || "Untitled post"}</p>
          {post.pinned_at && (
            <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black", isDark ? "bg-violet-400/15 text-violet-100" : "bg-violet-50 text-[var(--royal)]")}>
              <Pin size={11} />
              Pinned
            </span>
          )}
        </div>
        <p className={cx("mt-1 text-xs font-medium", isDark ? "text-violet-100/52" : "text-zinc-500")}>{formatDate(post.created_at)} · {post.status}</p>
        {post.sound_name && <p className={cx("mt-1 truncate text-xs", isDark ? "text-violet-100/38" : "text-zinc-400")}>{post.sound_name}</p>}
      </div>
    </div>
  );
}

function Metric({ value, isDark }: { value: number; isDark: boolean }) {
  return <span className={cx("text-sm font-semibold", isDark ? "text-violet-50/88" : "text-zinc-900")}>{compactNumber(value)}</span>;
}

function ActionButton({ icon: Icon, label, isDark, onClick }: { icon: LucideIcon; label: string; isDark: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("grid h-9 w-9 place-items-center rounded-full border", isDark ? "border-violet-200/10 text-violet-100/70 hover:bg-white/10" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50")}
      aria-label={label}
      title={label}
    >
      <Icon size={16} />
    </button>
  );
}

function PostMoreMenu({
  isDark,
  disabled,
  open,
  pinned,
  post,
  downloading,
  onDelete,
  onToggle,
  onTogglePin,
  onDownload,
}: {
  isDark: boolean;
  disabled: boolean;
  open: boolean;
  pinned: boolean;
  post: Video;
  downloading: boolean;
  onDelete: () => void;
  onToggle: () => void;
  onTogglePin: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={cx("grid h-9 w-9 place-items-center rounded-full border disabled:cursor-not-allowed disabled:opacity-55", isDark ? "border-violet-200/10 text-violet-100/70 hover:bg-white/10" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50")}
        aria-label="More post options"
        aria-expanded={open}
        title="More"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className={cx("absolute right-0 top-11 z-20 w-44 rounded-md border py-2 text-sm shadow-[0_12px_34px_rgba(15,23,42,0.12)]", isDark ? "border-violet-200/10 bg-[#12091f] text-white" : "border-zinc-200 bg-white")}>
          <button type="button" onClick={onTogglePin} className={cx("flex h-9 w-full items-center gap-3 px-4 text-left font-medium", isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-zinc-50")}>
            <Pin size={14} />
            {pinned ? "Unpin" : "Pin to top"}
          </button>
          <button
            type="button"
            disabled={!post.video_url || downloading}
            onClick={onDownload}
            className={cx(
              "flex h-9 w-full items-center gap-3 px-4 text-left font-medium disabled:cursor-not-allowed disabled:text-zinc-400",
              isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-zinc-50",
            )}
          >
            {downloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? "Downloading" : "Download"}
          </button>
          <button type="button" onClick={onDelete} className="flex h-9 w-full items-center gap-3 px-4 text-left font-medium text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function EditPostModal({ post, saving, onClose, onSave }: { post: Video; saving: boolean; onClose: () => void; onSave: (payload: UpdateVideoPayload) => Promise<void> }) {
  const [draft, setDraft] = useState<EditDraft>({
    caption: post.caption ?? "",
    visibility: post.visibility,
  });

  const captionCount = draft.caption.length;
  const title = draft.caption.trim() || "Edit post";

  function updateDraft<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(): UpdateVideoPayload {
    return {
      caption: draft.caption,
      visibility: draft.visibility,
    };
  }

  return (
    <div className="fixed inset-0 z-50 bg-white text-zinc-950">
      <div className="flex h-screen flex-col">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-100" aria-label="Back">
              <ArrowLeft size={17} />
            </button>
            <p className="min-w-0 truncate text-sm font-black">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md bg-zinc-100 px-5 text-sm font-bold hover:bg-zinc-200">Cancel</button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave(buildPayload())}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-6 text-sm font-black text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Save
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="space-y-5">
              <EditPanel title="Details">
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Description</span>
                  <div className="rounded-lg bg-zinc-100 p-3">
                    <textarea
                      value={draft.caption}
                      onChange={(event) => updateDraft("caption", event.target.value)}
                      maxLength={2200}
                      className="h-28 w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400"
                      placeholder="Describe your video"
                    />
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex gap-3">
                        <button type="button" onClick={() => updateDraft("caption", `${draft.caption}#`)} className="inline-flex items-center gap-1 font-semibold hover:text-violet-700"><Hash size={14} /> Hashtags</button>
                        <button type="button" onClick={() => updateDraft("caption", `${draft.caption}@`)} className="inline-flex items-center gap-1 font-semibold hover:text-violet-700"><AtSign size={14} /> Mention</button>
                      </div>
                      <span>{captionCount}/2200</span>
                    </div>
                  </div>
                </label>
              </EditPanel>

              <EditPanel title="Settings">
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Who can see this post</span>
                  <select value={draft.visibility} onChange={(event) => updateDraft("visibility", event.target.value as Visibility)} className="h-10 w-full rounded-md border-0 bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300">
                    {Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </EditPanel>
            </div>

            <aside className="xl:sticky xl:top-5 xl:h-fit">
              <div className="mb-3 grid grid-cols-[1fr_1fr_1fr_36px] rounded-md bg-zinc-200/70 p-1 text-xs font-bold">
                <button type="button" className="h-7 rounded bg-white shadow-sm">feed</button>
                <button type="button" className="h-7 rounded">profile</button>
                <button type="button" className="h-7 rounded">web</button>
                <button type="button" className="grid h-7 place-items-center rounded bg-white text-zinc-700 shadow-sm" aria-label="Video file"><FileVideo size={15} /></button>
              </div>

              <PostPreview post={post} caption={draft.caption} />

              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave(buildPayload())}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] text-sm font-black text-white shadow-[0_10px_30px_rgba(91,33,182,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {saving && <LoaderCircle size={18} className="animate-spin" />}
                Save changes
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-black">{title}</h3>
      {children}
    </section>
  );
}

function PostPreview({ post, caption }: { post: Video; caption: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(post.edit.trim_start ?? 0);
  const cropMode = post.edit.crop_mode ?? "fill";
  const duration = displayDuration(post);
  const trimStart = post.edit.trim_start ?? 0;
  const trimEnd = Math.max(trimStart + 0.1, post.edit.trim_end ?? post.duration ?? duration);
  const timelineMax = Math.max(trimEnd, trimStart + 0.1);
  const hasExternalSound = Boolean(post.sound_preview_url);
  const videoMuted = hasExternalSound || post.edit.original_audio_muted;

  function syncAudioToVideo() {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const audioDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    try {
      audio.currentTime = audioDuration ? video.currentTime % audioDuration : video.currentTime;
    } catch {
      // Audio metadata may not be ready during the first preview click.
    }
  }

  function seekPreview(value: number) {
    const nextValue = Math.min(trimEnd, Math.max(trimStart, value));
    setPreviewTime(nextValue);

    if (videoRef.current) {
      videoRef.current.currentTime = nextValue;
    }

    syncAudioToVideo();
  }

  async function playPreview() {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
      setPreviewTime(trimStart);
    }

    video.muted = videoMuted;
    await video.play().catch(() => undefined);

    if (audio && hasExternalSound) {
      audio.muted = false;
      syncAudioToVideo();
      await audio.play().catch(() => undefined);
    }

    setPlaying(true);
  }

  function pausePreview() {
    videoRef.current?.pause();
    audioRef.current?.pause();
    setPlaying(false);
  }

  function togglePlayback() {
    if (playing) {
      pausePreview();
      return;
    }

    void playPreview();
  }

  function handleTimeUpdate() {
    const currentTime = videoRef.current?.currentTime ?? trimStart;

    if (currentTime >= trimEnd) {
      pausePreview();
      seekPreview(trimStart);
      return;
    }

    if (hasExternalSound && audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 0.45) {
      syncAudioToVideo();
    }

    setPreviewTime(currentTime);
  }

  return (
    <div className="mx-auto mb-4 w-[290px] rounded-[32px] border-2 border-zinc-950 bg-zinc-950 p-2 shadow-xl">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[25px] bg-black text-white">
        {post.video_url ? (
          <button type="button" onClick={togglePlayback} className="h-full w-full" aria-label={playing ? "Pause preview" : "Play preview"}>
            <video
              ref={videoRef}
              src={post.video_url}
              className={`h-full w-full ${cropMode === "fill" ? "object-cover" : "object-contain"}`}
              muted={videoMuted}
              playsInline
              preload="metadata"
              onLoadedMetadata={() => seekPreview(trimStart)}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          </button>
        ) : post.thumbnail_url ? (
          <div className={`h-full w-full bg-center ${cropMode === "fill" ? "bg-cover" : "bg-contain bg-no-repeat"}`} style={{ backgroundImage: `url("${post.thumbnail_url}")` }} aria-hidden="true" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-violet-50 text-violet-500">
            <Filter size={28} />
          </div>
        )}
        {hasExternalSound && <audio ref={audioRef} src={post.sound_preview_url ?? undefined} loop preload="metadata" />}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent_36%,rgba(0,0,0,0.74))]" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[11px] font-bold drop-shadow">
          <span>8:00</span>
          <span className="text-[13px]">Following&nbsp;&nbsp; For You</span>
          <Search size={14} />
        </div>
        <div className="absolute bottom-18 left-4 right-14">
          <p className="text-sm font-black">@{post.user.username}</p>
          <p className="line-clamp-2 text-xs text-white/88">{caption || "Your caption preview appears here"}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80"><Music2 size={12} /> {post.sound_name || "Original sound"}</p>
        </div>
        <div className="absolute bottom-18 right-3 flex flex-col items-center gap-4 text-[10px] font-bold drop-shadow">
          <div className="relative mb-1">
            {post.user.avatar ? (
              <div className="h-10 w-10 rounded-full border-2 border-white bg-cover bg-center" style={{ backgroundImage: `url("${post.user.avatar}")` }} aria-hidden="true" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-violet-950 text-white"><UserRound size={20} /></div>
            )}
            <span className="absolute -bottom-1 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-[var(--royal-bright)] text-white"><Plus size={12} strokeWidth={3} /></span>
          </div>
          <Heart size={24} fill="white" />
          <MessageCircle size={23} fill="white" />
          <Bookmark size={23} fill="white" />
          <ForwardShareIcon />
        </div>
        {post.video_url && !playing && (
          <button type="button" onClick={togglePlayback} className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur" aria-label="Play preview">
            <Play size={28} fill="currentColor" />
          </button>
        )}
        <div className="absolute bottom-9 left-4 right-4 flex items-center gap-2">
          {post.video_url && (
            <button type="button" onClick={togglePlayback} className="grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur" aria-label={playing ? "Pause preview" : "Play preview"}>
              {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
          )}
          <input type="range" min={trimStart} max={timelineMax} step={0.1} value={Math.min(previewTime, timelineMax)} onChange={(event) => seekPreview(Number(event.target.value))} className="min-w-0 flex-1 accent-white" />
          <span className="whitespace-nowrap text-[10px] font-bold">{formatDuration(Math.max(0, previewTime - trimStart))}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 bg-black/75 py-2 text-center text-[9px] font-bold">
          <span>Home</span><span>Friends</span><span className="mx-auto rounded bg-white px-3 text-black">+</span><span>Inbox</span><span>Me</span>
        </div>
      </div>
    </div>
  );
}

function displayDuration(post: Video): number {
  const start = post.edit.trim_start ?? 0;
  const end = post.edit.trim_end ?? post.duration ?? 0;

  return Math.max(0, end - start);
}

function ForwardShareIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M18.7 6.1c-.8-.7-2.1-.1-2.1 1v4.1C9.7 11.9 5.2 15.8 3.4 22.8c-.3 1.2 1.2 2 2.1 1.1 3.2-3.1 6.8-4.4 11.1-4.1v4.7c0 1.1 1.3 1.7 2.1 1l9.4-8.1c.6-.5.6-1.5 0-2L18.7 6.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDate(value: string | null): string {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
