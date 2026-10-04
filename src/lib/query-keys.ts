export const queryKeys = {
  notifications: (userId: number) => ["notifications", userId] as const,
  comments: (videoId: number, userId = 0) => ["comments", videoId, userId] as const,
  commentReplies: (parentId: number, userId = 0) => ["comment-replies", parentId, userId] as const,
  feed: (scope: "for-you" | "following", authScope: number | "guest", initialVideoId?: number) =>
    ["feed", scope, authScope, initialVideoId ?? null] as const,
  likedVideos: (authScope: "auth" | "guest") => ["liked-videos", authScope] as const,
  myVideos: (authScope: number | "guest") => ["my-videos", authScope] as const,
  profile: (username: string, authScope: "auth" | "guest") => ["profile", username, authScope] as const,
  savedVideos: (authScope: "auth" | "guest") => ["saved-videos", authScope] as const,
  userVideos: (username: string, authScope: "auth" | "guest") => ["user-videos", username, authScope] as const,
};
