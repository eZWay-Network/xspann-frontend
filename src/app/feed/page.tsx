import { AppShell } from "@/components/common/app-shell";
import { FeedExperience } from "@/components/feed/feed-experience";
import { Suspense } from "react";

export default function FeedPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <FeedExperience />
      </Suspense>
    </AppShell>
  );
}
