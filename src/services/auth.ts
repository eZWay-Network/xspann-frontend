import type { AuthResponse, Profile, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

const TOKEN_KEY = "xspann_vertical_token";
const TOKEN_EXPIRES_AT_KEY = "xspann_vertical_token_expires_at";

type LoginPayload = {
  email: string;
  password: string;
  device_name?: string;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  name?: string;
  avatar?: string;
  bio?: string;
  device_name?: string;
};

type ForgotPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
};

type ChangePasswordPayload = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function storeTokenExpiresAt(expiresAt: string | null): void {
  if (!expiresAt) {
    window.localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
}

export function getStoredTokenExpiresAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
}

export function storedTokenIsExpired(): boolean {
  const expiresAt = getStoredTokenExpiresAt();
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ device_name: "nextjs-web", ...payload }),
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ device_name: "nextjs-web", ...payload }),
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<SingleResponse<Profile>>("/auth/me", { token });
}

export function updateProfile(payload: Partial<Pick<Profile, "username" | "name" | "avatar" | "bio">>, token: string) {
  return apiRequest<SingleResponse<Profile>>("/auth/profile", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function logout(token: string) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/logout", { method: "POST", token });
}

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: ChangePasswordPayload, token: string) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/password", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function resendVerificationEmail(token: string) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/email/verification-notification", {
    method: "POST",
    token,
  });
}

export function refreshToken(token: string) {
  return apiRequest<AuthResponse>("/auth/token/refresh", {
    method: "POST",
    token,
  });
}
