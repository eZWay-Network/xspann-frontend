"use client";

import type { ChangeEvent, DragEvent, FormEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AtSign,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileVideo,
  Hash,
  Heart,
  LoaderCircle,
  Maximize2,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Plus,
  MoveHorizontal,
  Search,
  SlidersHorizontal,
  Scissors,
  UploadCloud,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ApiError } from "@/services/api";
import { fallbackTracks, searchMusicTracks } from "@/services/music";
import { requestVideoUpload, uploadLocalAudio, uploadLocalVideo } from "@/services/uploads";
import { createVideo } from "@/services/videos";
import { cx } from "@/lib/format";
import type { MusicTrack } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";

const maxSize = 500 * 1024 * 1024;
const maxAudioSize = 50 * 1024 * 1024;
const supportedTypes = ["video/mp4", "video/quicktime", "video/webm"];
const supportedAudioTypes = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/m4a", "audio/ogg", "audio/webm"];
const customAudioId = "custom-upload";

type Step = "idle" | "preparing" | "uploading" | "publishing" | "done";
type PreviewMode = "feed" | "profile" | "web";
type Visibility = "public" | "followers" | "private";
type CropMode = "fill" | "fit";
type FilterSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  preset: string;
};
const defaultFilters: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  preset: "clean",
};

const filterPresets: Array<{ id: string; label: string; values: Omit<FilterSettings, "preset"> }> = [
  { id: "clean", label: "Clean", values: { brightness: 100, contrast: 100, saturation: 100, warmth: 0 } },
  { id: "vivid", label: "Vivid", values: { brightness: 106, contrast: 116, saturation: 132, warmth: 6 } },
  { id: "cinema", label: "Cinema", values: { brightness: 94, contrast: 128, saturation: 86, warmth: -8 } },
  { id: "sunset", label: "Sunset", values: { brightness: 104, contrast: 108, saturation: 118, warmth: 22 } },
  { id: "mono", label: "Mono", values: { brightness: 98, contrast: 124, saturation: 0, warmth: 0 } },
];

export function UploadVideoForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { authenticated, loading, token, user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cropMode, setCropMode] = useState<CropMode>("fill");
  const [filters, setFilters] = useState<FilterSettings>(defaultFilters);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [highQuality, setHighQuality] = useState(true);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("feed");
  const [soundQuery, setSoundQuery] = useState("lofi");
  const [soundResults, setSoundResults] = useState<MusicTrack[]>(fallbackTracks);
  const [selectedSound, setSelectedSound] = useState<MusicTrack>(fallbackTracks[0]);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioPreviewUrl, setCustomAudioPreviewUrl] = useState<string | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [soundLoading, setSoundLoading] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [trimEditorOpen, setTrimEditorOpen] = useState(false);
  const [soundEditorOpen, setSoundEditorOpen] = useState(false);
  const [filterEditorOpen, setFilterEditorOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (customAudioPreviewUrl) URL.revokeObjectURL(customAudioPreviewUrl);
    };
  }, [customAudioPreviewUrl]);

  const submitting = step !== "idle" && step !== "done";
  const selectedSoundArtist = selectedSound.provider === "original" ? user?.username : selectedSound.artist;
  const externalSoundSelected = selectedSound.provider !== "original" && Boolean(selectedSound.preview_url);
  const selectedSoundUrl = externalSoundSelected ? selectedSound.preview_url : undefined;
  const videoMuted = externalSoundSelected;
  const maxTimeline = Math.max(1, Math.floor(duration || 1));
  const activeTrimEnd = trimEnd || duration || maxTimeline;
  const videoFilter = buildVideoFilter(filters);

  function chooseFile(nextFile: File | undefined) {
    setError("");
    setCreatedVideoId(null);

    if (!nextFile) return;

    if (!supportedTypes.includes(nextFile.type)) {
      setError("Please upload MP4, MOV, or WebM video.");
      return;
    }

    if (nextFile.size > maxSize) {
      setError("Video must be 500 MB or smaller.");
      return;
    }

    pausePreview();
    setFile(nextFile);
    setCaption(nextFile.name.replace(/\.[^/.]+$/, ""));
    setPreviewTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCropMode("fill");
    setFilters(defaultFilters);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function handleMetadataLoaded() {
    const nextDuration = videoRef.current?.duration ?? 0;
    if (!Number.isFinite(nextDuration)) return;
    const roundedDuration = Number(nextDuration.toFixed(1));
    setDuration(roundedDuration);
    setTrimStart(0);
    setTrimEnd(roundedDuration);
    setPreviewTime(0);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = video.currentTime;
    if (trimEnd && nextTime > trimEnd) {
      seekPreview(trimStart);
      return;
    }

    setPreviewTime(nextTime);
  }

  function seekPreview(value: number) {
    const nextValue = Number(clamp(value, 0, duration || maxTimeline).toFixed(1));
    setPreviewTime(nextValue);
    if (videoRef.current) {
      videoRef.current.currentTime = nextValue;
    }
  }

  async function playPreview() {
    if (!previewUrl || !videoRef.current) {
      inputRef.current?.click();
      return;
    }

    setPlayingSoundId(null);
    audioRef.current?.pause();

    if (externalSoundSelected && selectedSound.preview_url && audioRef.current) {
      audioRef.current.src = selectedSound.preview_url;
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      await audioRef.current.play().catch(() => undefined);
    }

    if (videoRef.current.currentTime < trimStart || (trimEnd && videoRef.current.currentTime >= trimEnd)) {
      seekPreview(trimStart);
    }

    await videoRef.current.play().catch(() => undefined);
    setPreviewPlaying(true);
  }

  function pausePreview() {
    videoRef.current?.pause();
    audioRef.current?.pause();
    setPreviewPlaying(false);
  }

  function togglePreviewPlayback() {
    if (previewPlaying) {
      pausePreview();
      return;
    }

    void playPreview();
  }

  function appendCaptionToken(token: string) {
    setCaption((current) => {
      const needsSpace = current.length > 0 && !current.endsWith(" ");
      return `${current}${needsSpace ? " " : ""}${token}`;
    });
  }

  function selectSound(track: MusicTrack) {
    setSelectedSound(track);
    setPlayingSoundId(null);
    audioRef.current?.pause();
  }

  function selectCustomAudio(nextFile: File) {
    setError("");

    if (!isSupportedAudioFile(nextFile)) {
      setError("Please choose MP3, WAV, M4A, AAC, OGG, or WebM audio.");
      return;
    }

    if (nextFile.size > maxAudioSize) {
      setError("Audio must be 50 MB or smaller.");
      return;
    }

    const audioUrl = URL.createObjectURL(nextFile);
    const track: MusicTrack = {
      id: customAudioId,
      name: nextFile.name.replace(/\.[^/.]+$/, ""),
      artist: user?.username ?? "Custom audio",
      provider: "local",
      preview_url: audioUrl,
    };

    pausePreview();
    setCustomAudioFile(nextFile);
    setCustomAudioPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return audioUrl;
    });
    setSelectedSound(track);
    setPlayingSoundId(null);
  }

  async function handleSoundSearch() {
    setSoundLoading(true);
    setError("");

    try {
      const tracks = await searchMusicTracks(soundQuery);
      setSoundResults(tracks.length ? tracks : fallbackTracks);
    } catch (caught) {
      setSoundResults(fallbackTracks);
      setError(caught instanceof Error ? caught.message : "Could not load music tracks.");
    } finally {
      setSoundLoading(false);
    }
  }

  async function previewSound(track: MusicTrack) {
    pausePreview();
    setSelectedSound(track);

    if (!track.preview_url) {
      setPlayingSoundId(null);
      audioRef.current?.pause();
      return;
    }

    if (playingSoundId === track.id) {
      audioRef.current?.pause();
      setPlayingSoundId(null);
      return;
    }

    setPlayingSoundId(track.id);

    if (audioRef.current) {
      audioRef.current.src = track.preview_url;
      audioRef.current.loop = false;
      audioRef.current.currentTime = 0;
      await audioRef.current.play().catch(() => setPlayingSoundId(null));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please login before publishing.");
      return;
    }

    if (!file) {
      setError("Select a video before publishing.");
      return;
    }

    try {
      pausePreview();
      setError("");
      setStep("preparing");
      const uploadPlan = await requestVideoUpload({ filename: file.name, content_type: file.type }, token);
      let storagePath = "";
      let videoUrl: string | undefined;

      setStep("uploading");
      if (uploadPlan.data.upload_method === "signed_url") {
        const uploadResponse = await fetch(uploadPlan.data.upload_url, {
          method: "PUT",
          headers: uploadPlan.data.headers,
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Cloud upload failed. Please try again.");
        }

        storagePath = uploadPlan.data.storage_path;
      } else {
        const localUpload = await uploadLocalVideo(file, token);
        storagePath = localUpload.data.storage_path;
        videoUrl = localUpload.data.video_url;
      }

      let soundPreviewUrl = toAbsoluteUrl(selectedSound.preview_url);

      if (selectedSound.id === customAudioId && customAudioFile) {
        const audioUpload = await uploadLocalAudio(customAudioFile, token);
        soundPreviewUrl = audioUpload.data.audio_url;
      }

      setStep("publishing");
      const video = await createVideo({
        storage_path: storagePath,
        video_url: videoUrl,
        caption: caption.trim() || undefined,
        sound_name: selectedSound.name,
        sound_artist: selectedSoundArtist,
        sound_provider: selectedSound.provider,
        sound_external_id: selectedSound.provider === "jamendo" ? selectedSound.id : undefined,
        sound_preview_url: soundPreviewUrl,
        visibility,
        high_quality_upload: highQuality,
        trim_start: trimStart,
        trim_end: activeTrimEnd,
        crop_mode: cropMode,
        original_audio_muted: externalSoundSelected,
        filter_settings: filters,
      }, token);

      setCreatedVideoId(video.data.id);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["my-videos"] });
      if (user?.username) {
        void queryClient.invalidateQueries({ queryKey: ["user-videos", user.username] });
      }
      setStep("done");
    } catch (caught) {
      setStep("idle");
      if (caught instanceof ApiError) {
        const firstError = Object.values(caught.errors).flat()[0];
        setError(firstError ?? caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Upload failed. Please try again.");
      }
    }
  }

  function clearFile() {
    pausePreview();
    setCreatedVideoId(null);
    setDuration(0);
    setPreviewTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCropMode("fill");
    setFilters(defaultFilters);
    setFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  if (loading) {
    return <div className="grid min-h-[calc(100vh-80px)] place-items-center px-4 text-violet-100/70"><LoaderCircle className="animate-spin" size={28} /></div>;
  }

  if (!authenticated) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center px-4">
        <div className="glass-panel w-full rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-violet-600/25 text-violet-100"><UploadCloud size={27} /></div>
          <h1 className="mb-2 text-2xl font-black text-white">Login to upload</h1>
          <p className="mb-5 text-sm leading-6 text-violet-100/62">Your video needs an account before it can be published.</p>
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-6 text-sm font-bold text-white shadow-[0_0_32px_rgba(139,92,246,0.45)]">Login</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="h-screen overflow-y-auto bg-white px-4 pb-28 pt-5 text-zinc-950 md:pb-5 lg:px-8" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <div className={cx("mb-6 rounded-lg border bg-white p-4 shadow-sm", file ? "border-emerald-200 shadow-emerald-100" : "border-zinc-200")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-black">{file ? file.name : "Select a vertical video"}</p>
                {file && <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-bold">{highQuality ? "HD" : "SD"}</span>}
              </div>
              <p className={cx("mt-1 flex items-center gap-1.5 text-xs font-medium", file ? "text-emerald-700" : "text-zinc-500")}>
                {file ? <CheckCircle2 size={14} /> : <FileVideo size={14} />}
                {file ? `Ready (${formatFileSize(file.size)})` : "Drag video anywhere or choose MP4, MOV, WebM up to 500 MB"}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="h-9 rounded-md bg-zinc-100 px-4 text-sm font-bold hover:bg-zinc-200">{file ? "Replace" : "Choose file"}</button>
              {file && <button type="button" onClick={clearFile} className="grid h-9 w-9 place-items-center rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-200" aria-label="Remove selected video"><X size={17} /></button>}
            </div>
          </div>
          {file && <div className="mt-4 h-1 rounded-full bg-emerald-400" />}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <Panel title="Details">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Description</span>
                <div className="rounded-lg bg-zinc-100 p-3">
                  <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={4000} className="h-28 w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="Describe your video" />
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => appendCaptionToken("#")} className="inline-flex items-center gap-1 font-semibold hover:text-violet-700"><Hash size={14} /> Hashtags</button>
                      <button type="button" onClick={() => appendCaptionToken("@")} className="inline-flex items-center gap-1 font-semibold hover:text-violet-700"><AtSign size={14} /> Mention</button>
                    </div>
                    <span>{caption.length}/4000</span>
                  </div>
                </div>
              </label>

            </Panel>

            <Panel title="Settings">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Who can see this post</span>
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} className="h-10 w-full rounded-md border-0 bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="public">Everyone</option>
                  <option value="followers">Followers</option>
                  <option value="private">Only me</option>
                </select>
              </label>
              <label className="mt-5 flex items-center justify-between rounded-md bg-zinc-100 px-3 py-3 text-sm font-semibold">
                <span>High-quality uploads</span>
                <input type="checkbox" checked={highQuality} onChange={(event) => setHighQuality(event.target.checked)} className="h-4 w-4 accent-violet-600" />
              </label>
            </Panel>
          </div>

          <aside className="mx-auto w-full max-w-[330px] xl:sticky xl:top-5 xl:h-fit xl:max-w-none">
            <div className="mb-3 grid grid-cols-[1fr_1fr_1fr_36px] rounded-md bg-zinc-200/70 p-1 text-xs font-bold">
              {(["feed", "profile", "web"] as PreviewMode[]).map((mode) => <button key={mode} type="button" onClick={() => setPreviewMode(mode)} className={cx("h-7 rounded capitalize", previewMode === mode && "bg-white shadow-sm")}>{mode}</button>)}
              <button type="button" onClick={() => inputRef.current?.click()} className="grid h-7 place-items-center rounded bg-white text-zinc-700 shadow-sm" aria-label="Replace video"><FileVideo size={15} /></button>
            </div>

            <div className="mx-auto mb-4 w-[min(290px,calc(100vw-32px))] rounded-[32px] border-2 border-zinc-950 bg-zinc-950 p-2 shadow-xl">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[25px] bg-black text-white">
                {previewUrl ? (
                  <div onClick={() => previewMode !== "web" && togglePreviewPlayback()} className="h-full w-full cursor-pointer" role="button" tabIndex={0} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && previewMode !== "web") togglePreviewPlayback(); }} aria-label={previewPlaying ? "Pause preview" : "Play preview"}>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      muted={videoMuted}
                      playsInline
                      controls={previewMode === "web"}
                      onLoadedMetadata={handleMetadataLoaded}
                      onTimeUpdate={handleTimeUpdate}
                      onPlay={() => setPreviewPlaying(true)}
                      onPause={() => setPreviewPlaying(false)}
                      className={cx("h-full w-full transition duration-200", cropMode === "fill" ? "object-cover" : "object-contain")}
                      style={{ filter: videoFilter }}
                    />
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRef.current?.click()} className="grid h-full w-full place-items-center text-center text-white/65">
                    <span><UploadCloud className="mx-auto mb-3" size={34} />Select video</span>
                  </button>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent_36%,rgba(0,0,0,0.74))]" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[11px] font-bold"><span>8:00</span><span>{previewMode === "feed" ? "Following  For You" : previewMode === "profile" ? "Profile preview" : "Web preview"}</span><Search size={14} /></div>
                {previewUrl && !previewPlaying && <button type="button" onClick={togglePreviewPlayback} className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur" aria-label="Play preview"><Play size={28} fill="currentColor" /></button>}
                <div className="absolute bottom-18 left-4 right-14">
                  <p className="text-sm font-black">{user?.username}</p>
                  <p className="line-clamp-2 text-xs text-white/88">{caption || "Your caption preview appears here"}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80"><Music2 size={12} /> {selectedSound.name} - {selectedSoundArtist}</p>
                </div>
                {previewMode !== "profile" && (
                  <div className="absolute bottom-18 right-3 flex flex-col items-center gap-4 text-[10px] font-bold drop-shadow">
                    <div className="relative mb-1">
                      {user?.avatar ? (
                        <div className="h-10 w-10 rounded-full border-2 border-white bg-cover bg-center" style={{ backgroundImage: `url("${user.avatar}")` }} aria-hidden="true" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-violet-950 text-white"><UserRound size={20} /></div>
                      )}
                      <span className="absolute -bottom-1 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-[var(--royal-bright)] text-white"><Plus size={12} strokeWidth={3} /></span>
                    </div>
                    <Heart size={24} fill="white" />
                    <MessageCircle size={23} fill="white" />
                    <Bookmark size={23} fill="white" />
                    <ForwardShareIcon />
                  </div>
                )}
                <div className="absolute bottom-9 left-4 right-4 flex items-center gap-2">
                  <button type="button" onClick={togglePreviewPlayback} className="grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur" aria-label={previewPlaying ? "Pause preview" : "Play preview"}>{previewPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
                  <input type="range" min={0} max={maxTimeline} step={0.1} value={Math.min(previewTime, maxTimeline)} onChange={(event) => seekPreview(Number(event.target.value))} className="min-w-0 flex-1 accent-white" />
                  <span className="text-[10px] font-bold">{formatSeconds(previewTime)}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 bg-black/75 py-2 text-center text-[9px] font-bold"><span>Home</span><span>Friends</span><span className="mx-auto rounded bg-white px-3 text-black">+</span><span>Inbox</span><span>Me</span></div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <ToolLauncher icon={<Scissors size={20} />} label="Edit" onClick={() => { pausePreview(); setTrimEditorOpen(true); }} disabled={!previewUrl} />
              <ToolLauncher icon={<Music2 size={20} />} label="Sounds" onClick={() => { pausePreview(); setSoundEditorOpen(true); }} />
              <ToolLauncher icon={<SlidersHorizontal size={20} />} label="Filters" onClick={() => { pausePreview(); setFilterEditorOpen(true); }} disabled={!previewUrl} />
            </div>

            {createdVideoId && <Status tone="success" text={`Video #${createdVideoId} published and queued for processing.`} />}
            {error && <Status tone="error" text={error} />}
            {submitting && <Progress step={step} />}

            <button disabled={submitting} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] text-sm font-black text-white shadow-[0_10px_30px_rgba(91,33,182,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65">
              {submitting && <LoaderCircle size={18} className="animate-spin" />}
              {submitting ? stepLabel(step) : "Publish"}
            </button>
          </aside>
        </div>
      </form>
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleInputChange} />
      <audio ref={audioRef} onEnded={() => setPlayingSoundId(null)} />
      {trimEditorOpen && previewUrl && (
        <TrimCutEditorModal
          title={caption || "add title for your video"}
          previewUrl={previewUrl}
          duration={duration || maxTimeline}
          trimStart={trimStart}
          trimEnd={activeTrimEnd}
          cropMode={cropMode}
          videoFilter={videoFilter}
          soundUrl={selectedSoundUrl}
          muteVideo={videoMuted}
          onCancel={() => setTrimEditorOpen(false)}
          onSave={(nextEdit) => {
            setTrimStart(nextEdit.trimStart);
            setTrimEnd(nextEdit.trimEnd);
            seekPreview(nextEdit.trimStart);
            setTrimEditorOpen(false);
          }}
        />
      )}
      {soundEditorOpen && previewUrl && (
        <SoundEditorModal
          title={caption || "add title for your video"}
          previewUrl={previewUrl}
          cropMode={cropMode}
          videoFilter={videoFilter}
          trimStart={trimStart}
          trimEnd={activeTrimEnd}
          query={soundQuery}
          tracks={soundResults}
          selected={selectedSound}
          loading={soundLoading}
          playingId={playingSoundId}
          selectedSoundArtist={selectedSoundArtist}
          onQuery={setSoundQuery}
          onSearch={handleSoundSearch}
          onSelect={selectSound}
          onPreview={previewSound}
          onCustomAudio={selectCustomAudio}
          onClose={() => setSoundEditorOpen(false)}
        />
      )}
      {filterEditorOpen && previewUrl && (
        <FilterEditorModal
          title={caption || "add title for your video"}
          previewUrl={previewUrl}
          cropMode={cropMode}
          trimStart={trimStart}
          trimEnd={activeTrimEnd}
          filters={filters}
          onCancel={() => setFilterEditorOpen(false)}
          onSave={(nextFilters) => {
            setFilters(nextFilters);
            setFilterEditorOpen(false);
          }}
        />
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-black">{title}</h2>{children}</section>;
}

function ToolLauncher({ icon, label, onClick, disabled = false }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-45">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-[var(--royal)]">{icon}</span>
      <span className="font-normal leading-none" style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function EditorShell({ title, onCancel, onSave, sidebar, children }: { title: string; onCancel: () => void; onSave: () => void; sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-white text-zinc-950">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 sm:min-h-14 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-100" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <p className="truncate text-sm font-black">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-md bg-zinc-100 px-3 text-sm font-bold hover:bg-zinc-200 sm:px-5">Cancel</button>
          <button type="button" onClick={onSave} className="h-9 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-4 text-sm font-black text-white hover:brightness-105 sm:px-6">Save</button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f8f8f9] md:flex-row md:overflow-hidden">
        {sidebar}
        {children}
        <aside className="hidden w-32 shrink-0 border-l border-zinc-200 bg-white text-zinc-400 lg:grid lg:place-items-center">
          <div className="text-center">
            <SlidersHorizontal className="mx-auto mb-3 text-[var(--royal-bright)]" size={26} />
            <p className="text-xs font-semibold text-zinc-500">Select an item to edit</p>
          </div>
        </aside>
        <aside className="hidden w-12 shrink-0 border-l border-zinc-200 bg-white text-zinc-400 md:flex md:flex-col md:items-center md:pt-6">
          <Music2 size={18} />
          <span className="mt-2 text-[10px] font-bold">Audio</span>
        </aside>
      </div>
    </div>
  );
}

function EditorPreview({ previewUrl, cropMode, videoFilter, trimStart, trimEnd, soundUrl, muteVideo = true }: { previewUrl: string; cropMode: CropMode; videoFilter: string; trimStart: number; trimEnd: number; soundUrl?: string; muteVideo?: boolean }) {
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [previewTime, setPreviewTime] = useState(trimStart);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const trimDuration = Math.max(0.1, trimEnd - trimStart);
  const trimProgress = clamp((previewTime - trimStart) / trimDuration, 0, 1);

  const syncPreviewAudio = useCallback(() => {
    const video = previewVideoRef.current;
    const audio = previewAudioRef.current;
    if (!video || !audio || !soundUrl) return;

    const audioDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    try {
      audio.currentTime = audioDuration ? video.currentTime % audioDuration : video.currentTime;
    } catch {
      // Audio metadata may not be ready yet.
    }
  }, [soundUrl]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || !previewPlaying) return;

    if (!soundUrl) {
      audio.pause();
      return;
    }

    syncPreviewAudio();
    void audio.play().catch(() => undefined);
  }, [previewPlaying, soundUrl, syncPreviewAudio]);

  function handlePreviewMetadata() {
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = trimStart;
      setPreviewTime(trimStart);
    }
  }

  function handlePreviewTimeUpdate() {
    const video = previewVideoRef.current;
    if (!video) return;

    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
      setPreviewTime(trimStart);
      syncPreviewAudio();
      return;
    }

    setPreviewTime(video.currentTime);
  }

  async function togglePreviewPlayback() {
    const video = previewVideoRef.current;
    if (!video) return;

    if (previewPlaying) {
      video.pause();
      previewAudioRef.current?.pause();
      setPreviewPlaying(false);
      return;
    }

    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
      setPreviewTime(trimStart);
    }

    syncPreviewAudio();
    await video.play().catch(() => undefined);
    if (soundUrl) await previewAudioRef.current?.play().catch(() => undefined);
    setPreviewPlaying(true);
  }

  function seekTrimmedPreview(value: number) {
    const nextTime = trimStart + trimDuration * clamp(value, 0, 1);
    setPreviewTime(nextTime);
    if (previewVideoRef.current) previewVideoRef.current.currentTime = nextTime;
    syncPreviewAudio();
  }

  return (
    <main className="relative flex w-full min-w-0 flex-1 items-start justify-center px-3 py-3 md:min-h-[360px] md:items-center md:px-8">
      <div className="relative w-full max-w-[calc(100vw-24px)] overflow-hidden bg-black shadow-sm md:max-h-[calc(100dvh-96px)] md:max-w-[min(62vw,1040px)]">
        <video ref={previewVideoRef} src={previewUrl} muted={muteVideo} playsInline onLoadedMetadata={handlePreviewMetadata} onTimeUpdate={handlePreviewTimeUpdate} onPause={() => { previewAudioRef.current?.pause(); setPreviewPlaying(false); }} className={cx("max-h-[300px] w-full bg-black md:max-h-[calc(100dvh-112px)]", cropMode === "fill" ? "object-cover" : "object-contain")} style={{ filter: videoFilter }} />
        {soundUrl && <audio ref={previewAudioRef} src={soundUrl} loop preload="metadata" />}
        {!previewPlaying && (
          <button type="button" onClick={togglePreviewPlayback} className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label="Play preview">
            <Play size={28} fill="currentColor" />
          </button>
        )}
        <div className="absolute bottom-3 left-4 right-14 flex items-center gap-3 rounded-full bg-black/45 px-3 py-2 text-white backdrop-blur">
          <button type="button" onClick={togglePreviewPlayback} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label={previewPlaying ? "Pause preview" : "Play preview"}>
            {previewPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <input type="range" min={0} max={1000} step={1} value={Math.round(trimProgress * 1000)} onChange={(event) => seekTrimmedPreview(Number(event.target.value) / 1000)} className="min-w-0 flex-1 accent-white" aria-label="Trimmed preview progress" />
          <span className="shrink-0 text-[10px] font-bold">{formatSeconds(previewTime - trimStart)} / {formatSeconds(trimDuration)}</span>
        </div>
        <button type="button" className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-md bg-white/92 text-zinc-900 shadow-sm ring-1 ring-zinc-200" aria-label="Resize preview">
          <Maximize2 size={17} />
        </button>
      </div>
      <button type="button" className="absolute bottom-4 left-4 hidden rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black shadow-sm sm:block">Basic mode</button>
    </main>
  );
}

function SoundEditorModal(props: { title: string; previewUrl: string; cropMode: CropMode; videoFilter: string; trimStart: number; trimEnd: number; query: string; tracks: MusicTrack[]; selected: MusicTrack; loading: boolean; playingId: string | null; selectedSoundArtist: string | undefined; onQuery: (value: string) => void; onSearch: () => void; onSelect: (track: MusicTrack) => void; onPreview: (track: MusicTrack) => void; onCustomAudio: (file: File) => void; onClose: () => void }) {
  const selectedSoundUrl = props.selected.provider !== "original" ? props.selected.preview_url : undefined;

  return (
    <EditorShell
      title={props.title}
      onCancel={props.onClose}
      onSave={props.onClose}
      sidebar={
        <aside className="flex h-[56dvh] min-h-[360px] w-full shrink-0 flex-col overflow-hidden border-b border-zinc-200 bg-white md:h-full md:min-h-0 md:w-[344px] md:border-b-0 md:border-r">
          <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-5">
            <h2 className="text-base font-black">Sounds</h2>
            <button type="button" onClick={props.onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-zinc-100" aria-label="Close sounds"><X size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 p-4">
            <SoundTools query={props.query} tracks={props.tracks} selected={props.selected} loading={props.loading} playingId={props.playingId} onQuery={props.onQuery} onSearch={props.onSearch} onSelect={props.onSelect} onPreview={props.onPreview} onCustomAudio={props.onCustomAudio} />
          </div>
        </aside>
      }
    >
      <EditorPreview previewUrl={props.previewUrl} cropMode={props.cropMode} videoFilter={props.videoFilter} trimStart={props.trimStart} trimEnd={props.trimEnd} soundUrl={selectedSoundUrl} muteVideo={Boolean(selectedSoundUrl)} />
    </EditorShell>
  );
}

function FilterEditorModal({ title, previewUrl, cropMode, trimStart, trimEnd, filters, onCancel, onSave }: { title: string; previewUrl: string; cropMode: CropMode; trimStart: number; trimEnd: number; filters: FilterSettings; onCancel: () => void; onSave: (filters: FilterSettings) => void }) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const draftFilterStyle = buildVideoFilter(draftFilters);

  function applyDraftPreset(presetId: string) {
    const preset = filterPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setDraftFilters({ ...preset.values, preset: preset.id });
  }

  function updateDraftFilter(key: keyof Omit<FilterSettings, "preset">, value: number) {
    setDraftFilters((current) => ({ ...current, [key]: value, preset: "custom" }));
  }

  return (
    <EditorShell
      title={title}
      onCancel={onCancel}
      onSave={() => onSave(draftFilters)}
      sidebar={
        <aside className="max-h-[250px] w-full shrink-0 overflow-y-auto border-b border-zinc-200 bg-white md:h-full md:max-h-none md:w-[344px] md:border-b-0 md:border-r">
          <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-5">
            <h2 className="text-base font-black">Filters</h2>
            <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md hover:bg-zinc-100" aria-label="Close filters"><X size={18} /></button>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-2">
              {filterPresets.map((preset) => <button key={preset.id} type="button" onClick={() => applyDraftPreset(preset.id)} className={cx("h-10 rounded-md border text-xs font-black", draftFilters.preset === preset.id ? "border-violet-400 bg-violet-50 text-violet-800" : "border-zinc-200 bg-white text-zinc-600")}>{preset.label}</button>)}
            </div>
            <div className="space-y-4 rounded-md bg-zinc-100 p-4">
              <SliderControl label="Brightness" min={60} max={140} step={1} value={draftFilters.brightness} onChange={(value) => updateDraftFilter("brightness", value)} suffix="%" />
              <SliderControl label="Contrast" min={60} max={160} step={1} value={draftFilters.contrast} onChange={(value) => updateDraftFilter("contrast", value)} suffix="%" />
              <SliderControl label="Saturation" min={0} max={180} step={1} value={draftFilters.saturation} onChange={(value) => updateDraftFilter("saturation", value)} suffix="%" />
              <SliderControl label="Warmth" min={-40} max={40} step={1} value={draftFilters.warmth} onChange={(value) => updateDraftFilter("warmth", value)} />
            </div>
          </div>
        </aside>
      }
    >
      <EditorPreview previewUrl={previewUrl} cropMode={cropMode} videoFilter={draftFilterStyle} trimStart={trimStart} trimEnd={trimEnd} />
    </EditorShell>
  );
}

function TrimCutEditorModal({
  title,
  previewUrl,
  duration,
  trimStart,
  trimEnd,
  cropMode,
  videoFilter,
  soundUrl,
  muteVideo,
  onCancel,
  onSave,
}: {
  title: string;
  previewUrl: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cropMode: CropMode;
  videoFilter: string;
  soundUrl?: string;
  muteVideo: boolean;
  onCancel: () => void;
  onSave: (value: { trimStart: number; trimEnd: number }) => void;
}) {
  const editorVideoRef = useRef<HTMLVideoElement>(null);
  const editorAudioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragHandle, setDragHandle] = useState<"start" | "end" | null>(null);
  const [draftStart, setDraftStart] = useState(trimStart);
  const [draftEnd, setDraftEnd] = useState(trimEnd);
  const [currentTime, setCurrentTime] = useState(trimStart);
  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const safeDuration = Math.max(0.5, duration);
  const selectedDuration = Math.max(0, draftEnd - draftStart);

  const syncEditorAudio = useCallback(() => {
    const video = editorVideoRef.current;
    const audio = editorAudioRef.current;
    if (!video || !audio || !soundUrl) return;

    const audioDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    try {
      audio.currentTime = audioDuration ? video.currentTime % audioDuration : video.currentTime;
    } catch {
      // Audio metadata may not be ready yet.
    }
  }, [soundUrl]);

  useEffect(() => {
    const nextVolume = clamp(volume, 0, 100) / 100;
    if (editorVideoRef.current) {
      editorVideoRef.current.volume = nextVolume;
      editorVideoRef.current.muted = muted || muteVideo;
    }
    if (editorAudioRef.current) {
      editorAudioRef.current.volume = nextVolume;
      editorAudioRef.current.muted = muted;
    }
  }, [muted, muteVideo, volume]);

  useEffect(() => {
    const audio = editorAudioRef.current;
    if (!audio || !playing) return;

    if (!soundUrl) {
      audio.pause();
      return;
    }

    syncEditorAudio();
    void audio.play().catch(() => undefined);
  }, [playing, soundUrl, syncEditorAudio]);

  useEffect(() => {
    let cancelled = false;

    async function extractFrames() {
      try {
        const nextFrames = await captureVideoFrames(previewUrl, safeDuration, 14);
        if (!cancelled) setFrames(nextFrames);
      } catch {
        if (!cancelled) setFrames([]);
      }
    }

    void extractFrames();

    return () => {
      cancelled = true;
    };
  }, [previewUrl, safeDuration]);

  function timeToPercent(value: number) {
    return (clamp(value, 0, safeDuration) / safeDuration) * 100;
  }

  const timeFromPointer = useCallback((clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 0;

    return Number(clamp(((clientX - rect.left) / rect.width) * safeDuration, 0, safeDuration).toFixed(1));
  }, [safeDuration]);

  const seekEditor = useCallback((value: number) => {
    const nextValue = Number(clamp(value, 0, safeDuration).toFixed(1));
    setCurrentTime(nextValue);
    if (editorVideoRef.current) editorVideoRef.current.currentTime = nextValue;
    syncEditorAudio();
  }, [safeDuration, syncEditorAudio]);

  const updateDraftStart = useCallback((value: number) => {
    const nextValue = Number(clamp(value, 0, draftEnd - 0.5).toFixed(1));
    setDraftStart(nextValue);
    if (currentTime < nextValue) seekEditor(nextValue);
  }, [currentTime, draftEnd, seekEditor]);

  const updateDraftEnd = useCallback((value: number) => {
    const nextValue = Number(clamp(value, draftStart + 0.5, safeDuration).toFixed(1));
    setDraftEnd(nextValue);
    if (currentTime > nextValue) seekEditor(nextValue);
  }, [currentTime, draftStart, safeDuration, seekEditor]);

  useEffect(() => {
    if (!dragHandle) return undefined;

    function handlePointerMove(event: globalThis.PointerEvent) {
      event.preventDefault();
      const nextTime = timeFromPointer(event.clientX);

      if (dragHandle === "start") updateDraftStart(nextTime);
      if (dragHandle === "end") updateDraftEnd(nextTime);
    }

    function handlePointerUp() {
      setDragHandle(null);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragHandle, timeFromPointer, updateDraftEnd, updateDraftStart]);

  async function toggleEditorPlayback() {
    const video = editorVideoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }

    if (video.currentTime < draftStart || video.currentTime >= draftEnd) {
      video.currentTime = draftStart;
      setCurrentTime(draftStart);
    }

    syncEditorAudio();
    await video.play().catch(() => undefined);
    if (soundUrl) await editorAudioRef.current?.play().catch(() => undefined);
    setPlaying(true);
  }

  function handleEditorTimeUpdate() {
    const video = editorVideoRef.current;
    if (!video) return;

    if (video.currentTime >= draftEnd) {
      video.currentTime = draftStart;
      setCurrentTime(draftStart);
      syncEditorAudio();
      return;
    }

    if (soundUrl) {
      const audio = editorAudioRef.current;
      if (audio && Math.abs(audio.currentTime - video.currentTime) > 0.45) {
        syncEditorAudio();
      }
    }

    setCurrentTime(video.currentTime);
  }

  function startHandleDrag(handle: "start" | "end", event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragHandle(handle);
  }

  function moveHandle(event: PointerEvent<HTMLDivElement>) {
    if (!dragHandle) return;

    event.preventDefault();
    const nextTime = timeFromPointer(event.clientX);
    if (dragHandle === "start") updateDraftStart(nextTime);
    if (dragHandle === "end") updateDraftEnd(nextTime);
  }

  function finishHandleDrag() {
    setDragHandle(null);
  }

  function handleTimelineClick(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    seekEditor(timeFromPointer(event.clientX));
  }

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-white text-zinc-950">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 sm:min-h-14 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-100" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <p className="truncate text-sm font-black">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onCancel} className="h-8 rounded-md bg-zinc-100 px-3 text-sm font-bold hover:bg-zinc-200 sm:h-9 sm:px-5">Cancel</button>
          <button type="button" onClick={() => onSave({ trimStart: draftStart, trimEnd: draftEnd })} className="h-8 rounded-md bg-[linear-gradient(135deg,var(--royal),var(--royal-bright))] px-4 text-sm font-black text-white hover:brightness-105 sm:h-9 sm:px-6">Save</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f8f8f9]">
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2 md:px-8">
            <div className="group relative max-h-[calc(100dvh-240px)] w-full max-w-[calc(100vw-24px)] border-2 border-[var(--royal-bright)] bg-black shadow-[0_0_0_1px_rgba(139,92,246,0.16)] sm:max-h-[calc(100dvh-300px)] md:max-w-[min(76vw,980px)]">
              <span className="absolute -left-1 -top-1 z-10 h-2.5 w-2.5 rounded-sm bg-[var(--royal-bright)] sm:-left-1.5 sm:-top-1.5 sm:h-3 sm:w-3" />
              <span className="absolute -right-1 -top-1 z-10 h-2.5 w-2.5 rounded-sm bg-[var(--royal-bright)] sm:-right-1.5 sm:-top-1.5 sm:h-3 sm:w-3" />
              <span className="absolute -bottom-1 -left-1 z-10 h-2.5 w-2.5 rounded-sm bg-[var(--royal-bright)] sm:-bottom-1.5 sm:-left-1.5 sm:h-3 sm:w-3" />
              <span className="absolute -bottom-1 -right-1 z-10 h-2.5 w-2.5 rounded-sm bg-[var(--royal-bright)] sm:-bottom-1.5 sm:-right-1.5 sm:h-3 sm:w-3" />
              <video
                ref={editorVideoRef}
                src={previewUrl}
                muted={muteVideo}
                playsInline
                onLoadedMetadata={() => seekEditor(draftStart)}
                onTimeUpdate={handleEditorTimeUpdate}
                onPause={() => {
                  editorAudioRef.current?.pause();
                  setPlaying(false);
                }}
                className={cx("max-h-[calc(100dvh-244px)] w-full bg-black sm:max-h-[calc(100dvh-304px)]", cropMode === "fill" ? "object-cover" : "object-contain")}
                style={{ filter: videoFilter }}
              />
              {soundUrl && <audio ref={editorAudioRef} src={soundUrl} loop preload="metadata" />}
              <button type="button" className="absolute bottom-3 right-3 hidden h-8 w-8 place-items-center rounded-md bg-white/92 text-zinc-900 shadow-sm ring-1 ring-zinc-200 transition hover:bg-white sm:grid" aria-label="Resize preview">
                <Maximize2 size={17} />
              </button>
              {!playing && (
                <button type="button" onClick={toggleEditorPlayback} className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label="Play">
                  <Play size={28} fill="currentColor" />
                </button>
              )}
            </div>
          </div>
          <button type="button" className="absolute bottom-4 left-4 hidden rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black shadow-sm sm:block">Basic mode</button>
        </main>
        <aside className="hidden w-64 shrink-0 border-l border-zinc-200 bg-white md:block">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h3 className="text-base font-black">Audio</h3>
          </div>
          <div className="space-y-8 px-5 py-5">
            <label className="block text-sm font-bold">
              <span>Volume</span>
              <input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-5 w-full accent-[var(--royal-bright)]" />
            </label>
            <label className="block text-sm font-bold">
              <span>Fade in</span>
              <span className="mt-5 block text-xs font-medium text-zinc-400">Fade-in duration</span>
              <input type="range" min={0} max={10} defaultValue={0} className="mt-2 w-full accent-[var(--royal-bright)]" />
            </label>
            <label className="block text-sm font-bold">
              <span>Fade out</span>
              <span className="mt-5 block text-xs font-medium text-zinc-400">Fade-out duration</span>
              <input type="range" min={0} max={10} defaultValue={0} className="mt-2 w-full accent-[var(--royal-bright)]" />
            </label>
          </div>
        </aside>
      </div>

      <section className="h-[160px] shrink-0 border-t border-zinc-200 bg-white sm:h-[244px]">
        <div className="relative flex h-9 items-center justify-center border-b border-zinc-100 sm:h-11">
          <button type="button" onClick={toggleEditorPlayback} className="mr-3 grid h-8 w-8 place-items-center rounded-full hover:bg-zinc-100" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <p className="text-sm font-semibold">
            <span className="sm:hidden">{formatSeconds(currentTime)}</span>
            <span className="hidden sm:inline">{formatClock(currentTime)}</span>
            <span className="text-zinc-400">
              {" / "}
              <span className="sm:hidden">{formatSeconds(safeDuration)}</span>
              <span className="hidden sm:inline">{formatClock(safeDuration)}</span>
            </span>
          </p>
          <div className="absolute right-5 hidden items-center gap-3 text-zinc-500 sm:flex">
            <Search size={15} />
            <div className="h-1 w-20 rounded-full bg-zinc-200" />
            <Search size={17} />
          </div>
        </div>

        <div className="grid h-[124px] grid-cols-[32px_1fr] sm:h-[200px] sm:grid-cols-[42px_1fr]">
          <div className="flex flex-col items-center gap-3 border-r border-zinc-100 pt-3 text-zinc-700 sm:gap-8 sm:pt-4">
            <Scissors size={15} />
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-zinc-100"
              aria-label={muted ? "Unmute audio" : "Mute audio"}
              title={muted ? "Unmute audio" : "Mute audio"}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          </div>
          <div className="relative min-w-0 px-2 py-2 sm:px-6 sm:py-3">
            <div className="mb-1 grid h-5 grid-cols-5 border-b border-zinc-100 text-[9px] font-medium text-zinc-400 sm:mb-3 sm:h-7 sm:text-[10px]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="relative">
                  <span className="absolute left-0 top-3 h-2 w-px bg-zinc-200 sm:top-4" />
                  <span>{formatSeconds((safeDuration / 4) * index)}</span>
                </div>
              ))}
            </div>
            <div
              ref={timelineRef}
              onPointerDown={handleTimelineClick}
              onPointerMove={moveHandle}
              onPointerUp={finishHandleDrag}
              onPointerCancel={finishHandleDrag}
              className="relative h-[44px] cursor-pointer rounded-md bg-zinc-100 sm:h-[58px]"
            >
              <div className="pointer-events-none flex h-full overflow-hidden rounded-md">
                {frames.length ? frames.map((frame, index) => (
                  <div key={`${frame}-${index}`} className="h-full min-w-[64px] flex-1 bg-cover bg-center sm:min-w-[92px]" style={{ backgroundImage: `url(${frame})` }} />
                )) : Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className={cx("h-full min-w-[64px] flex-1 sm:min-w-[92px]", index % 2 ? "bg-zinc-200" : "bg-zinc-300")} />
                ))}
              </div>
              <div
                className="pointer-events-none absolute -inset-y-1 rounded-md border-2 border-[var(--royal-bright)] bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.16)]"
                style={{ left: `${timeToPercent(draftStart)}%`, width: `${timeToPercent(draftEnd) - timeToPercent(draftStart)}%` }}
              />
              <button type="button" onPointerDown={(event) => startHandleDrag("start", event)} className="absolute -top-1 grid h-[52px] w-5 -translate-x-1/2 cursor-ew-resize place-items-center rounded bg-[var(--royal-bright)] text-white shadow sm:h-[66px]" style={{ left: `${timeToPercent(draftStart)}%` }} aria-label="Drag trim start">
                <MoveHorizontal size={14} strokeWidth={2.6} />
              </button>
              <button type="button" onPointerDown={(event) => startHandleDrag("end", event)} className="absolute -top-1 grid h-[52px] w-5 -translate-x-1/2 cursor-ew-resize place-items-center rounded bg-[var(--royal-bright)] text-white shadow sm:h-[66px]" style={{ left: `${timeToPercent(draftEnd)}%` }} aria-label="Drag trim end">
                <MoveHorizontal size={14} strokeWidth={2.6} />
              </button>
              <div className="pointer-events-none absolute -top-[34px] bottom-[-24px] w-0.5 bg-[var(--royal-bright)] sm:-top-[50px] sm:bottom-[-42px]" style={{ left: `${timeToPercent(currentTime)}%` }}>
                <span className="absolute -left-1 top-0 h-2.5 w-2.5 rounded-sm bg-[var(--royal-bright)] sm:-left-[5px] sm:h-3 sm:w-3" />
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 sm:mt-3 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">{formatSeconds(selectedDuration)} selected</span>
              </div>
              <span className="hidden text-xs font-medium text-zinc-500 sm:inline">Move the handles to choose the final clip</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SoundTools(props: { query: string; tracks: MusicTrack[]; selected: MusicTrack; loading: boolean; playingId: string | null; onQuery: (value: string) => void; onSearch: () => void; onSelect: (track: MusicTrack) => void; onPreview: (track: MusicTrack) => void; onCustomAudio: (file: File) => void }) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedInResults = props.tracks.some((track) => track.id === props.selected.id && track.provider === props.selected.provider);
  const visibleTracks = selectedInResults ? props.tracks : [props.selected, ...props.tracks];

  function handleCustomAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) props.onCustomAudio(nextFile);
    event.target.value = "";
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 pb-3">
        <ToolTitle icon={<Music2 size={16} />} text="Sounds" />
        <button type="button" onClick={() => audioInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-md border border-dashed border-violet-300 bg-violet-50 px-3 py-3 text-left transition hover:bg-violet-100">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[var(--royal)] shadow-sm"><UploadCloud size={17} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-zinc-950">Upload custom audio</span>
            <span className="block truncate text-xs font-medium text-zinc-500">MP3, WAV, M4A, AAC, OGG, or WebM up to 50 MB</span>
          </span>
        </button>
        <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/x-m4a,audio/m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.webm" className="hidden" onChange={handleCustomAudioChange} />
        <div className="flex gap-2">
          <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); props.onSearch(); } }} placeholder="Search free music" className="h-10 min-w-0 flex-1 rounded-md bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300" />
          <button type="button" onClick={props.onSearch} className="grid h-10 w-10 place-items-center rounded-md bg-zinc-950 text-white" aria-label="Search sounds">{props.loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:#c4b5fd_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300">
        {visibleTracks.map((track) => <div key={`${track.provider}-${track.id}`} className={cx("rounded-md border p-3", props.selected.id === track.id && props.selected.provider === track.provider ? "border-violet-300 bg-violet-50" : "border-zinc-200")}> <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => props.onSelect(track)} className="min-w-0 text-left"><span className="block truncate text-sm font-black">{track.name}</span><span className="block truncate text-xs text-zinc-500">{track.artist}</span>{track.license_url && <span className="block truncate text-[10px] text-zinc-400">Creative Commons</span>}</button><button type="button" onClick={() => props.onPreview(track)} className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-900", props.playingId === track.id ? "bg-violet-200" : "bg-zinc-100")} aria-label="Preview sound">{props.playingId === track.id ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button></div>{props.selected.id === track.id && props.selected.provider === track.provider && <p className="mt-2 text-xs font-bold text-violet-700">Selected</p>}</div>)}
      </div>
    </div>
  );
}

function ToolTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <p className="flex items-center gap-2 text-sm font-black">{icon}{text}</p>;
}

function SliderControl({ label, min, max, step, value, onChange, suffix = "" }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; suffix?: string }) {
  return <label className="block text-xs font-bold text-zinc-600"><span className="mb-1 flex items-center justify-between"><span>{label}</span><span>{value}{suffix}</span></span><input type="range" min={min} max={max} step={step} value={clamp(value, min, max)} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-violet-700" /></label>;
}

function Status({ tone, text }: { tone: "success" | "error"; text: string }) {
  return <p className={cx("mt-4 flex gap-2 rounded-md border px-3 py-2 text-sm font-medium", tone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-pink-300 bg-pink-50 text-pink-800")}>{tone === "success" ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}{text}</p>;
}

function Progress({ step }: { step: Step }) {
  return <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-zinc-500"><span className="inline-flex items-center gap-1"><Clock size={14} />{stepLabel(step)}</span><span>{stepPercent(step)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--royal),var(--royal-bright),var(--pink-signal))] transition-all" style={{ width: `${stepPercent(step)}%` }} /></div></div>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isSupportedAudioFile(file: File) {
  if (supportedAudioTypes.includes(file.type)) return true;
  return /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(file.name);
}

function formatSeconds(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatClock(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function captureVideoFrames(src: string, duration: number, frameCount: number) {
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [];

  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await waitForVideoEvent(video, "loadedmetadata");

  canvas.width = 160;
  canvas.height = 90;

  const frames: string[] = [];
  const safeDuration = Math.max(0.5, Math.min(duration, Number.isFinite(video.duration) ? video.duration : duration));

  for (let index = 0; index < frameCount; index += 1) {
    video.currentTime = Math.min(safeDuration - 0.05, (safeDuration * index) / Math.max(1, frameCount - 1));
    await waitForVideoEvent(video, "seeked");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/jpeg", 0.62));
  }

  video.removeAttribute("src");
  video.load();

  return frames;
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Could not load video ${eventName}.`));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };

    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function toAbsoluteUrl(value: string | undefined) {
  if (!value) return undefined;

  try {
    return new URL(value).toString();
  } catch {
    if (typeof window === "undefined") return undefined;
    return new URL(value, window.location.origin).toString();
  }
}

function buildVideoFilter(filters: FilterSettings) {
  const warmth = clamp(filters.warmth, -40, 40);
  const warmthSepia = Math.max(0, warmth) * 0.45;
  const warmthHue = warmth < 0 ? warmth * 0.55 : warmth * 0.28;

  return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${warmthSepia}%) hue-rotate(${warmthHue}deg)`;
}

function ForwardShareIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M18.7 6.1c-.8-.7-2.1-.1-2.1 1v4.1C9.7 11.9 5.2 15.8 3.4 22.8c-.3 1.2 1.2 2 2.1 1.1 3.2-3.1 6.8-4.4 11.1-4.1v4.7c0 1.1 1.3 1.7 2.1 1l9.4-8.1c.6-.5.6-1.5 0-2L18.7 6.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stepLabel(step: Step) {
  if (step === "preparing") return "Preparing upload";
  if (step === "uploading") return "Uploading video";
  if (step === "publishing") return "Publishing";
  if (step === "done") return "Published";
  return "Ready";
}

function stepPercent(step: Step) {
  if (step === "preparing") return 20;
  if (step === "uploading") return 64;
  if (step === "publishing") return 88;
  if (step === "done") return 100;
  return 0;
}
