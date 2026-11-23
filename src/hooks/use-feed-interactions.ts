import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { followUser, unfollowUser } from "@/services/follows";
import { likeVideo, unlikeVideo } from "@/services/likes";
import { saveVideo, unsaveVideo } from "@/services/saves";
import { shareVideo } from "@/services/shares";
import type { Video } from "@/types/api";

type VideoChange = { liked?: boolean; likes?: number; saved?: boolean; saves?: number; shares?: number };

export function useFeedInteractions(viewer: number | "guest", token: string | null) {
  const client = useQueryClient();
  const [changes, setChanges] = useState<Record<number, VideoChange>>({});
  const [following, setFollowing] = useState<Record<number, boolean>>({});
  const [confirmedFollowing, setConfirmedFollowing] = useState<Record<number, boolean>>({});
  const requests = useRef(new Set<string>());

  function updateVideo(id: number, change: VideoChange) {
    setChanges(previous => ({ ...previous, [id]: { ...previous[id], ...change } }));
  }

  async function run(key: string, write: () => Promise<void>) {
    if (requests.current.has(key)) return;
    requests.current.add(key);
    try {
      await write();
    } finally {
      requests.current.delete(key);
    }
  }

  function toggleLike(video: Video) {
    return run(`like-${video.id}`, async () => {
      if (!token) return;
      const { liked } = video.viewer;
      const { likes } = video.stats;
      updateVideo(video.id, { liked: !liked, likes: Math.max(0, likes + (liked ? -1 : 1)) });
      try {
        const { data } = await (liked ? unlikeVideo : likeVideo)(video.id, token);
        updateVideo(video.id, { liked: data.liked, likes: data.likes_count });
        void client.invalidateQueries({ queryKey: queryKeys.likedVideos(viewer) });
        if (video.user.id === viewer) void client.invalidateQueries({ queryKey: queryKeys.myVideos(viewer) });
      } catch (error) {
        updateVideo(video.id, { liked, likes });
        throw error;
      }
    });
  }

  function toggleSave(video: Video) {
    return run(`save-${video.id}`, async () => {
      if (!token) return;
      const { saved } = video.viewer;
      const { saves } = video.stats;
      updateVideo(video.id, { saved: !saved, saves: Math.max(0, saves + (saved ? -1 : 1)) });
      try {
        const { data } = await (saved ? unsaveVideo : saveVideo)(video.id, token);
        updateVideo(video.id, { saved: data.saved, saves: data.saves_count });
        void client.invalidateQueries({ queryKey: queryKeys.savedVideos(viewer) });
      } catch (error) {
        updateVideo(video.id, { saved, saves });
        throw error;
      }
    });
  }

  function toggleFollow(video: Video) {
    const creator = video.user.id;
    return run(`follow-${creator}`, async () => {
      if (!token || creator === viewer) return;
      const wasFollowing = video.viewer.following;
      const update = (value: boolean) => setFollowing(previous => ({ ...previous, [creator]: value }));
      update(!wasFollowing);
      try {
        const { data } = await (wasFollowing ? unfollowUser : followUser)(creator, token);
        update(data.following);
        setConfirmedFollowing(previous => ({ ...previous, [creator]: data.following }));
        void client.invalidateQueries({ queryKey: ["profile"], predicate: query => query.queryKey[2] === viewer });
      } catch (error) {
        update(wasFollowing);
        throw error;
      }
    });
  }

  async function recordShare(video: Video, channel: string) {
    const { data } = await shareVideo(video.id, channel, token);
    // Multiple share targets can complete out of order.
    setChanges(previous => ({
      ...previous,
      [video.id]: { ...previous[video.id], shares: Math.max(previous[video.id]?.shares ?? 0, data.shares_count) },
    }));
  }

  return { changes, following, confirmedFollowing, toggleLike, toggleSave, toggleFollow, recordShare };
}
