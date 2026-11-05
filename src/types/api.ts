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
  restricted_access?: boolean;
};

export type AuthResponse = {
  data: {
    user: Profile | null;
    token: string | null;
    token_expires_at: string | null;
    restricted_access?: boolean;
    onboarding_required?: boolean;
    onboarding_token?: string;
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
  audio_id?: number | null;
  audio_mode?: "replace" | "mix" | null;
  audio_settings?: Record<string, unknown> | null;
  audio?: AudioTrack | null;
  reuse_content?: boolean;
  moderation_status?: string;
  processing_state?: "processing" | "ready" | "failed";
  publication_state?: "draft" | "scheduled" | "published";
  publication_intent?: "draft" | "immediate";
  published_at?: string | null;
  version?: number;
  tags: string[];
  location_name: string | null;
  visibility: "public" | "followers" | "private";
  high_quality_upload: boolean;
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
  provider: "original" | "library" | "local";
  preview_url?: string;
  artwork_url?: string;
  duration?: number;
  license_url?: string;
  saved?: boolean;
  videos_count?: number;
  origin?: AudioTrack["origin"];
};

export type AudioTrack = {
  id: number;
  title: string;
  audio_url: string | null;
  duration: number | null;
  origin: "original" | "upload" | "library";
  status: "processing" | "ready" | "failed" | "withdrawn";
  reuse_allowed: boolean;
  moderation_status: string;
  source_video_id: number | null;
  videos_count: number;
  creator: UserSummary;
  viewer: { saved: boolean };
  created_at: string;
};

export type Comment = {
  id: number;
  video_id: number;
  parent_id: number | null;
  body: string;
  user: UserSummary;
  created_at: string;
  replies_count: number;
  reactions: Record<CommentReactionType, number>;
  viewer_reaction: CommentReactionType | null;
};

export type CommentReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

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

export type CursorResponse<T> = {
  data: T[];
  meta: { limit: number; next_cursor: string | null; has_more?: boolean; unread_count?: number };
};

export type PolicyCatalog = {
  minimum_age: number;
  policies: Record<string, { version: string; url: string; required: boolean }>;
  rights_version: string;
  rights_declaration: string;
};

export type Genre = { id: number; name: string; slug: string };
export type ArtistLink = { label: string; type: "website" | "music" | "merchandise" | "social"; url: string };
export type ArtistCapabilities = {
  plan: string;
  links: number;
  playlists: number;
  featured_release: boolean;
  enhanced_profile: boolean;
  enhanced_directory_card: boolean;
  analytics_30_days: boolean;
  release_scheduling: boolean;
  fan_announcements: number;
  announcement_recipients: number;
  monthly_boost_credit_cents: number;
};
export type Artist = {
  id: number;
  user_id: number;
  stage_name: string;
  slug: string;
  bio: string | null;
  location: string | null;
  image_url: string | null;
  image?: string | null;
  listed: boolean;
  genres: Genre[];
  links: ArtistLink[];
  featured_release: Video | null;
  featured_video_id?: number | null;
  followers_count: number;
  announcement_subscribers_count: number;
  presentation: { enhanced_profile: boolean; enhanced_directory_card: boolean };
  viewer: { following: boolean; updates_subscribed: boolean; update_subscriptions_available: boolean };
  capabilities?: ArtistCapabilities;
  moderation_status?: string;
  data_since?: string;
  created_at: string;
  updated_at: string;
};
export type ArtistTaxonomy = { genres: Genre[]; playlist_categories: string[]; link_types: ArtistLink["type"][] };
export type ArtistPlaylist = {
  id: number; artist_id: number; title: string; description: string | null; genre_id: number | null;
  category: string; visibility: "public" | "private"; videos_count: number; cover_url: string | null;
  version?: number; read_only?: boolean; moderation_status?: string; videos?: Video[];
  items?: Array<{ video_id: number; position: number; video?: Video }>;
  created_at: string; updated_at: string;
};
export type ArtistAnalytics = {
  totals: Record<string, number>;
  data_since: string;
  trends_available: boolean;
  metrics?: Array<{ key: string; label: string; description?: string }>;
  daily: Array<Record<string, string | number>>;
};
export type ArtistFanSummary = {
  followers_count: number;
  announcement_subscribers_count: number;
  trends_available: boolean;
};

export type PlanOffer = {
  code: string; name?: string; amount: number; currency: string; interval?: string; offer_version?: string;
  checkout_enabled?: boolean; limits: Omit<ArtistCapabilities, "plan">;
};
export type PlanCatalog = { offers: PlanOffer[]; environment: "test" | "live"; live_sales_enabled: boolean; disclosures: string[] };
export type Entitlements = { effective_plan: string; access_ends_at: string | null; capabilities: ArtistCapabilities; usage?: Record<string, number> };
export type Subscription = { effective_plan: string; paid_through: string | null; cancel_at_period_end: boolean; renewal_pending: boolean; status?: string };
export type Invoice = { id: string | number; amount_paid: number; currency: string; status: string; created_at: string; receipt_url: string | null };
export type CheckoutStatus = { reference: string; status: string; payment_status?: string; plan_code?: string; access_pending?: boolean; expires_at?: string | null };

export type Release = Video & {
  version: number; processing_state: "processing" | "ready" | "failed";
  publication_state: "draft" | "scheduled" | "published"; moderation_status: string;
  error_code?: string | null; publish_at?: string | null; timezone?: string | null; paused_reason?: string | null;
  preview?: { video: string | null; thumbnail: string | null; original_audio: string | null };
};

export type ConversationMessage = {
  id: number; conversation_id: number; sender_user_id: number; client_message_id: string;
  body: string; unavailable: boolean; created_at: string;
};
export type Conversation = {
  id: number; recipient_user_id: number; version: number; can_send: boolean; last_read_message_id: number;
  muted: boolean; unread_count: number; last_message: ConversationMessage | null; created_at: string;
};
export type MessagePage = { data: ConversationMessage[]; meta: { has_more: boolean; next_before_id: number | null; next_after_id: number | null } };
export type CommunicationPreferences = {
  allow_direct_messages: boolean;
  artist_updates_enabled: boolean;
  message_alerts_enabled: boolean;
  mute_new_conversations: boolean;
  updates_revision: number;
};
export type Announcement = {
  id: number; artist_id: number; title: string; body: string; video_id: number | null; version: number;
  status?: string; moderation_status?: string; recipient_count?: number; recipient_estimate?: number;
  delivered_count?: number; suppressed_count?: number; read_at?: string | null; delivered_at?: string; created_at: string;
};

export type PromotionOffer = {
  id: string; surface: string; enabled: boolean; configured: boolean; price_cents: number; currency: string;
  duration_seconds: number; capacity: number; rights_version: string; disclosure: string; terms: string;
};
export type PromotionPlacement = {
  boost_id: number; surface: string; disclosure: string; sponsor: { artist_id: number; user_id: number; name: string; slug: string };
  video: Video; expires_at: string; event_token: string;
};
export type BoostBalance = { available_cents: number; reserved_cents: number; used_cents: number; held_cents: number; currency: string; spending_held: boolean };
export type Boost = {
  id: number; artist_id: number; video_id: number; offer_id: string; surface: string; status: string; version: number;
  price_cents: number; currency: string; duration_seconds: number; starts_at: string; ends_at: string; stop_reason: string | null;
  report: { reserved_cents: number; charged_cents: number; returned_cents: number; delivered_seconds: number; undelivered_seconds: number; render_events: number; click_events: number };
  created_at: string;
};

export type Notification = {
  id: number;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};
