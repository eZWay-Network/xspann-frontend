import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { AnnouncementPage } from "@/components/messaging/announcement-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><ProtectedRoute><AnnouncementPage id={Number(id)} /></ProtectedRoute></AppShell>;
}
