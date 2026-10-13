import { cx } from "@/lib/format";

export function XpnLoader({
  label = "Loading...",
  compact = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cx("xpn-loader", compact && "xpn-loader--compact", className)}>
      <span className="xpn-loader__mark" aria-hidden="true">
        <span>X</span><span>P</span><span>N</span>
      </span>
      <span className="xpn-loader__track" aria-hidden="true" />
      <span className="xpn-loader__label" aria-hidden="true">{label}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
