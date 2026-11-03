"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/types/api";
import { AUTH_UNAUTHORIZED_EVENT, ApiError } from "@/services/api";
import {
  clearStoredToken,
  AUTH_STORAGE_KEYS,
  getCurrentUser,
  getStoredTokenExpiresAt,
  getStoredToken,
  getStoredSessionUser,
  login as loginRequest,
  loginWithGoogle as loginWithGoogleRequest,
  logout as logoutRequest,
  register as registerRequest,
  refreshToken as refreshTokenRequest,
  completeOnboarding as completeOnboardingRequest,
  storeToken,
  storeSessionUser,
  storedTokenIsExpired,
  storeTokenExpiresAt,
} from "@/services/auth";

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = AuthCredentials & {
  username: string;
  password_confirmation: string;
  date_of_birth: string;
  accepted_policies: Record<string, string>;
};

type AuthResult = "authenticated" | "verification_required" | "onboarding_required";

type AuthContextValue = {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
  pendingOnboardingToken: string | null;
  login: (credentials: AuthCredentials) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  register: (credentials: RegisterCredentials) => Promise<AuthResult>;
  completeOnboarding: (dateOfBirth: string, acceptedPolicies: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

function storedTokenNeedsRefresh() {
  const expiresAt = getStoredTokenExpiresAt();
  return Boolean(expiresAt && new Date(expiresAt).getTime() - Date.now() <= TOKEN_REFRESH_WINDOW_MS);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOnboardingToken, setPendingOnboardingToken] = useState<string | null>(null);

  const setSession = useCallback((nextToken: string, nextUser: Profile, expiresAt: string | null) => {
    const previousUser = getStoredSessionUser();
    if (previousUser && previousUser.id !== nextUser.id) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    storeToken(nextToken);
    storeTokenExpiresAt(expiresAt);
    storeSessionUser(nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, [queryClient]);

  const clearSession = useCallback(() => {
    clearStoredToken();
    void queryClient.cancelQueries();
    queryClient.clear();
    setToken(null);
    setUser(null);
  }, [queryClient]);

  const installAuthResponse = useCallback((response: Awaited<ReturnType<typeof loginRequest>>): AuthResult => {
    if (response.data.onboarding_required && response.data.onboarding_token) {
      setPendingOnboardingToken(response.data.onboarding_token);
      return "onboarding_required";
    }
    if (!response.data.token || !response.data.user) return "verification_required";
    setPendingOnboardingToken(null);
    setSession(response.data.token, { ...response.data.user, restricted_access: Boolean(response.data.restricted_access) }, response.data.token_expires_at);
    return "authenticated";
  }, [setSession]);

  const refreshUser = useCallback(async () => {
    const activeToken = getStoredToken();

    if (!activeToken || storedTokenIsExpired()) {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      const storedUser = getStoredSessionUser();
      if (storedUser?.restricted_access) {
        if (user && user.id !== storedUser.id) {
          void queryClient.cancelQueries();
          queryClient.clear();
        }
        setToken(activeToken);
        setUser(storedUser);
        return;
      }
      if (storedTokenNeedsRefresh()) {
        const response = await refreshTokenRequest(activeToken);
        if (response.data.token && response.data.user) setSession(response.data.token, response.data.user, response.data.token_expires_at);
        return;
      }

      const response = await getCurrentUser(activeToken);
      if (user && user.id !== response.data.id) {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      setToken(activeToken);
      setUser(response.data);
      storeSessionUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearSession, queryClient, setSession, user]);

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(async () => {
      const storedToken = getStoredToken();

      if (!active) return;

      if (!storedToken || storedTokenIsExpired()) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const storedUser = getStoredSessionUser();
        if (storedUser?.restricted_access) {
          setToken(storedToken);
          setUser(storedUser);
          return;
        }
        if (storedTokenNeedsRefresh()) {
          const response = await refreshTokenRequest(storedToken);
          if (!active) return;
          if (response.data.token && response.data.user) setSession(response.data.token, response.data.user, response.data.token_expires_at);
          return;
        }

        const response = await getCurrentUser(storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(response.data);
        storeSessionUser(response.data);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [clearSession, setSession]);

  useEffect(() => {
    function handleUnauthorized(event: Event) {
      const rejectedToken = (event as CustomEvent<{ token?: string }>).detail?.token;
      if (!rejectedToken || rejectedToken === getStoredToken()) clearSession();
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [clearSession]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      const authStorageKeys: string[] = Object.values(AUTH_STORAGE_KEYS);
      if (!event.key || !authStorageKeys.includes(event.key)) return;
      const storedToken = getStoredToken();
      if (!storedToken || storedTokenIsExpired()) {
        clearSession();
        return;
      }
      if (storedToken !== token || event.key === AUTH_STORAGE_KEYS.user) {
        void refreshUser().catch(() => undefined);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearSession, refreshUser, token]);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const response = await loginRequest(credentials);
    return installAuthResponse(response);
  }, [installAuthResponse]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await loginWithGoogleRequest(idToken);
    return installAuthResponse(response);
  }, [installAuthResponse]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const response = await registerRequest(credentials);
    return installAuthResponse(response);
  }, [installAuthResponse]);

  const completeOnboarding = useCallback(async (dateOfBirth: string, acceptedPolicies: Record<string, string>) => {
    if (!pendingOnboardingToken) throw new Error("Your onboarding session expired. Please sign in again.");
    const response = await completeOnboardingRequest({ onboarding_token: pendingOnboardingToken, date_of_birth: dateOfBirth, accepted_policies: acceptedPolicies });
    if (!response.data.token || !response.data.user) throw new Error("Onboarding could not create a session.");
    setSession(response.data.token, response.data.user, response.data.token_expires_at);
    setPendingOnboardingToken(null);
  }, [pendingOnboardingToken, setSession]);

  const logout = useCallback(async () => {
    const activeToken = token ?? getStoredToken();

    if (activeToken) {
      await logoutRequest(activeToken).catch(() => undefined);
    }

    clearSession();
  }, [clearSession, token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    authenticated: Boolean(user && token),
    pendingOnboardingToken,
    login,
    loginWithGoogle,
    register,
    completeOnboarding,
    logout,
    refreshUser,
  }), [completeOnboarding, loading, login, loginWithGoogle, logout, pendingOnboardingToken, refreshUser, register, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
