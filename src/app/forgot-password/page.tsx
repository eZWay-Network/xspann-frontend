"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { forgotPassword } from "@/services/auth";
import { cx } from "@/lib/format";

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await forgotPassword({ email });
      setMessage(response.data.message);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not send reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={cx("grid min-h-screen place-items-center px-4 py-10", isDark ? "text-white" : "text-zinc-950")}>
      <section className="glass-panel w-full max-w-md rounded-xl p-6">
        <div className="mb-7">
          <Logo />
        </div>
        <h1 className="mb-2 text-2xl font-black">Reset your password</h1>
        <p className={cx("mb-6 text-sm", isDark ? "text-violet-100/62" : "text-zinc-600")}>
          Enter your email and we&apos;ll send a reset link if the account exists.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className={cx("block text-sm font-semibold", isDark ? "text-violet-100/78" : "text-zinc-700")}>
            <span className="mb-2 block">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className={cx(
                "h-11 w-full rounded-lg border px-3 outline-none focus:border-violet-500",
                isDark
                  ? "border-violet-200/10 bg-white/[0.06] text-white placeholder:text-violet-100/35"
                  : "border-violet-200/60 bg-white text-zinc-950 placeholder:text-zinc-400",
              )}
            />
          </label>
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
            Send reset link
          </button>
        </form>
        <p className={cx("mt-5 text-center text-sm", isDark ? "text-violet-100/62" : "text-zinc-600")}>
          Remembered it?{" "}
          <Link className={cx("font-bold", isDark ? "text-violet-300" : "text-violet-700")} href="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
