"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ApiError } from "@/services/api";
import { reportTarget, type ReportTarget } from "@/services/safety";

const reasons = ["Spam", "Harassment", "Hate or abuse", "Sexual content", "Violence", "Copyright or rights", "Other"];

export function ReportTargetForm({ target, token, onClose }: { target: ReportTarget; token: string; onClose: () => void }) {
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setResult("");
    try { const response = await reportTarget(target, { reason, details }, token); setResult(`Report #${response.data.id} submitted.`); }
    catch (caught) { setResult(caught instanceof ApiError ? caught.message : "Could not submit the report."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-xl border border-pink-500/20 bg-[var(--panel)] p-4"><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><select value={reason} onChange={(event) => setReason(event.target.value)} className="studio-input">{reasons.map((item) => <option key={item}>{item}</option>)}</select><input value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} placeholder="Optional details" className="studio-input" /></div>{result && <p role="status" className="mt-3 text-xs text-[var(--muted)]">{result}</p>}<div className="mt-3 flex gap-2"><button disabled={busy || Boolean(result.startsWith("Report #"))} className="primary-button">{busy && <LoaderCircle size={15} className="animate-spin" />} Submit report</button><button type="button" onClick={onClose} className="h-10 px-3 text-sm font-semibold">Close</button></div></form>;
}
