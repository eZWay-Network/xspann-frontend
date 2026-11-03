import type { PaginatedResponse, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export type ModerationDecision = { id: number; action: string; reason: string; active: boolean; created_at: string };
export type ModerationAppeal = { id: number; decision_id: number; explanation?: string; status: string; resolution?: string | null; version: number; created_at?: string };
export const getModerationDecisions = (token: string) => apiRequest<PaginatedResponse<ModerationDecision>>("/me/moderation-decisions?limit=50", { token });
export const getModerationAppeals = (token: string) => apiRequest<PaginatedResponse<ModerationAppeal>>("/me/moderation-appeals?limit=50", { token });
export const createModerationAppeal = (decisionId: number, explanation: string, token: string) => apiRequest<SingleResponse<ModerationAppeal>>("/me/moderation-appeals", { method: "POST", token, body: JSON.stringify({ decision_id: decisionId, explanation }) });
export const getReportStatus = (id: number, token: string) => apiRequest<SingleResponse<{ id: number; status: string; version: number }>>(`/me/reports/${id}`, { token });
