export const queryKeys = {
  comments: (videoId: number) => ["comments", videoId] as const,
  feed: (scope: "for-you" | "following", authScope: "auth" | "guest", initialVideoId?: number) =>
    ["feed", scope, authScope, initialVideoId ?? null] as const,
  likedVideos: (authScope: "auth" | "guest") => ["liked-videos", authScope] as const,
  myVideos: (authScope: "auth" | "guest") => ["my-videos", authScope] as const,
  profile: (username: string, authScope: "auth" | "guest") => ["profile", username, authScope] as const,
  savedVideos: (authScope: "auth" | "guest") => ["saved-videos", authScope] as const,
  userVideos: (username: string, authScope: "auth" | "guest") => ["user-videos", username, authScope] as const,
};
