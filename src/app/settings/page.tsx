"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { ApiError } from "@/services/api";
import { changePassword, forgotPassword, resendVerificationEmail } from "@/services/auth";
import { cx } from "@/lib/format";
import { AtSign, ChevronRight, KeyRound, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <SettingsContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function SettingsContent() {
  const { theme } = useTheme();
  const { token, user, refreshUser } = useAuth();
  const isDark = theme === "dark";
  const [passwordDraft, setPasswordDraft] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [resetEmail, setResetEmail] = useState(user?.email ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"verify" | "forgot" | "password" | null>(null);

  const panelClass = isDark
    ? "border-violet-200/10 bg-[#151515]/92 text-white"
    : "border-zinc-200 bg-white text-zinc-950";
  const mutedClass = isDark ? "text-violet-100/55" : "text-zinc-500";
  const rowBorderClass = isDark ? "border-white/10" : "border-zinc-200";
  const inputClass = isDark
    ? "border-white/10 bg-white/10 text-white placeholder:text-white/35 focus:border-violet-300/55"
    : "border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 focus:border-violet-500";

  async function handleResendVerification() {
    if (!token) return;
    setStatus("");
    setError("");
    setSubmitting("verify");

    try {
      const response = await resendVerificationEmail(token);
      setStatus(response.data.message);
      await refreshUser().catch(() => undefined);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not send verification email.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    setSubmitting("forgot");

    try {
      const response = await forgotPassword({ email: resetEmail });
      setStatus(response.data.message);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not send reset link.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setStatus("");
    setError("");
    setSubmitting("password");

    try {
      const response = await changePassword(passwordDraft, token);
      setStatus(response.data.message);
      setPasswordDraft({ current_password: "", password: "", password_confirmation: "" });
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not change password.");
    } finally {
      setSubmitting(null);
    }
  }

  function updatePasswordField(name: keyof typeof passwordDraft, value: string) {
    setPasswordDraft((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className={cx("page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8", isDark ? "text-white" : "text-zinc-950")}>
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[356px_1fr]">
        <aside className={cx("rounded-lg border p-4", panelClass)}>
          <SettingsNavItem active icon={UserRound} label="Manage account" isDark={isDark} />
          <SettingsNavItem icon={ShieldCheck} label="Security" isDark={isDark} />
        </aside>

        <div className={cx("rounded-lg border px-6 py-7", panelClass)}>
          <h1 className="text-2xl font-semibold tracking-tight">Manage account</h1>

          <section className={cx("mt-7 border-b pb-6", rowBorderClass)}>
            <h2 className="mb-4 text-lg font-semibold">Account information</h2>
            <InfoRow label="Username" value={`@${user?.username ?? "unknown"}`} mutedClass={mutedClass} />
            <InfoRow label="Email" value={user?.email ?? "No email"} mutedClass={mutedClass} />
          </section>

          <section className={cx("border-b py-6", rowBorderClass)}>
            <h2 className="mb-4 text-lg font-semibold">Email verification</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{user?.email_verified_at ? "Verified email" : "Verify your email"}</p>
                <p className={cx("mt-1 text-sm", mutedClass)}>
                  {user?.email_verified_at
                    ? "Your account email is verified."
                    : "Verification helps protect account recovery and security changes."}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(user?.email_verified_at) || submitting === "verify"}
                onClick={() => void handleResendVerification()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting === "verify" && <LoaderCircle className="animate-spin" size={16} />}
                Send email
              </button>
            </div>
          </section>

          <section className={cx("border-b py-6", rowBorderClass)}>
            <h2 className="mb-4 text-lg font-semibold">Password recovery</h2>
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleForgotPassword}>
              <label className="block">
                <span className={cx("mb-2 block text-sm font-bold", mutedClass)}>Recovery email</span>
                <input
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  type="email"
                  required
                  className={cx("h-11 w-full rounded-md border px-3 text-sm outline-none transition", inputClass)}
                />
              </label>
              <button
                type="submit"
                disabled={submitting === "forgot"}
                className={cx("mt-auto h-11 rounded-md border px-5 text-sm font-bold transition", isDark ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]" : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-violet-50")}
              >
                {submitting === "forgot" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </section>

          <section className="py-6">
            <h2 className="mb-4 text-lg font-semibold">Change password</h2>
            <form className="grid gap-4" onSubmit={handleChangePassword}>
              {[
                ["current_password", "Current password"],
                ["password", "New password"],
                ["password_confirmation", "Confirm new password"],
              ].map(([name, label]) => (
                <label key={name} className="block">
                  <span className={cx("mb-2 block text-sm font-bold", mutedClass)}>{label}</span>
                  <input
                    value={passwordDraft[name as keyof typeof passwordDraft]}
                    onChange={(event) => updatePasswordField(name as keyof typeof passwordDraft, event.target.value)}
                    type="password"
                    required
                    minLength={8}
                    className={cx("h-11 w-full rounded-md border px-3 text-sm outline-none transition", inputClass)}
                  />
                </label>
              ))}
              {(status || error) && (
                <p className={cx("rounded-md border px-3 py-2 text-sm font-medium", error ? "border-pink-200 bg-pink-50 text-pink-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                  {error || status}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting === "password"}
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting === "password" && <LoaderCircle className="animate-spin" size={16} />}
                Save password
              </button>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}

function SettingsNavItem({
  active = false,
  icon: Icon,
  label,
  isDark,
}: {
  active?: boolean;
  icon: typeof UserRound;
  label: string;
  isDark: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between rounded-md px-4 py-3 text-base font-bold transition",
        active
          ? isDark
            ? "text-[var(--royal-soft)]"
            : "text-[var(--royal)]"
          : isDark
            ? "text-violet-100/80 hover:bg-white/[0.05] hover:text-white"
            : "text-zinc-800 hover:bg-violet-50 hover:text-[var(--royal)]",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={20} />
        {label}
      </span>
      {!active && <ChevronRight size={16} />}
    </div>
  );
}

function InfoRow({ label, value, mutedClass }: { label: string; value: string; mutedClass: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 font-bold">
        {label === "Email" ? <AtSign size={16} /> : <KeyRound size={16} />}
        {label}
      </span>
      <span className={cx("text-sm", mutedClass)}>{value}</span>
    </div>
  );
}
