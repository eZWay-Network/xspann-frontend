import { Suspense } from "react";
import { AppShell } from "@/components/common/app-shell";
import { SearchExperience } from "@/components/search/search-experience";

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div role="status" className="page-content px-6 text-[var(--muted)]">Loading search…</div>}>
        <SearchExperience />
      </Suspense>
    </AppShell>
  );
}
