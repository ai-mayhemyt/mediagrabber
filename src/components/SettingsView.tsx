import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, BellRing, BellOff, Smartphone, Send } from 'lucide-react';
import { MediaGrabberSettings } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NotificationControlProps {
  isEnabled: boolean;
  pushSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  busy: boolean;
  onToggle: () => Promise<void>;
  onTest: () => Promise<void>;
}

interface SettingsViewProps {
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
  onStorageRefresh: () => void;
  notifications?: NotificationControlProps;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNotify,
  onStorageRefresh,
  notifications,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [settings, setSettings] = useState<MediaGrabberSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanningJellyfin, setScanningJellyfin] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => onNotify('error', 'Failed to load settings'));
  }, []);

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-xs" style={{ color: 'var(--mg-muted)' }}>
        Loading configuration...
      </div>
    );
  }

  const updateField = <K extends keyof MediaGrabberSettings>(
    key: K,
    value: MediaGrabberSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.settings) setSettings(data.settings);
      onNotify('success', 'Settings saved.');
      onStorageRefresh();
    } catch (err: any) {
      onNotify('error', err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleJellyfinScan = async () => {
    setScanningJellyfin(true);
    try {
      const res = await fetch('/api/scan-media', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Jellyfin refresh failed.');
      } else {
        onNotify('success', data.message || 'Jellyfin library refresh triggered.');
      }
    } catch {
      onNotify('error', 'Failed to connect to Jellyfin endpoint.');
    } finally {
      setScanningJellyfin(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors';
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--mg-bg)',
    borderColor: 'var(--mg-border)',
    color: 'var(--mg-text)',
  };

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto flex flex-col gap-6 pb-8">
      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <h2 className="font-display text-sm font-semibold border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          Video &amp; Audio Output
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Max Video Resolution</span>
            <select
              value={settings.video_res}
              onChange={(e) => updateField('video_res', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="2160">4K (2160p)</option>
              <option value="1440">1440p</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Container Format</span>
            <select
              value={settings.container}
              onChange={(e) => updateField('container', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mkv">MKV</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Audio Format</span>
            <select
              value={settings.audio_format}
              onChange={(e) => updateField('audio_format', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
              <option value="m4a">M4A</option>
              <option value="opus">Opus</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Audio Bitrate</span>
            <select
              value={settings.audio_bitrate}
              onChange={(e) => updateField('audio_bitrate', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="320k">320 kbps</option>
              <option value="256k">256 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="128k">128 kbps</option>
            </select>
          </label>
        </div>

        <label className="inline-flex items-center gap-2.5 text-xs font-medium cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={settings.generate_lrc}
            onChange={(e) => updateField('generate_lrc', e.target.checked)}
            className="w-4 h-4 accent-[var(--mg-accent)]"
          />
          <span>Generate synchronized .lrc lyrics sidecars for music tracks</span>
        </label>
      </section>

      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <h2 className="font-display text-sm font-semibold border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          Folder Structure &amp; Storage Paths
        </h2>
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          <span>Organization Template</span>
          <select
            value={settings.folder_structure}
            onChange={(e) => updateField('folder_structure', e.target.value as 'default' | 'flat')}
            className={inputClass}
            style={inputStyle}
          >
            <option value="default">Default (YouTube: Uploader/Year, Spotify: Artist/Album)</option>
            <option value="flat">Flat (all files in base root)</option>
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3.5">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>YouTube Base Path</span>
            <input
              type="text"
              value={settings.yt_base_path}
              onChange={(e) => updateField('yt_base_path', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Music Base Path</span>
            <input
              type="text"
              value={settings.music_base_path}
              onChange={(e) => updateField('music_base_path', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Gallery Base Path</span>
            <input
              type="text"
              value={settings.gallery_base_path}
              onChange={(e) => updateField('gallery_base_path', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          <h2 className="font-display text-sm font-semibold">Media Server Integrations</h2>
          <button
            type="button"
            disabled={scanningJellyfin}
            onClick={handleJellyfinScan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanningJellyfin ? 'animate-spin' : ''}`} />
            <span>Trigger Jellyfin Scan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Jellyfin URL</span>
            <input
              type="text"
              value={settings.jellyfin_url}
              onChange={(e) => updateField('jellyfin_url', e.target.value)}
              placeholder="http://localhost:8096"
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Jellyfin API Key</span>
            <input
              type="password"
              value={settings.jellyfin_api_key}
              onChange={(e) => updateField('jellyfin_api_key', e.target.value)}
              placeholder="(optional)"
              className={inputClass}
              style={inputStyle}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Navidrome URL</span>
            <input
              type="text"
              value={settings.navidrome_url}
              onChange={(e) => updateField('navidrome_url', e.target.value)}
              placeholder="http://localhost:4533"
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Navidrome API Key</span>
            <input
              type="password"
              value={settings.navidrome_api_key}
              onChange={(e) => updateField('navidrome_api_key', e.target.value)}
              placeholder="(optional)"
              className={inputClass}
              style={inputStyle}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Plex URL</span>
            <input
              type="text"
              value={settings.plex_url}
              onChange={(e) => updateField('plex_url', e.target.value)}
              placeholder="http://localhost:32400"
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Plex Token</span>
            <input
              type="password"
              value={settings.plex_token}
              onChange={(e) => updateField('plex_token', e.target.value)}
              placeholder="Plex X-Token"
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <h2 className="font-display text-sm font-semibold border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          Cookies, SMTP &amp; Extractor Arguments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>YouTube Cookies Path</span>
            <input
              type="text"
              value={settings.cookies_youtube_path}
              onChange={(e) => updateField('cookies_youtube_path', e.target.value)}
              placeholder="/path/to/youtube_cookies.txt"
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Gallery Cookies Path</span>
            <input
              type="text"
              value={settings.cookies_gallery_path}
              onChange={(e) => updateField('cookies_gallery_path', e.target.value)}
              placeholder="/path/to/gallery_cookies.txt"
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>yt-dlp Extra Args</span>
            <input
              type="text"
              value={settings.ytdlp_extra}
              onChange={(e) => updateField('ytdlp_extra', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>spotdl Extra Args</span>
            <input
              type="text"
              value={settings.spotdl_extra}
              onChange={(e) => updateField('spotdl_extra', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>gallery-dl Extra Args</span>
            <input
              type="text"
              value={settings.gallerydl_extra}
              onChange={(e) => updateField('gallerydl_extra', e.target.value)}
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>SMTP Host</span>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => updateField('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>SMTP Port</span>
            <input
              type="text"
              value={settings.smtp_port}
              onChange={(e) => updateField('smtp_port', e.target.value)}
              placeholder="587"
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>SMTP Username</span>
            <input
              type="text"
              value={settings.smtp_user}
              onChange={(e) => updateField('smtp_user', e.target.value)}
              placeholder="you@gmail.com"
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>SMTP Password / App Password</span>
            <input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => updateField('smtp_pass', e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--mg-border)' }}>
          <span className="text-xs" style={{ color: 'var(--mg-muted)' }}>
            Save SMTP settings before testing outbound email delivery.
          </span>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/settings/email/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: settings.smtp_user }),
                });
                const data = await res.json();
                if (!res.ok) onNotify('error', data.error || 'SMTP test failed');
                else onNotify('success', data.message || 'SMTP test succeeded');
              } catch {
                onNotify('error', 'SMTP test request failed');
              }
            }}
            className="px-3 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            Send Test Email
          </button>
        </div>
      </section>

      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <h2 className="font-display text-sm font-semibold border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          PWA App &amp; Push Notifications
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium" style={{ color: 'var(--mg-text)' }}>
              Download Completion &amp; Failure Alerts
            </div>
            <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              {notifications?.isEnabled
                ? notifications.pushSubscribed
                  ? 'Web Push subscription active (VAPID).'
                  : 'Browser notification alerts active.'
                : notifications?.permission === 'denied'
                ? 'Blocked in browser site settings — allow notifications for this origin to re-enable.'
                : 'Receive desktop or mobile alerts whenever queued jobs finish or fail.'}
            </div>
          </div>

          {notifications && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={notifications.busy}
                onClick={() => void notifications.onToggle()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{
                  backgroundColor: notifications.isEnabled ? 'var(--mg-accent)' : 'var(--mg-bg)',
                  borderColor: notifications.isEnabled ? 'var(--mg-accent)' : 'var(--mg-border)',
                  color: notifications.isEnabled ? '#ffffff' : 'var(--mg-text)',
                }}
              >
                {notifications.isEnabled ? (
                  <>
                    <BellOff className="w-3.5 h-3.5" />
                    <span>Disable Alerts</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Enable Alerts</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={notifications.busy}
                onClick={() => void notifications.onTest()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Test</span>
              </button>
            </div>
          )}
        </div>

        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--mg-muted)' }}>
            <Smartphone className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            <span>
              {isInstalled
                ? 'Running as an installed standalone PWA.'
                : isInstallable
                ? 'Ready to install as a desktop or mobile app.'
                : isIOS
                ? 'On iOS Safari: tap Share → Add to Home Screen to install.'
                : 'Install via browser address bar icon or HTTPS origin.'}
            </span>
          </div>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={async () => {
                const ok = await install();
                if (ok) onNotify('success', 'MediaGrabber installed as an app.');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              Install PWA
            </button>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
          style={{ backgroundColor: 'var(--mg-accent)' }}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </form>
  );
};
