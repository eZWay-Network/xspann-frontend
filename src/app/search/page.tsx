import { Suspense } from "react";
import { AppShell } from "@/components/common/app-shell";
import { SearchExperience } from "@/components/search/search-experience";
import { XpnLoader } from "@/components/common/xpn-loader";

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="page-content grid min-h-72 place-items-center px-6"><XpnLoader label="Loading Discover..." /></div>}>
        <SearchExperience />
      </Suspense>
    </AppShell>
  );
}
