export type PolicyDescriptor = {
  version: string;
  required: boolean;
};

export function acceptedPolicyVersions(
  policies: Record<string, PolicyDescriptor>,
  accepted: Record<string, boolean>,
) {
  return Object.fromEntries(
    Object.entries(policies)
      .filter(([name]) => accepted[name])
      .map(([name, policy]) => [name, policy.version]),
  );
}

export function allRequiredPoliciesAccepted(
  policies: Record<string, PolicyDescriptor>,
  accepted: Record<string, boolean>,
) {
  return Object.entries(policies).every(
    ([name, policy]) => !policy.required || accepted[name],
  );
}

export function safeInternalPath(path: string | null, fallback = "/feed") {
  return path?.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export function isRecoveryPath(pathname: string) {
  return ["/settings/privacy", "/settings/billing"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function exportNeedsPolling(status: string) {
  return status === "pending" || status === "processing";
}

export function meetsMinimumAge(
  dateOfBirth: string,
  minimumAge: number,
  today = new Date(),
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (
    birthDate.getFullYear() !== year
    || birthDate.getMonth() !== month - 1
    || birthDate.getDate() !== day
  ) {
    return false;
  }

  const latestEligibleDate = new Date(
    today.getFullYear() - minimumAge,
    today.getMonth(),
    today.getDate(),
  );

  return birthDate <= latestEligibleDate;
}
