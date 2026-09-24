"use client";

import { CommentsPanel } from "@/components/comments/comments-panel";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { ActionRail } from "@/components/video/action-rail";
import { cx } from "@/lib/format";
import { videos } from "@/lib/mock-data";
import { queryKeys } from "@/lib/query-keys";
import { getFollowingFeedVideos, getFeedVideos, getVideo, recordVideoView } from "@/services/videos";
import type { Video } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

const fallbackPoster =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85";
const progressScale = 1000;
const emptyVideos: Video[] = [];

export function FeedExperience({ initialVideoId }: { initialVideoId?: number }) {
  const { loading: authLoading, token } = useAuth();
  const { theme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const isDark = !themeReady || theme === "dark";
  const searchParams = useSearchParams();
  const feedTab = searchParams.get("tab");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [viewCountsByVideoId, setViewCountsByVideoId] = useState<Record<number, number>>({});
  const [followingByUserId, setFollowingByUserId] = useState<Record<number, boolean>>({});
  const feedRef = useRef<HTMLElement>(null);
  const viewedVideoIdsRef = useRef<Set<number>>(new Set());
  const authScope = token ? "auth" : "guest";
  const feedScope = feedTab === "following" ? "following" : "for-you";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setThemeReady(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const feedQuery = useQuery({
    enabled: !authLoading,
    queryKey: queryKeys.feed(feedScope, authScope, initialVideoId),
    queryFn: async () => {
      const feedPromise = feedTab === "following" && token
        ? getFollowingFeedVideos(20, token)
        : getFeedVideos(20, token);

      const selectedPromise = initialVideoId && feedTab !== "following"
        ? getVideo(initialVideoId, token).then((response) => response.data).catch(() => null)
        : Promise.resolve(null);

      const [feedResponse, selectedVideo] = await Promise.all([feedPromise, selectedPromise]);

      if (!selectedVideo) {
        return feedResponse.data;
      }

      return [
        selectedVideo,
        ...feedResponse.data.filter((video) => video.id !== selectedVideo.id),
      ];
    },
    staleTime: 30 * 1000,
  });

  const baseFeedVideos = feedQuery.isError
    ? videos
    : feedQuery.data
      ? feedQuery.data.length
        ? feedQuery.data
        : videos
      : emptyVideos;
  const feedVideos = useMemo(() => baseFeedVideos.map((video) => ({
    ...video,
    stats: {
      ...video.stats,
      views: viewCountsByVideoId[video.id] ?? video.stats.views,
    },
    viewer: {
      ...video.viewer,
      following: followingByUserId[video.user.id] ?? video.viewer.following,
    },
  })), [baseFeedVideos, followingByUserId, viewCountsByVideoId]);
  const effectiveActiveVideoId = activeVideoId ?? feedVideos[0]?.id ?? null;

  useEffect(() => {
    if (!effectiveActiveVideoId || viewedVideoIdsRef.current.has(effectiveActiveVideoId)) return undefined;

    const timeout = window.setTimeout(() => {
      if (viewedVideoIdsRef.current.has(effectiveActiveVideoId)) return;
      viewedVideoIdsRef.current.add(effectiveActiveVideoId);

      void recordVideoView(effectiveActiveVideoId, token)
        .then((response) => {
          setViewCountsByVideoId((current) => ({ ...current, [effectiveActiveVideoId]: response.data.views_count }));
        })
        .catch(() => undefined);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [effectiveActiveVideoId, token]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !feedVideos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          )[0];
        const videoId = visibleEntry?.target.getAttribute("data-video-id");

        if (videoId) setActiveVideoId(Number(videoId));
      },
      { root: feed, threshold: [0.6, 0.9] },
    );

    feed
      .querySelectorAll("[data-video-id]")
      .forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [feedVideos]);

  const updateCreatorFollowState = useCallback((userId: number, following: boolean) => {
    setFollowingByUserId((current) => ({ ...current, [userId]: following }));
  }, []);

  const activeVideoIndex = effectiveActiveVideoId
    ? feedVideos.findIndex((video) => video.id === effectiveActiveVideoId)
    : -1;
  const activeVideo = activeVideoIndex >= 0 ? feedVideos[activeVideoIndex] : null;
  const canGoPrevious = activeVideoIndex > 0;
  const canGoNext = activeVideoIndex >= 0 && activeVideoIndex < feedVideos.length - 1;

  const scrollToVideo = useCallback((direction: "previous" | "next") => {
    const feed = feedRef.current;
    if (!feed || !feedVideos.length) return;

    const currentIndex = effectiveActiveVideoId
      ? feedVideos.findIndex((video) => video.id === effectiveActiveVideoId)
      : 0;
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = direction === "previous"
      ? Math.max(0, fallbackIndex - 1)
      : Math.min(feedVideos.length - 1, fallbackIndex + 1);
    const nextVideo = feedVideos[nextIndex];
    if (!nextVideo || nextVideo.id === effectiveActiveVideoId) return;

    feed.querySelector<HTMLElement>(`[data-video-id="${nextVideo.id}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveVideoId(nextVideo.id);
  }, [effectiveActiveVideoId, feedVideos]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      event.preventDefault();
      scrollToVideo(event.key === "ArrowUp" ? "previous" : "next");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scrollToVideo]);

  return (
    <div className={cx("relative h-screen transition-colors duration-200", isDark ? "bg-transparent" : "bg-white")}>
      <section
        ref={feedRef}
        className="no-scrollbar h-screen snap-y snap-mandatory overflow-y-auto"
      >
        {feedQuery.isLoading && !feedVideos.length && (
          <div className={cx("grid h-screen place-items-center text-sm font-semibold", isDark ? "bg-black text-violet-50/70" : "bg-white text-zinc-500")}>
            Loading videos...
          </div>
        )}

        {(!feedQuery.isLoading || Boolean(feedVideos.length)) &&
          feedVideos.map((video, index) => (
            <article
              key={video.id}
              data-video-id={video.id}
              className={cx("relative flex h-screen snap-start items-center justify-center px-2 pb-16 pt-3 transition-colors duration-200 md:px-8 md:pb-5 md:pt-3", isDark ? "bg-black" : "bg-white")}
            >
              <div className="flex h-full w-full items-end justify-center gap-4 lg:gap-5">
                <div className="relative h-full max-h-[calc(100vh-24px)] w-full max-w-[min(56.25vh,526px)] overflow-hidden rounded-[16px] bg-[#0b0614] shadow-[0_0_70px_rgba(91,33,182,0.28)] ring-1 ring-violet-200/14">
                  <VideoPlayer
                    video={video}
                    paused={paused}
                    muted={muted}
                    isActive={video.id === effectiveActiveVideoId}
                    priority={video.id === feedVideos[0]?.id}
                    shouldPreload={index >= activeVideoIndex && index <= activeVideoIndex + 1}
                    onTogglePaused={() => setPaused((value) => !value)}
                    onToggleMuted={() => setMuted((value) => !value)}
                  />
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.03),rgba(0,0,0,0.04)_48%,rgba(0,0,0,0.66))]" />

                  <div className="absolute bottom-16 left-0 right-0 z-20 p-4 text-white sm:p-5">
                    {video.location_name && (
                      <div className="mb-2 inline-flex items-center gap-2 rounded bg-black/28 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
                        <span className="grid h-4 w-4 place-items-center rounded-sm bg-emerald-500 text-[10px]">
                          ✓
                        </span>
                        {video.location_name}
                      </div>
                    )}
                    <Link
                      href={`/profile/${video.user.username}`}
                      className="mb-2 inline-flex max-w-full text-lg font-bold leading-tight transition hover:text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      @{video.user.username}
                    </Link>
                    <ExpandableCaption caption={video.caption} />
                    <p className="mt-1 line-clamp-1 text-[15px] font-semibold text-white">
                      {video.tags
                        .map((tag) => `#${tag.replace("#", "")}`)
                        .join(" ")}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-white/88">
                      <Music size={15} /> {video.music}
                    </div>
                  </div>
                </div>

                <ActionRail
                  key={`${video.id}-${video.viewer.following}`}
                  video={video}
                  onComments={() => {
                    setActiveVideoId(video.id);
                    setCommentsOpen(true);
                  }}
                  onFollowChange={updateCreatorFollowState}
                />
              </div>
            </article>
          ))}
      </section>

      <div className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-4 xl:flex">
        <button
          type="button"
          onClick={() => scrollToVideo("previous")}
          disabled={!canGoPrevious}
          className={cx("grid h-12 w-12 place-items-center rounded-full ring-1 transition disabled:cursor-not-allowed disabled:opacity-35", isDark ? "bg-violet-950/70 text-violet-50 ring-violet-200/12 hover:bg-violet-800/80" : "bg-zinc-100 text-zinc-950 ring-zinc-200 hover:bg-zinc-200")}
          aria-label="Previous video"
        >
          <ChevronUp size={26} />
        </button>
        <button
          type="button"
          onClick={() => scrollToVideo("next")}
          disabled={!canGoNext}
          className={cx("grid h-12 w-12 place-items-center rounded-full ring-1 transition disabled:cursor-not-allowed disabled:opacity-35", isDark ? "bg-violet-950/70 text-violet-50 ring-violet-200/12 hover:bg-violet-800/80" : "bg-zinc-100 text-zinc-950 ring-zinc-200 hover:bg-zinc-200")}
          aria-label="Next video"
        >
          <ChevronDown size={26} />
        </button>
      </div>

      {commentsOpen && activeVideo && (
        <CommentsPanel
          video={activeVideo}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </div>
  );
}

function ExpandableCaption({ caption }: { caption: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const text = caption?.trim();

  if (!text) return null;

  const shouldClamp = text.length > 92;

  return (
    <div className="max-w-[88%] text-[15px] leading-5 text-white/92">
      <p className={expanded || !shouldClamp ? "" : "line-clamp-2"}>{text}</p>
      {shouldClamp && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-sm font-bold text-white transition hover:text-violet-100"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

function VideoPlayer({
  video,
  paused,
  muted,
  isActive,
  priority,
  shouldPreload,
  onTogglePaused,
  onToggleMuted,
}: {
  video: Video;
  paused: boolean;
  muted: boolean;
  isActive: boolean;
  priority: boolean;
  shouldPreload: boolean;
  onTogglePaused: () => void;
  onToggleMuted: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingProgressRef = useRef(false);
  const lastVideoTimeRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const hasExternalSound = Boolean(video.sound_preview_url);
  const trimStart = video.edit.trim_start ?? 0;
  const trimEnd = video.edit.trim_end;
  const filterStyle = buildVideoFilter(video.edit.filter_settings);
  const cropClass = video.edit.crop_mode === "fit" ? "object-contain" : "object-cover";

  const syncAudioToVideo = useCallback(() => {
    const element = videoRef.current;
    const audio = audioRef.current;
    if (!element || !audio) return;

    const audioDuration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : 0;

    try {
      audio.currentTime = audioDuration
        ? element.currentTime % audioDuration
        : element.currentTime;
    } catch {
      // Some browsers reject currentTime changes before audio metadata is ready.
    }
  }, []);

  const updateProgress = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      setProgress(0);
      return;
    }

    const duration = getPlayableDuration(element, video.duration, trimStart, trimEnd);
    const currentTime = Math.max(0, element.currentTime - trimStart);
    const nextProgress = duration
      ? clampProgress(currentTime / duration)
      : 0;

    if (trimEnd && element.currentTime >= trimEnd) {
      element.currentTime = trimStart;
      syncAudioToVideo();
      setProgress(0);
      return;
    }

    if (
      hasExternalSound &&
      element.currentTime + 0.25 < lastVideoTimeRef.current
    ) {
      syncAudioToVideo();
    }

    lastVideoTimeRef.current = element.currentTime;
    setProgress(nextProgress);
  }, [hasExternalSound, syncAudioToVideo, trimEnd, trimStart, video.duration]);

  const seekToProgress = useCallback(
    (nextProgress: number) => {
      const element = videoRef.current;
      if (!element) return;

      const duration = getPlayableDuration(element, video.duration, trimStart, trimEnd);
      if (!duration) return;

      const safeProgress = clampProgress(nextProgress);
      element.currentTime = trimStart + duration * safeProgress;
      lastVideoTimeRef.current = element.currentTime;
      setProgress(safeProgress);
      syncAudioToVideo();
    },
    [syncAudioToVideo, trimEnd, trimStart, video.duration],
  );

  const seekToPointer = useCallback(
    (clientX: number) => {
      const track = progressTrackRef.current;
      if (!track || !video.video_url) return;

      const rect = track.getBoundingClientRect();
      if (!rect.width) return;

      seekToProgress((clientX - rect.left) / rect.width);
    },
    [seekToProgress, video.video_url],
  );

  function handleProgressPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!video.video_url) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDraggingProgressRef.current = true;
    setIsDraggingProgress(true);
    seekToPointer(event.clientX);
  }

  function handleProgressPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingProgressRef.current) return;

    event.preventDefault();
    seekToPointer(event.clientX);
  }

  function finishProgressDrag(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingProgressRef.current) return;

    event.preventDefault();
    seekToPointer(event.clientX);
    isDraggingProgressRef.current = false;
    setIsDraggingProgress(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleProgressKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!video.video_url) return;

    const smallStep = 1 / progressScale;
    const largeStep = 0.05;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      seekToProgress(progress - smallStep);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      seekToProgress(progress + smallStep);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      seekToProgress(progress - largeStep);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      seekToProgress(progress + largeStep);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToProgress(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekToProgress(1);
    }
  }

  function handleToggleMuted() {
    const element = videoRef.current;
    const audio = audioRef.current;
    const nextMuted = !muted;

    onToggleMuted();

    if (nextMuted) {
      audio?.pause();
      return;
    }

    if (element) {
      element.muted = hasExternalSound;
      void element.play().catch(() => undefined);
    }

    if (audio && hasExternalSound) {
      audio.muted = false;
      syncAudioToVideo();
      void audio.play().catch(() => undefined);
    }
  }

  useEffect(() => {
    const element = videoRef.current;
    const audio = audioRef.current;
    if (!element) return;

    if (shouldPreload && element.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      element.load();
    }

    if (paused || !isActive) {
      element.pause();
      audio?.pause();
      return;
    }

    if (element.currentTime < trimStart || (trimEnd && element.currentTime >= trimEnd)) {
      element.currentTime = trimStart;
    }

    void element.play().catch(() => undefined);

    if (audio) {
      if (muted || !hasExternalSound) {
        audio.pause();
      } else {
        syncAudioToVideo();
        void audio.play().catch(() => undefined);
      }
    }
  }, [
    hasExternalSound,
    isActive,
    muted,
    paused,
    shouldPreload,
    syncAudioToVideo,
    trimEnd,
    trimStart,
    video.video_url,
  ]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video.video_url) {
      setProgress(0);
      return;
    }

    const handleProgressUpdate = () => updateProgress();
    const handleSeeked = () => {
      updateProgress();
      syncAudioToVideo();
    };

    updateProgress();
    element.addEventListener("loadedmetadata", handleProgressUpdate);
    element.addEventListener("durationchange", handleProgressUpdate);
    element.addEventListener("timeupdate", handleProgressUpdate);
    element.addEventListener("seeked", handleSeeked);

    return () => {
      element.removeEventListener("loadedmetadata", handleProgressUpdate);
      element.removeEventListener("durationchange", handleProgressUpdate);
      element.removeEventListener("timeupdate", handleProgressUpdate);
      element.removeEventListener("seeked", handleSeeked);
    };
  }, [syncAudioToVideo, updateProgress, video.video_url]);

  return (
    <>
      {video.video_url ? (
        <video
          ref={videoRef}
          src={shouldPreload ? video.video_url : undefined}
          poster={video.thumbnail_url ?? undefined}
          muted={muted || hasExternalSound}
          playsInline
          loop
          autoPlay={isActive && !paused}
          preload={shouldPreload ? "auto" : "none"}
          className={`h-full w-full transition duration-200 ${cropClass}`}
          style={{ filter: filterStyle }}
        />
      ) : (
        <Image
          src={video.thumbnail_url ?? fallbackPoster}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 526px"
          className={cropClass}
          priority={priority}
        />
      )}

      {hasExternalSound && (
        <audio
          ref={audioRef}
          src={shouldPreload ? video.sound_preview_url ?? undefined : undefined}
          loop
          preload={shouldPreload ? "metadata" : "none"}
        />
      )}

      {video.video_url && (
        <button
          type="button"
          onClick={onTogglePaused}
          className="absolute inset-0 z-[15] cursor-pointer bg-transparent"
          aria-label={paused ? "Play video" : "Pause video"}
        />
      )}

      <div className="absolute bottom-3 left-4 right-4 z-30 flex items-center gap-3 text-white">
        <button
          onClick={onTogglePaused}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={paused ? "Play video" : "Pause video"}
        >
          {paused ? (
            <Play size={20} fill="currentColor" />
          ) : (
            <Pause size={20} fill="currentColor" />
          )}
        </button>
        <div
          ref={progressTrackRef}
          role="slider"
          tabIndex={video.video_url ? 0 : -1}
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={progressScale}
          aria-valuenow={Math.round(progress * progressScale)}
          onKeyDown={handleProgressKeyDown}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={finishProgressDrag}
          onPointerCancel={finishProgressDrag}
          className="relative h-5 flex-1 cursor-pointer touch-none outline-none focus-visible:[&_.progress-knob]:opacity-100 disabled:cursor-default"
        >
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/22">
            <div
              className="h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--royal),var(--royal-bright))] transition-transform duration-100"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <div
            className="progress-knob pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
          {isDraggingProgress && (
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.65)]"
              style={{ left: `calc(${progress * 100}% - 8px)` }}
            />
          )}
        </div>
        <button
          onClick={handleToggleMuted}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>
    </>
  );
}

function getPlayableDuration(
  element: HTMLVideoElement,
  fallbackDuration: number | null,
  trimStart = 0,
  trimEnd: number | null = null,
) {
  if (trimEnd && trimEnd > trimStart) {
    return trimEnd - trimStart;
  }

  if (Number.isFinite(element.duration) && element.duration > 0) {
    return Math.max(0, element.duration - trimStart);
  }

  return fallbackDuration && fallbackDuration > 0
    ? Math.max(0, fallbackDuration - trimStart)
    : 0;
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildVideoFilter(value: Record<string, unknown> | null | undefined) {
  const brightness = readNumber(value?.brightness, 100);
  const contrast = readNumber(value?.contrast, 100);
  const saturation = readNumber(value?.saturation, 100);
  const warmth = Math.min(40, Math.max(-40, readNumber(value?.warmth, 0)));
  const warmthSepia = Math.max(0, warmth) * 0.45;
  const warmthHue = warmth < 0 ? warmth * 0.55 : warmth * 0.28;

  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${warmthSepia}%) hue-rotate(${warmthHue}deg)`;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
