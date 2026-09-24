import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const stripExtensionHydrationAttributes = `
(() => {
  const shouldRemove = (name) => name.startsWith("bis_") || name.startsWith("__processed_");
  const cleanElement = (element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (shouldRemove(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  };
  const cleanTree = (root) => {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    cleanElement(root);
    root.querySelectorAll("*").forEach(cleanElement);
  };

  cleanTree(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && shouldRemove(mutation.attributeName || "")) {
        cleanElement(mutation.target);
      }
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(cleanTree);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  window.addEventListener("load", () => observer.disconnect(), { once: true });
})();
`;

const suppressExtensionRuntimeErrors = `
(() => {
  const extensionProtocols = ["chrome-extension://", "moz-extension://", "safari-web-extension://"];
  const knownExtensionMessages = [
    "Cannot read properties of undefined (reading 'M_ID')",
  ];

  const stringify = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return [value.message, value.stack].filter(Boolean).join("\\n");

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const isFromExtension = (value) => {
    const text = stringify(value);
    return extensionProtocols.some((protocol) => text.includes(protocol));
  };

  const isKnownExtensionMessage = (value) => {
    const text = stringify(value);
    return knownExtensionMessages.some((message) => text.includes(message));
  };

  window.addEventListener("error", (event) => {
    if (isFromExtension(event.filename) || isFromExtension(event.error) || isKnownExtensionMessage(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (isFromExtension(event.reason) || isKnownExtensionMessage(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
`;

const restoreTheme = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem("xspann-theme");
    const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: "XSpann RNB",
  description: "XSpann RNB short-video platform UI mockup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="restore-theme" strategy="beforeInteractive">
          {restoreTheme}
        </Script>
        <Script id="suppress-extension-runtime-errors" strategy="beforeInteractive">
          {suppressExtensionRuntimeErrors}
        </Script>
        <Script id="strip-extension-hydration-attributes" strategy="beforeInteractive">
          {stripExtensionHydrationAttributes}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
