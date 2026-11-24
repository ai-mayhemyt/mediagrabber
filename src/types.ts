export type EngineType = 'YOUTUBE' | 'YT MUSIC' | 'SPOTIFY' | 'GALLERY';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface Job {
  job_id: string;
  url: string;
  title?: string;
  uploader?: string;
  mode: 'video' | 'audio';
  engine: EngineType;
  status: JobStatus;
  progress: number;
  file: string | null;
  thumbnail: string | null;
  output_dir: string | null;
  log: string[];
  created_at: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  timestamp: string;
  source: 'youtube' | 'ytmusic' | 'spotify' | 'gallery' | 'other';
  file?: string;
}

export interface MediaGrabberSettings {
  video_res: string;
  container: string;
  audio_format: string;
  audio_bitrate: string;
  generate_lrc: boolean;
  folder_structure: 'default' | 'flat';
  yt_base_path: string;
  music_base_path: string;
  gallery_base_path: string;
  cookies_youtube_path: string;
  cookies_gallery_path: string;
  jellyfin_url: string;
  jellyfin_api_key: string;
  navidrome_url: string;
  navidrome_api_key: string;
  plex_url: string;
  plex_token: string;
  plex_section_id: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  ytdlp_extra: string;
  spotdl_extra: string;
  gallerydl_extra: string;
  webhook_url?: string;
  stale_timeout_minutes?: number;
  quick_start_completed?: boolean;
}

export interface StorageMount {
  free_gb?: number;
  total_gb?: number;
  percent_used?: number;
  path?: string;
  error?: string;
}

export type StorageMap = Record<string, StorageMount>;

export interface MediaFileItem {
  path: string;
  filename: string;
  title: string;
  artist: string;
  album: string;
  date: string;
  description: string;
  extension: string;
  size_bytes: number;
  has_cover: boolean;
  cover_url?: string;
}

export interface ArchiveEntry {
  raw: string;
  source: string;
  id: string;
  url: string;
}

export interface RadioStation {
  id: string;
  name: string;
  url: string;
  homepage?: string;
  country?: string;
  tags?: string;
  bitrate?: number;
  codec?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string;
  theme: 'dark' | 'light';
  totp_enabled: boolean;
  theme_colors?: ThemeColors | null;
}

export interface ThemeColors {
  bg: string;
  sidebar: string;
  card: string;
  border: string;
  text: string;
  accent: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export interface ScheduledJob {
  id: number;
  url: string;
  mode: 'video' | 'audio';
  scheduled_time: string;
  status: 'pending' | 'fired' | 'failed';
  created_at: string;
  fired_at: string | null;
  job_id: string | null;
}

export interface ApiToken {
  id: number;
  name: string;
  token_prefix: string;
  scope: 'read' | 'download' | 'admin';
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface VersionInfo {
  current: string;
  latest: string;
  channel?: 'nightly' | 'stable';
  is_prerelease?: boolean;
  update_available: boolean;
  release_zip_url?: string | null;
  checked_at: string;
  tags: string[];
  error: string | null;
}

export interface SignedFileDownload {
  url: string;
  filename: string;
  size_bytes: number;
  expires_at: string;
}

export interface YoutubeFeedChannel {
  channelId: string;
  title: string;
  addedAt: string;
}

export interface YoutubeFeedVideo {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  url: string;
  thumbnail: string;
  published: string;
}

export interface MediaPreviewItem {
  inlineUrl: string;
  downloadUrl: string;
  filename: string;
  size_bytes: number;
  isAudio: boolean;
}

export interface StatsOverview {
  queue: {
    total: number;
    queued: number;
    running: number;
    done: number;
    failed: number;
    cancelled: number;
  };
  history: {
    total: number;
    recent_24h: number;
    recent_7d: number;
    by_source: Record<string, number>;
  };
  success_rate: number;
  storage_summary: {
    total_files: number;
    total_bytes: number;
    libraries: {
      name: string;
      path: string;
      file_count: number;
      size_bytes: number;
    }[];
  };
}

export interface NetwatchStatus {
  timer_active: boolean;
  timer_enabled: boolean;
  next_run_seconds: number;
  last_run_ts: string | null;
  consecutive_failures: number;
  iface: string;
  gateway: string;
  recent_log: string[];
}

export type ActiveView = 'queue' | 'history' | 'utilities' | 'settings';

