import { AppShell } from "@/components/common/app-shell";
import { FeedExperience } from "@/components/feed/feed-experience";

export default async function VideoPage({ params }: PageProps<"/video/[id]">) {
  const { id } = await params;
  const videoId = Number(id);

  return <AppShell><FeedExperience initialVideoId={Number.isFinite(videoId) ? videoId : undefined} /></AppShell>;
}
