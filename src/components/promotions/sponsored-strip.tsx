"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Flag, Play } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ReportTargetForm } from "@/components/common/report-target-form";
import { getPromotionEventId } from "@/lib/promotions";
import { ApiError } from "@/services/api";
import { getPromotedPlacements, recordPromotionEvent } from "@/services/promotions";
import type { PromotionPlacement } from "@/types/api";

export function SponsoredStrip() {
  const { token, user } = useAuth();
  const placements = useQuery({ queryKey: ["promoted-placements", user?.id ?? "guest"], queryFn: () => getPromotedPlacements(token), staleTime: 30_000, refetchOnWindowFocus: true });
  const active = placements.data?.data ?? [];
  if (!active.length) return null;
  return <section className="my-7" aria-labelledby="sponsored-title"><div className="mb-3"><p id="sponsored-title" className="text-sm font-semibold">Promoted videos</p><p className="mt-0.5 text-xs text-[var(--muted)]">Paid placements shown separately from organic discovery. Placement events are informational, not verified views.</p></div><div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">{active.map((placement) => <SponsoredCard key={`${placement.boost_id}-${placement.event_token}`} placement={placement} token={token} />)}</div></section>;
}

function SponsoredCard({ placement, token }: { placement: PromotionPlacement; token?: string | null }) {
  const cardRef = useRef<HTMLElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [reporting, setReporting] = useState(false);
  useEffect(() => {
    const target = cardRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
      observer.disconnect();
      void recordPromotionEvent(placement.event_token, "render", getPromotionEventId(placement.event_token, "render"), token).catch((caught) => {
        if (caught instanceof ApiError && caught.status === 410) setUnavailable(true);
      });
    }, { threshold: 0.35 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [placement.event_token, token]);
  if (unavailable) return null;
  function recordClick() {
    void recordPromotionEvent(placement.event_token, "click", getPromotionEventId(placement.event_token, "click"), token).catch((caught) => {
      if (caught instanceof ApiError && caught.status === 410) setUnavailable(true);
    });
  }
  return <article ref={cardRef} className="w-48 shrink-0"><Link href={`/video/${placement.video.id}`} onClick={recordClick} className="group block"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">{placement.video.thumbnail_url && <Image src={placement.video.thumbnail_url} alt="" fill sizes="192px" className="object-cover transition group-hover:scale-[1.02]" />}<span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold uppercase text-white">{placement.disclosure}</span><span className="absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Play size={14} fill="currentColor" /></span></div><p className="mt-2 flex items-center gap-1 truncate text-sm font-semibold">{placement.sponsor.name}<BadgeCheck size={13} className="text-[var(--royal)]" /></p><p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{placement.video.caption}</p></Link>{token && <button type="button" onClick={() => setReporting((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]"><Flag size={12} /> Report sponsored placement</button>}{reporting && token && <div className="mt-2 w-80 max-w-[80vw]"><ReportTargetForm target={{ boost_id: placement.boost_id }} token={token} onClose={() => setReporting(false)} /></div>}</article>;
}
