"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { isRecoveryPath } from "@/lib/account-safety";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authenticated) {
      if (user?.restricted_access && !isRecoveryPath(pathname)) {
        router.replace("/settings/privacy");
      }
      return;
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [authenticated, loading, pathname, router, user?.restricted_access]);

  if (loading || !authenticated || Boolean(user?.restricted_access && !isRecoveryPath(pathname))) {
    return (
      <section className="grid h-full place-items-center px-4">
        <XpnLoader label="Checking account..." />
      </section>
    );
  }

  return children;
}
