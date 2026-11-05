import test from "node:test";
import assert from "node:assert/strict";
import { announcementSendStorageKey, displayedIncomingMessageId, mergeMessages, newestMessageId } from "../src/lib/messaging.ts";
import { RealtimeHintTracker, scheduleRealtimeExpiry } from "../src/lib/realtime.ts";
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

test("Relay hints deduplicate opaque events and reject stale conversation versions", () => {
  const tracker = new RealtimeHintTracker();
  assert.equal(tracker.accept("message.created", { event_id: "opaque-a", conversation_id: 4, version: 8 }), true);
  assert.equal(tracker.accept("message.created", { event_id: "opaque-a", conversation_id: 4, version: 8 }), false);
  assert.equal(tracker.accept("conversation.updated", { event_id: "opaque-b", conversation_id: 4, version: 7 }), false);
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
