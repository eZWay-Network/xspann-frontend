"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { cx } from "@/lib/format";

export function UserAvatar({
  src,
  alt = "",
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const explicitSize = className ? undefined : { width: size, height: size };
  const avatarClassName = cx(
    "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface)] text-[var(--muted)]",
    className,
  );

  if (src && src !== failedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={explicitSize}
        onError={() => setFailedSrc(src)}
        className={cx(avatarClassName, "object-cover")}
      />
    );
  }

  return (
    <div style={explicitSize} className={avatarClassName} aria-hidden={alt ? undefined : true} aria-label={alt || undefined}>
      {name?.trim()
        ? <span className="font-semibold" style={{ fontSize: Math.round(size * 0.34) }}>{name.trim().split(/\s+/u).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase()}</span>
        : <UserRound size={Math.max(16, Math.round(size * 0.52))} strokeWidth={2.2} />}
    </div>
  );
}
