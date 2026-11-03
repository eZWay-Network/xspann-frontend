import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { WelcomeChoice } from "@/components/auth/welcome-choice";

export default function WelcomePage() {
  return <AppShell><ProtectedRoute><WelcomeChoice /></ProtectedRoute></AppShell>;
}
