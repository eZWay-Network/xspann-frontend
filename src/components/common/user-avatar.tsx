"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { cx } from "@/lib/format";

export function UserAvatar({
  src,
  alt = "",
  size = 40,
  className,
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarClassName = cx(
    "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface)] text-[var(--muted)]",
    className,
  );

  if (src && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        onError={() => setImageFailed(true)}
        className={cx(avatarClassName, "object-cover")}
      />
    );
  }

  return (
    <div className={avatarClassName} aria-hidden={alt ? undefined : true} aria-label={alt || undefined}>
      <UserRound size={Math.max(16, Math.round(size * 0.52))} strokeWidth={2.2} />
    </div>
  );
}
