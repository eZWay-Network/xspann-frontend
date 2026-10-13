"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || authenticated) return;

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [authenticated, loading, pathname, router]);

  if (loading || !authenticated) {
    return (
      <section className="grid h-full place-items-center px-4">
        <XpnLoader label="Checking account..." />
      </section>
    );
  }

  return children;
}
