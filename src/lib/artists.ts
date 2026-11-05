import type { Artist, ArtistCapabilities } from "@/types/api";

export type ArtistProfileDraft = {
  stage_name: string;
  slug: string;
  bio: string;
  location: string;
  listed: boolean;
  genre_ids: number[];
  image: string | null;
  featured_video_id: number | null;
};

export const FREE_ARTIST_CAPABILITIES: ArtistCapabilities = {
  plan: "free",
  links: 1,
  playlists: 1,
  featured_release: false,
  enhanced_profile: false,
  enhanced_directory_card: false,
  analytics_30_days: false,
  release_scheduling: false,
  fan_announcements: 0,
  announcement_recipients: 0,
  monthly_boost_credit_cents: 0,
};

export function normalizeArtistSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sameNumberSet(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function buildArtistProfilePayload(
  artist: Artist | null,
  draft: ArtistProfileDraft,
  allowFeaturedEdit = false,
) {
  const payload: {
    stage_name: string;
    slug: string;
    bio?: string | null;
    location?: string | null;
    image?: string | null;
    genre_ids?: number[];
    featured_video_id?: number | null;
    listed?: boolean;
  } = {
    stage_name: draft.stage_name.trim(),
    slug: draft.slug,
  };

  if (!artist || draft.bio !== (artist.bio ?? "")) payload.bio = draft.bio.trim() || null;
  if (!artist || draft.location !== (artist.location ?? "")) payload.location = draft.location.trim() || null;
  if (!artist || draft.listed !== artist.listed) payload.listed = draft.listed;
  if (!artist || !sameNumberSet(draft.genre_ids, artist.genres.map((genre) => genre.id))) payload.genre_ids = draft.genre_ids;
  if (draft.image !== (artist?.image ?? null)) payload.image = draft.image;
  if (allowFeaturedEdit && draft.featured_video_id !== (artist?.featured_video_id ?? artist?.featured_release?.id ?? null)) {
    payload.featured_video_id = draft.featured_video_id;
  }

  return payload;
}

export function sameOrderedIds(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export type AnalyticsPoint = Record<string, string | number>;
export type AnalyticsDay = { date: string; point: AnalyticsPoint | null };

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildUtcDailySeries(
  daily: AnalyticsPoint[],
  dataSince: string,
  endDate = new Date(),
  maximumDays = 30,
): AnalyticsDay[] {
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  const earliest = new Date(`${dataSince.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(earliest.getTime()) || maximumDays < 1) return [];

  const windowStart = new Date(end);
  windowStart.setUTCDate(windowStart.getUTCDate() - maximumDays + 1);
  const start = earliest > windowStart ? earliest : windowStart;
  if (start > end) return [];

  const byDate = new Map(daily.flatMap((point) => {
    const date = typeof point.date === "string" ? point.date.slice(0, 10) : "";
    return date ? [[date, point] as const] : [];
  }));
  const result: AnalyticsDay[] = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = utcDateKey(cursor);
    result.push({ date, point: byDate.get(date) ?? null });
  }

  return result;
}

export function moveOrderedItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
