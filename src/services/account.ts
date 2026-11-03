import type { PolicyCatalog, SingleResponse } from "@/types/api";
import { apiDownload, apiRequest } from "./api";

export const getPolicies = () => apiRequest<SingleResponse<PolicyCatalog>>("/policies");
export const acceptPolicies = (acceptedPolicies: Record<string, string>, token: string) => apiRequest<SingleResponse<{ message: string }>>("/me/policy-acceptances", { method: "POST", token, body: JSON.stringify({ accepted_policies: acceptedPolicies }) });
export type ReauthenticationCredentials = { password?: string; google_token?: string; mfa_code?: string };
export const reauthenticate = (purpose: "export_data" | "delete_account", credentials: ReauthenticationCredentials, token: string) => apiRequest<SingleResponse<{ proof: string; purpose: string; expires_at: string; staff_access_expires_at: string | null }>>("/auth/reauthenticate", { method: "POST", token, body: JSON.stringify({ purpose, ...credentials }) });
export const createExport = (proof: string, token: string) => apiRequest<SingleResponse<{ id: number; reference: string; status: string }>>("/me/export-requests", { method: "POST", token, headers: { "X-Reauth-Proof": proof }, body: JSON.stringify({ proof }) });
export const getExport = (id: number, token: string) => apiRequest<SingleResponse<{ id: number; reference: string; status: "pending" | "processing" | "ready" | "failed" | "expired"; download_url: string | null; expires_at?: string }>>(`/me/export-requests/${id}`, { token });
export const downloadExport = (url: string, token: string) => apiDownload(url.replace(/^\/api\/v1/, ""), token);
export const requestDeletion = (proof: string, token: string) => apiRequest<SingleResponse<{ reference: string; status: string }>>("/me/deletion-requests", { method: "POST", token, headers: { "X-Reauth-Proof": proof }, body: JSON.stringify({ proof }) });
export const requestDeletionByEmail = (email: string) => apiRequest<SingleResponse<{ message: string }>>("/account/deletion-requests", { method: "POST", body: JSON.stringify({ email }) });
export const confirmDeletionByEmail = (deletionToken: string) => apiRequest<SingleResponse<{ reference: string; status: string }>>("/account/deletion-confirmations", { method: "POST", body: JSON.stringify({ token: deletionToken }) });
