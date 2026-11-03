import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { InboxPage } from "@/components/messaging/inbox-page";
export default function Page() { return <AppShell><ProtectedRoute><InboxPage /></ProtectedRoute></AppShell>; }
