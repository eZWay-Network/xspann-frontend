import assert from "node:assert/strict";
import test from "node:test";
import { buildArtistProfilePayload, buildUtcDailySeries, moveOrderedItem, normalizeArtistSlug, sameOrderedIds } from "../src/lib/artists.ts";

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

test("artist updates require identity but omit unchanged optional values", () => {
  const artist = {
    bio: "Original bio",
    location: "Dhaka",
    listed: true,
    genres: [{ id: 4 }],
    image: "artists/original.webp",
    featured_video_id: 99,
  };
  const draft = {
    stage_name: "  Maya  ",
    slug: "maya",
    bio: "Original bio",
    location: "Dhaka",
    listed: true,
    genre_ids: [4],
    image: "artists/original.webp",
    featured_video_id: 99,
  };

  assert.deepEqual(buildArtistProfilePayload(artist, draft, true), {
    stage_name: "Maya",
    slug: "maya",
  });
  assert.deepEqual(buildArtistProfilePayload(artist, { ...draft, bio: "", genre_ids: [7, 4] }, true), {
    stage_name: "Maya",
    slug: "maya",
    bio: null,
    genre_ids: [7, 4],
  });
});

test("downgraded profile edits preserve a saved featured release", () => {
  const payload = buildArtistProfilePayload({
    bio: null,
    location: null,
    listed: true,
    genres: [],
    featured_video_id: 41,
  }, {
    stage_name: "Maya",
    slug: "maya",
    bio: "New bio",
    location: "",
    listed: true,
    genre_ids: [],
    image: null,
    featured_video_id: 41,
  }, false);

  assert.equal("featured_video_id" in payload, false);
  assert.equal(payload.bio, "New bio");
});

test("analytics preserves missing UTC days as empty points", () => {
  const series = buildUtcDailySeries([
    { date: "2026-11-01", views: 8 },
    { date: "2026-11-03", views: 13 },
  ], "2026-11-01T10:00:00Z", new Date("2026-11-04T23:00:00Z"), 30);

  assert.deepEqual(series.map((day) => [day.date, day.point?.views ?? null]), [
    ["2026-11-01", 8],
    ["2026-11-02", null],
    ["2026-11-03", 13],
    ["2026-11-04", null],
  ]);
});

test("playlist order comparison is position-sensitive", () => {
  assert.equal(sameOrderedIds([1, 2, 3], [1, 2, 3]), true);
  assert.equal(sameOrderedIds([1, 2, 3], [2, 1, 3]), false);
  assert.equal(sameOrderedIds([1, 2], [1, 2, 3]), false);
});
