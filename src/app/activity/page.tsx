import { ActivityPage } from "@/components/activity/activity-page";
import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";

export default function Page() {
  return (
    <AppShell>
      <ProtectedRoute>
        <ActivityPage />
      </ProtectedRoute>
    </AppShell>
  );
}
