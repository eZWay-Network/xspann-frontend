import assert from "node:assert/strict";
import test from "node:test";
import { checkoutAttemptMatches, checkoutReconciliationState } from "../src/lib/billing.ts";
import { isStaleRightsError, scheduleInstantFromLocal } from "../src/lib/releases.ts";

test("checkout completion remains locked while access reconciliation is pending", () => {
  assert.equal(checkoutReconciliationState({ reference: "a", status: "pending" }), "pending");
  assert.equal(checkoutReconciliationState({ reference: "a", status: "completed", access_pending: true }), "reconciling");
  assert.equal(checkoutReconciliationState({ reference: "a", status: "completed", access_pending: false }), "verified");
  assert.equal(checkoutReconciliationState({ reference: "a", status: "expired" }), "terminal");
});

test("saved checkout identity can only replay the exact offer input", () => {
  const attempt = { planCode: "artist_pro", offerVersion: "2026-10-29" };
  assert.equal(checkoutAttemptMatches(attempt, "artist_pro", "2026-10-29"), true);
  assert.equal(checkoutAttemptMatches(attempt, "artist_starter", "2026-10-29"), false);
  assert.equal(checkoutAttemptMatches(attempt, "artist_pro", "2026-11-01"), false);
});

test("release schedules preserve the wall clock, whole seconds, offset, and IANA zone", () => {
  const value = scheduleInstantFromLocal("2026-11-05T18:30", "Asia/Dhaka", new Date("2026-11-05T00:00:00Z"));
  assert.equal(value, "2026-11-05T18:30:00+06:00");
  assert.equal(new Date(value).toISOString(), "2026-11-05T12:30:00.000Z");
});

test("release schedules reject past and nonexistent daylight-saving times", () => {
  assert.throws(() => scheduleInstantFromLocal("2026-11-05T18:30", "Asia/Dhaka", new Date("2026-11-06T00:00:00Z")), /future/);
  assert.throws(() => scheduleInstantFromLocal("2027-03-14T02:30", "America/New_York", new Date("2027-01-01T00:00:00Z")), /does not exist/);
});

test("stale rights responses are recognized without treating all validation errors alike", () => {
  assert.equal(isStaleRightsError({ message: "The rights version is stale." }), true);
  assert.equal(isStaleRightsError({ errors: { rights_confirmed: ["Confirm the current declaration."] } }), true);
  assert.equal(isStaleRightsError({ message: "The publication time is invalid." }), false);
});
