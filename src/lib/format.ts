export function compactNumber(value: number): string {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function shortRelativeTime(value: string | null | undefined): string {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;

  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (secondsAgo < 60) return "now";

  const units = [
    { maxSeconds: 60 * 60, seconds: 60, label: "min" },
    { maxSeconds: 60 * 60 * 24, seconds: 60 * 60, label: "hr" },
    { maxSeconds: 60 * 60 * 24 * 7, seconds: 60 * 60 * 24, label: "d" },
    { maxSeconds: 60 * 60 * 24 * 30, seconds: 60 * 60 * 24 * 7, label: "w" },
    { maxSeconds: 60 * 60 * 24 * 365, seconds: 60 * 60 * 24 * 30, label: "mo" },
  ];

  const unit = units.find(({ maxSeconds }) => secondsAgo < maxSeconds);
  if (unit) return `${Math.floor(secondsAgo / unit.seconds)}${unit.label} ago`;

  return `${Math.floor(secondsAgo / (60 * 60 * 24 * 365))}yr ago`;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
