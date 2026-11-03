"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { getPolicies, resendVerificationEmail } from "@/services/auth";
import type { PolicyCatalog } from "@/types/api";
import { cx } from "@/lib/format";
import {
  acceptedPolicyVersions,
  allRequiredPoliciesAccepted,
  meetsMinimumAge,
  safeInternalPath,
} from "@/lib/account-safety";
import { GoogleSignIn } from "./google-sign-in";
import { rememberArtistSetupChoice, shouldOfferArtistSetup } from "@/lib/onboarding";

type FieldErrors = Record<string, string[]>;

export function AuthCard({ mode, googleClientId }: { mode: "login" | "register"; googleClientId: string }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const auth = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
    date_of_birth: "",
  });
  const [policies, setPolicies] = useState<PolicyCatalog | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [flow, setFlow] = useState<"credentials" | "onboarding" | "verification">("credentials");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = isRegister ? "Create your account" : "Welcome back";
  const helper = isRegister
    ? "Start posting vertical moments on XPN social."
    : "Sign in to continue your creator flow.";
  const submitLabel = isRegister ? "Register" : "Login";

  const firstError = useMemo(() => Object.values(errors).flat()[0], [errors]);

  useEffect(() => {
    if (!isRegister && flow !== "onboarding") return;
    void getPolicies().then((response) => setPolicies(response.data)).catch(() => setMessage("Could not load the current policies. Please try again."));
  }, [flow, isRegister]);

  const acceptedPolicies = useMemo(
    () => acceptedPolicyVersions(policies?.policies ?? {}, accepted),
    [accepted, policies],
  );

  const redirectAfterSignIn = useCallback((forceWelcome = false) => {
    const nextPath = new URLSearchParams(window.location.search).get("next");
    if (nextPath) {
      router.replace(safeInternalPath(nextPath));
      return;
    }
    router.replace(forceWelcome || shouldOfferArtistSetup() ? "/welcome" : "/feed");
  }, [router]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setSubmitting(true);
    setErrors({});
    setMessage("");
    setGoogleError("");

    try {
      const result = await auth.loginWithGoogle(credential);
      if (result === "onboarding_required") setFlow("onboarding");
      else if (result === "verification_required") setFlow("verification");
      else redirectAfterSignIn();
    } catch (error) {
      if (error instanceof ApiError) {
        setGoogleError(Object.values(error.errors).flat()[0] ?? error.message);
      } else {
        setGoogleError("Google sign-in failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [auth, redirectAfterSignIn]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage("");
    setGoogleError("");

    try {
      if (isRegister) {
        const requiredAccepted = allRequiredPoliciesAccepted(policies?.policies ?? {}, accepted);
        if (!policies || !meetsMinimumAge(values.date_of_birth, policies.minimum_age)) {
          setErrors({ date_of_birth: [`You must be at least ${policies?.minimum_age ?? 18} years old.`] });
          setMessage("Enter a valid date of birth.");
          return;
        }
        if (!policies || !requiredAccepted) {
          setMessage("Please accept the current required policies.");
          return;
        }
        const result = await auth.register({ ...values, accepted_policies: acceptedPolicies });
        rememberArtistSetupChoice();
        if (result === "verification_required") setFlow("verification");
        else if (result === "onboarding_required") setFlow("onboarding");
        else redirectAfterSignIn(true);
      } else {
        const result = await auth.login({ email: values.email, password: values.password });
        if (result === "onboarding_required") {
          setFlow("onboarding");
          return;
        }
        if (result === "verification_required") {
          setFlow("verification");
          return;
        }
        redirectAfterSignIn();
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        setMessage(error.message);
      } else {
        setMessage("Authentication failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const requiredAccepted = allRequiredPoliciesAccepted(policies?.policies ?? {}, accepted);
      if (!policies || !meetsMinimumAge(values.date_of_birth, policies.minimum_age)) {
        throw new Error(`You must be at least ${policies?.minimum_age ?? 18} years old.`);
      }
      if (!policies || !requiredAccepted) throw new Error("Please accept the current required policies.");
      await auth.completeOnboarding(values.date_of_birth, acceptedPolicies);
      rememberArtistSetupChoice();
      redirectAfterSignIn(true);
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : "Could not complete onboarding.");
    } finally { setSubmitting(false); }
  }

  function updateField(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  return (
    <main
      className={cx(
        "grid min-h-dvh place-items-center bg-[var(--background)] px-5 py-10",
        isDark ? "text-white" : "text-zinc-950",
      )}
    >
      <section className="glass-panel w-full max-w-md rounded-2xl p-7 shadow-[0_18px_60px_-38px_rgba(67,31,142,0.45)] sm:p-9">
        <div className="mb-7">
          <Logo />
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">{flow === "onboarding" ? "Finish setting up your account" : flow === "verification" ? "Check your email" : title}</h1>
        <p
          className={cx(
            "mb-6 text-sm",
            isDark ? "text-violet-100/62" : "text-zinc-600",
          )}
        >
          {flow === "onboarding" ? "Confirm your age and accept the current community policies." : flow === "verification" ? `We sent a verification link to ${values.email}. Verify it before signing in.` : helper}
        </p>
        {flow === "verification" ? (
          <div className="space-y-3">
            <button type="button" className="primary-button w-full" onClick={() => void resendVerificationEmail(values.email).then((response) => setMessage(response.data.message)).catch((error) => setMessage(error instanceof Error ? error.message : "Could not resend the email."))}>Resend verification email</button>
            <Link href="/login" className="block text-center text-sm font-bold text-[var(--royal)]">Back to sign in</Link>
            {message && <p role="status" className="text-center text-sm text-[var(--muted)]">{message}</p>}
          </div>
        ) : flow === "onboarding" ? (
          <form className="space-y-4" onSubmit={handleOnboarding}>
            <DateOfBirthPicker
              value={values.date_of_birth}
              onChange={(value) => updateField("date_of_birth", value)}
              minimumAge={policies?.minimum_age ?? 18}
              error={errors.date_of_birth?.[0]}
              isDark={isDark}
            />
            <PolicyAcceptance policies={policies} accepted={accepted} setAccepted={setAccepted} />
            {message && <p className="rounded-md bg-pink-500/10 px-3 py-2 text-sm text-pink-300">{message}</p>}
            <button disabled={submitting || !policies} className="primary-button w-full">{submitting ? "Saving…" : "Complete setup"}</button>
          </form>
        ) : <>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <Input
              isDark={isDark}
              label="Username"
              name="username"
              placeholder="aziz.builder"
              value={values.username}
              error={errors.username?.[0]}
              onChange={(event) => updateField("username", event.target.value)}
              required
            />
          )}
          {isRegister && (
            <DateOfBirthPicker
              value={values.date_of_birth}
              onChange={(value) => updateField("date_of_birth", value)}
              minimumAge={policies?.minimum_age ?? 18}
              error={errors.date_of_birth?.[0]}
              isDark={isDark}
            />
          )}
          <Input
            isDark={isDark}
            label="Email"
            name="email"
            placeholder="you@example.com"
            type="email"
            value={values.email}
            error={errors.email?.[0]}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
          <Input
            isDark={isDark}
            label="Password"
            name="password"
            placeholder="Password"
            type="password"
            value={values.password}
            error={errors.password?.[0]}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
          {!isRegister && (
            <div className="-mt-2 text-right">
              <Link
                href="/forgot-password"
                className={cx(
                  "text-xs font-bold",
                  isDark ? "text-violet-300" : "text-violet-700",
                )}
              >
                Forgot password?
              </Link>
            </div>
          )}
          {isRegister && (
            <>
              <Input
                isDark={isDark}
                label="Confirm password"
                name="password_confirmation"
                placeholder="Confirm password"
                type="password"
                value={values.password_confirmation}
                error={errors.password_confirmation?.[0]}
                onChange={(event) =>
                  updateField("password_confirmation", event.target.value)
                }
                required
              />
              <PolicyAcceptance policies={policies} accepted={accepted} setAccepted={setAccepted} />
            </>
          )}
          {(message || firstError) && (
            <p
              className={cx(
                "rounded-md border px-3 py-2 text-sm font-medium",
                isDark
                  ? "border-pink-400/25 bg-pink-500/10 text-pink-100"
                  : "border-pink-200 bg-pink-50 text-pink-700",
              )}
            >
              {firstError ?? message}
            </p>
          )}
          <button
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7545e8] font-bold text-white  transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {submitting && <LoaderCircle size={18} className="animate-spin" />}
            {submitting ? "Please wait" : submitLabel}
          </button>
        </form>
        {googleClientId && (
          <>
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[var(--line)]" />
              <span className={cx("text-xs font-medium", isDark ? "text-violet-100/50" : "text-zinc-500")}>or</span>
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
            <GoogleSignIn clientId={googleClientId} isDark={isDark} onCredential={handleGoogleCredential} />
            {googleError && (
              <p role="alert" className={cx("mt-3 text-center text-sm", isDark ? "text-pink-200" : "text-pink-700")}>
                {googleError}
              </p>
            )}
          </>
        )}
        <p
          className={cx(
            "mt-5 text-center text-sm",
            isDark ? "text-violet-100/62" : "text-zinc-600",
          )}
        >
          {isRegister ? "Already have an account?" : "New to XPN social?"}{" "}
          <Link
            className={cx(
              "font-bold",
              isDark ? "text-violet-300" : "text-violet-700",
            )}
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Login" : "Register"}
          </Link>
        </p>
        </>}
      </section>
    </main>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function DateOfBirthPicker({ value, onChange, minimumAge, error, isDark }: {
  value: string;
  onChange: (value: string) => void;
  minimumAge: number;
  error?: string;
  isDark: boolean;
}) {
  const initial = value.split("-");
  const [year, setYear] = useState(initial[0] ?? "");
  const [month, setMonth] = useState(initial[1] ?? "");
  const [day, setDay] = useState(initial[2] ?? "");
  const latestYear = new Date().getFullYear() - minimumAge;
  const years = Array.from(
    { length: Math.max(1, 121 - minimumAge) },
    (_, index) => latestYear - index,
  );
  const daysInMonth = year && month
    ? new Date(Number(year), Number(month), 0).getDate()
    : 31;
  const fieldClass = cx(
    "h-11 w-full rounded-lg border px-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15",
    isDark
      ? "border-violet-200/10 bg-white/[0.06] text-white"
      : "border-violet-200/60 bg-white text-zinc-950",
  );

  function commit(nextYear: string, nextMonth: string, nextDay: string) {
    onChange(nextYear && nextMonth && nextDay ? `${nextYear}-${nextMonth}-${nextDay}` : "");
  }

  function changeMonth(nextMonth: string) {
    const maximumDay = year && nextMonth
      ? new Date(Number(year), Number(nextMonth), 0).getDate()
      : 31;
    const nextDay = Number(day) > maximumDay ? "" : day;
    setMonth(nextMonth);
    setDay(nextDay);
    commit(year, nextMonth, nextDay);
  }

  function changeYear(nextYear: string) {
    const maximumDay = nextYear && month
      ? new Date(Number(nextYear), Number(month), 0).getDate()
      : 31;
    const nextDay = Number(day) > maximumDay ? "" : day;
    setYear(nextYear);
    setDay(nextDay);
    commit(nextYear, month, nextDay);
  }

  return (
    <fieldset>
      <legend className={cx("flex items-center gap-2 text-sm font-semibold", isDark ? "text-violet-100/78" : "text-zinc-700")}>
        <CalendarDays size={16} aria-hidden="true" /> Date of birth
      </legend>
      <p className="mt-1 text-xs text-[var(--muted)]">You must be {minimumAge} or older.</p>
      <div className="mt-2 grid grid-cols-[1.35fr_.75fr_1fr] gap-2">
        <label>
          <span className="sr-only">Birth month</span>
          <select required aria-label="Birth month" value={month} onChange={(event) => changeMonth(event.target.value)} className={fieldClass}>
            <option value="">Month</option>
            {MONTHS.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Birth day</span>
          <select required aria-label="Birth day" value={day} onChange={(event) => { const nextDay = event.target.value; setDay(nextDay); commit(year, month, nextDay); }} className={fieldClass}>
            <option value="">Day</option>
            {Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => <option key={value} value={value}>{Number(value)}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Birth year</span>
          <select required aria-label="Birth year" value={year} onChange={(event) => changeYear(event.target.value)} className={fieldClass}>
            <option value="">Year</option>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {error && <span role="alert" className={cx("mt-1.5 block text-xs font-medium", isDark ? "text-pink-200" : "text-pink-700")}>{error}</span>}
    </fieldset>
  );
}

function PolicyAcceptance({ policies, accepted, setAccepted }: {
  policies: PolicyCatalog | null;
  accepted: Record<string, boolean>;
  setAccepted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--line)] p-3">
      {!policies && <p className="text-xs text-[var(--muted)]">Loading current policies…</p>}
      {Object.entries(policies?.policies ?? {}).map(([name, policy]) => (
        <label key={name} className="flex items-start gap-2 text-xs leading-5">
          <input type="checkbox" className="mt-1 accent-violet-600" checked={Boolean(accepted[name])} onChange={(event) => setAccepted((current) => ({ ...current, [name]: event.target.checked }))} />
          <span>I accept the <a href={policy.url} target="_blank" rel="noreferrer" className="font-bold text-[var(--royal)]">{name.replaceAll("_", " ")}</a> policy ({policy.version}){policy.required ? " *" : ""}</span>
        </label>
      ))}
    </div>
  );
}

function Input({
  label,
  error,
  isDark,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  isDark: boolean;
}) {
  return (
    <label
      className={cx(
        "block text-sm font-semibold",
        isDark ? "text-violet-100/78" : "text-zinc-700",
      )}
    >
      <span className="mb-2 block">{label}</span>
      <input
        {...props}
        className={cx(
          "h-11 w-full rounded-lg border px-3 outline-none focus:border-violet-500",
          isDark
            ? "border-violet-200/10 bg-white/[0.06] text-white placeholder:text-violet-100/35"
            : "border-violet-200/60 bg-white text-zinc-950 placeholder:text-zinc-400",
        )}
      />
      {error && (
        <span
          className={cx(
            "mt-1.5 block text-xs font-medium",
            isDark ? "text-pink-200" : "text-pink-700",
          )}
        >
          {error}
        </span>
      )}
    </label>
  );
}
