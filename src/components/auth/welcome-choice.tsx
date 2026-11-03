"use client";

import Link from "next/link";
import { ArrowRight, Music2, Sparkles } from "lucide-react";
import { clearArtistSetupChoice } from "@/lib/onboarding";

export function WelcomeChoice() {
  return (
    <section className="page-content grid h-full place-items-center overflow-y-auto px-5 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-7 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--royal)]">Welcome to XPN social</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How would you like to begin?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">You have one free XPN account. Browse as a fan, share as a creator, or create an artist profile now. You can become an artist later from your profile.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/feed" onClick={clearArtistSetupChoice} className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition hover:border-violet-500/35">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-[var(--royal)]"><Music2 size={21} /></span>
            <h2 className="mt-5 text-xl font-semibold">Continue to feed</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Discover videos and artists, follow people, comment, save and share.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]">Start exploring <ArrowRight size={16} /></span>
          </Link>
          <Link href="/studio" onClick={clearArtistSetupChoice} className="group rounded-2xl border border-violet-500/30 bg-[linear-gradient(145deg,#7c3aed18,var(--surface))] p-6 transition hover:border-violet-500/55">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles size={21} /></span>
            <h2 className="mt-5 text-xl font-semibold">Become an artist</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choose a stage name and public slug. Artist profile creation is free.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]">Create artist profile <ArrowRight size={16} /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
