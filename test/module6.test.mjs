import test from "node:test";
import assert from "node:assert/strict";
import { boostActionMessage, boostSubmitStorageKey, promotionEventStorageKey, promotionStartFromLocal } from "../src/lib/promotions.ts";

test("campaign starts are future UTC whole-second instants within 90 days", () => {
  const now = new Date("2026-11-05T00:00:00Z");
  const instant = promotionStartFromLocal("2026-11-06T12:30", now);
  assert.match(instant, /^2026-11-06T\d{2}:30:00Z$/);
  assert.throws(() => promotionStartFromLocal("2026-11-04T12:30", now), /future/);
  assert.throws(() => promotionStartFromLocal("2027-03-01T12:30", now), /90 days/);
});

test("campaign submission identity is scoped to owner, campaign, and version", () => {
  assert.equal(boostSubmitStorageKey(4, 9, 2), "xpn-boost-submit:4:9:2");
  assert.notEqual(boostSubmitStorageKey(4, 9, 2), boostSubmitStorageKey(4, 9, 3));
});

test("promotion telemetry storage keys do not expose signed event tokens", () => {
  const token = "signed-sensitive-placement-token";
  const key = promotionEventStorageKey(token, "render");
  assert.equal(key.includes(token), false);
  assert.notEqual(key, promotionEventStorageKey(token, "click"));
});

test("campaign conflicts and booking closure have distinct recovery messages", () => {
  assert.match(boostActionMessage({ status: 409 }), /credit|inventory/i);
  assert.match(boostActionMessage({ status: 503 }), /closed/i);
});
