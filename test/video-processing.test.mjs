import assert from "node:assert/strict";
import test from "node:test";
import { videoProcessingOutcome } from "../src/lib/video-processing.ts";

test("keeps immediate uploads processing until publication is confirmed", () => {
  assert.equal(videoProcessingOutcome({ status: "processing", processing_state: "processing", publication_state: "draft" }, "immediate"), "pending");
  assert.equal(videoProcessingOutcome({ status: "processing", processing_state: "ready", publication_state: "draft" }, "immediate"), "pending");
  assert.equal(videoProcessingOutcome({ status: "published", processing_state: "ready", publication_state: "published" }, "immediate"), "published");
});

test("treats a ready private draft separately from a published video", () => {
  assert.equal(videoProcessingOutcome({ status: "processing", processing_state: "ready", publication_state: "draft" }, "draft"), "draft-ready");
});

test("surfaces either processing failure field as terminal", () => {
  assert.equal(videoProcessingOutcome({ status: "failed", processing_state: "processing" }, "immediate"), "failed");
  assert.equal(videoProcessingOutcome({ status: "processing", processing_state: "failed" }, "draft"), "failed");
});
