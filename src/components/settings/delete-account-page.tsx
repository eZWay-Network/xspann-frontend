"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/services/api";
import { confirmDeletionByEmail, requestDeletionByEmail } from "@/services/account";

export function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function request(event: FormEvent) { event.preventDefault(); setBusy(true); try { const response = await requestDeletionByEmail(email); setMessage(response.data.message); } catch (error) { setMessage(error instanceof ApiError ? error.message : "If the account is eligible, a confirmation email will be sent."); } finally { setBusy(false); } }
  async function confirm(event: FormEvent) { event.preventDefault(); setBusy(true); try { const response = await confirmDeletionByEmail(token); setMessage(`Deletion accepted. Reference: ${response.data.reference}`); } catch (error) { setMessage(error instanceof ApiError ? error.message : "The confirmation link is invalid or expired."); } finally { setBusy(false); } }
  return <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-5 py-10 text-[var(--foreground)]"><div className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-7"><p className="text-sm font-semibold text-[var(--royal)]">Account deletion</p><h1 className="mt-1 text-2xl font-semibold">Delete an XPN social account</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Request a generic confirmation email, then paste the one-time token from that email. Signed-in users can use Privacy settings instead.</p><form onSubmit={request} className="mt-6 space-y-3"><label className="text-sm font-semibold">Account email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="studio-input mt-2" /></label><button disabled={busy} className="primary-button">Send confirmation email</button></form><div className="my-7 h-px bg-[var(--line)]" /><form onSubmit={confirm} className="space-y-3"><label className="text-sm font-semibold">Confirmation token<input required value={token} onChange={(event) => setToken(event.target.value)} className="studio-input mt-2" /></label><button disabled={busy} className="primary-button">Confirm deletion</button></form>{message && <p role="status" className="mt-5 rounded-xl bg-[var(--surface)] p-4 text-sm">{message}</p>}<Link href="/login" className="mt-6 inline-block text-sm font-bold text-[var(--royal)]">Back to sign in</Link></div></main>;
}
