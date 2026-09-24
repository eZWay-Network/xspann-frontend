import type { MusicTrack } from "@/types/api";

const JAMENDO_CLIENT_ID = process.env.NEXT_PUBLIC_JAMENDO_CLIENT_ID;

export const fallbackTracks: MusicTrack[] = [
  { id: "original", name: "Original sound", artist: "Your video audio", provider: "original" },
  { id: "royal-pulse", name: "Royal Pulse", artist: "XSpann RNB Sounds", provider: "local", preview_url: "/sounds/royal-pulse.wav" },
  { id: "night-vertical", name: "Night Vertical", artist: "XSpann RNB Sounds", provider: "local", preview_url: "/sounds/night-vertical.wav" },
  { id: "creator-glow", name: "Creator Glow", artist: "XSpann RNB Sounds", provider: "local", preview_url: "/sounds/creator-glow.wav" },
];

type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  audio?: string;
  audiodownload?: string;
  album_image?: string;
  duration?: number;
  license_ccurl?: string;
};

export async function searchMusicTracks(term: string): Promise<MusicTrack[]> {
  const query = term.trim();

  if (!JAMENDO_CLIENT_ID || query.length < 2) {
    return fallbackTracks;
  }

  const params = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: "json",
    limit: "10",
    search: query,
    include: "licenses",
    audioformat: "mp32",
  });

  const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Could not load music tracks.");
  }

  const payload = (await response.json()) as { results?: JamendoTrack[] };

  return (payload.results ?? []).map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artist_name,
    provider: "jamendo" as const,
    preview_url: track.audio ?? track.audiodownload,
    artwork_url: track.album_image,
    duration: track.duration,
    license_url: track.license_ccurl,
  }));
}
