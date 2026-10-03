"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (element: HTMLElement, options: {
        theme: "outline" | "outline_dark";
        size: "large";
        text: "continue_with";
        shape: "rectangular";
        width: number;
      }) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export function GoogleSignIn({
  clientId,
  isDark,
  onCredential,
}: {
  clientId: string;
  isDark: boolean;
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!scriptReady || !container || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });

    let lastWidth = 0;
    const render = () => {
      const width = Math.min(Math.floor(container.clientWidth), 400);
      if (!width || width === lastWidth) return;
      lastWidth = width;
      container.replaceChildren();
      window.google?.accounts.id.renderButton(container, {
        theme: isDark ? "outline_dark" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width,
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [clientId, isDark, onCredential, scriptReady]);

  return (
    <div className="mt-5">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptError(true)}
      />
      <div ref={containerRef} className="min-h-10 w-full" aria-label="Continue with Google" />
      {scriptError && (
        <p role="alert" className="mt-2 text-center text-xs text-rose-500">
          Google sign-in is unavailable right now. Please use email instead.
        </p>
      )}
    </div>
  );
}
