import type { LocalVideoUploadResponse, SingleResponse, UploadFallbackResponse, UploadSignedResponse } from "@/types/api";
import { apiRequest } from "./api";

const videoChunkSize = 1024 * 1024;

export function requestVideoUpload(payload: { filename: string; content_type: string }, token: string) {
  return apiRequest<SingleResponse<UploadSignedResponse | UploadFallbackResponse>>("/uploads/videos/signed-url", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function uploadLocalVideo(file: File, token: string) {
  if (file.size > videoChunkSize) {
    return uploadLocalVideoInChunks(file, token);
  }

  const body = new FormData();
  body.append("file", file);

  return apiRequest<SingleResponse<LocalVideoUploadResponse>>("/uploads/videos/local", {
    method: "POST",
    token,
    body,
  });
}

async function uploadLocalVideoInChunks(file: File, token: string) {
  const uploadId = createUploadId();
  const totalChunks = Math.ceil(file.size / videoChunkSize);

  for (let index = 0; index < totalChunks; index++) {
    const start = index * videoChunkSize;
    const chunk = file.slice(start, Math.min(start + videoChunkSize, file.size));
    const body = new FormData();

    body.append("upload_id", uploadId);
    body.append("chunk_index", String(index));
    body.append("total_chunks", String(totalChunks));
    body.append("filename", file.name);
    body.append("content_type", file.type);
    body.append("total_size", String(file.size));
    body.append("chunk", chunk, `${file.name}.part${index}`);

    await apiRequest<SingleResponse<{ upload_method: "chunked"; upload_id: string; chunk_index: number; total_chunks: number }>>("/uploads/videos/chunk", {
      method: "POST",
      token,
      body,
    });
  }

  return apiRequest<SingleResponse<LocalVideoUploadResponse>>("/uploads/videos/complete", {
    method: "POST",
    token,
    body: JSON.stringify({
      upload_id: uploadId,
      total_chunks: totalChunks,
      filename: file.name,
      content_type: file.type,
      total_size: file.size,
    }),
  });
}

function createUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16) >> (Number(character) / 4)).toString(16),
  );
}

export function uploadLocalAudio(file: File, token: string) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<SingleResponse<{ upload_method: "multipart"; storage_path: string; audio_url: string }>>("/uploads/sounds/local", {
    method: "POST",
    token,
    body,
  });
}

export function uploadAvatar(file: File, token: string) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<SingleResponse<{ upload_method: "multipart"; storage_path: string; avatar_url: string }>>("/uploads/avatar", {
    method: "POST",
    token,
    body,
  });
}
