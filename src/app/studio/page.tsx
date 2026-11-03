import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export default function StudioPage() { return <AppShell><ProtectedRoute><StudioWorkspace /></ProtectedRoute></AppShell>; }
