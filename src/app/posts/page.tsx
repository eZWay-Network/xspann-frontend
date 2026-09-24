import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { PostsManager } from "@/components/posts/posts-manager";

export default function PostsPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <PostsManager />
      </ProtectedRoute>
    </AppShell>
  );
}
