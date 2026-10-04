import assert from "node:assert/strict";
import test from "node:test";
import { categoryOf, collapseNotifications, notificationDetails } from "../src/lib/notifications.ts";

function notification(id, type, data, createdAt = "2026-10-04T10:00:00Z", readAt = null) {
  return { id, type, data, created_at: createdAt, read_at: readAt };
}

test("collapses repeated follows from one actor and retains every unread ID", () => {
  const rows = [
    notification(3, "UserFollowedNotification", { follower: { id: 7, username: "newaj" } }, "2026-10-04T10:03:00Z"),
    notification(2, "UserFollowedNotification", { follower: { id: 7, username: "newaj" } }, "2026-10-04T10:02:00Z"),
    notification(1, "UserFollowedNotification", { follower: { id: 8, username: "rahad" } }, "2026-10-04T10:01:00Z"),
  ];

  const items = collapseNotifications(rows);
  assert.equal(items.length, 2);
  assert.equal(items[0].notification.id, 3);
  assert.deepEqual(items[0].unreadIds, [3, 2]);
  assert.equal(items[1].notification.id, 1);
});

test("keeps a grouped follow unread when an older copy is still unread", () => {
  const rows = [
    notification(5, "UserFollowedNotification", { actor_id: 7 }, "2026-10-04T10:03:00Z", "2026-10-04T10:04:00Z"),
    notification(4, "UserFollowedNotification", { actor_id: 7 }, "2026-10-04T10:02:00Z"),
  ];

  assert.deepEqual(collapseNotifications(rows)[0].unreadIds, [4]);
});

test("removes repeated page IDs while preserving distinct targets and comments", () => {
  const rows = [
    notification(10, "VideoLikedNotification", { actor_id: 7, video_id: 1 }),
    notification(10, "VideoLikedNotification", { actor_id: 7, video_id: 1 }),
    notification(11, "VideoLikedNotification", { actor_id: 7, video_id: 1 }),
    notification(12, "VideoLikedNotification", { actor_id: 7, video_id: 2 }),
    notification(13, "VideoCommentedNotification", { actor_id: 7, comment_id: 8, video_id: 1 }),
    notification(14, "VideoCommentedNotification", { actor_id: 7, comment_id: 9, video_id: 1 }),
  ];

  const items = collapseNotifications(rows);
  assert.equal(items.length, 4);
  assert.deepEqual(items[0].unreadIds, [10, 11]);
  assert.deepEqual(items.slice(1).map((item) => item.notification.id), [12, 13, 14]);
});

test("keeps events with no reliable actor or target identity", () => {
  const rows = [
    notification(20, "UserFollowedNotification", { message: "Someone followed you" }),
    notification(21, "UserFollowedNotification", { message: "Someone followed you" }),
  ];

  assert.equal(collapseNotifications(rows).length, 2);
});

test("collapses repeated follow messages when the same avatar identifies the actor", () => {
  const rows = [
    notification(22, "FollowNotification", { message: "newaj started following you.", actor_avatar: "https://example.com/newaj.jpg" }),
    notification(23, "FollowNotification", { message: "newaj started following you.", actor_avatar: "https://example.com/newaj.jpg" }),
  ];

  assert.deepEqual(collapseNotifications(rows)[0].unreadIds, [22, 23]);
  assert.equal(collapseNotifications(rows).length, 1);
});

test("uses the event payload to classify generic notification types", () => {
  assert.equal(categoryOf(notification(30, "Notification", { type: "activity", action: "follow" })), "followers");
});

test("extracts the video thumbnail and comment from a flat comment payload", () => {
  const details = notificationDetails(notification(31, "VideoCommentedNotification", {
    message: "alex commented on your video",
    video_id: 42,
    video_thumbnail: "https://example.com/cover.jpg",
    comment_id: 9,
    comment: "This is great!",
  }));

  assert.equal(details.thumbnail, "https://example.com/cover.jpg");
  assert.equal(details.detail, "This is great!");
  assert.equal(details.videoId, 42);
  assert.equal(details.commentId, 9);
  assert.equal(details.href, "/video/42");
});

test("extracts nested comment text and video cover fields", () => {
  const details = notificationDetails(notification(32, "VideoCommentedNotification", {
    video: { id: 43, cover_url: "https://example.com/cover-43.jpg" },
    comment: { id: 10, content: "Nice video" },
  }));

  assert.equal(details.thumbnail, "https://example.com/cover-43.jpg");
  assert.equal(details.detail, "Nice video");
  assert.equal(details.commentId, 10);
});

test("identifies a reply for comment text lookup", () => {
  const details = notificationDetails(notification(34, "CommentRepliedNotification", {
    video_id: 43,
    comment_id: 10,
    parent_comment_id: 8,
  }));

  assert.equal(details.videoId, 43);
  assert.equal(details.commentId, 10);
  assert.equal(details.parentId, 8);
});

test("shows comment text once when the API message already includes it", () => {
  const details = notificationDetails(notification(33, "VideoCommentedNotification", {
    actor: { name: "Alex", username: "alex" },
    message: "Alex commented on your video: Nice video",
    comment_body: "Nice video",
  }));

  assert.equal(details.title, "Alex commented on your video");
  assert.equal(details.detail, "Nice video");
});
