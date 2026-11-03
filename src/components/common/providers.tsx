"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/components/common/auth-provider";
import { ThemeProvider } from "@/components/common/theme-provider";
import { RealtimeBridge } from "@/components/common/realtime-bridge";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: 1,
        staleTime: 30 * 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider><RealtimeBridge />{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
