import { Suspense } from "react";
import { AppShell } from "@/components/common/app-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { CheckoutResult } from "@/components/billing/checkout-result";
export default function Page() { return <AppShell><ProtectedRoute><Suspense><CheckoutResult cancelled /></Suspense></ProtectedRoute></AppShell>; }
