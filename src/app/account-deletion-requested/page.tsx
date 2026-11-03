import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/common/logo";

export default async function AccountDeletionRequestedPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-5 py-10 text-[var(--foreground)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
        <div className="mb-7 flex justify-center"><Logo /></div>
        <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
        <h1 className="mt-5 text-2xl font-semibold">Deletion request accepted</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your session has been cleared and account cleanup is now pending.</p>
        {reference && <p className="mt-5 break-all rounded-xl bg-[var(--surface)] p-3 text-xs">Reference: {reference}</p>}
        <Link href="/login" className="primary-button mt-7">Return to sign in</Link>
      </section>
    </main>
  );
}
