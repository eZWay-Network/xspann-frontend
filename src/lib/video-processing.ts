export type OwnedVideoProcessingState = {
  status: "processing" | "published" | "failed" | "deleted";
  processing_state?: "processing" | "ready" | "failed";
  publication_state?: "draft" | "scheduled" | "published";
};

export type VideoProcessingOutcome = "pending" | "published" | "draft-ready" | "failed";

export function videoProcessingOutcome(
  video: OwnedVideoProcessingState,
  intent: "immediate" | "draft",
): VideoProcessingOutcome {
  if (video.status === "failed" || video.processing_state === "failed") return "failed";

  const ready = video.processing_state === "ready" || video.status === "published";
  if (!ready) return "pending";

  if (intent === "draft") return "draft-ready";
  return video.publication_state === "published" || video.status === "published" ? "published" : "pending";
}
