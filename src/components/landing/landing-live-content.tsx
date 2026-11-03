"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Check, MapPin, Music2, Radio, Users } from "lucide-react";
import { getArtists } from "@/services/artists";
import { getPlans } from "@/services/billing";
import type { PlanOffer } from "@/types/api";

export function LandingLiveContent() {
  const artists = useQuery({
    queryKey: ["landing-artists", "popular"],
    queryFn: () => getArtists({ sort: "popular", limit: 6 }),
    staleTime: 5 * 60_000,
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <section id="artists" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--royal)]">Live from XPN</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Artists to discover</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Popular public artist profiles, loaded directly from the XPN community.</p>
          </div>
          <Link href="/artists" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]">Browse every artist <ArrowRight size={16} /></Link>
        </div>

        {artists.isPending && <ArtistSkeleton />}
        {artists.isError && (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-7 text-sm text-[var(--muted)]">
            Artist profiles are temporarily unavailable. <button type="button" onClick={() => void artists.refetch()} className="font-bold text-[var(--royal)]">Try again</button>
          </div>
        )}
        {!!artists.data?.data.length && (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.data.data.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.slug}`} className="group overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_24px_70px_-38px_rgba(124,58,237,0.7)]">
                <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#8b5cf655,transparent_48%),linear-gradient(135deg,#20113e,#121215)]">
                  {artist.image_url ? (
                    <Image src={artist.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="grid h-full place-items-center"><Music2 size={42} className="text-violet-200/70" /></div>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">Artist</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><h3 className="truncate text-lg font-semibold">{artist.stage_name}</h3><p className="mt-1 text-xs text-[var(--muted)]">@{artist.slug}</p></div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--muted)]"><Users size={14} /> {artist.followers_count.toLocaleString()}</span>
                  </div>
                  {artist.bio && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{artist.bio}</p>}
                  <div className="mt-4 flex min-h-6 flex-wrap items-center gap-2">
                    {artist.genres.slice(0, 2).map((genre) => <span key={genre.id} className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-[var(--royal)]">{genre.name}</span>)}
                    {artist.location && <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]"><MapPin size={12} /> {artist.location}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!artists.isPending && !artists.isError && !artists.data?.data.length && (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-10 text-center">
            <Music2 className="mx-auto text-[var(--muted)]" size={32} />
            <p className="mt-3 font-semibold">The artist directory is getting ready.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Create an artist profile and be among the first to appear.</p>
          </div>
        )}
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-[var(--royal)]"><BarChart3 size={21} /></span>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--royal)]">Artist workspace</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start simple. Add tools when you need them.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Build your artist profile and organize releases first. Available limits and advanced tools come from the current XPN plan catalog.</p>
            {plans.data?.data.environment === "test" && <p className="mt-4 inline-flex rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">Test plan catalog · live sales are not open</p>}
            <Link href="/pricing" className="primary-button mt-7">Compare artist plans <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.isPending && Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-[var(--surface)]" />)}
            {plans.data?.data.offers.map((offer) => <PlanSnapshot key={offer.code} offer={offer} />)}
            {plans.isError && <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)] sm:col-span-2">Current artist plan details are temporarily unavailable.</div>}
          </div>
        </div>
      </section>
    </>
  );
}

function PlanSnapshot({ offer }: { offer: PlanOffer }) {
  const title = offer.name ?? offer.code.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const price = offer.amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency.toUpperCase() }).format(offer.amount / 100);
  const highlights = [
    `${offer.limits.links} profile ${offer.limits.links === 1 ? "link" : "links"}`,
    `${offer.limits.playlists} ${offer.limits.playlists === 1 ? "playlist" : "playlists"}`,
    offer.limits.release_scheduling ? "Release scheduling" : null,
    offer.limits.analytics_30_days ? "30-day analytics" : null,
    offer.limits.fan_announcements > 0 ? `${offer.limits.fan_announcements} fan updates per period` : null,
  ].filter(Boolean).slice(0, 4) as string[];

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{title}</h3><span className="text-sm font-bold text-[var(--royal)]">{price}{offer.amount > 0 ? `/${offer.interval ?? "month"}` : ""}</span></div>
      <ul className="mt-4 space-y-2.5">{highlights.map((item) => <li key={item} className="flex items-start gap-2 text-xs text-[var(--muted)]"><Check size={14} className="mt-0.5 shrink-0 text-emerald-400" /> {item}</li>)}</ul>
    </article>
  );
}

function ArtistSkeleton() {
  return <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading artists">{Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]"><div className="aspect-[16/9] animate-pulse bg-[var(--surface)]" /><div className="space-y-3 p-5"><div className="h-5 w-2/3 animate-pulse rounded bg-[var(--surface)]" /><div className="h-3 w-full animate-pulse rounded bg-[var(--surface)]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface)]" /></div></div>)}</div>;
}

export function LandingLiveProof() {
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-[var(--muted)]">
      <span className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 py-3"><Music2 className="mx-auto mb-1.5 text-[var(--royal)]" size={16} />Discover</span>
      <span className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 py-3"><Users className="mx-auto mb-1.5 text-[var(--royal)]" size={16} />Connect</span>
      <span className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 py-3"><Radio className="mx-auto mb-1.5 text-[var(--royal)]" size={16} />Release</span>
    </div>
  );
}
