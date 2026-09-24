"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeStorageKey = "xspann-theme";
const themeChangeEvent = "xspann-theme-change";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (isThemeMode(storedTheme)) return storedTheme;

  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "dark" || documentTheme === "light") return documentTheme;

  return "dark";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    function syncTheme() {
      const nextTheme = readStoredTheme();
      document.documentElement.dataset.theme = nextTheme;
      setThemeState(nextTheme);
    }

    syncTheme();

    window.addEventListener("storage", syncTheme);
    window.addEventListener(themeChangeEvent, syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(themeChangeEvent, syncTheme);
    };
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    setThemeState(nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
  }), [setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}
