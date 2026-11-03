"use client";

import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/components/common/auth-provider";

export function LandingHeader() {
  const { authenticated, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Logo href="/join-free" />
        <nav aria-label="Landing navigation" className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href="/feed" className="transition hover:text-[var(--foreground)]">Explore</Link>
          <Link href="/artists" className="transition hover:text-[var(--foreground)]">Artists</Link>
          <Link href="/pricing" className="transition hover:text-[var(--foreground)]">Artist plans</Link>
        </nav>
        <div className="flex items-center gap-2">
          {!loading && authenticated ? (
            <Link href="/feed" className="primary-button">Open XPN <ArrowRight size={16} /></Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:inline-flex">
                <LogIn size={16} /> Log in
              </Link>
              <Link href="/register" className="primary-button">Join free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
