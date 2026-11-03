import type { MusicTrack } from "@/types/api";
import { getAudios } from "./audio";

export const fallbackTracks: MusicTrack[] = [
  { id: "original", name: "Original sound", artist: "Your video audio", provider: "original" },
];

export async function searchMusicTracks(term: string): Promise<MusicTrack[]> {
  const response = await getAudios(term);
  return [fallbackTracks[0], ...response.data
    .filter((audio) => audio.status === "ready" && audio.reuse_allowed)
    .map((audio) => ({
      id: String(audio.id), name: audio.title, artist: audio.creator.username,
      provider: "library" as const, preview_url: audio.audio_url ?? undefined,
      duration: audio.duration ?? undefined,
    }))];
}
