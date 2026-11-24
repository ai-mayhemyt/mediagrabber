import React, { useEffect, useRef, useState } from 'react';
import {
  Save,
  RefreshCw,
  BellRing,
  BellOff,
  Smartphone,
  Send,
  Download,
  Copy,
  Check,
  Upload,
  FileText,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { CookieStatusMap, MediaGrabberSettings } from '../types';
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
  refreshKey?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNotify,
  onStorageRefresh,
  notifications,
  refreshKey = 0,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [settings, setSettings] = useState<MediaGrabberSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanningJellyfin, setScanningJellyfin] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedRepoUrl, setCopiedRepoUrl] = useState(false);
  const [cookieStatus, setCookieStatus] = useState<CookieStatusMap | null>(null);
  const [cookiePasteKind, setCookiePasteKind] = useState<'youtube' | 'gallery' | null>(null);
  const [cookiePasteText, setCookiePasteText] = useState('');
  const [cookieBusyKind, setCookieBusyKind] = useState<'youtube' | 'gallery' | null>(null);
  const [runningAutoDedup, setRunningAutoDedup] = useState(false);
  const ytCookieInputRef = useRef<HTMLInputElement | null>(null);
  const galleryCookieInputRef = useRef<HTMLInputElement | null>(null);

  const jellyfinRepoUrl =
    'https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition/releases/latest/download/manifest.json';

  const loadCookieStatus = async () => {
    try {
      const res = await fetch('/api/settings/cookies/status', { cache: 'no-store' });
      if (res.ok) {
        setCookieStatus((await res.json()) as CookieStatusMap);
      }
    } catch {
      // ignore if non-admin or unavailable
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => onNotify('error', 'Failed to load settings'));
    void loadCookieStatus();
  }, [refreshKey]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <label className="inline-flex items-center gap-2.5 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={settings.generate_lrc}
              onChange={(e) => updateField('generate_lrc', e.target.checked)}
              className="w-4 h-4 accent-[var(--mg-accent)]"
            />
            <span>Generate synchronized .lrc lyrics sidecars for music tracks</span>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Max Concurrent Downloads</span>
            <select
              value={String(settings.max_concurrent_downloads ?? 2)}
              onChange={(e) =>
                updateField(
                  'max_concurrent_downloads',
                  Math.max(1, Math.min(8, Number(e.target.value) || 2))
                )
              }
              className={inputClass}
              style={inputStyle}
            >
              <option value="1">1 download at a time (Low CPU / Strict Rate Limit)</option>
              <option value="2">2 concurrent downloads (Recommended)</option>
              <option value="3">3 concurrent downloads</option>
              <option value="4">4 concurrent downloads</option>
              <option value="6">6 concurrent downloads</option>
              <option value="8">8 concurrent downloads (High Bandwidth)</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t" style={{ borderColor: 'var(--mg-border)' }}>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Bandwidth Limit (--limit-rate)</span>
            <select
              value={
                ['', '1M', '2M', '5M', '10M', '25M', '50M'].includes(settings.download_rate_limit || '')
                  ? settings.download_rate_limit || ''
                  : 'custom'
              }
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  updateField('download_rate_limit', e.target.value);
                }
              }}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Unlimited (Full Line Speed)</option>
              <option value="1M">1 MB/s (1M)</option>
              <option value="2M">2 MB/s (2M)</option>
              <option value="5M">5 MB/s (5M)</option>
              <option value="10M">10 MB/s (10M)</option>
              <option value="25M">25 MB/s (25M)</option>
              <option value="50M">50 MB/s (50M)</option>
              <option value="custom">Custom Rate</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Custom Rate Override (e.g. 500K, 3.5M)</span>
            <input
              type="text"
              value={settings.download_rate_limit || ''}
              onChange={(e) => updateField('download_rate_limit', e.target.value)}
              placeholder="Leave blank for unlimited (applied to yt-dlp & gallery-dl)"
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
        <h2 className="font-display text-sm font-semibold border-b pb-2.5" style={{ borderColor: 'var(--mg-border)' }}>
          Folder Structure, Paths &amp; Naming Templates
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

        <div className="pt-2 border-t flex flex-col gap-3" style={{ borderColor: 'var(--mg-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold">Custom Per-Site Filename Templates</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                Applied across Linux <code className="font-mono">grab</code>, Windows <code className="font-mono">grab.ps1</code>, and direct fallback. Path traversal (<code className="font-mono">..</code>) is blocked.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateField('yt_naming_template', '%(title).150s.%(ext)s');
                updateField('music_naming_template', '{artist}/{album}/{title}.{ext}');
                updateField('gallery_naming_template', '%(title).100s-%(id)s.%(ext)s');
              }}
              className="px-2.5 py-1 rounded border text-[11px] font-medium whitespace-nowrap shrink-0"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
            >
              Reset Defaults
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>YouTube / YT Music Output Template (<code className="font-mono">yt-dlp -o</code>)</span>
              <input
                type="text"
                value={settings.yt_naming_template ?? '%(title).150s.%(ext)s'}
                onChange={(e) => updateField('yt_naming_template', e.target.value)}
                placeholder="%(title).150s.%(ext)s"
                className={`${inputClass} font-mono text-xs`}
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Spotify Output Template (<code className="font-mono">spotdl --output</code>)</span>
              <input
                type="text"
                value={settings.music_naming_template ?? '{artist}/{album}/{title}.{ext}'}
                onChange={(e) => updateField('music_naming_template', e.target.value)}
                placeholder="{artist}/{album}/{title}.{ext}"
                className={`${inputClass} font-mono text-xs`}
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Social / Gallery Filename Template (<code className="font-mono">gallery-dl --filename</code>)</span>
              <input
                type="text"
                value={settings.gallery_naming_template ?? '%(title).100s-%(id)s.%(ext)s'}
                onChange={(e) => updateField('gallery_naming_template', e.target.value)}
                placeholder="%(title).100s-%(id)s.%(ext)s"
                className={`${inputClass} font-mono text-xs`}
                style={inputStyle}
              />
            </label>
          </div>
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

        <div
          className="mt-1 p-4 rounded-lg border flex flex-col gap-3"
          style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <img
                src="/pwa-192x192.png"
                alt="MediaGrabber — Jellyfin Edition"
                className="w-11 h-11 rounded-lg border shrink-0 object-cover"
                style={{ borderColor: 'var(--mg-border)' }}
              />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold" style={{ color: 'var(--mg-text)' }}>
                  MediaGrabber — Jellyfin Edition Plugin (Jellyfin 10.8 / 10.9 / 10.10 / 10.11+)
                </h3>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--mg-muted)' }}>
                  Connects your Jellyfin server to MediaGrabber so you can paste single or bulk YouTube, YouTube Music, Spotify, and social media links, pick Video or Audio format, and track queue progress directly inside Jellyfin. Requires a{' '}
                  <strong style={{ color: 'var(--mg-text)' }}>download</strong> or{' '}
                  <strong style={{ color: 'var(--mg-text)' }}>admin</strong> API token from Account → API Tokens.
                </p>
              </div>
            </div>
            <a
              href="/api/server/export-jellyfin-plugin"
              download="MediaGrabber-Jellyfin-Edition.zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Plugin Repo (.zip)</span>
            </a>
          </div>

          <div className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
            Add this Plugin Repository URL in{' '}
            <strong style={{ color: 'var(--mg-text)' }}>
              Jellyfin → Dashboard → Plugins → Repositories → +
            </strong>
            :
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={jellyfinRepoUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Jellyfin Plugin Repository Manifest URL"
              className={`${inputClass} font-mono text-xs flex-1`}
              style={{ ...inputStyle, backgroundColor: 'var(--mg-card)' }}
            />
            <button
              type="button"
              onClick={async () => {
                let ok = false;
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(jellyfinRepoUrl);
                    ok = true;
                  }
                } catch {
                  ok = false;
                }
                if (!ok) {
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = jellyfinRepoUrl;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    ok = document.execCommand('copy');
                    document.body.removeChild(ta);
                  } catch {
                    ok = false;
                  }
                }
                if (ok) {
                  setCopiedRepoUrl(true);
                  onNotify('success', 'Copied Jellyfin Plugin Repository URL.');
                  setTimeout(() => setCopiedRepoUrl(false), 2000);
                } else {
                  onNotify('error', 'Select the URL field above to copy.');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              {copiedRepoUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRepoUrl ? 'Copied' : 'Copy Repo URL'}</span>
            </button>
          </div>
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
          {(['youtube', 'gallery'] as const).map((kind) => {
            const label = kind === 'youtube' ? 'YouTube Cookies (cookies.txt)' : 'Gallery Cookies (cookies.txt)';
            const fieldKey = kind === 'youtube' ? 'cookies_youtube_path' : 'cookies_gallery_path';
            const st = cookieStatus?.[kind];
            const inputRef = kind === 'youtube' ? ytCookieInputRef : galleryCookieInputRef;
            const busy = cookieBusyKind === kind;

            return (
              <div
                key={kind}
                className="p-3.5 rounded-lg border flex flex-col gap-2.5"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{label}</span>
                  {st?.configured ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {st.line_count} {st.line_count === 1 ? 'cookie' : 'cookies'} ({st.source === 'managed' ? 'Managed' : 'Custom'})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                      Not configured
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={settings[fieldKey]}
                  onChange={(e) => updateField(fieldKey, e.target.value)}
                  placeholder={kind === 'youtube' ? '/path/to/youtube_cookies.txt' : '/path/to/gallery_cookies.txt'}
                  className={`${inputClass} font-mono text-xs`}
                  style={{ ...inputStyle, backgroundColor: 'var(--mg-card)' }}
                />

                <input
                  ref={inputRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setCookieBusyKind(kind);
                    try {
                      const fd = new FormData();
                      fd.append('kind', kind);
                      fd.append('file', file);
                      const res = await fetch('/api/settings/cookies', { method: 'POST', body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        onNotify('error', data.error || 'Failed to upload cookies.txt');
                        return;
                      }
                      if (data.settings) setSettings(data.settings);
                      await loadCookieStatus();
                      onNotify('success', `${kind === 'youtube' ? 'YouTube' : 'Gallery'} cookies uploaded and linked.`);
                    } catch {
                      onNotify('error', 'Failed to upload cookie file.');
                    } finally {
                      setCookieBusyKind(null);
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap disabled:opacity-50"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)', backgroundColor: 'var(--mg-card)' }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{busy ? 'Saving...' : 'Upload .txt'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setCookiePasteKind(cookiePasteKind === kind ? null : kind);
                      setCookiePasteText('');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap disabled:opacity-50"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)', backgroundColor: 'var(--mg-card)' }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Text</span>
                  </button>
                  {(st?.configured || settings[fieldKey]) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setCookieBusyKind(kind);
                        try {
                          const res = await fetch(`/api/settings/cookies/${kind}`, { method: 'DELETE' });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            onNotify('error', data.error || 'Failed to clear cookies');
                            return;
                          }
                          if (data.settings) setSettings(data.settings);
                          await loadCookieStatus();
                          onNotify('info', `${kind === 'youtube' ? 'YouTube' : 'Gallery'} cookies cleared.`);
                        } catch {
                          onNotify('error', 'Failed to clear cookies.');
                        } finally {
                          setCookieBusyKind(null);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium text-red-500 border-red-500/40 whitespace-nowrap disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {cookiePasteKind === kind && (
                  <div className="flex flex-col gap-2 pt-1">
                    <textarea
                      rows={4}
                      value={cookiePasteText}
                      onChange={(e) => setCookiePasteText(e.target.value)}
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;..."
                      className={`${inputClass} font-mono text-xs resize-y`}
                      style={{ ...inputStyle, backgroundColor: 'var(--mg-card)' }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCookiePasteKind(null);
                          setCookiePasteText('');
                        }}
                        className="px-2.5 py-1 rounded-md border text-xs"
                        style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy || !cookiePasteText.trim()}
                        onClick={async () => {
                          setCookieBusyKind(kind);
                          try {
                            const res = await fetch('/api/settings/cookies', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ kind, content: cookiePasteText }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              onNotify('error', data.error || 'Invalid Netscape cookies.txt content');
                              return;
                            }
                            if (data.settings) setSettings(data.settings);
                            setCookiePasteKind(null);
                            setCookiePasteText('');
                            await loadCookieStatus();
                            onNotify('success', `${kind === 'youtube' ? 'YouTube' : 'Gallery'} cookies saved.`);
                          } catch {
                            onNotify('error', 'Failed to save pasted cookies.');
                          } finally {
                            setCookieBusyKind(null);
                          }
                        }}
                        className="px-3 py-1 rounded-md text-xs font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--mg-accent)' }}
                      >
                        Save Cookies
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
          Webhooks, Stale Jobs &amp; Scheduled Duplicate Cleanup
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium">
            <span>Webhook URL (Discord, Slack, ntfy, or Custom JSON)</span>
            <input
              type="url"
              value={settings.webhook_url || ''}
              onChange={(e) => updateField('webhook_url', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span>Stale Download Timeout (mins)</span>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.stale_timeout_minutes ?? 120}
              onChange={(e) =>
                updateField('stale_timeout_minutes', Math.max(5, Math.min(1440, Number(e.target.value) || 120)))
              }
              className={`${inputClass} font-mono tabular-nums`}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-xs" style={{ color: 'var(--mg-muted)' }}>
            Fires on download completion or failure. Active downloads hung longer than the timeout are killed automatically.
          </span>
          <button
            type="button"
            disabled={testingWebhook || !String(settings.webhook_url || '').trim()}
            onClick={async () => {
              setTestingWebhook(true);
              try {
                const res = await fetch('/api/webhook/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ webhook_url: settings.webhook_url }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) onNotify('error', data.error || 'Webhook test failed');
                else onNotify('success', data.message || 'Webhook test delivered.');
              } catch {
                onNotify('error', 'Failed to send test webhook.');
              } finally {
                setTestingWebhook(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testingWebhook ? 'Testing...' : 'Test Webhook'}</span>
          </button>
        </div>

        <div className="pt-3 border-t flex flex-col gap-3" style={{ borderColor: 'var(--mg-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              <span>Automated Duplicate Cleanup (SHA-256)</span>
              <select
                value={settings.auto_dedup_schedule || 'off'}
                onChange={(e) =>
                  updateField('auto_dedup_schedule', e.target.value as 'off' | 'daily' | 'weekly')
                }
                className={inputClass}
                style={inputStyle}
              >
                <option value="off">Off (Manual Deduplication Only)</option>
                <option value="daily">Daily (Every 24 Hours)</option>
                <option value="weekly">Weekly (Every 7 Days)</option>
              </select>
            </label>
            <div className="flex justify-start sm:justify-end">
              <button
                type="button"
                disabled={runningAutoDedup}
                onClick={async () => {
                  setRunningAutoDedup(true);
                  try {
                    const res = await fetch('/api/deduplicate/run-scheduled', { method: 'POST' });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      onNotify('error', data.error || 'Failed to run cleanup');
                      return;
                    }
                    if (data.settings) setSettings(data.settings);
                    onNotify('success', data.summary || 'Duplicate cleanup completed.');
                    onStorageRefresh();
                  } catch {
                    onNotify('error', 'Failed to run scheduled duplicate cleanup.');
                  } finally {
                    setRunningAutoDedup(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningAutoDedup ? 'animate-spin' : ''}`} />
                <span>{runningAutoDedup ? 'Scanning Libraries...' : 'Run All Libraries Now'}</span>
              </button>
            </div>
          </div>
          <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>
            {settings.auto_dedup_last_run
              ? `Last run (${new Date(settings.auto_dedup_last_run).toLocaleString()}): ${settings.auto_dedup_last_summary || 'Completed'}`
              : 'No automated cleanup pass has run yet. Keeps the largest copy of exact byte duplicates and moves extras to duplicates_trash.'}
          </div>
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
