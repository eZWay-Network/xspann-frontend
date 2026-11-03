import { AppShell } from "@/components/common/app-shell";
import { ArtistPlaylistPage } from "@/components/artists/artist-playlist";

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string; playlistId: string }> }) {
  const { slug, playlistId } = await params;
  return <AppShell><ArtistPlaylistPage slug={slug} playlistId={Number(playlistId)} /></AppShell>;
}
