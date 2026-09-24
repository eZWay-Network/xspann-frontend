import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { UploadVideoForm } from "@/components/upload/upload-video-form";

export default function UploadPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <UploadVideoForm />
      </ProtectedRoute>
    </AppShell>
  );
}
