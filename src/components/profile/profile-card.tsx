"use client";

/* eslint-disable @next/next/no-img-element -- Local backend media thumbnails bypass Next image optimization. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Camera,
  Grid2X2,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Settings,
  Share2,
  UserCheck,
  UserPlus,
  VideoOff,
  X,
} from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useTheme } from "@/components/common/theme-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compactNumber, cx } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/services/api";
import { updateProfile } from "@/services/auth";
import { followUser, unfollowUser } from "@/services/follows";
import { getLikedVideos } from "@/services/likes";
import { getSavedVideos } from "@/services/saves";
import { uploadAvatar } from "@/services/uploads";
import { getFollowers, getFollowing, getProfile, getUserVideos } from "@/services/users";
import type { Profile, SingleResponse, UserSummary, Video } from "@/types/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const demoCover =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85";
type ProfileTab = "videos" | "favorites" | "liked";
type SortMode = "latest" | "popular" | "oldest";
const BIO_MAX_LENGTH = 120;

export function ProfileCard({ username }: { username: string }) {
  const router = useRouter();
  const { authenticated, loading: authLoading, token, user: viewer, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [relationPanel, setRelationPanel] = useState<"followers" | "following" | null>(null);
  const [relationUsers, setRelationUsers] = useState<UserSummary[]>([]);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editDraft, setEditDraft] = useState({ username: "", name: "", avatar: "", bio: "" });
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({});
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const authScope = token ? "auth" : "guest";
  const profileQueryKey = queryKeys.profile(username, authScope);
  const profileQuery = useQuery({
    enabled: !authLoading,
    queryKey: profileQueryKey,
    queryFn: () => getProfile(username, token),
    staleTime: 60 * 1000,
  });
  const profile = profileQuery.data?.data ?? null;
  const userVideosQuery = useQuery({
    enabled: !authLoading,
    queryKey: queryKeys.userVideos(username, authScope),
    queryFn: () => getUserVideos(username, 40, token),
    staleTime: 45 * 1000,
  });
  const isOwnProfileFromQuery = Boolean(token && viewer?.id && profile?.id === viewer.id);
  const favoriteVideosQuery = useQuery({
    enabled: isOwnProfileFromQuery,
    queryKey: queryKeys.savedVideos(authScope),
    queryFn: () => getSavedVideos(token as string, 80),
    staleTime: 30 * 1000,
  });
  const likedVideosQuery = useQuery({
    enabled: isOwnProfileFromQuery,
    queryKey: queryKeys.likedVideos(authScope),
    queryFn: () => getLikedVideos(token as string, 80),
    staleTime: 30 * 1000,
  });
  const userVideos = userVideosQuery.data?.data ?? [];
  const favoriteVideos = favoriteVideosQuery.data?.data ?? [];
  const likedVideos = likedVideosQuery.data?.data ?? [];
  const loading = authLoading || profileQuery.isLoading || userVideosQuery.isLoading;
  const profileLoadError = profileQuery.error;
  const error = profileQuery.isError || userVideosQuery.isError
    ? profileLoadError instanceof ApiError && profileLoadError.status === 404
      ? "Profile not found."
      : "Unable to load this profile right now."
    : null;

  function setCachedProfile(updater: (current: Profile) => Profile) {
    queryClient.setQueryData<SingleResponse<Profile>>(profileQueryKey, (current) => current
      ? { ...current, data: updater(current.data) }
      : current);
  }

  const toggleFollow = async () => {
    if (!profile || !authenticated || !token || viewer?.id === profile.id) return;

    const wasFollowing = profile.following;
    const previousFollowersCount = profile.followers_count;

    setFollowLoading(true);
    setFollowError(null);
    setCachedProfile((current) => ({
      ...current,
      following: !wasFollowing,
      followers_count: Math.max(0, current.followers_count + (wasFollowing ? -1 : 1)),
    }));

    try {
      const response = wasFollowing
        ? await unfollowUser(profile.id, token)
        : await followUser(profile.id, token);

      setCachedProfile((current) => ({
        ...current,
        following: response.data.following,
        followers_count: response.data.followers_count,
      }));
    } catch {
      setFollowError("Could not update follow right now.");
      setCachedProfile((current) => ({
        ...current,
        following: wasFollowing,
        followers_count: previousFollowersCount,
      }));
    } finally {
      setFollowLoading(false);
    }
  };

  const openRelationPanel = async (panel: "followers" | "following") => {
    if (!profile) return;

    setRelationPanel(panel);
    setRelationLoading(true);
    setRelationError(null);
    setRelationUsers([]);

    try {
      const response = panel === "followers"
        ? await getFollowers(profile.username, 50)
        : await getFollowing(profile.username, 50);
      setRelationUsers(response.data);
    } catch {
      setRelationError(`Could not load ${panel}.`);
    } finally {
      setRelationLoading(false);
    }
  };

  const openEditProfile = () => {
    if (!profile) return;

    setEditDraft({
      username: profile.username,
      name: profile.name ?? profile.username,
      avatar: profile.avatar ?? "",
      bio: (profile.bio ?? "").slice(0, BIO_MAX_LENGTH),
    });
    setEditError("");
    setEditFieldErrors({});
    setEditAvatarPreview("");
    setEditingProfile(true);
  };

  const submitEditProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !token) return;

    setEditSaving(true);
    setEditError("");
    setEditFieldErrors({});

    try {
      const payload = {
        username: editDraft.username.trim(),
        name: editDraft.name.trim() || null,
        avatar: editDraft.avatar.trim() || null,
        bio: editDraft.bio.trim().slice(0, BIO_MAX_LENGTH) || null,
      };
      const response = await updateProfile(payload, token);
      setCachedProfile((current) => ({ ...current, ...response.data }));
      await refreshUser().catch(() => undefined);
      setEditingProfile(false);

      if (response.data.username !== profile.username) {
        router.replace(`/profile/${response.data.username}`);
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditError(caughtError.message);
        setEditFieldErrors(caughtError.errors);
      } else {
        setEditError("Could not update profile.");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file || !token) return;

    const previewUrl = URL.createObjectURL(file);
    setEditAvatarPreview(previewUrl);
    setAvatarUploading(true);
    setEditError("");
    setEditFieldErrors((errors) => ({ ...errors, avatar: [] }));

    try {
      const response = await uploadAvatar(file, token);
      setEditDraft((draft) => ({ ...draft, avatar: response.data.avatar_url }));
    } catch (caughtError) {
      setEditAvatarPreview("");
      if (caughtError instanceof ApiError) {
        setEditError(caughtError.message);
        setEditFieldErrors(caughtError.errors);
      } else {
        setEditError("Could not upload profile photo.");
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <section className="grid h-full place-items-center px-4">
        <div className={cx("inline-flex items-center gap-2 text-sm font-semibold", isDark ? "text-violet-100/75" : "text-violet-950/60")}>
          <LoaderCircle className="animate-spin" size={18} /> Loading profile...
        </div>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="grid h-full place-items-center px-4 text-center">
        <div>
          <VideoOff className={cx("mx-auto mb-3", isDark ? "text-violet-100/45" : "text-violet-950/35")} size={34} />
          <h1 className={cx("text-xl font-black", isDark ? "text-white" : "text-zinc-950")}>{error ?? "Profile unavailable."}</h1>
        </div>
      </section>
    );
  }

  const isOwnProfile = viewer?.id === profile.id;
  const tabVideos = activeTab === "videos"
    ? userVideos
    : activeTab === "favorites"
      ? favoriteVideos
      : likedVideos;
  const sortedVideos = sortProfileVideos(tabVideos, sortMode);
  const privateTabLocked = activeTab !== "videos" && !isOwnProfile;
  const emptyMessage = privateTabLocked
    ? `${activeTab === "favorites" ? "Favorites" : "Liked videos"} are private.`
    : activeTab === "videos"
      ? "No visible posts yet."
      : `No ${activeTab === "favorites" ? "favorite" : "liked"} videos yet.`;
  const modalDividerClass = isDark ? "border-white/10" : "border-zinc-200";
  const modalDivideClass = isDark ? "divide-white/10" : "divide-zinc-200";
  const modalLabelClass = isDark ? "text-white/90" : "text-zinc-900";
  const modalHintClass = isDark ? "text-white/45" : "text-zinc-500";
  const modalInputClass = isDark
    ? "border-white/10 bg-white/10 text-white placeholder:text-white/35 focus:border-violet-300/55 focus:bg-white/[0.13]"
    : "border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white";
  const modalSoftButtonClass = isDark
    ? "border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/[0.12] hover:text-white"
    : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-violet-50 hover:text-zinc-950";
  const modalUploadButtonClass = isDark
    ? "bg-white/10 text-white hover:bg-white/15"
    : "bg-zinc-100 text-zinc-800 hover:bg-violet-50";
  const modalFooterClass = isDark
    ? "border-white/10"
    : "border-zinc-200";
  const modalPhotoRingClass = isDark ? "ring-white/15" : "ring-zinc-200";
  const modalAvatarUploadClass = isDark
    ? "bg-white text-zinc-950 ring-[#151515] hover:bg-violet-100"
    : "bg-zinc-950 text-white ring-white hover:bg-violet-700";
  const modalErrorClass = isDark
    ? "border-pink-400/20 bg-pink-500/10 text-pink-100"
    : "border-pink-200 bg-pink-50 text-pink-700";

  return (
    <section className={cx("page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8", isDark ? "text-white" : "text-zinc-950")}>
      <div className="mx-auto max-w-5xl">
        <div className={cx("mb-6 rounded-lg border p-6 transition-colors duration-200", isDark ? "border-violet-200/10 bg-[#090313]/92" : "border-violet-200 bg-white")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar src={profile.avatar} size={96} className="h-24 w-24 ring-2 ring-violet-300/60" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h1 className={cx("text-2xl font-semibold tracking-tight", isDark ? "text-white" : "text-zinc-950")}>
                  @{profile.username}
                </h1>
                {profile.verified && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold">
                    verified
                  </span>
                )}
              </div>
              <p className={cx("max-w-xl text-sm leading-6", isDark ? "text-violet-100/68" : "text-zinc-600")}>
                {profile.bio || "No bio yet."}
              </p>
              <div className={cx("mt-4 flex flex-wrap gap-5 text-sm", isDark ? "text-violet-100/75" : "text-zinc-600")}>
                <button
                  type="button"
                  onClick={() => void openRelationPanel("following")}
                  className={cx("text-left transition", isDark ? "hover:text-white" : "hover:text-zinc-950")}
                >
                  <strong className={cx(isDark ? "text-white" : "text-zinc-950")}>
                    {compactNumber(profile.following_count)}
                  </strong>{" "}
                  following
                </button>
                <button
                  type="button"
                  onClick={() => void openRelationPanel("followers")}
                  className={cx("text-left transition", isDark ? "hover:text-white" : "hover:text-zinc-950")}
                >
                  <strong className={cx(isDark ? "text-white" : "text-zinc-950")}>
                    {compactNumber(profile.followers_count)}
                  </strong>{" "}
                  followers
                </button>
                <span>
                  <strong className={cx(isDark ? "text-white" : "text-zinc-950")}>
                    {compactNumber(profile.likes_count)}
                  </strong>{" "}
                  likes
                </span>
              </div>
            </div>
            {isOwnProfile ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openEditProfile}
                  className={cx("inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold ring-1 transition", isDark ? "bg-white/12 text-white ring-white/10 hover:bg-white/18" : "bg-violet-50 text-violet-950 ring-violet-200 hover:bg-violet-100")}
                >
                  <Pencil size={16} />
                  Edit profile
                </button>
                <button
                  type="button"
                  className={cx("grid h-11 w-11 place-items-center rounded-full ring-1 transition", isDark ? "bg-white/10 text-white ring-white/10 hover:bg-white/15" : "bg-violet-50 text-violet-950 ring-violet-200 hover:bg-violet-100")}
                  aria-label="Profile settings"
                >
                  <Settings size={18} />
                </button>
                <button
                  type="button"
                  className={cx("grid h-11 w-11 place-items-center rounded-full ring-1 transition", isDark ? "bg-white/10 text-white ring-white/10 hover:bg-white/15" : "bg-violet-50 text-violet-950 ring-violet-200 hover:bg-violet-100")}
                  aria-label="Share profile"
                >
                  <Share2 size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={!authenticated || followLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {followLoading ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : profile.following ? (
                  <UserCheck size={17} />
                ) : (
                  <UserPlus size={17} />
                )}
                {authenticated
                  ? profile.following
                    ? "Following"
                    : "Follow"
                  : "Log in to follow"}
              </button>
            )}
          </div>
          {followError && (
            <p className={cx("mt-4 rounded-md border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-sm font-medium", isDark ? "text-pink-100" : "text-pink-700")}>
              {followError}
            </p>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className={cx("mb-6 border-b", isDark ? "border-violet-200/10" : "border-violet-200")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <TabsList>
              <TabsTrigger value="videos" className={cx(isDark ? "text-violet-100/45 hover:text-violet-100/80 data-[state=active]:border-white data-[state=active]:text-white" : "text-zinc-500 hover:text-zinc-900 data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950")}>
                <Grid2X2 size={17} />
                Videos
              </TabsTrigger>
              <TabsTrigger value="favorites" className={cx(isDark ? "text-violet-100/45 hover:text-violet-100/80 data-[state=active]:border-white data-[state=active]:text-white" : "text-zinc-500 hover:text-zinc-900 data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950")}>
                {isOwnProfile ? <Bookmark size={17} /> : <LockKeyhole size={17} />}
                Favorites
              </TabsTrigger>
              <TabsTrigger value="liked" className={cx(isDark ? "text-violet-100/45 hover:text-violet-100/80 data-[state=active]:border-white data-[state=active]:text-white" : "text-zinc-500 hover:text-zinc-900 data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950")}>
                {isOwnProfile ? <Heart size={17} /> : <LockKeyhole size={17} />}
                Liked
              </TabsTrigger>
            </TabsList>
            <div className={cx("mb-2 inline-flex w-fit rounded-lg p-1 text-xs font-bold ring-1", isDark ? "bg-white/[0.06] text-violet-100/65 ring-violet-200/10" : "bg-white text-zinc-500 ring-violet-200")}>
              {(["latest", "popular", "oldest"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={cx(
                    "rounded-md px-3 py-2 capitalize transition",
                    sortMode === mode
                      ? isDark ? "bg-white/15 text-white" : "bg-violet-100 text-violet-950"
                      : isDark ? "hover:text-white" : "hover:text-zinc-950",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </Tabs>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
          {!privateTabLocked && sortedVideos.map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className={cx("group overflow-hidden rounded-md border", isDark ? "border-violet-200/10 bg-white/[0.05]" : "border-violet-100 bg-white")}
            >
              <div className="relative aspect-[9/14] overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : video.video_url ? (
                  <video
                    src={`${video.video_url}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={demoCover}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/78 to-transparent px-2 pb-2 pt-8 text-[11px] font-bold text-white">
                  <Heart size={13} fill="currentColor" /> {compactNumber(video.stats.likes)}
                </div>
              </div>
            </Link>
          ))}
          {(privateTabLocked || !sortedVideos.length) && (
            <div className={cx("col-span-full rounded-lg border px-5 py-10 text-center text-sm font-semibold", isDark ? "border-violet-200/10 bg-white/[0.04] text-violet-100/65" : "border-violet-200 bg-white text-zinc-500")}>
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="flex h-[min(92vh,760px)] flex-col p-0">
          <DialogHeader className={cx("border-b px-6 py-5 pr-16", modalDividerClass)}>
            <DialogTitle className="text-xl font-black">Edit profile</DialogTitle>
            <DialogDescription className="sr-only">
              Update your profile photo, username, display name, and bio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitEditProfile} className="flex min-h-0 flex-1 flex-col">
            <div className={cx("modern-scrollbar min-h-0 flex-1 divide-y overflow-y-auto px-6", modalDivideClass)}>
              <div className="grid gap-5 py-6 sm:grid-cols-[128px_1fr]">
                <label className={cx("text-sm font-bold", modalLabelClass)}>Profile photo</label>
                  <div className="flex flex-col gap-4">
                    <div className="relative h-24 w-24">
                      <UserAvatar src={editAvatarPreview || editDraft.avatar || null} size={96} className={cx("h-24 w-24 ring-2", modalPhotoRingClass)} />
                      <label className={cx("absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full shadow-lg ring-4 transition", modalAvatarUploadClass)} aria-label="Upload profile photo">
                        {avatarUploading ? <LoaderCircle className="animate-spin" size={17} /> : <Camera size={17} />}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={avatarUploading}
                          onChange={(event) => {
                            void handleAvatarUpload(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <label className={cx("inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition", modalUploadButtonClass)}>
                          {avatarUploading ? <LoaderCircle className="animate-spin" size={16} /> : <Camera size={16} />}
                          Upload photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            disabled={avatarUploading}
                            onChange={(event) => {
                              void handleAvatarUpload(event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {editDraft.avatar && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditAvatarPreview("");
                              setEditDraft((draft) => ({ ...draft, avatar: "" }));
                            }}
                            className={cx("h-10 rounded-md border px-4 text-sm font-bold transition", modalSoftButtonClass)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        value={editDraft.avatar}
                        onChange={(event) => {
                          setEditAvatarPreview("");
                          setEditDraft((draft) => ({ ...draft, avatar: event.target.value }));
                        }}
                        placeholder="Avatar URL, or upload a photo"
                        className={cx("h-11 w-full rounded-md border px-3 text-sm outline-none transition", modalInputClass)}
                      />
                      <p className={cx("mt-2 text-xs leading-5", modalHintClass)}>Upload a JPG, PNG, or WebP image up to 5 MB. Empty keeps the default avatar icon.</p>
                      {editFieldErrors.avatar && <FieldError messages={editFieldErrors.avatar} />}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 py-6 sm:grid-cols-[128px_1fr]">
                  <label htmlFor="profile-username" className={cx("text-sm font-bold", modalLabelClass)}>Username</label>
                  <div>
                    <input
                      id="profile-username"
                      value={editDraft.username}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, username: event.target.value }))}
                      maxLength={30}
                      className={cx("h-11 w-full rounded-md border px-3 text-sm outline-none transition", modalInputClass)}
                    />
                    <p className={cx("mt-2 text-xs leading-5", modalHintClass)}>Letters, numbers, dashes, and underscores only. Changing it updates your profile link.</p>
                    {editFieldErrors.username && <FieldError messages={editFieldErrors.username} />}
                  </div>
                </div>

                <div className="grid gap-5 py-6 sm:grid-cols-[128px_1fr]">
                  <label htmlFor="profile-name" className={cx("text-sm font-bold", modalLabelClass)}>Name</label>
                  <div>
                    <input
                      id="profile-name"
                      value={editDraft.name}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, name: event.target.value }))}
                      maxLength={80}
                      className={cx("h-11 w-full rounded-md border px-3 text-sm outline-none transition", modalInputClass)}
                    />
                    <p className={cx("mt-2 text-xs leading-5", modalHintClass)}>This is your display name on profile surfaces.</p>
                    {editFieldErrors.name && <FieldError messages={editFieldErrors.name} />}
                  </div>
                </div>

                <div className="grid gap-5 py-6 sm:grid-cols-[128px_1fr]">
                  <label htmlFor="profile-bio" className={cx("text-sm font-bold", modalLabelClass)}>Bio</label>
                  <div>
                    <textarea
                      id="profile-bio"
                      value={editDraft.bio}
                      onChange={(event) =>
                        setEditDraft((draft) => ({
                          ...draft,
                          bio: event.target.value.slice(0, BIO_MAX_LENGTH),
                        }))
                      }
                      maxLength={BIO_MAX_LENGTH}
                      rows={4}
                      placeholder="Tell people about yourself"
                      className={cx("min-h-28 w-full resize-none rounded-md border px-3 py-3 text-sm outline-none transition", modalInputClass)}
                    />
                    <div className={cx("mt-2 flex items-center justify-between gap-3 text-xs", modalHintClass)}>
                      <span>Keep it short and memorable.</span>
                      <span>{editDraft.bio.length}/{BIO_MAX_LENGTH}</span>
                    </div>
                    {editFieldErrors.bio && <FieldError messages={editFieldErrors.bio} />}
                  </div>
                </div>
              </div>

              {editError && (
                <p className={cx("mx-6 mb-4 rounded-md border px-3 py-2 text-sm font-medium", modalErrorClass)}>
                  {editError}
                </p>
              )}

              <DialogFooter className={cx("shrink-0 border-t px-4 py-4 sm:px-6", modalFooterClass)}>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className={cx("h-10 min-w-24 rounded-md border px-5 text-sm font-bold transition", modalSoftButtonClass)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || avatarUploading || !editDraft.username.trim()}
                  className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-md bg-[#7545e8] px-5 text-sm font-bold text-white  transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editSaving && <LoaderCircle className="animate-spin" size={16} />}
                  Save
                </button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {relationPanel && (
        <div className={cx("fixed inset-0 z-50 backdrop-blur-sm", isDark ? "bg-black/60" : "bg-zinc-950/28")} onClick={() => setRelationPanel(null)}>
          <aside
            className={cx("ml-auto flex h-full w-full max-w-md flex-col border-l p-5 shadow-[-24px_0_80px_rgba(0,0,0,0.18)]", isDark ? "border-violet-200/10 bg-[#0b0614] text-white shadow-[-24px_0_80px_rgba(0,0,0,0.55)]" : "border-zinc-200 bg-white text-zinc-950")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className={cx("text-lg font-bold", isDark ? "text-white" : "text-zinc-950")}>
                  {relationPanel === "followers" ? "Followers" : "Following"}
                </h2>
                <p className={cx("text-sm", isDark ? "text-violet-100/55" : "text-zinc-500")}>
                  {relationPanel === "followers"
                    ? `${profile.followers_count} followers`
                    : `${profile.following_count} following`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRelationPanel(null)}
                className={cx("rounded-lg p-2 transition", isDark ? "text-violet-100/70 hover:bg-white/10" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950")}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {relationLoading && (
                <div className={cx("grid h-40 place-items-center text-sm font-semibold", isDark ? "text-violet-100/55" : "text-zinc-500")}>
                  <LoaderCircle className="mb-2 animate-spin" size={22} />
                  Loading
                </div>
              )}

              {!relationLoading && relationError && (
                <p className={cx("rounded-md border px-3 py-2 text-sm font-medium", isDark ? "border-pink-400/20 bg-pink-500/10 text-pink-100" : "border-pink-200 bg-pink-50 text-pink-700")}>
                  {relationError}
                </p>
              )}

              {!relationLoading && !relationError && relationUsers.map((person) => (
                <Link
                  key={person.id}
                  href={`/profile/${person.username}`}
                  onClick={() => setRelationPanel(null)}
                  className={cx("flex items-center gap-3 rounded-lg p-3 ring-1 transition", isDark ? "bg-white/[0.06] ring-violet-200/10 hover:bg-white/[0.09]" : "bg-zinc-50 ring-zinc-200 hover:bg-violet-50")}
                >
                  <UserAvatar src={person.avatar} size={44} className="h-11 w-11" />
                  <div className="min-w-0">
                    <p className={cx("truncate text-sm font-bold", isDark ? "text-white" : "text-zinc-950")}>@{person.username}</p>
                    {person.bio && (
                      <p className={cx("line-clamp-1 text-sm", isDark ? "text-violet-100/55" : "text-zinc-500")}>{person.bio}</p>
                    )}
                  </div>
                </Link>
              ))}

              {!relationLoading && !relationError && !relationUsers.length && (
                <p className={cx("pt-10 text-center text-sm font-semibold", isDark ? "text-violet-100/45" : "text-zinc-400")}>
                  No users yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function FieldError({ messages }: { messages: string[] }) {
  return <p className="mt-2 text-xs font-medium text-pink-200">{messages[0]}</p>;
}

function sortProfileVideos(videos: Video[], sortMode: SortMode): Video[] {
  return [...videos].sort((left, right) => {
    if (sortMode === "popular") return right.stats.likes - left.stats.likes;

    const leftTime = new Date(left.created_at ?? 0).getTime();
    const rightTime = new Date(right.created_at ?? 0).getTime();

    return sortMode === "latest" ? rightTime - leftTime : leftTime - rightTime;
  });
}
