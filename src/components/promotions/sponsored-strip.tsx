"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Play } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { getPromotedPlacements, recordPromotionEvent } from "@/services/promotions";

export function SponsoredStrip() {
  const { token, user } = useAuth();
  const placements = useQuery({ queryKey: ["promoted-placements", user?.id ?? "guest"], queryFn: () => getPromotedPlacements(token), staleTime: 30_000 });
  const eventIds = useRef(new Map<string, string>());
  useEffect(() => {
    for (const placement of placements.data?.data ?? []) {
      const key = `render:${placement.event_token}`;
      if (eventIds.current.has(key)) continue;
      const id = crypto.randomUUID(); eventIds.current.set(key, id);
      void recordPromotionEvent(placement.event_token, "render", id, token).catch(() => undefined);
    }
  }, [placements.data, token]);
  if (!placements.data?.data.length) return null;
  function recordClick(eventToken: string) { const key = `click:${eventToken}`; const id = eventIds.current.get(key) ?? crypto.randomUUID(); eventIds.current.set(key, id); void recordPromotionEvent(eventToken, "click", id, token).catch(() => undefined); }
  return <section className="my-7" aria-labelledby="sponsored-title"><div className="mb-3 flex items-center justify-between"><div><p id="sponsored-title" className="text-sm font-semibold">Promoted videos</p><p className="mt-0.5 text-xs text-[var(--muted)]">Paid placements shown separately from organic discovery.</p></div></div><div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">{placements.data.data.map((placement) => <Link key={placement.boost_id} href={`/video/${placement.video.id}`} onClick={() => recordClick(placement.event_token)} className="group w-48 shrink-0"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">{placement.video.thumbnail_url && <Image src={placement.video.thumbnail_url} alt="" fill sizes="192px" className="object-cover transition group-hover:scale-[1.02]" />}<span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold uppercase text-white">{placement.disclosure}</span><span className="absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Play size={14} fill="currentColor" /></span></div><p className="mt-2 flex items-center gap-1 truncate text-sm font-semibold">{placement.sponsor.name}<BadgeCheck size={13} className="text-[var(--royal)]" /></p><p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{placement.video.caption}</p></Link>)}</div></section>;
}
