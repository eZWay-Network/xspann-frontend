import Link from "next/link";
import { Menu, Search, Upload } from "lucide-react";
import { Logo } from "@/components/common/logo";

export function Topbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-violet-200/10 bg-[#080411]/72 backdrop-blur-2xl md:left-[280px]">
      <div className="flex h-16 items-center gap-4 px-4 md:px-7">
        <div className="md:hidden"><Logo /></div>
        <button className="hidden rounded-lg p-2 text-violet-100/70 hover:bg-white/10 md:inline-flex" aria-label="Collapse navigation"><Menu size={20} /></button>
        <label className="mx-auto hidden h-10 w-full max-w-xl items-center gap-3 rounded-lg border border-violet-200/10 bg-white/[0.06] px-4 text-sm text-violet-100/60 md:flex">
          <input className="w-full bg-transparent outline-none placeholder:text-violet-100/40" placeholder="Search accounts, videos, hashtags..." />
          <Search size={17} />
        </label>
        <Link href="/upload" className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-[#18072d] shadow-[0_0_30px_rgba(255,255,255,0.22)] md:ml-0">
          <Upload size={16} /> Upload
        </Link>
      </div>
    </header>
  );
}
