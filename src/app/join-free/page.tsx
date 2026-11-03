import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Clapperboard,
  Compass,
  Headphones,
  Heart,
  LibraryBig,
  ListMusic,
  MessageCircle,
  Play,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingLiveContent, LandingLiveProof } from "@/components/landing/landing-live-content";

export const metadata: Metadata = {
  title: "XPN social — Discover music. Build your audience.",
  description: "A social music community for discovering independent artists, sharing vertical videos and building an artist presence.",
};

const listenerFeatures = [
  { icon: Compass, title: "Discover every day", body: "Explore public vertical videos, sounds and independent artist profiles." },
  { icon: Heart, title: "Shape your feed", body: "Follow, like, save, comment and share the moments that move you." },
  { icon: MessageCircle, title: "Join the community", body: "Connect through mutual follows, conversations and artist updates you choose." },
];

const artistFeatures = [
  { icon: Upload, title: "Share your work", body: "Publish original video, use eligible sounds and keep control of your releases." },
  { icon: LibraryBig, title: "Build your artist home", body: "Create a public profile, organize playlists and highlight your music." },
  { icon: BellRing, title: "Grow with your fans", body: "Understand your audience and use available artist updates, scheduling and promotion tools." },
];

export default function JoinFreePage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <LandingHeader />

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_22%,rgba(124,58,237,.23),transparent_31%),radial-gradient(circle_at_86%_18%,rgba(244,63,94,.12),transparent_27%)]" />
        <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.04fr_.96fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-[var(--royal)]"><Sparkles size={14} /> Music discovery meets artist growth</span>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Find the sound.<br /><span className="bg-[linear-gradient(100deg,#8b5cf6,#c4b5fd_52%,#fb7185)] bg-clip-text text-transparent">Follow the story.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">XPN social is where people discover independent music through video—and where artists turn every release into a lasting connection.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/feed" className="primary-button min-h-12 px-6 text-base"><Play size={17} fill="currentColor" /> Start exploring</Link>
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 text-base font-semibold transition hover:border-violet-500/35 hover:bg-[var(--surface)]">Build your artist presence <ArrowRight size={17} /></Link>
            </div>
            <div className="mt-9 max-w-sm"><LandingLiveProof /></div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-10 -z-10 rounded-full bg-violet-600/15 blur-3xl" />
            <div className="relative min-h-[510px] overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(150deg,#24103f,#161119_58%,#281226)] p-5 shadow-[0_35px_110px_-40px_rgba(76,29,149,.9)] sm:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(251,113,133,.2),transparent_29%)]" />
              <div className="relative flex items-center justify-between text-white"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-200/70">Your XPN</p><p className="mt-1 text-lg font-semibold">Choose how you show up</p></div><Headphones className="text-violet-200" /></div>
              <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
                <AudiencePreview icon={Users} eyebrow="For everyone" title="Discover & connect" description="Watch, follow, save and be part of the music community." accent="violet" />
                <AudiencePreview icon={Clapperboard} eyebrow="For artists" title="Release & grow" description="Create your artist home and bring your audience closer." accent="pink" />
              </div>
              <div className="relative mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-white backdrop-blur">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">One account, your own path</p><ListMusic size={18} className="text-violet-200" /></div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">Start as a listener, share as a creator, and build an artist profile whenever you are ready.</p>
                <div className="mt-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500 text-sm font-black">X</span><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-3/4 rounded-full bg-[linear-gradient(90deg,#8b5cf6,#fb7185)]" /></div><span className="text-xs font-bold text-zinc-300">YOUR STORY</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--royal)]">Two ways to experience XPN</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Come for discovery. Stay to create.</h2><p className="mt-4 text-base leading-7 text-[var(--muted)]">The social experience stays familiar for everyone, while artists get a dedicated workspace for the work behind each release.</p></div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <AudienceSection eyebrow="Listeners, fans & creators" title="Your daily music community" description="A simple place to find video, people and sounds—then decide what deserves another play." features={listenerFeatures} cta="Explore the feed" href="/feed" tone="violet" />
            <AudienceSection eyebrow="Independent artists" title="A home for more than one post" description="Bring your profile, releases, playlists and audience tools into one artist workspace." features={artistFeatures} cta="Open the artist workspace" href="/studio" tone="pink" />
          </div>
        </div>
      </section>

      <LandingLiveContent />

      <section className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(124,58,237,.18),transparent_56%)]" />
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-violet-500/20 bg-[linear-gradient(145deg,rgba(124,58,237,.13),var(--panel))] px-6 py-14 text-center sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--royal)]">Your next favorite sound is already moving</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Join as yourself. Grow into what comes next.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Explore the community for free, or start building an artist presence around the music you make.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/register" className="primary-button min-h-12 px-7 text-base">Create your account</Link><Link href="/artists" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-7 text-base font-semibold">Meet the artists <ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-8 text-sm text-[var(--muted)] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 XPN social. Music, people and stories in motion.</p><nav aria-label="Footer" className="flex flex-wrap gap-5"><Link href="/feed">Explore</Link><Link href="/artists">Artists</Link><Link href="/pricing">Plans</Link><Link href="/delete-account">Account deletion</Link></nav></div>
      </footer>
    </main>
  );
}

function AudiencePreview({ icon: Icon, eyebrow, title, description, accent }: { icon: typeof Users; eyebrow: string; title: string; description: string; accent: "violet" | "pink" }) {
  return <article className="rounded-3xl border border-white/10 bg-white/[.07] p-5 text-white backdrop-blur"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${accent === "violet" ? "bg-violet-500/25 text-violet-200" : "bg-rose-500/20 text-rose-200"}`}><Icon size={21} /></span><p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-zinc-400">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-300">{description}</p></article>;
}

function AudienceSection({ eyebrow, title, description, features, cta, href, tone }: { eyebrow: string; title: string; description: string; features: Array<{ icon: typeof Compass; title: string; body: string }>; cta: string; href: string; tone: "violet" | "pink" }) {
  return <article className="rounded-[2rem] border border-[var(--line)] bg-[var(--background)] p-6 sm:p-8"><p className={`text-xs font-bold uppercase tracking-[.18em] ${tone === "violet" ? "text-[var(--royal)]" : "text-rose-400"}`}>{eyebrow}</p><h3 className="mt-3 text-2xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p><div className="mt-7 space-y-5">{features.map(({ icon: Icon, title: featureTitle, body }) => <div key={featureTitle} className="flex gap-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === "violet" ? "bg-violet-500/10 text-[var(--royal)]" : "bg-rose-500/10 text-rose-400"}`}><Icon size={18} /></span><div><h4 className="text-sm font-semibold">{featureTitle}</h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</p></div></div>)}</div><Link href={href} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--royal)]">{cta} <ArrowRight size={16} /></Link></article>;
}
