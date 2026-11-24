import React, { useEffect, useState } from 'react';
import { X, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import { VersionInfo } from '../types';

interface ChangelogEntryItem {
  kind: 'new' | 'fix' | 'security';
  text: string;
}

interface NightlyReleaseNote {
  version: string;
  channel: string;
  date: string;
  summary: string;
  items: ChangelogEntryItem[];
}

const NIGHTLY_RELEASES: NightlyReleaseNote[] = [
  {
    version: 'v2.0-pre8',
    channel: 'Nightly Pre-Release',
    date: '2026-11-24',
    summary:
      'Added full Windows 10 & Windows 11 server support (grab.ps1, PowerShell installer, batch launcher, WinGet/FFmpeg/yt-dlp PATH resolution) plus dynamic OS platform tags (-Linux, -Windows11, -Windows10) on the running version badge.',
    items: [
      {
        kind: 'new',
        text: 'Added Windows 10 & Windows 11 support: native PowerShell wrapper (grab.ps1), auto-installer (deploy/install-windows.ps1), one-click launcher (deploy/start-windows.bat), and %LOCALAPPDATA%/User media directory defaults.',
      },
      {
        kind: 'new',
        text: 'Version badge, /healthz, and /api/version/info now automatically append -Linux, -Windows11, or -Windows10 based on the host operating system.',
      },
      {
        kind: 'fix',
        text: 'Made auto-updater, zip packaging, PATH lookups, process cancellation (taskkill on Windows), and System Info cross-platform across Linux and Windows.',
      },
    ],
  },
  {
    version: 'v2.0-pre7-fix4',
    channel: 'Nightly Pre-Release',
    date: '2026-11-24',
    summary:
      'High-resolution vector-rendered MediaGrabber logo banner, complete main README with Linux platforms/dependencies/grab CLI setup, and Jellyfin Downloader inline API key configuration.',
    items: [
      {
        kind: 'fix',
        text: 'Generated 1200×675 high-resolution Web UI MediaGrabber logo across README.md and Jellyfin plugin, plus full Linux platforms, dependencies, and grab wrapper setup docs.',
      },
      {
        kind: 'fix',
        text: 'Fixed API Token generation form submission, inline error handling, admin store persistence, and plain-HTTP clipboard copy fallback in Account Settings.',
      },
      {
        kind: 'new',
        text: 'Added inline Server URL & API Key configuration drawer directly inside the Jellyfin Downloader page plus MediaGrabber logo branding, descriptions, and copyable repository URL.',
      },
      {
        kind: 'security',
        text: 'Enforced admin role checks on token management routes and prevented background user updates from clearing freshly generated keys before copy.',
      },
    ],
  },
  {
    version: 'v2.0-pre7',
    channel: 'Nightly Pre-Release',
    date: '2026-11-24',
    summary:
      'MediaGrabber - Jellyfin Edition companion plugin (Jellyfin 10.8–10.11+), API key-gated Jellyfin downloader bridge, and Settings/Utilities plugin repository export.',
    items: [
      {
        kind: 'new',
        text: 'Added MediaGrabber - Jellyfin Edition plugin repository (jellyfin-plugin/) supporting Jellyfin 10.8, 10.9, 10.10, and 10.11+ with CI workflow and manifest.json.',
      },
      {
        kind: 'security',
        text: 'Added API key-authenticated Jellyfin bridge (/api/jellyfin/verify, /grab, /queue, /cancel, /retry) requiring a valid download/admin MediaGrabber API key.',
      },
      {
        kind: 'new',
        text: 'Added Jellyfin Plugin (.zip) export & repository URL copy card in Settings → Media Server Integrations and Utilities → Server Manager.',
      },
    ],
  },
  {
    version: 'v2.0-pre6',
    channel: 'Nightly Pre-Release',
    date: '2026-11-24',
    summary:
      'Release channel selector (Full Releases vs Nightly Pre-Releases), interactive TopBar Changelog viewer, 2.0-app default branch alignment, and Linux auto-installer upgrades.',
    items: [
      {
        kind: 'new',
        text: 'Added ChangelogModal accessible by clicking the version badge in the TopBar.',
      },
      {
        kind: 'new',
        text: 'Added Full Releases vs Nightly Pre-Releases channel selector in Version Manager & auto-updater.',
      },
      {
        kind: 'new',
        text: 'Updated Linux auto-installer (deploy/install-linux.sh) with --stable / --nightly flags and interactive channel selection.',
      },
      {
        kind: 'fix',
        text: 'Aligned updater and GitHub branch references to 2.0-app and installed dependencies with --no-package-lock --legacy-peer-deps.',
      },
    ],
  },
  {
    version: 'v2.0-pre5',
    channel: 'Nightly Pre-Release',
    date: '2026-11-24',
    summary:
      'Jellyfin-style Setup Wizard, outgoing webhooks, stale download auto-cleanup, in-browser HTTP range player, stats overview, and nightly updater improvements.',
    items: [
      {
        kind: 'new',
        text: '5-step Setup Wizard (Quick Start Guide) with non-destructive admin creation that always preserves existing accounts.',
      },
      {
        kind: 'new',
        text: 'Direct "Open in Authenticator App" link (otpauth://), Copy 2FA Link, and copyable setup key alongside 2FA QR codes.',
      },
      {
        kind: 'new',
        text: 'Outgoing webhooks on job completion and failure with auto-formatting for Discord, Slack, and JSON/ntfy/Shortcuts + Test button.',
      },
      {
        kind: 'new',
        text: 'Configurable stale download auto-cleanup janitor (default 120m) plus manual Clean Stale Jobs trigger in Utilities.',
      },
      {
        kind: 'new',
        text: 'In-browser media player modal with HTTP 206 byte-range streaming for smooth iOS/iPad video & audio preview.',
      },
      {
        kind: 'new',
        text: 'Library & download stats tab under Utilities showing 24h/7d totals, success rate, source breakdown, and storage sizes.',
      },
      {
        kind: 'fix',
        text: 'Nightly-aware updater parses pre/nightly/rc/fix tags accurately, pulls the active branch, and uses --no-package-lock --legacy-peer-deps.',
      },
      {
        kind: 'security',
        text: 'Admin-only guards on global server settings updates and server-side webhook URL validation blocking local metadata targets.',
      },
    ],
  },
  {
    version: 'v2.0-pre4',
    channel: 'Nightly Pre-Release',
    date: '2026-11-23',
    summary:
      'Health monitoring endpoint, signed temporary device downloads, and YouTube RSS channel feeds in the sidebar.',
    items: [
      {
        kind: 'new',
        text: 'GET /healthz endpoint reporting uptime, active child processes, and queue status.',
      },
      {
        kind: 'new',
        text: 'Signed 1-hour "Send to Device" download links and QR codes for direct iOS/iPad Files app saving.',
      },
      {
        kind: 'new',
        text: 'YouTube RSS sidebar feed supporting @handles and channel IDs with 1-click queueing.',
      },
    ],
  },
  {
    version: 'v2.0-pre3fix',
    channel: 'Nightly Pre-Release',
    date: '2026-11-22',
    summary: 'Web Push notification delivery fixes, PWA badges, and version tag detection.',
    items: [
      {
        kind: 'fix',
        text: 'Fixed VAPID Web Push subscriptions and background job completion / update notifications.',
      },
      {
        kind: 'fix',
        text: 'Improved GitHub tag and release comparison across pre-release and -fix suffixes.',
      },
    ],
  },
  {
    version: 'v2.0-pre2',
    channel: 'Nightly Pre-Release',
    date: '2026-11-20',
    summary: 'Multi-user auth, TOTP 2FA, scheduled downloads, API tokens, and Netwatch integration.',
    items: [
      {
        kind: 'new',
        text: 'Added account authentication, 2FA verification, API token scopes, scheduled grabs, and server bundle export.',
      },
    ],
  },
];

const BADGE_STYLES: Record<ChangelogEntryItem['kind'], { label: string; color: string }> = {
  new: { label: 'NEW', color: '#5b7cfa' },
  fix: { label: 'FIX', color: '#10b981' },
  security: { label: 'SEC', color: '#f59e0b' },
};

export const ChangelogModal: React.FC<{
  open: boolean;
  currentVersion: string;
  onClose: () => void;
  onOpenQuickStart?: () => void;
}> = ({ open, currentVersion, onClose, onOpenQuickStart }) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch('/api/version/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VersionInfo | null) => {
        if (active && data) setVersionInfo(data);
      })
      .catch(() => {});

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      active = false;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
        className="w-full max-w-2xl rounded-xl border p-5 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b pb-3"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <h2 id="changelog-modal-title" className="font-display text-base font-semibold">
                What&apos;s New in {currentVersion}
              </h2>
              <span
                className="font-mono text-[11px] px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-accent)',
                  color: 'var(--mg-accent)',
                }}
              >
                {versionInfo?.channel === 'stable' ? 'Stable' : 'Nightly Channel'}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
              Recent updates, fixes, and security hardening across MediaGrabber nightly builds.
              {versionInfo?.update_available && versionInfo.latest
                ? ` Upstream ${versionInfo.latest} is available in Utilities → Server Manager.`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            className="p-1.5 rounded-lg border shrink-0"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {NIGHTLY_RELEASES.map((release) => {
            const normalizedCurrent = currentVersion
              .trim()
              .replace(/-(?:linux|windows11|windows10|windows|macos|darwin)$/i, '')
              .toLowerCase();
            const isCurrent =
              release.version.toLowerCase() === currentVersion.trim().toLowerCase() ||
              release.version.toLowerCase() === normalizedCurrent;
            return (
              <section
                key={release.version}
                className="p-4 rounded-xl border flex flex-col gap-2.5"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: isCurrent ? 'var(--mg-accent)' : 'var(--mg-border)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{release.version}</span>
                    {isCurrent && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: 'var(--mg-accent)' }}
                      >
                        Installed
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                      {release.channel}
                    </span>
                  </div>
                  <span
                    className="font-mono tabular-nums text-[11px]"
                    style={{ color: 'var(--mg-muted)' }}
                  >
                    {release.date}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--mg-muted)' }}>
                  {release.summary}
                </p>

                <ul className="flex flex-col gap-1.5 pt-1">
                  {release.items.map((item, idx) => {
                    const badge = BADGE_STYLES[item.kind];
                    return (
                      <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
                        <span
                          className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border mt-0.5 shrink-0"
                          style={{
                            borderColor: badge.color,
                            color: badge.color,
                            backgroundColor: 'var(--mg-card)',
                          }}
                        >
                          {badge.label}
                        </span>
                        <span style={{ color: 'var(--mg-text)' }}>{item.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://github.com/ai-mayhemyt/mediagrabber/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub Releases</span>
            </a>
            {onOpenQuickStart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuickStart();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Setup Wizard</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: 'var(--mg-accent)' }}
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
