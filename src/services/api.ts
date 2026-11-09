export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
export const AUTH_UNAUTHORIZED_EVENT = "xspann-auth-unauthorized";

export type ApiOptions = RequestInit & { token?: string | null };

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  retryAfterMs: number;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}, retryAfterMs = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfterMs = retryAfterMs;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: { token } }));
    }

    const fallbackMessage =
      response.status === 413
        ? "Upload is larger than the active server request limit. Please try again; local video uploads are sent in chunks, but the API may need a restart."
        : `API request failed: ${response.status}`;

    const retryAfterSeconds = Number(response.headers.get("Retry-After"));
    const retryAfterMs = Number.isFinite(retryAfterSeconds) ? Math.max(0, retryAfterSeconds) * 1000 : 0;
    throw new ApiError(payload?.message ?? fallbackMessage, response.status, payload?.errors ?? {}, retryAfterMs);
  }

  return (response.status === 204 ? undefined : payload) as T;
}

export async function apiDownload(path: string, token: string, signal?: AbortSignal) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
  const response = await fetch(url, {
    headers: { Accept: "application/octet-stream", Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.message ?? `Download failed: ${response.status}`, response.status, payload?.errors ?? {}, Math.max(0, Number(response.headers.get("Retry-After")) || 0) * 1000);
  }

  return response.blob();
}

export async function apiMediaBlob(path: string, token: string, signal?: AbortSignal) {
  const apiBase = new URL(API_URL);
  const target = /^https?:\/\//i.test(path)
    ? new URL(path)
    : path.startsWith("/api/")
      ? new URL(path, apiBase.origin)
      : new URL(`${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  const trustedApiOrigin = target.origin === apiBase.origin;
  const response = await fetch(target, {
    headers: {
      Accept: "video/*,audio/*,image/*,application/octet-stream",
      ...(trustedApiOrigin ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    redirect: "follow",
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.message ?? `Preview failed: ${response.status}`, response.status, payload?.errors ?? {}, Math.max(0, Number(response.headers.get("Retry-After")) || 0) * 1000);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 250 * 1024 * 1024) throw new ApiError("This private preview is too large to load in the browser.", 413);
  return response.blob();
}
