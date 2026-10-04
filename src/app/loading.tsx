import { XpnLoader } from "@/components/common/xpn-loader";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-6">
      <XpnLoader label="Loading XPN social..." />
    </main>
  );
}
