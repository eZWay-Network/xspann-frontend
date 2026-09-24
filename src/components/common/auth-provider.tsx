"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "@/types/api";
import { AUTH_UNAUTHORIZED_EVENT, ApiError } from "@/services/api";
import {
  clearStoredToken,
  getCurrentUser,
  getStoredTokenExpiresAt,
  getStoredToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  refreshToken as refreshTokenRequest,
  storeToken,
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
};

type AuthContextValue = {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((nextToken: string, nextUser: Profile, expiresAt: string | null) => {
    storeToken(nextToken);
    storeTokenExpiresAt(expiresAt);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = getStoredToken();

    if (!activeToken || storedTokenIsExpired()) {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      if (storedTokenNeedsRefresh()) {
        const response = await refreshTokenRequest(activeToken);
        setSession(response.data.token, response.data.user, response.data.token_expires_at);
        return;
      }

      const response = await getCurrentUser(activeToken);
      setToken(activeToken);
      setUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearSession, setSession]);

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
        if (storedTokenNeedsRefresh()) {
          const response = await refreshTokenRequest(storedToken);
          if (!active) return;
          setSession(response.data.token, response.data.user, response.data.token_expires_at);
          return;
        }

        const response = await getCurrentUser(storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(response.data);
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
    function handleUnauthorized() {
      clearSession();
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [clearSession]);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const response = await loginRequest(credentials);
    setSession(response.data.token, response.data.user, response.data.token_expires_at);
  }, [setSession]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const response = await registerRequest(credentials);
    setSession(response.data.token, response.data.user, response.data.token_expires_at);
  }, [setSession]);

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
    login,
    register,
    logout,
    refreshUser,
  }), [loading, login, logout, refreshUser, register, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
