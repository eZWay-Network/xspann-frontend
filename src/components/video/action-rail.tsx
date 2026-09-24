"use client";

import Link from "next/link";
import { Bookmark, Check, Code2, Heart, Link2, MessageCircle, Plus, Send, Share2, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { followUser, unfollowUser } from "@/services/follows";
import { likeVideo, unlikeVideo } from "@/services/likes";
import { saveVideo, unsaveVideo } from "@/services/saves";
import { shareVideo as shareVideoRequest } from "@/services/shares";
import { compactNumber, cx } from "@/lib/format";
import type { Video } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";

export function ActionRail({
  video,
  onComments,
  onFollowChange,
}: {
  video: Video;
  onComments: () => void;
  onFollowChange?: (userId: number, following: boolean) => void;
}) {
  const { authenticated, token, user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [liked, setLiked] = useState(video.viewer.liked);
  const [saved, setSaved] = useState(video.viewer.saved);
  const [following, setFollowing] = useState(video.viewer.following);
  const [likes, setLikes] = useState(video.stats.likes);
  const [saves, setSaves] = useState(video.stats.saves);
  const [shares, setShares] = useState(video.stats.shares);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const isOwnVideo = user?.id === video.user.id;

  async function toggleFollow() {
    if (isOwnVideo) return;
    if (!authenticated || !token) { router.push(`/login?next=${encodeURIComponent(`/video/${video.id}`)}`); return; }

    const wasFollowing = following;
    setFollowing(!wasFollowing);
    onFollowChange?.(video.user.id, !wasFollowing);

    try {
      const response = wasFollowing ? await unfollowUser(video.user.id, token) : await followUser(video.user.id, token);
      setFollowing(response.data.following);
      onFollowChange?.(video.user.id, response.data.following);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      setFollowing(wasFollowing);
      onFollowChange?.(video.user.id, wasFollowing);
    }
  }

  async function toggleLike() {
    if (!authenticated || !token) { router.push(`/login?next=${encodeURIComponent(`/video/${video.id}`)}`); return; }

    const wasLiked = liked;
    setLiked((value) => !value);
    setLikes((value) => Math.max(0, value + (wasLiked ? -1 : 1)));

    try {
      const response = wasLiked ? await unlikeVideo(video.id, token) : await likeVideo(video.id, token);
      setLiked(response.data.liked);
      setLikes(response.data.likes_count);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["liked-videos"] });
      void queryClient.invalidateQueries({ queryKey: ["my-videos"] });
    } catch {
      setLiked(wasLiked);
      setLikes(video.stats.likes);
    }
  }

  async function toggleSave() {
    if (!authenticated || !token) { router.push(`/login?next=${encodeURIComponent(`/video/${video.id}`)}`); return; }

    const wasSaved = saved;
    setSaved((value) => !value);
    setSaves((value) => Math.max(0, value + (wasSaved ? -1 : 1)));

    try {
      const response = wasSaved ? await unsaveVideo(video.id, token) : await saveVideo(video.id, token);
      setSaved(response.data.saved);
      setSaves(response.data.saves_count);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-videos"] });
    } catch {
      setSaved(wasSaved);
      setSaves(video.stats.saves);
    }
  }

  function getShareUrl() {
    if (typeof window === "undefined") return `/video/${video.id}`;
    return `${window.location.origin}/video/${video.id}`;
  }

  async function writeToClipboard(value: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  async function recordShare(channel: string) {
    setShares((value) => value + 1);

    try {
      const response = await shareVideoRequest(video.id, channel, token);
      setShares(response.data.shares_count);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch {
      setShares(video.stats.shares);
    }
  }

  async function handleShare(channel: string) {
    const shareUrl = getShareUrl();
    const shareText = video.caption ? `${video.caption} ${shareUrl}` : shareUrl;

    if (channel === "copy_link") {
      const copied = await writeToClipboard(shareUrl);
      setShareMessage(copied ? "Link copied" : "Could not copy link");
      if (copied) await recordShare(channel);
      return;
    }

    if (channel === "embed") {
      const embedCode = `<iframe src="${shareUrl}" title="XSpann RNB video" width="360" height="640" allowfullscreen></iframe>`;
      const copied = await writeToClipboard(embedCode);
      setShareMessage(copied ? "Embed code copied" : "Could not copy embed code");
      if (copied) await recordShare(channel);
      return;
    }

    await recordShare(channel);

    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "telegram") {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.caption ?? "XSpann RNB")}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "x") {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.caption ?? "XSpann RNB")}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "pinterest") {
      window.open(`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(video.caption ?? "XSpann RNB")}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ title: "XSpann RNB", text: video.caption ?? undefined, url: shareUrl }).catch(() => undefined);
    }
  }

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-4 pb-2 max-sm:absolute max-sm:bottom-20 max-sm:right-2 max-sm:z-20 max-sm:gap-3">
      <div className="relative mb-1">
        <Link href={`/profile/${video.user.username}`} aria-label={`Open @${video.user.username} profile`} className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200">
          <UserAvatar src={video.user.avatar} size={50} className="h-12 w-12 transition hover:opacity-85 max-sm:h-11 max-sm:w-11" />
        </Link>
        {!isOwnVideo && (
          <button
            onClick={() => void toggleFollow()}
            className={cx(
              "absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-white transition",
              following ? "bg-[#7545e8] hover:bg-[#6635d5]" : "bg-[#7545e8] hover:bg-[#6635d5]",
            )}
            aria-pressed={following}
            aria-label={following ? "Unfollow creator" : "Follow creator"}
            title={following ? "Following" : "Follow"}
          >
            {following ? <Check size={14} strokeWidth={3.2} /> : <Plus size={14} strokeWidth={3} />}
          </button>
        )}
      </div>
      <ActionButton label={compactNumber(likes)} name={liked ? "Unlike video" : "Like video"} kind="like" active={liked} onClick={() => void toggleLike()} icon={<Heart size={25} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} />} />
      <ActionButton label={compactNumber(video.stats.comments)} name="Open comments" onClick={onComments} icon={<MessageCircle size={25} strokeWidth={1.8} />} />
      <ActionButton label={compactNumber(saves)} name={saved ? "Unsave video" : "Save video"} active={saved} onClick={() => void toggleSave()} icon={<Bookmark size={25} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />} />
      <ActionButton label={compactNumber(shares)} name="Share video" onClick={() => setShareOpen(true)} icon={<Share2 size={24} strokeWidth={1.8} />} />
      {shareOpen && (
        <ShareSheet
          video={video}
          user={user}
          message={shareMessage}
          onClose={() => {
            setShareOpen(false);
            setShareMessage("");
          }}
          onShare={(channel) => void handleShare(channel)}
        />
      )}
    </div>
  );
}

function ShareSheet({
  video,
  user,
  message,
  onClose,
  onShare,
}: {
  video: Video;
  user: { username: string; avatar: string | null } | null;
  message: string;
  onClose: () => void;
  onShare: (channel: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const actions = [
    { label: "Copy", channel: "copy_link", icon: <Link2 size={27} />, className: "bg-blue-600 text-white" },
    { label: "WhatsApp", channel: "whatsapp", icon: <span className="text-[15px] font-black">WA</span>, className: "bg-green-500 text-white" },
    { label: "Embed", channel: "embed", icon: <Code2 size={27} />, className: "bg-cyan-600 text-white" },
    { label: "Facebook", channel: "facebook", icon: <span className="font-black text-[30px] leading-none">f</span>, className: "bg-blue-700 text-white" },
    { label: "Telegram", channel: "telegram", icon: <Send size={25} fill="currentColor" />, className: "bg-sky-500 text-white" },
    { label: "X", channel: "x", icon: <span className="text-[25px] font-black">X</span>, className: "bg-zinc-950 text-white ring-1 ring-white/15" },
    { label: "LinkedIn", channel: "linkedin", icon: <span className="text-[21px] font-black">in</span>, className: "bg-[#0a66c2] text-white" },
    { label: "Pinterest", channel: "pinterest", icon: <span className="text-[26px] font-black">P</span>, className: "bg-[#e60023] text-white" },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="share-dialog">
        <div className="grid h-16 grid-cols-[40px_1fr_40px] items-center px-5">
          <span aria-hidden="true" />
          <DialogTitle className="text-center text-base font-semibold">Share video</DialogTitle>
          <button type="button" onClick={onClose} className={cx("grid h-10 w-10 place-items-center rounded-full transition", isDark ? "text-white hover:bg-white/10" : "text-zinc-700 hover:bg-zinc-100")} aria-label="Close share">
            <X size={24} />
          </button>
        </div>

        <div className="min-h-[128px] px-6 pb-6">
          {user ? (
            <button type="button" onClick={() => onShare("message")} className="flex w-20 flex-col items-center gap-2 text-center">
              <UserAvatar src={user.avatar ?? video.user.avatar} size={64} className="h-16 w-16" />
              <span className={cx("max-w-20 truncate text-xs", isDark ? "text-white/85" : "text-zinc-700")}>{user.username}</span>
            </button>
          ) : (
            <p className={cx("pt-8 text-center text-sm font-semibold", isDark ? "text-white/45" : "text-zinc-500")}>Log in to send this video to people.</p>
          )}
        </div>

        <div className={cx("border-t px-6 py-6", isDark ? "border-white/10" : "border-zinc-200")}>
          <div className="grid grid-cols-4 gap-x-2 gap-y-6 max-[360px]:grid-cols-3">
            {actions.map((action) => (
              <button
                key={action.channel}
                type="button"
                onClick={() => onShare(action.channel)}
                className="flex min-w-0 flex-col items-center gap-2 text-center"
              >
                <span className={cx("grid h-16 w-16 place-items-center rounded-full", action.className)}>
                  {action.icon}
                </span>
                <span className={cx("max-w-full truncate text-xs", isDark ? "text-white/88" : "text-zinc-700")}>{action.label}</span>
              </button>
            ))}
          </div>
          {message && (
            <p className={cx("mt-4 rounded-md px-3 py-2 text-center text-sm font-semibold", isDark ? "bg-white/10 text-white/78" : "bg-zinc-100 text-zinc-700")}>
              {message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({ icon, label, name, kind, active, onClick }: { icon: React.ReactNode; label: string; name: string; kind?: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-14 flex-col items-center gap-1.5 rounded-xl text-center" aria-label={`${name}, ${label}`} aria-pressed={active} title={name}>
      <span className="feed-action-icon" data-active={active} data-kind={kind}>{icon}</span>
      <span className="text-[11px] font-semibold tabular-nums text-[var(--muted)] max-sm:text-white">{label}</span>
    </button>
  );
}
