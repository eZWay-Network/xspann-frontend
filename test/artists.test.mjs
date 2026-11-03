import assert from "node:assert/strict";
import test from "node:test";
import { moveOrderedItem, normalizeArtistSlug } from "../src/lib/artists.ts";

test("normalizes artist slugs to the API contract", () => {
  assert.equal(normalizeArtistSlug("  Maya & The Lights  "), "maya-the-lights");
  assert.equal(normalizeArtistSlug("Already--Clean"), "already-clean");
  assert.equal(normalizeArtistSlug("---"), "");
});

test("reorders playlist items without mutating the source", () => {
  const source = [11, 22, 33];
  assert.deepEqual(moveOrderedItem(source, 1, -1), [22, 11, 33]);
  assert.deepEqual(moveOrderedItem(source, 1, 1), [11, 33, 22]);
  assert.deepEqual(moveOrderedItem(source, 0, -1), source);
  assert.deepEqual(source, [11, 22, 33]);
});
