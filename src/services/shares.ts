import type { SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export type ShareResponse = {
  video_id: number;
  share_url: string;
  shares_count: number;
};

export function shareVideo(videoId: number, channel = "native_share", token?: string | null) {
  return apiRequest<SingleResponse<ShareResponse>>(`/videos/${videoId}/share`, {
    method: "POST",
    token,
    body: JSON.stringify({ channel }),
  });
}
