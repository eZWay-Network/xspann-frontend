import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { BillingSettings } from "@/components/billing/billing-settings";
export default function Page() { return <AppShell><ProtectedRoute><BillingSettings /></ProtectedRoute></AppShell>; }
