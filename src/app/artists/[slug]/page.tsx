import { AppShell } from "@/components/common/app-shell";
import { ArtistProfile } from "@/components/artists/artist-profile";

export default async function ArtistPage({ params }: PageProps<"/artists/[slug]">) {
  const { slug } = await params;
  return <AppShell><ArtistProfile slug={slug} /></AppShell>;
}
