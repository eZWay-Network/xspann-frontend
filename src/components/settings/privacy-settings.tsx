"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSearch, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { GoogleSignIn } from "@/components/forms/google-sign-in";
import { useAuth } from "@/components/common/auth-provider";
import { ApiError } from "@/services/api";
import {
  acceptPolicies,
  createExport,
  downloadExport,
  getExport,
  getPolicies,
  reauthenticate,
  requestDeletion,
  type ReauthenticationCredentials,
} from "@/services/account";
import { getCommunicationPreferences, updateCommunicationPreferences } from "@/services/messaging";
import {
  createModerationAppeal,
  getModerationAppeals,
  getModerationDecisions,
  getReportStatus,
} from "@/services/moderation";
import type { CommunicationPreferences } from "@/types/api";
import { exportNeedsPolling } from "@/lib/account-safety";

type ExportRequest = {
  id: number;
  reference: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  download_url?: string | null;
  expires_at?: string;
};

type ReauthMethod = "password" | "google";

export function PrivacySettings({ googleClientId }: { googleClientId: string }) {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const pollTimer = useRef<number | null>(null);
  const [reauthMethod, setReauthMethod] = useState<ReauthMethod>("password");
  const [password, setPassword] = useState("");
  const [googleToken, setGoogleToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState<"export" | "download" | "delete" | "policies" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);

  const policies = useQuery({ queryKey: ["policies"], queryFn: getPolicies });
  const preferences = useQuery({
    queryKey: ["communication-preferences", user?.id],
    enabled: !user?.restricted_access,
    queryFn: () => getCommunicationPreferences(token!),
  });

  const exportStorageKey = user ? `xpn-export-request:${user.id}` : null;

  const persistExport = useCallback((value: ExportRequest | null) => {
    setExportRequest(value);
    if (!exportStorageKey) return;
    if (value) localStorage.setItem(exportStorageKey, JSON.stringify(value));
    else localStorage.removeItem(exportStorageKey);
  }, [exportStorageKey]);

  const pollExport = useCallback((id: number, initialAttempt = 0) => {
    async function poll(attempt: number): Promise<void> {
      if (!token || !exportStorageKey) return;
      try {
        const response = await getExport(id, token);
        const next = response.data;
        persistExport(next);
        if (exportNeedsPolling(next.status) && attempt < 8) {
          pollTimer.current = window.setTimeout(
            () => void poll(attempt + 1),
            Math.min(8_000, 1_000 * 2 ** attempt),
          );
        }
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Could not refresh the export status.");
      }
    }

    return poll(initialAttempt);
  }, [exportStorageKey, persistExport, token]);

  useEffect(() => {
    if (!exportStorageKey) return;
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(exportStorageKey) ?? "null") as ExportRequest | null;
        if (saved) {
          setExportRequest(saved);
          void pollExport(saved.id);
        }
      } catch {
        localStorage.removeItem(exportStorageKey);
      }
    });
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [exportStorageKey, pollExport]);

  function credentials(): ReauthenticationCredentials {
    return {
      ...(reauthMethod === "password" && password ? { password } : {}),
      ...(reauthMethod === "google" && googleToken ? { google_token: googleToken } : {}),
      ...(mfaCode ? { mfa_code: mfaCode } : {}),
    };
  }

  function validateCredentials() {
    if (reauthMethod === "password" && !password) throw new Error("Enter your current password.");
    if (reauthMethod === "google" && !googleToken) throw new Error("Confirm your linked Google account first.");
  }

  async function handlePolicies() {
    if (!policies.data) return;
    setBusy("policies");
    setError("");
    setMessage("");
    try {
      const current = Object.fromEntries(
        Object.entries(policies.data.data.policies)
          .filter(([, policy]) => policy.required)
          .map(([name, policy]) => [name, policy.version]),
      );
      const response = await acceptPolicies(current, token!);
      setMessage(response.data.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not record policy acceptance.");
    } finally {
      setBusy(null);
    }
  }

  async function handleExport(event: FormEvent) {
    event.preventDefault();
    setBusy("export");
    setError("");
    setMessage("");
    try {
      validateCredentials();
      const proof = await reauthenticate("export_data", credentials(), token!);
      const created = await createExport(proof.data.proof, token!);
      const next: ExportRequest = { ...created.data, status: "pending" };
      persistExport(next);
      setMessage(`Export ${created.data.reference} is being prepared.`);
      void pollExport(created.data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare your export.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (!exportRequest) return;
    setBusy("download");
    setError("");
    try {
      // Refresh immediately so the signed URL is current before downloading.
      const response = await getExport(exportRequest.id, token!);
      persistExport(response.data);
      if (response.data.status !== "ready" || !response.data.download_url) {
        throw new Error(`Export status is ${response.data.status}.`);
      }
      const blob = await downloadExport(response.data.download_url, token!);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `xpn-account-export-${response.data.reference}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Your export has downloaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not download the export.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Request permanent account deletion? Access is revoked as soon as the request is accepted.")) return;
    setBusy("delete");
    setError("");
    try {
      validateCredentials();
      const proof = await reauthenticate("delete_account", credentials(), token!);
      const response = await requestDeletion(proof.data.proof, token!);
      const reference = response.data.reference;
      await logout();
      router.replace(`/account-deletion-requested?reference=${encodeURIComponent(reference)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request deletion.");
      setBusy(null);
    }
  }

  const editablePreferences = Object.entries(preferences.data?.data ?? {})
    .filter(([, value]) => typeof value === "boolean") as Array<[keyof CommunicationPreferences, boolean]>;

  return (
    <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-[var(--royal)]">Account safety</p>
        <h1 className="mt-1 text-3xl font-semibold">Privacy & recovery</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Manage policy acceptance, communication choices, moderation, exports and deletion.</p>

        {user?.restricted_access && (
          <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
            This account has restricted access. Recovery, appeals, export, deletion and limited billing remain available.
          </p>
        )}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-pink-500/10 p-4 text-sm text-pink-300">{error}</p>}

        <PolicySection policies={policies.data?.data.policies} busy={busy === "policies"} onAccept={handlePolicies} />

        {!user?.restricted_access && (
          <CommunicationSection
            preferences={editablePreferences}
            onChange={(key, value) => void updateCommunicationPreferences({ [key]: value }, token!).then(() => preferences.refetch())}
          />
        )}

        <ModerationSection token={token!} userId={user!.id} />

        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="text-lg font-semibold">Sensitive actions</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Authorize exports or deletion with your password or a fresh linked Google credential.</p>

          <div className="mt-5 flex gap-2">
            <MethodButton active={reauthMethod === "password"} onClick={() => setReauthMethod("password")}>Password</MethodButton>
            {googleClientId && <MethodButton active={reauthMethod === "google"} onClick={() => setReauthMethod("google")}>Google</MethodButton>}
          </div>

          {reauthMethod === "password" ? (
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Current password" className="studio-input mt-4 max-w-md" />
          ) : (
            <div className="mt-4 max-w-md">
              <GoogleSignIn clientId={googleClientId} isDark onCredential={(credential) => { setGoogleToken(credential); setMessage("Google identity confirmed for the next sensitive action."); }} />
            </div>
          )}

          <input
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="MFA code, if required"
            className="studio-input mt-3 max-w-md"
          />

          <form onSubmit={handleExport} className="mt-4 flex flex-wrap gap-3">
            <button disabled={Boolean(busy)} className="primary-button">
              {busy === "export" ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
              Request data export
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void handleDelete()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-500/30 px-4 text-sm font-bold text-pink-400 disabled:opacity-50">
              {busy === "delete" ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete account
            </button>
          </form>

          {exportRequest && (
            <ExportStatus
              request={exportRequest}
              busy={busy === "download"}
              onRefresh={() => void pollExport(exportRequest.id)}
              onDownload={() => void handleDownload()}
              onNew={() => persistExport(null)}
            />
          )}
        </section>
      </div>
    </section>
  );
}

function PolicySection({ policies, busy, onAccept }: {
  policies?: Record<string, { version: string; url: string; required: boolean }>;
  busy: boolean;
  onAccept: () => Promise<void>;
}) {
  return (
    <section className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--royal)]"><ShieldCheck size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Current policies</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Review the published documents before recording the current required versions.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(policies ?? {}).map(([name, policy]) => (
              <a key={name} href={policy.url} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold capitalize">
                {name} · {policy.version}{policy.required ? " *" : ""}
              </a>
            ))}
          </div>
          <button onClick={() => void onAccept()} disabled={!policies || busy} className="primary-button mt-5">
            {busy && <LoaderCircle size={16} className="animate-spin" />} Accept current required versions
          </button>
        </div>
      </div>
    </section>
  );
}

function CommunicationSection({ preferences, onChange }: {
  preferences: Array<[keyof CommunicationPreferences, boolean]>;
  onChange: (key: keyof CommunicationPreferences, value: boolean) => void;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
      <h2 className="text-lg font-semibold">Communication choices</h2>
      <div className="mt-4 space-y-3">
        {preferences.map(([key, value]) => (
          <label key={key} className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface)] p-4 text-sm">
            <span className="capitalize">{key.replaceAll("_", " ")}</span>
            <input type="checkbox" checked={value} onChange={(event) => onChange(key, event.target.checked)} className="accent-violet-600" />
          </label>
        ))}
      </div>
    </section>
  );
}

function ModerationSection({ token, userId }: { token: string; userId: number }) {
  const decisions = useQuery({ queryKey: ["moderation-decisions", userId], queryFn: () => getModerationDecisions(token) });
  const appeals = useQuery({ queryKey: ["moderation-appeals", userId], queryFn: () => getModerationAppeals(token) });
  const [decisionId, setDecisionId] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [reportId, setReportId] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [status, setStatus] = useState("");

  async function submitAppeal(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      const response = await createModerationAppeal(decisionId, explanation, token);
      setStatus(`Appeal #${response.data.id} submitted.`);
      setExplanation("");
      await appeals.refetch();
    } catch (caught) {
      setStatus(caught instanceof ApiError ? caught.message : "Could not submit the appeal.");
    }
  }

  async function lookupReport(event: FormEvent) {
    event.preventDefault();
    setReportStatus("");
    try {
      const response = await getReportStatus(Number(reportId), token);
      setReportStatus(`Report #${response.data.id}: ${response.data.status} (version ${response.data.version})`);
    } catch (caught) {
      setReportStatus(caught instanceof ApiError ? caught.message : "Could not load that report.");
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
      <h2 className="text-lg font-semibold">Reports, decisions & appeals</h2>

      <form onSubmit={lookupReport} className="mt-4 flex gap-2">
        <input value={reportId} onChange={(event) => setReportId(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Your report ID" className="studio-input" required />
        <button className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold"><FileSearch size={16} /> Check status</button>
      </form>
      {reportStatus && <p className="mt-2 text-sm text-[var(--muted)]">{reportStatus}</p>}

      {!!decisions.data?.data.length && (
        <div className="mt-5 space-y-2">
          {decisions.data.data.map((decision) => (
            <div key={decision.id} className="rounded-xl bg-[var(--surface)] p-4 text-sm">
              <b>Decision #{decision.id} · {decision.action}</b>
              <p className="mt-1 text-[var(--muted)]">{decision.reason}</p>
            </div>
          ))}
        </div>
      )}

      {!!appeals.data?.data.length && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Appeal history</h3>
          <div className="mt-2 space-y-2">
            {appeals.data.data.map((appeal) => (
              <div key={appeal.id} className="rounded-xl border border-[var(--line)] p-4 text-sm">
                <b>Appeal #{appeal.id} · {appeal.status}</b>
                {appeal.explanation && <p className="mt-1 text-[var(--muted)]">{appeal.explanation}</p>}
                {appeal.resolution && <p className="mt-2 text-emerald-400">Resolution: {appeal.resolution}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!decisions.data?.data.some((decision) => decision.active) && (
        <form onSubmit={submitAppeal} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
          <select required value={decisionId} onChange={(event) => setDecisionId(Number(event.target.value))} className="studio-input">
            <option value={0}>Choose a decision to appeal</option>
            {decisions.data.data.filter((decision) => decision.active).map((decision) => <option value={decision.id} key={decision.id}>#{decision.id} · {decision.action}</option>)}
          </select>
          <textarea required minLength={3} maxLength={4000} value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explain why this decision should be reviewed" className="studio-input h-auto py-3" rows={4} />
          <button disabled={!decisionId} className="primary-button w-fit">Submit appeal</button>
          {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
        </form>
      )}
    </section>
  );
}

function ExportStatus({ request, busy, onRefresh, onDownload, onNew }: {
  request: ExportRequest;
  busy: boolean;
  onRefresh: () => void;
  onDownload: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl bg-[var(--surface)] p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Export {request.reference}</p>
          <p className="mt-1 capitalize text-[var(--muted)]">Status: {request.status}</p>
          {request.expires_at && <p className="mt-1 text-xs text-[var(--muted)]">Available until {new Date(request.expires_at).toLocaleString()}</p>}
        </div>
        <div className="flex gap-2">
          {request.status === "ready" && <button type="button" disabled={busy} onClick={onDownload} className="primary-button">{busy && <LoaderCircle size={15} className="animate-spin" />} Download</button>}
          {exportNeedsPolling(request.status) && <button type="button" onClick={onRefresh} className="h-10 rounded-xl border border-[var(--line)] px-4 font-semibold">Refresh</button>}
          {(request.status === "failed" || request.status === "expired") && <button type="button" onClick={onNew} className="h-10 rounded-xl border border-[var(--line)] px-4 font-semibold">Request another</button>}
        </div>
      </div>
    </div>
  );
}

function MethodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`h-9 rounded-full px-4 text-sm font-semibold ${active ? "bg-violet-600 text-white" : "bg-[var(--surface)] text-[var(--muted)]"}`}>{children}</button>;
}
