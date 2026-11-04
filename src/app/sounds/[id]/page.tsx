import { AppShell } from "@/components/common/app-shell";
import { SoundProfile } from "@/components/audio/sound-profile";

export default async function SoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audioId = Number(id);

  return <AppShell><SoundProfile id={Number.isFinite(audioId) ? audioId : 0} /></AppShell>;
}
