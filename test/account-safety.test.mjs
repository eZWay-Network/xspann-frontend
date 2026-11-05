import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptedPolicyVersions,
  allRequiredPoliciesAccepted,
  exportNeedsPolling,
  isRecoveryPath,
  meetsMinimumAge,
  safeInternalPath,
} from "../src/lib/account-safety.ts";

const policies = {
  terms: { version: "2026-10-29", required: true },
  privacy: { version: "2026-10-29", required: true },
  marketing: { version: "2026-10-29", required: false },
};

test("requires every mandatory policy and preserves optional consent", () => {
  assert.equal(allRequiredPoliciesAccepted(policies, { terms: true }), false);
  assert.equal(allRequiredPoliciesAccepted(policies, { terms: true, privacy: true }), true);
  assert.deepEqual(
    acceptedPolicyVersions(policies, { terms: true, privacy: true, marketing: false }),
    { terms: "2026-10-29", privacy: "2026-10-29" },
  );
});

test("allows only local post-login return paths", () => {
  assert.equal(safeInternalPath("/settings/privacy"), "/settings/privacy");
  assert.equal(safeInternalPath("//example.com/steal"), "/feed");
  assert.equal(safeInternalPath("https://example.com/steal"), "/feed");
});

test("keeps restricted sessions inside exact recovery routes", () => {
  assert.equal(isRecoveryPath("/settings/privacy"), true);
  assert.equal(isRecoveryPath("/settings/billing/invoices"), true);
  assert.equal(isRecoveryPath("/billing/return"), true);
  assert.equal(isRecoveryPath("/billing/cancel"), true);
  assert.equal(isRecoveryPath("/settings/privacy-impersonation"), false);
  assert.equal(isRecoveryPath("/feed"), false);
});

test("continues export polling while queued or processing", () => {
  assert.equal(exportNeedsPolling("pending"), true);
  assert.equal(exportNeedsPolling("processing"), true);
  assert.equal(exportNeedsPolling("ready"), false);
  assert.equal(exportNeedsPolling("failed"), false);
});

test("validates a real birth date against the configured minimum age", () => {
  const today = new Date(2026, 10, 3);
  assert.equal(meetsMinimumAge("2008-11-03", 18, today), true);
  assert.equal(meetsMinimumAge("2008-11-04", 18, today), false);
  assert.equal(meetsMinimumAge("2007-02-29", 18, today), false);
  assert.equal(meetsMinimumAge("not-a-date", 18, today), false);
});
