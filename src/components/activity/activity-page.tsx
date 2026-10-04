"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clapperboard, Heart, LoaderCircle, MessageCircle, RefreshCw, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { cx, shortRelativeTime } from "@/lib/format";
import { categoryOf, collapseNotifications, notificationDetails, type ActivityItem } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/services/api";
import { getCommentReplies, getComments } from "@/services/comments";
import { getNotifications, markAllNotificationsRead, markNotificationRead, NOTIFICATION_REFRESH_INTERVAL_MS } from "@/services/notifications";
import { getVideo } from "@/services/videos";

type Filter = "all" | "likes" | "comments" | "mentions" | "followers";

const filters: { label: string; value: Filter }[] = [
  { label: "All activity", value: "all" },
  { label: "Likes", value: "likes" },
  { label: "Comments", value: "comments" },
  { label: "Mentions and tags", value: "mentions" },
  { label: "Followers", value: "followers" },
];

export function ActivityPage() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState("");
  const [weekAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const notificationsQuery = useInfiniteQuery({
    queryKey: [...queryKeys.notifications(user?.id ?? 0), "pages"],
    queryFn: ({ pageParam }) => getNotifications(token!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
    enabled: Boolean(token && user),
    refetchInterval: NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
  const notifications = collapseNotifications(notificationsQuery.data?.pages.flatMap((page) => page.data) ?? []);
  const filtered = notifications.filter((item) => filter === "all" || categoryOf(item.notification) === filter);
  const newItems = filtered.filter((item) => item.unreadIds.length > 0);
  const thisWeek = filtered.filter((item) => item.unreadIds.length === 0 && new Date(item.notification.created_at).getTime() >= weekAgo);
  const earlier = filtered.filter((item) => item.unreadIds.length === 0 && new Date(item.notification.created_at).getTime() < weekAgo);

  async function refreshNotifications() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user!.id) });
  }

  async function openNotification(item: ActivityItem) {
    if (!token || pendingId !== null) return;
    const href = notificationDetails(item.notification).href;
    setActionError("");
    if (item.unreadIds.length > 0) {
      setPendingId(item.notification.id);
      try {
        await Promise.all(item.unreadIds.map((id) => markNotificationRead(id, token)));
        void refreshNotifications().catch(() => undefined);
      } catch (error) {
        setActionError(error instanceof ApiError ? error.message : "Could not mark this notification as read.");
        void refreshNotifications().catch(() => undefined);
        setPendingId(null);
        return;
      }
      setPendingId(null);
    }
    if (href) router.push(href);
  }

  async function markAllRead() {
    if (!token || markingAll) return;
    setActionError("");
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(token);
      await refreshNotifications();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Could not mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="modern-scrollbar h-full overflow-y-auto px-4 pb-24 pt-20 sm:px-8 md:pb-10">
      <div className="mx-auto max-w-[680px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--royal)]">Activity</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Notifications</h1>
          </div>
          <button type="button" onClick={() => void notificationsQuery.refetch()} disabled={notificationsQuery.isRefetching} className="icon-button" aria-label="Refresh activity" title="Refresh activity">
            <RefreshCw size={19} className={notificationsQuery.isRefetching ? "animate-spin" : undefined} />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter activity">
          {filters.map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cx("rounded-full px-4 py-2 text-sm font-semibold transition", filter === item.value ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]")}>
              {item.label}
            </button>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => void markAllRead()} disabled={markingAll} className="text-sm font-semibold text-[var(--royal)] hover:underline disabled:opacity-50">
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        )}

        {actionError && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{actionError}</p>}
        {notificationsQuery.isPending && <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-[var(--royal)]" aria-label="Loading activity" /></div>}
        {notificationsQuery.isError && <div role="alert" className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center"><p>Could not load your activity.</p><button type="button" onClick={() => void notificationsQuery.refetch()} className="mt-3 text-sm font-semibold text-[var(--royal)]">Try again</button></div>}
        {!notificationsQuery.isPending && !notificationsQuery.isError && notifications.length === 0 && (
          <div className="mt-9 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-6 py-14 text-center">
            <Bell className="mx-auto text-[var(--muted)]" size={30} />
            <h2 className="mt-4 text-lg font-semibold">No activity yet</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Likes, comments, mentions and follows will show up here.</p>
          </div>
        )}
        {!notificationsQuery.isPending && !notificationsQuery.isError && notifications.length > 0 && (
          <div className="mt-7 space-y-7">
            {filtered.length === 0 && <p className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-10 text-center text-sm text-[var(--muted)]">No {filters.find((item) => item.value === filter)?.label.toLowerCase()} in the loaded activity.</p>}
            <NotificationGroup title="New" items={newItems} pendingId={pendingId} onOpen={openNotification} isDark={isDark} />
            <NotificationGroup title="This week" items={thisWeek} pendingId={pendingId} onOpen={openNotification} isDark={isDark} />
            <NotificationGroup title="Earlier" items={earlier} pendingId={pendingId} onOpen={openNotification} isDark={isDark} />
          </div>
        )}
        {notificationsQuery.hasNextPage && !notificationsQuery.isError && (
          <button type="button" onClick={() => void notificationsQuery.fetchNextPage()} disabled={notificationsQuery.isFetchingNextPage} className="mx-auto mt-8 block rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-50">
            {notificationsQuery.isFetchingNextPage ? "Loading..." : "Load more activity"}
          </button>
        )}
      </div>
    </section>
  );
}

function NotificationGroup({ title, items, pendingId, onOpen, isDark }: {
  title: string;
  items: ActivityItem[];
  pendingId: number | null;
  onOpen: (item: ActivityItem) => Promise<void>;
  isDark: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-sm font-bold text-[var(--muted)]">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {items.map((item) => <NotificationRow key={item.notification.id} item={item} pendingId={pendingId} onOpen={onOpen} isDark={isDark} />)}
      </div>
    </section>
  );
}

function NotificationRow({ item, pendingId, onOpen, isDark }: {
  item: ActivityItem;
  pendingId: number | null;
  onOpen: (item: ActivityItem) => Promise<void>;
  isDark: boolean;
}) {
  const { token, user } = useAuth();
  const notification = item.notification;
  const unread = item.unreadIds.length > 0;
  const details = notificationDetails(notification);
  const isVideoActivity = details.category === "likes" || details.category === "comments";
  const videoQuery = useQuery({
    queryKey: ["activity-video", user?.id ?? 0, details.videoId],
    queryFn: () => getVideo(details.videoId!, token).then((response) => response.data),
    enabled: isVideoActivity && Boolean(details.videoId && !details.thumbnail),
    retry: false,
  });
  const commentsQuery = useQuery({
    queryKey: ["activity-video-comments", user?.id ?? 0, details.videoId],
    queryFn: () => getComments(details.videoId!, 100, token),
    enabled: details.category === "comments" && Boolean(details.videoId && details.commentId && !details.parentId && !details.commentBody),
    retry: false,
  });
  const repliesQuery = useQuery({
    queryKey: ["activity-comment-replies", user?.id ?? 0, details.parentId],
    queryFn: () => getCommentReplies(details.parentId!, 100, token),
    enabled: details.category === "comments" && Boolean(details.commentId && details.parentId && !details.commentBody),
    retry: false,
  });
  const commentText = details.detail
    ?? commentsQuery.data?.data.find((comment) => comment.id === details.commentId)?.body
    ?? repliesQuery.data?.data.find((comment) => comment.id === details.commentId)?.body
    ?? null;
  const thumbnail = details.thumbnail ?? videoQuery.data?.thumbnail_url ?? null;
  const showVideoPreview = Boolean(thumbnail || (isVideoActivity && details.videoId));
  const Icon = details.category === "likes" ? Heart : details.category === "comments" || details.category === "mentions" ? MessageCircle : details.category === "followers" ? UserRoundPlus : Bell;

  return (
    <button type="button" onClick={() => void onOpen(item)} disabled={pendingId === notification.id || Boolean(!unread && !details.href)} className={cx("flex w-full items-center gap-3 border-b border-[var(--line)] px-4 py-4 text-left transition last:border-b-0 enabled:hover:bg-[var(--surface)] sm:gap-4", unread && (isDark ? "bg-violet-500/[0.07]" : "bg-violet-50/70"))} aria-label={`${details.title}. ${unread ? "Unread" : "Read"}.${details.href ? " Open" : unread ? " Mark as read" : ""}`}>
      {details.avatar ? <UserAvatar src={details.avatar} size={48} className="h-12 w-12" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--royal)]"><Icon size={22} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5">{details.title}</span>
        {commentText && <span className="mt-1 block line-clamp-2 text-sm leading-5 text-[var(--muted)]">“{commentText}”</span>}
        <time dateTime={notification.created_at} className="mt-1 block text-xs text-[var(--muted)]">{shortRelativeTime(notification.created_at)}</time>
      </span>
      {showVideoPreview && (
        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--surface)] text-[var(--muted)] sm:h-16 sm:w-16" aria-hidden="true">
          <Clapperboard size={22} />
          {thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={thumbnail} src={thumbnail} alt="" onError={(event) => { event.currentTarget.hidden = true; }} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </span>
      )}
      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" aria-hidden="true" />}
      {pendingId === notification.id && <LoaderCircle size={16} className="shrink-0 animate-spin text-[var(--muted)]" />}
    </button>
  );
}
