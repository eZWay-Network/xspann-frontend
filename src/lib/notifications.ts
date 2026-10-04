import type { Notification } from "@/types/api";

export type ActivityCategory = "likes" | "comments" | "mentions" | "followers" | "other";

export type ActivityItem = {
  notification: Notification;
  unreadIds: number[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}

function positiveId(...values: unknown[]): number | null {
  const value = values.find((candidate) =>
    (typeof candidate === "number" || typeof candidate === "string") &&
    Number.isSafeInteger(Number(candidate)) && Number(candidate) > 0,
  );
  return value === undefined ? null : Number(value);
}

function identifier(...values: unknown[]): string | null {
  const value = values.find((candidate) =>
    (typeof candidate === "string" && candidate.trim().length > 0) ||
    (typeof candidate === "number" && Number.isSafeInteger(candidate)),
  );
  return value == null ? null : String(value).trim().toLowerCase();
}

export function categoryOf(notification: Notification): ActivityCategory {
  const data = record(notification.data);
  const type = [notification.type, data.type, data.action, data.event]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (/mention|tag/.test(type)) return "mentions";
  if (/follow/.test(type)) return "followers";
  if (/like|react|heart/.test(type)) return "likes";
  if (/comment|repl(y|ied)/.test(type)) return "comments";
  return "other";
}

export function notificationDetails(notification: Notification) {
  const data = record(notification.data);
  const actor = record(data.actor ?? data.user ?? data.sender ?? data.from_user ?? data.notifier ?? data.follower ?? data.liker ?? data.commenter);
  const video = record(data.video);
  const comment = record(data.comment);
  const category = categoryOf(notification);
  const username = text(actor.username, data.actor_username, data.username, data.from_username, data.follower_username);
  const name = text(actor.name, actor.username, data.actor_name, data.user_name, username);
  const avatar = text(actor.avatar, actor.avatar_url, data.actor_avatar, data.avatar_url);
  const thumbnail = text(
    video.thumbnail_url, video.thumbnail, video.cover_url,
    data.video_thumbnail_url, data.video_thumbnail, data.video_thumb_url,
    data.thumbnail_url, data.thumbnail, data.video_cover_url,
  );
  const videoId = positiveId(data.video_id, video.id, comment.video_id);
  const commentId = positiveId(data.comment_id, comment.id);
  const parentId = positiveId(data.parent_id, data.parent_comment_id, comment.parent_id);
  const commentBody = text(
    comment.body, comment.content, comment.text, data.comment_body,
    data.comment_text, data.comment_content, data.comment_excerpt,
    data.comment_preview, data.comment, data.body,
  );
  const message = text(data.message, data.title, data.text);
  const fallback = notification.type.split("\\").pop()?.replace(/Notification$/, "").replace(/([a-z])([A-Z])/g, "$1 $2") || "Activity";
  const action = category === "likes" ? (/comment/.test(notification.type.toLowerCase()) ? "liked your comment" : "liked your video") :
    category === "comments" ? (/repl(y|ied)/.test(notification.type.toLowerCase()) ? "replied to your comment" : "commented on your video") :
    category === "mentions" ? "mentioned or tagged you" :
    category === "followers" ? "started following you" : fallback;
  const title = message && commentBody && message.includes(commentBody) && name
    ? `${name} ${action}`
    : message ?? (name ? `${name} ${action}` : (category === "other" ? fallback : `Someone ${action}`));
  const detail = commentBody && !title.includes(commentBody) && (category === "comments" || category === "likes") ? commentBody : null;
  const href = videoId ? `/video/${videoId}` : username ? `/profile/${encodeURIComponent(username)}` : null;

  return { avatar, category, commentBody, commentId, detail, href, parentId, thumbnail, title, videoId };
}

function repeatedEventKey(notification: Notification): string | null {
  const data = record(notification.data);
  const actor = record(data.actor ?? data.user ?? data.sender ?? data.from_user ?? data.notifier ?? data.follower ?? data.liker ?? data.commenter);
  const video = record(data.video);
  const comment = record(data.comment);
  const actorId = identifier(data.actor_id, data.follower_id, data.liker_id, data.commenter_id, actor.id);
  const actorName = identifier(data.actor_username, data.follower_username, data.from_username, actor.username);
  const actorKey = actorId ? `id:${actorId}` : actorName ? `username:${actorName}` : null;
  const message = identifier(data.message);
  const avatar = identifier(actor.avatar, actor.avatar_url, data.actor_avatar, data.avatar_url);
  const videoId = identifier(data.video_id, video.id, comment.video_id);
  const commentId = identifier(data.comment_id, comment.id);

  switch (categoryOf(notification)) {
    case "followers":
      return actorKey ? `follow:${actorKey}` : message && avatar ? `follow:message:${message}:avatar:${avatar}` : null;
    case "likes":
      return actorKey && (commentId || videoId)
        ? `like:${actorKey}:${commentId ? `comment:${commentId}` : `video:${videoId}`}`
        : null;
    case "comments":
      return commentId ? `comment:${commentId}` : null;
    case "mentions":
      return actorKey && (commentId || videoId)
        ? `mention:${actorKey}:${commentId ? `comment:${commentId}` : `video:${videoId}`}`
        : null;
    default:
      return null;
  }
}

export function collapseNotifications(notifications: Notification[]): ActivityItem[] {
  const groups = new Map<string, ActivityItem>();
  const seenIds = new Set<number>();
  const newestFirst = [...notifications].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const notification of newestFirst) {
    if (seenIds.has(notification.id)) continue;
    seenIds.add(notification.id);

    const key = repeatedEventKey(notification) ?? `notification:${notification.id}`;
    const group = groups.get(key);
    if (group) {
      if (!notification.read_at) group.unreadIds.push(notification.id);
    } else {
      groups.set(key, {
        notification,
        unreadIds: notification.read_at ? [] : [notification.id],
      });
    }
  }

  return [...groups.values()];
}
