"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { cx } from "@/lib/format";

type FieldErrors = Record<string, string[]>;

export function AuthCard({ mode }: { mode: "login" | "register" }) {
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
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = isRegister ? "Create your account" : "Welcome back";
  const helper = isRegister
    ? "Start posting vertical moments on XSpann RNB."
    : "Sign in to continue your creator flow.";
  const submitLabel = isRegister ? "Register" : "Login";

  const firstError = useMemo(() => Object.values(errors).flat()[0], [errors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage("");

    try {
      if (isRegister) {
        await auth.register(values);
      } else {
        await auth.login({ email: values.email, password: values.password });
      }

      const nextPath = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;

      router.replace(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/feed");
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
        "grid min-h-screen place-items-center px-4 py-10",
        isDark ? "text-white" : "text-zinc-950",
      )}
    >
      <section className="glass-panel w-full max-w-md rounded-xl p-6">
        <div className="mb-7">
          <Logo />
        </div>
        <h1 className="mb-2 text-2xl font-black">{title}</h1>
        <p
          className={cx(
            "mb-6 text-sm",
            isDark ? "text-violet-100/62" : "text-zinc-600",
          )}
        >
          {helper}
        </p>
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] font-bold text-white shadow-[0_0_32px_rgba(139,92,246,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {submitting && <LoaderCircle size={18} className="animate-spin" />}
            {submitting ? "Please wait" : submitLabel}
          </button>
        </form>
        <p
          className={cx(
            "mt-5 text-center text-sm",
            isDark ? "text-violet-100/62" : "text-zinc-600",
          )}
        >
          {isRegister ? "Already have an account?" : "New to XSpann RNB?"}{" "}
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
      </section>
    </main>
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
