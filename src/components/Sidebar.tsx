import React, { useCallback, useEffect, useState } from 'react';
import {
  ListVideo,
  History,
  Wrench,
  Settings,
  Palette,
  HardDrive,
  User as UserIcon,
  LogOut,
  Rss,
  Plus,
  RefreshCw,
  Film,
  Music,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  ActiveView,
  StorageMap,
  UserAccount,
  YoutubeFeedChannel,
  YoutubeFeedVideo,
} from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  user: UserAccount | null;
  storage: StorageMap;
  version?: string;
  onOpenAccount: () => void;
  onOpenTheme: () => void;
  onLogout: () => void;
  onGrab?: (urls: string[], mode: 'video' | 'audio') => Promise<string[]>;
  onNotify?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

const NAV_ITEMS: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'queue', label: 'Queue', icon: ListVideo },
  { id: 'history', label: 'History', icon: History },
  { id: 'utilities', label: 'Utilities', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  user,
  storage,
  version = 'v2.0-pre4',
  onOpenAccount,
  onOpenTheme,
  onLogout,
  onGrab,
  onNotify,
}) => {
  const visibleNav =
    user?.role === 'user' ? NAV_ITEMS.filter((item) => item.id !== 'settings') : NAV_ITEMS;

  const [feedsOpen, setFeedsOpen] = useState(true);
  const [channels, setChannels] = useState<YoutubeFeedChannel[]>([]);
  const [videos, setVideos] = useState<YoutubeFeedVideo[]>([]);
  const [feedInput, setFeedInput] = useState('');
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [addingFeed, setAddingFeed] = useState(false);
  const [grabbingVideoId, setGrabbingVideoId] = useState<string | null>(null);

  const loadYoutubeFeeds = useCallback(async (force = false) => {
    setLoadingFeeds(true);
    try {
      const res = await fetch(`/api/feeds/youtube${force ? '?force=1' : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      setChannels(Array.isArray(data.channels) ? data.channels : []);
      setVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch {
      // ignore transient network errors
    } finally {
      setLoadingFeeds(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadYoutubeFeeds(false);
    }
  }, [user, loadYoutubeFeeds]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = feedInput.trim();
    if (!raw || addingFeed) return;
    setAddingFeed(true);
    try {
      const res = await fetch('/api/feeds/youtube/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        onNotify?.('error', data.error || 'Could not add YouTube channel feed.');
        return;
      }
      setFeedInput('');
      onNotify?.('success', `Following ${data.channel?.title || 'channel'} RSS feed.`);
      await loadYoutubeFeeds(true);
    } catch {
      onNotify?.('error', 'Failed to add YouTube channel.');
    } finally {
      setAddingFeed(false);
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const res = await fetch(`/api/feeds/youtube/${encodeURIComponent(channelId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onNotify?.('info', 'Removed channel from YouTube Feeds.');
        await loadYoutubeFeeds(true);
      }
    } catch {
      onNotify?.('error', 'Failed to remove channel.');
    }
  };

  const handleQuickGrab = async (video: YoutubeFeedVideo, mode: 'video' | 'audio') => {
    if (!onGrab) return;
    setGrabbingVideoId(video.videoId);
    try {
      await onGrab([video.url], mode);
    } finally {
      setGrabbingVideoId(null);
    }
  };

  return (
    <aside
      className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--mg-sidebar)',
        borderColor: 'var(--mg-border)',
      }}
    >
      <div className="p-4 flex flex-col gap-5 flex-1 min-h-0">
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <BrandLogo className="w-7 h-7 shrink-0" />
            <span
              className="font-display text-xl font-bold tracking-tight whitespace-nowrap shrink-0 bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #a0b4ff 0%, #5b7cfa 100%)',
              }}
            >
              MediaGrabber
            </span>
          </div>
          <span
            className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--mg-card)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-muted)',
            }}
          >
            {version}
          </span>
        </div>

        {user && (
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onOpenAccount}
              className="flex items-center gap-3 flex-1 min-w-0 text-left p-2.5 rounded-lg border transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: 'var(--mg-card)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center border"
                style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-bg)' }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.display_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4" style={{ color: 'var(--mg-muted)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--mg-text)' }}
                >
                  {user.display_name}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--mg-muted)' }}>
                  {user.role === 'admin' ? 'Administrator' : 'Standard User'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
              className="px-2.5 rounded-lg border flex items-center justify-center transition-colors hover:text-red-400 shrink-0"
              style={{
                backgroundColor: 'var(--mg-card)',
                borderColor: 'var(--mg-border)',
                color: 'var(--mg-muted)',
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'var(--mg-accent)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--mg-text)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          className="rounded-lg border p-2.5 flex flex-col gap-2.5"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFeedsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold min-w-0 text-left"
              style={{ color: 'var(--mg-text)' }}
            >
              {feedsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-muted)' }} />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-muted)' }} />
              )}
              <Rss className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
              <span className="truncate">YouTube Feeds</span>
              {channels.length > 0 && (
                <span className="font-mono text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                  ({channels.length})
                </span>
              )}
            </button>
            <button
              type="button"
              disabled={loadingFeeds}
              onClick={() => void loadYoutubeFeeds(true)}
              title="Refresh YouTube RSS feeds"
              aria-label="Refresh YouTube RSS feeds"
              className="p-1 rounded hover:opacity-80 disabled:opacity-40 shrink-0"
              style={{ color: 'var(--mg-muted)' }}
            >
              <RefreshCw className={`w-3 h-3 ${loadingFeeds ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {feedsOpen && (
            <>
              <form onSubmit={handleAddChannel} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={feedInput}
                  onChange={(e) => setFeedInput(e.target.value)}
                  placeholder="@handle, URL, or UC..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                />
                <button
                  type="submit"
                  disabled={addingFeed || !feedInput.trim()}
                  aria-label="Follow YouTube channel"
                  className="p-1.5 rounded-md text-white shrink-0 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {channels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {channels.map((ch) => (
                    <span
                      key={ch.channelId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] max-w-full"
                      style={{
                        backgroundColor: 'var(--mg-bg)',
                        borderColor: 'var(--mg-border)',
                        color: 'var(--mg-text)',
                      }}
                    >
                      <span className="truncate max-w-[130px]">{ch.title}</span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveChannel(ch.channelId)}
                        aria-label={`Unfollow ${ch.title}`}
                        className="opacity-70 hover:opacity-100 hover:text-red-400 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5">
                {channels.length === 0 ? (
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--mg-muted)' }}>
                    Follow any YouTube channel via @handle, channel URL, or UC... ID for 1-click grabs (no API key needed).
                  </p>
                ) : videos.length === 0 ? (
                  <p className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                    {loadingFeeds ? 'Fetching latest uploads...' : 'No recent uploads loaded yet.'}
                  </p>
                ) : (
                  videos.slice(0, 12).map((v) => (
                    <div
                      key={v.videoId}
                      className="flex flex-col gap-1.5 p-2 rounded-md border"
                      style={{
                        backgroundColor: 'var(--mg-bg)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {v.thumbnail && (
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-8 rounded object-cover shrink-0 border"
                            style={{ borderColor: 'var(--mg-border)' }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[11px] font-medium leading-tight line-clamp-2"
                            style={{ color: 'var(--mg-text)' }}
                            title={v.title}
                          >
                            {v.title}
                          </div>
                          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                            {v.channelTitle}
                          </div>
                        </div>
                      </div>
                      {onGrab && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={grabbingVideoId === v.videoId}
                            onClick={() => void handleQuickGrab(v, 'video')}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                            style={{ backgroundColor: 'var(--mg-accent)' }}
                          >
                            <Film className="w-3 h-3" />
                            <span>Video</span>
                          </button>
                          <button
                            type="button"
                            disabled={grabbingVideoId === v.videoId}
                            onClick={() => void handleQuickGrab(v, 'audio')}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1 rounded border text-[11px] font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                          >
                            <Music className="w-3 h-3" />
                            <span>Audio</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col gap-4 p-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-3" style={{ color: 'var(--mg-muted)' }}>
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage Space</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {Object.entries(storage).map(([label, mount]) => (
              <div key={label} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: 'var(--mg-text)' }}>{label}</span>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--mg-muted)' }}>
                    {mount.error ? mount.error : `${mount.free_gb} / ${mount.total_gb} GB`}
                  </span>
                </div>
                {!mount.error && (
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--mg-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, mount.percent_used || 0)}%`,
                        backgroundColor:
                          (mount.percent_used || 0) > 90 ? '#dc2626' : 'var(--mg-accent)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTheme}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:opacity-90 whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-text)',
          }}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Theme Editor</span>
        </button>
      </div>
    </aside>
  );
};
