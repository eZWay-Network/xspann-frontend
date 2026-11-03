"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/common/theme-provider";

const logos = {
  light: {
    src: "/images/xpn-logo.png",
    width: 2066,
    height: 761,
  },
  dark: {
    src: "/images/xpn-logo-white.png",
    width: 1774,
    height: 887,
  },
};

export function Logo({ href = "/feed" }: { href?: string }) {
  const { theme } = useTheme();
  const logo = logos[theme];

  return (
    <Link
      href={href}
      className="inline-flex items-center"
      aria-label="XPN social home"
    >
      <Image
        src={logo.src}
        alt="XPN social"
        width={logo.width}
        height={logo.height}
        priority
        sizes="170px"
        className="h-12 w-auto max-w-[170px] bg-transparent object-contain"
      />
    </Link>
  );
}
