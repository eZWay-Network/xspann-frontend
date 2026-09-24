"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { cx } from "@/lib/format";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (loading || authenticated) return;

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [authenticated, loading, pathname, router]);

  if (loading || !authenticated) {
    return (
      <section className="grid h-full place-items-center px-4">
        <div
          className={cx(
            "inline-flex items-center gap-2 text-sm font-semibold",
            isDark ? "text-violet-100/75" : "text-violet-950/60",
          )}
        >
          <LoaderCircle className="animate-spin" size={18} />
          Checking account...
        </div>
      </section>
    );
  }

  return children;
}
