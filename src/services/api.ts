const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
export const AUTH_UNAUTHORIZED_EVENT = "xspann-auth-unauthorized";

export type ApiOptions = RequestInit & { token?: string | null };

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
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
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    const fallbackMessage =
      response.status === 413
        ? "Upload is larger than the active server request limit. Please try again; local video uploads are sent in chunks, but the API may need a restart."
        : `API request failed: ${response.status}`;

    throw new ApiError(payload?.message ?? fallbackMessage, response.status, payload?.errors ?? {});
  }

  return payload as T;
}
