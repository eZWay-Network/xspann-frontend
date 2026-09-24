"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LoaderCircle, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { compactNumber, cx } from "@/lib/format";
import { followUser } from "@/services/follows";
import { getSuggestedUsers } from "@/services/users";
import type { UserSummary } from "@/types/api";

const demoCover =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85";

export function FollowingCreators() {
  const { authenticated, loading: authLoading, token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [creators, setCreators] = useState<UserSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);

  useEffect(() => {
    let active = true;

    if (authLoading) return undefined;

    void getSuggestedUsers(24, token)
      .then((response) => {
        if (active) setCreators(response.data);
      })
      .catch(() => {
        if (active) setCreators([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [authLoading, token]);

  const loading = authLoading || !loaded;

  async function followCreator(creator: UserSummary) {
    if (!authenticated || !token || followingIds.includes(creator.id)) return;

    setFollowingIds((ids) => [...ids, creator.id]);

    try {
      await followUser(creator.id, token);
    } catch {
      setFollowingIds((ids) => ids.filter((id) => id !== creator.id));
    }
  }

  return (
    <section className="h-full overflow-y-auto px-4 pb-24 pt-6">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className={cx("text-2xl font-black", isDark ? "text-white" : "text-zinc-950")}>Following</h1>
            <p className={cx("mt-1 text-sm font-semibold", isDark ? "text-violet-100/52" : "text-zinc-500")}>Discover creators and build your feed.</p>
          </div>
          <Link href="/feed?tab=following" className={cx("hidden rounded-md px-4 py-2 text-sm font-bold ring-1 transition sm:inline-flex", isDark ? "bg-white/10 text-white ring-white/10 hover:bg-white/15" : "bg-white text-zinc-950 ring-zinc-200 shadow-sm hover:bg-zinc-50")}>
            Following feed
          </Link>
        </div>

        {loading && (
          <div className={cx("grid h-72 place-items-center text-sm font-bold", isDark ? "text-violet-100/60" : "text-zinc-500")}>
            <div className="inline-flex items-center gap-2">
              <LoaderCircle className="animate-spin" size={18} /> Loading creators
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {creators.map((creator) => {
              const followed = followingIds.includes(creator.id);

              return (
                <article key={creator.id} className="group relative isolate aspect-[3/4] overflow-hidden rounded-lg bg-violet-950/70 shadow-lg ring-1 ring-violet-200/10">
                  <Link
                    href={`/profile/${creator.username}`}
                    className="absolute inset-0 z-10"
                    aria-label={`Open ${creator.username} profile`}
                  />
                  {creator.cover_url ? (
                    <Image src={creator.cover_url} alt="" fill sizes="(max-width: 768px) 50vw, 252px" className="object-cover transition duration-300 group-hover:scale-105" />
                  ) : creator.cover_video_url ? (
                    <video src={`${creator.cover_video_url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <Image src={demoCover} alt="" fill sizes="(max-width: 768px) 50vw, 252px" className="object-cover transition duration-300 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.12)_38%,rgba(0,0,0,0.78))]" />
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex flex-col items-center text-center">
                    <UserAvatar src={creator.avatar} size={56} className="mb-3 h-14 w-14 ring-2 ring-white/70" />
                    <p className="max-w-full truncate text-lg font-black text-white">
                      {creator.name || creator.username}
                    </p>
                    <div className="mt-0.5 flex max-w-full items-center justify-center gap-1 text-sm font-semibold text-white/86">
                      <span className="truncate">@{creator.username}</span>
                      {creator.verified && <Check size={14} className="shrink-0 rounded-full bg-sky-500 p-0.5 text-white" />}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-white/65">{compactNumber(creator.followers_count ?? 0)} followers</p>
                    <button
                      type="button"
                      onClick={() => void followCreator(creator)}
                      disabled={!authenticated || followed}
                      className="pointer-events-auto mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-4 text-sm font-black text-white shadow-[0_0_22px_rgba(139,92,246,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/18 disabled:text-white/70 disabled:shadow-none"
                    >
                      {followed ? (
                        <>
                          <Check size={17} /> Following
                        </>
                      ) : (
                        <>
                          <UserRoundPlus size={17} /> {authenticated ? "Follow" : "Log in to follow"}
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !creators.length && (
          <div className={cx("rounded-lg border px-5 py-12 text-center text-sm font-bold", isDark ? "border-violet-200/10 bg-white/[0.04] text-violet-100/60" : "border-zinc-200 bg-white text-zinc-500 shadow-sm")}>
            No creator suggestions right now.
          </div>
        )}
      </div>
    </section>
  );
}
