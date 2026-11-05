import type { Artist, ArtistAnalytics, ArtistFanSummary, ArtistLink, ArtistPlaylist, ArtistTaxonomy, PaginatedResponse, SingleResponse, UserSummary, Video } from "@/types/api";
import { apiRequest } from "./api";

export function getArtistTaxonomy() {
  return apiRequest<SingleResponse<ArtistTaxonomy>>("/artist-taxonomy");
}

export function getArtists(filters: { q?: string; genreId?: number; sort?: "latest" | "popular"; page?: number; limit?: number } = {}, token?: string | null) {
  const params = new URLSearchParams({ page: String(filters.page ?? 1), limit: String(filters.limit ?? 20), sort: filters.sort ?? "latest" });
  if (filters.q) params.set("q", filters.q);
  if (filters.genreId) params.set("genre_id", String(filters.genreId));
  return apiRequest<PaginatedResponse<Artist>>(`/artists?${params}`, { token });
}

export function getArtistBySlug(slug: string, token?: string | null) {
  return apiRequest<SingleResponse<Artist>>(`/artists/by-slug/${encodeURIComponent(slug)}`, { token });
}

export function getArtist(id: number, token?: string | null) {
  return apiRequest<SingleResponse<Artist>>(`/artists/${id}`, { token });
}

export function getArtistVideos(artistId: number, token?: string | null, page = 1) {
  return apiRequest<PaginatedResponse<Video>>(`/artists/${artistId}/videos?page=${page}&limit=24`, { token });
}

export function getArtistFollowers(artistId: number, token?: string | null, page = 1) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/artists/${artistId}/followers?page=${page}&limit=24`, { token });
}

export function getMyArtist(token: string) {
  return apiRequest<SingleResponse<Artist>>("/me/artist", { token });
}

export function saveMyArtist(payload: { stage_name: string; slug: string; bio?: string | null; location?: string | null; image?: string | null; genre_ids?: number[]; featured_video_id?: number | null; listed?: boolean }, token: string) {
  return apiRequest<SingleResponse<Artist>>("/me/artist", { method: "PUT", token, body: JSON.stringify(payload) });
}

export function saveArtistLinks(links: ArtistLink[], token: string) {
  return apiRequest<SingleResponse<Artist>>("/me/artist/links", { method: "PUT", token, body: JSON.stringify({ links }) });
}

export function uploadArtistImage(file: File, token: string) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<SingleResponse<{ upload_method: "multipart"; storage_path: string; image_url: string }>>("/uploads/artist-image", { method: "POST", token, body });
}

export function followArtist(id: number, token: string) {
  return apiRequest<SingleResponse<{ following: boolean; followers_count: number }>>(`/artists/${id}/follow`, { method: "POST", token });
}

export function unfollowArtist(id: number, token: string) {
  return apiRequest<SingleResponse<{ following: boolean; followers_count: number }>>(`/artists/${id}/follow`, { method: "DELETE", token });
}

export function getArtistPlaylists(artistId: number, token?: string | null, page = 1) {
  return apiRequest<PaginatedResponse<ArtistPlaylist>>(`/artists/${artistId}/playlists?page=${page}&limit=20`, { token });
}

export function getArtistPlaylist(artistId: number, playlistId: number, token?: string | null) {
  return apiRequest<SingleResponse<ArtistPlaylist>>(`/artists/${artistId}/playlists/${playlistId}`, { token });
}

export function getMyPlaylists(token: string, page = 1) {
  return apiRequest<PaginatedResponse<ArtistPlaylist>>(`/me/artist/playlists?page=${page}&limit=50`, { token });
}

export function getMyPlaylist(id: number, token: string) {
  return apiRequest<SingleResponse<ArtistPlaylist>>(`/me/artist/playlists/${id}`, { token });
}

export function createPlaylist(payload: { title: string; description?: string | null; genre_id?: number | null; category?: string; visibility?: "public" | "private" }, token: string) {
  return apiRequest<SingleResponse<ArtistPlaylist>>("/me/artist/playlists", { method: "POST", token, body: JSON.stringify(payload) });
}

export function updatePlaylist(id: number, payload: Partial<Pick<ArtistPlaylist, "title" | "description" | "genre_id" | "category" | "visibility">> & { version: number }, token: string) {
  return apiRequest<SingleResponse<ArtistPlaylist>>(`/me/artist/playlists/${id}`, { method: "PATCH", token, body: JSON.stringify(payload) });
}

export function replacePlaylistItems(id: number, version: number, videoIds: number[], token: string) {
  return apiRequest<SingleResponse<ArtistPlaylist>>(`/me/artist/playlists/${id}/items`, { method: "PUT", token, body: JSON.stringify({ version, video_ids: videoIds }) });
}

export function deletePlaylist(id: number, token: string) {
  return apiRequest<void>(`/me/artist/playlists/${id}`, { method: "DELETE", token });
}

export function getArtistAnalytics(token: string) {
  return apiRequest<SingleResponse<ArtistAnalytics>>("/me/artist/analytics", { token });
}

export function getFanSummary(token: string) {
  return apiRequest<SingleResponse<ArtistFanSummary>>("/me/artist/fans/summary", { token });
}
