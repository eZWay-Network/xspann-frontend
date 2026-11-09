import test from "node:test";
import assert from "node:assert/strict";
import { announcementSendStorageKey, displayedIncomingMessageId, mergeMessages, newestMessageId, ThreadHistory } from "../src/lib/messaging.ts";
import { RealtimeHintTracker, scheduleRealtimeExpiry, threadForHint } from "../src/lib/realtime.ts";
import { notificationDetails } from "../src/lib/notifications.ts";

const message = (id, sender = 1) => ({ id, conversation_id: 9, sender_user_id: sender, client_message_id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`, body: `message ${id}`, unavailable: false, created_at: "2026-11-05T00:00:00Z" });

test("message pages and replayed sends merge once in ascending order", () => {
  const merged = mergeMessages([message(3), message(2)], [message(2), message(4)]);
  assert.deepEqual(merged.map((item) => item.id), [2, 3, 4]);
  assert.equal(newestMessageId(merged), 4);
  assert.equal(displayedIncomingMessageId(merged, 1), 0);
  assert.equal(displayedIncomingMessageId([...merged, message(5, 2)], 1), 5);
});

test("announcement send identity is scoped to account, draft, and version", () => {
  assert.equal(announcementSendStorageKey(7, 12, 3), "xpn-announcement-send:7:12:3");
  assert.notEqual(announcementSendStorageKey(7, 12, 3), announcementSendStorageKey(8, 12, 3));
  assert.notEqual(announcementSendStorageKey(7, 12, 3), announcementSendStorageKey(7, 12, 4));
});

test("Relay hints deduplicate opaque events and retain independently actionable structural changes", () => {
  const tracker = new RealtimeHintTracker();
  assert.equal(tracker.accept("message.created", { event_id: "opaque-a", conversation_id: 4, version: 8 }), true);
  assert.equal(tracker.accept("message.created", { event_id: "opaque-a", conversation_id: 4, version: 8 }), false);
  assert.equal(tracker.accept("conversation.updated", { event_id: "opaque-b", resource_id: 4, version: 7 }), true);
  assert.equal(tracker.accept("conversation.updated", { event_id: "opaque-c", conversation_id: 4, version: 9 }), true);
});

test("a 30-day Relay session expires once at its login deadline", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  const lifetime = 30 * 24 * 60 * 60 * 1000;
  const maxDelay = 2_147_483_647;
  let expired = 0;
  scheduleRealtimeExpiry(lifetime, () => expired++);
  t.mock.timers.tick(maxDelay);
  assert.equal(expired, 0);
  t.mock.timers.tick(lifetime - maxDelay - 1);
  assert.equal(expired, 0);
  t.mock.timers.tick(1);
  assert.equal(expired, 1);
});

test("rotating the login token cancels the old Relay expiry", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  let expired = false;
  const cancel = scheduleRealtimeExpiry(500, () => { expired = true; });
  cancel();
  t.mock.timers.tick(500);
  assert.equal(expired, false);
});

test("announcement and paused-release activity open their distinct destinations", () => {
  const announcement = notificationDetails({ id: 1, type: "artist_announcement", data: { announcement_id: 22 }, read_at: null, created_at: "2026-11-05T00:00:00Z" });
  const release = notificationDetails({ id: 2, type: "release_paused", data: { release_id: 33 }, read_at: null, created_at: "2026-11-05T00:00:00Z" });
  assert.equal(announcement.href, "/announcements/22");
  assert.equal(release.href, "/studio?release=33");
});

test("both wire shapes preserve the message ID and route structural changes separately", () => {
  const messageHint = { event_id: "8142", type: "message.created", occurred_at: "2026-11-08T10:00:00Z",
    resource_id: 731, version: 12 };
  assert.equal(threadForHint("message.created", messageHint), null);
  assert.equal(threadForHint("message.created", { ...messageHint, conversation_id: 4 }), 4);
  assert.equal(threadForHint("conversation.updated", { resource_id: 731, version: 11 }), 731);
});

test("an acknowledged send cannot skip a gap, and snapshots replace redacted or removed rows", async () => {
  const history = new ThreadHistory();
  const page = (rows, more = false, nextBefore = null, nextAfter = null) => ({
    data: rows, meta: { has_more: more, next_before_id: nextBefore, next_after_id: nextAfter },
  });
  await history.sync(async () => page([message(2), message(1)]), true);
  history.acknowledge(message(1010));
  const requests = [];
  await history.sync(async ({ afterId }) => {
    requests.push(afterId);
    const last = Math.min(afterId + 50, 1010);
    return page(Array.from({ length: last - afterId }, (_, i) => message(afterId + i + 1)), last < 1010, null, last);
  }, false);
  assert.ok(requests.length > 20);
  assert.deepEqual(history.rows.map(m => m.id), Array.from({ length: 1010 }, (_, i) => i + 1));
  await history.sync(async () => page([{ ...message(1010), body: null, unavailable: true }, message(1)]), true);
  history.acknowledge(message(1010));
  assert.deepEqual(history.rows.map(m => m.id), [1, 1010]);
  assert.equal(history.rows[1].body, null);
  assert.equal(history.rows[1].unavailable, true);
});
