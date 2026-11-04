import type { AudioTrack, MusicTrack } from "@/types/api";
import { getAudios, getSavedAudios } from "./audio";

export const fallbackTracks: MusicTrack[] = [
  { id: "original", name: "Original sound", artist: "Your video audio", provider: "original" },
];

function toMusicTrack(audio: AudioTrack): MusicTrack {
  return {
    id: String(audio.id),
    name: audio.title,
    artist: audio.creator.username,
    provider: "library",
    preview_url: audio.audio_url ?? undefined,
    duration: audio.duration ?? undefined,
    saved: audio.viewer.saved,
    videos_count: audio.videos_count,
    origin: audio.origin,
  };
}

function availableMusicTracks(audios: AudioTrack[]) {
  return audios
    .filter((audio) => audio.status === "ready" && audio.reuse_allowed)
    .map(toMusicTrack);
}

export async function searchMusicTracks(term: string, token?: string | null): Promise<MusicTrack[]> {
  const response = await getAudios(term, 1, token);
  return [fallbackTracks[0], ...availableMusicTracks(response.data)];
}

export async function getSavedMusicTracks(token: string): Promise<MusicTrack[]> {
  const response = await getSavedAudios(token);
  return [fallbackTracks[0], ...availableMusicTracks(response.data).map((track) => ({ ...track, saved: true }))];
}
