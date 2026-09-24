export type UserSummary = {
  id: number;
  name?: string | null;
  username: string;
  avatar: string | null;
  bio?: string | null;
  verified?: boolean;
  followers_count?: number;
  following_count?: number;
  following?: boolean;
  cover_url?: string | null;
  cover_video_url?: string | null;
};

export type Profile = UserSummary & {
  email: string;
  email_verified_at: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
  videos_count: number;
  following: boolean;
};

export type AuthResponse = {
  data: {
    user: Profile;
    token: string;
    token_expires_at: string | null;
  };
};

export type SingleResponse<T> = {
  data: T;
};

export type Video = {
  id: number;
  video_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  duration: number | null;
  status: "processing" | "published" | "failed" | "deleted";
  user: UserSummary;
  stats: {
    views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  };
  viewer: {
    liked: boolean;
    saved: boolean;
    following: boolean;
  };
  sound_name: string | null;
  sound_artist: string | null;
  sound_provider: "original" | "jamendo" | "local" | null;
  sound_external_id: string | null;
  sound_preview_url: string | null;
  music: string;
  tags: string[];
  location_name: string | null;
  visibility: "public" | "followers" | "private";
  high_quality_upload: boolean;
  scheduled_at: string | null;
  pinned_at: string | null;
  edit: {
    trim_start: number | null;
    trim_end: number | null;
    cover_time: number | null;
    crop_mode: "fit" | "fill" | null;
    text_overlay: string | null;
    original_audio_muted: boolean;
    cut_points?: number[];
    filter_settings?: Record<string, unknown> | null;
    effect_settings?: Record<string, unknown> | null;
  };
  created_at: string | null;
};

export type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  provider: "original" | "jamendo" | "local";
  preview_url?: string;
  artwork_url?: string;
  duration?: number;
  license_url?: string;
};

export type Comment = {
  id: number;
  video_id: number;
  parent_id: number | null;
  body: string;
  user: UserSummary;
  created_at: string;
};

export type UploadSignedResponse = {
  upload_method: "signed_url";
  storage_path: string;
  upload_url: string;
  headers: Record<string, string>;
};

export type UploadFallbackResponse = {
  upload_method: "multipart";
  upload_url: string;
  storage_path: null;
  headers: Record<string, string>;
  field_name: "file";
  message: string;
};

export type LocalVideoUploadResponse = {
  upload_method: "multipart" | "chunked";
  storage_path: string;
  video_url: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
