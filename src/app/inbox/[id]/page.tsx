import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { ConversationPage } from "@/components/messaging/conversation-page";
export default async function Page({ params }: PageProps<"/inbox/[id]">) { const { id } = await params; return <AppShell><ProtectedRoute><ConversationPage id={Number(id)} /></ProtectedRoute></AppShell>; }
