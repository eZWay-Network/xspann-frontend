import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { PrivacySettings } from "@/components/settings/privacy-settings";
export default function Page() { return <AppShell><ProtectedRoute><PrivacySettings googleClientId={process.env.GOOGLE_CLIENT_ID ?? ""} /></ProtectedRoute></AppShell>; }
