import { AppShell } from "@/components/common/app-shell";
import { ProfileCard } from "@/components/profile/profile-card";

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const { username } = await params;
  return <AppShell><ProfileCard username={username} /></AppShell>;
}
