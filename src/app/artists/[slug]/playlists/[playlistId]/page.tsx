import { AppShell } from "@/components/common/app-shell";
import { ArtistPlaylistPage } from "@/components/artists/artist-playlist";
import { notFound } from "next/navigation";

export default async function PlaylistPage({ params }: PageProps<"/artists/[slug]/playlists/[playlistId]">) {
  const { slug, playlistId } = await params;
  const numericPlaylistId = Number(playlistId);
  if (!Number.isSafeInteger(numericPlaylistId) || numericPlaylistId < 1) notFound();
  return <AppShell><ArtistPlaylistPage slug={slug} playlistId={numericPlaylistId} /></AppShell>;
}
