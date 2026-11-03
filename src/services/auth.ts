import type { AuthResponse, PolicyCatalog, Profile, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export const AUTH_STORAGE_KEYS = {
  token: "xspann_vertical_token",
  expiresAt: "xspann_vertical_token_expires_at",
  user: "xspann_vertical_session_user",
} as const;

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
  date_of_birth: string;
  accepted_policies: Record<string, string>;
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
  return window.localStorage.getItem(AUTH_STORAGE_KEYS.token);
}

export function storeToken(token: string): void {
  window.localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
}

export function storeSessionUser(user: Profile): void {
  window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
}

export function getStoredSessionUser(): Profile | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEYS.user) ?? "null") as Profile | null; } catch { return null; }
}

export function storeTokenExpiresAt(expiresAt: string | null): void {
  if (!expiresAt) {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.expiresAt);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEYS.expiresAt, expiresAt);
}

export function getStoredTokenExpiresAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE_KEYS.expiresAt);
}

export function storedTokenIsExpired(): boolean {
  const expiresAt = getStoredTokenExpiresAt();
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.expiresAt);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ device_name: "nextjs-web", ...payload }),
  });
}

export function loginWithGoogle(idToken: string) {
  return apiRequest<AuthResponse>("/auth/social/google", {
    method: "POST",
    body: JSON.stringify({ token: idToken }),
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

export function resendVerificationEmail(email: string) {
  return apiRequest<SingleResponse<{ message: string }>>("/auth/email/verification-notification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function refreshToken(token: string) {
  return apiRequest<AuthResponse>("/auth/token/refresh", {
    method: "POST",
    token,
  });
}

export function getPolicies() {
  return apiRequest<SingleResponse<PolicyCatalog>>("/policies");
}

export function completeOnboarding(payload: { onboarding_token: string; date_of_birth: string; accepted_policies: Record<string, string> }) {
  return apiRequest<AuthResponse>("/auth/onboarding", { method: "POST", body: JSON.stringify(payload) });
}
