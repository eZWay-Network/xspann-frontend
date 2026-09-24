"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { resetPassword } from "@/services/auth";
import { cx } from "@/lib/format";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [values, setValues] = useState(() => {
    const params = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

    return {
      email: params.get("email") ?? "",
      token: params.get("token") ?? "",
      password: "",
      password_confirmation: "",
    };
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await resetPassword(values);
      setMessage(response.data.message);
      window.setTimeout(() => router.replace("/login"), 900);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className={cx("grid min-h-screen place-items-center px-4 py-10", isDark ? "text-white" : "text-zinc-950")}>
      <section className="glass-panel w-full max-w-md rounded-xl p-6">
        <div className="mb-7">
          <Logo />
        </div>
        <h1 className="mb-2 text-2xl font-black">Choose a new password</h1>
        <p className={cx("mb-6 text-sm", isDark ? "text-violet-100/62" : "text-zinc-600")}>
          Paste your reset token if it was not filled automatically.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {(["email", "token", "password", "password_confirmation"] as const).map((name) => (
            <label key={name} className={cx("block text-sm font-semibold", isDark ? "text-violet-100/78" : "text-zinc-700")}>
              <span className="mb-2 block">
                {name === "password_confirmation" ? "Confirm password" : name === "token" ? "Reset token" : name[0].toUpperCase() + name.slice(1)}
              </span>
              <input
                value={values[name]}
                onChange={(event) => updateField(name, event.target.value)}
                type={name.includes("password") ? "password" : name === "email" ? "email" : "text"}
                required
                className={cx(
                  "h-11 w-full rounded-lg border px-3 outline-none focus:border-violet-500",
                  isDark
                    ? "border-violet-200/10 bg-white/[0.06] text-white placeholder:text-violet-100/35"
                    : "border-violet-200/60 bg-white text-zinc-950 placeholder:text-zinc-400",
                )}
              />
            </label>
          ))}
          {(message || error) && (
            <p className={cx("rounded-md border px-3 py-2 text-sm font-medium", error ? "border-pink-200 bg-pink-50 text-pink-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
              {error || message}
            </p>
          )}
          <button
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] font-bold text-white shadow-[0_0_32px_rgba(139,92,246,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {submitting && <LoaderCircle size={18} className="animate-spin" />}
            Reset password
          </button>
        </form>
        <p className={cx("mt-5 text-center text-sm", isDark ? "text-violet-100/62" : "text-zinc-600")}>
          Back to{" "}
          <Link className={cx("font-bold", isDark ? "text-violet-300" : "text-violet-700")} href="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
