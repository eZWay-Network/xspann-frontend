const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function offsetAt(instant: Date, timeZone: string) {
  const parts = partsInTimeZone(instant, timeZone);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - instant.getTime();
}

export function scheduleInstantFromLocal(
  localValue: string,
  timeZone: string,
  now = new Date(),
) {
  const match = localDateTimePattern.exec(localValue);
  if (!match) throw new Error("Choose a valid publication date and time.");
  const [, year, month, day, hour, minute] = match;
  const wallClockUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  let instant = new Date(wallClockUtc);
  instant = new Date(wallClockUtc - offsetAt(instant, timeZone));
  instant = new Date(wallClockUtc - offsetAt(instant, timeZone));

  const roundTrip = partsInTimeZone(instant, timeZone);
  if ([year, month, day, hour, minute].join("-") !== [roundTrip.year, roundTrip.month, roundTrip.day, roundTrip.hour, roundTrip.minute].join("-")) {
    throw new Error("That local time does not exist in the selected time zone. Choose another time.");
  }
  if (instant.getTime() <= now.getTime()) throw new Error("Choose a publication time in the future.");

  const offsetMinutes = Math.round(offsetAt(instant, timeZone) / 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00${sign}${offsetHours}:${offsetRemainder}`;
}

export function formatReleaseInstant(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function isStaleRightsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: string; errors?: Record<string, string[]> };
  const text = [candidate.message, ...Object.entries(candidate.errors ?? {}).flatMap(([key, values]) => [key, ...values])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return text.includes("rights") && (text.includes("version") || text.includes("confirm") || text.includes("stale"));
}
