import React, { useEffect, useRef, useState } from 'react';
import {
  FolderSync,
  CopyX,
  ImagePlus,
  Archive,
  Radio,
  Users,
  Terminal,
  Play,
  Square,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  FolderInput,
  Pencil,
  UserCheck,
  Activity,
  PackageCheck,
  FileUp,
  Download,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import {
  ArchiveEntry,
  DependencyHealthReport,
  MediaFileItem,
  NetwatchStatus,
  RadioStation,
  StatsOverview,
  UserAccount,
  VersionInfo,
} from '../types';

interface UtilitiesViewProps {
  currentUser: UserAccount | null;
  onEditMetadata: (item: MediaFileItem, onUpdated: () => void) => void;
  onUserSwitched: () => void;
  onQueueBatch: (urls: string[], mode: 'video' | 'audio') => Promise<string[]>;
  onStorageRefresh: () => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
  onConfirm: (title: string, message: string, onAccept: () => void) => void;
}

type UtilityTab =
  | 'library'
  | 'batch'
  | 'stats'
  | 'metadata'
  | 'archive'
  | 'radio'
  | 'users'
  | 'server';

function parseUrlsFromTextFile(raw: string): { urls: string[]; skipped: number } {
  const seen = new Set<string>();
  const urls: string[] = [];
  let skipped = 0;

  for (const rawLine of raw.split(/[\r\n]+/)) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      continue;
    }
    const tokens = trimmedLine.split(/[\s,]+/).filter(Boolean);
    for (const token of tokens) {
      if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(token)) {
        if (!seen.has(token)) {
          seen.add(token);
          urls.push(token);
        }
      } else {
        skipped++;
      }
    }
  }
  return { urls, skipped };
}

export const UtilitiesView: React.FC<UtilitiesViewProps> = ({
  currentUser,
  onEditMetadata,
  onUserSwitched,
  onQueueBatch,
  onStorageRefresh,
  onNotify,
  onConfirm,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<UtilityTab>(isAdmin ? 'library' : 'batch');

  // Reorganize & Tmp Reorder
  const [reorgLogs, setReorgLogs] = useState<string[]>(['Waiting to start...']);
  const [reorgRunning, setReorgRunning] = useState(false);
  const [reorgExtraPath, setReorgExtraPath] = useState('');
  const [tmpLogs, setTmpLogs] = useState<string[]>(['Waiting to start...']);
  const [tmpRunning, setTmpRunning] = useState(false);
  const [tmpTarget, setTmpTarget] = useState('');

  // Deduplicate
  const [dedupTarget, setDedupTarget] = useState('/tmp/mediagrabber-workspace/YouTube');
  const [dedupLogs, setDedupLogs] = useState<string[]>(['Ready to scan target folder for SHA-256 duplicates.']);
  const [dedupBusy, setDedupBusy] = useState(false);

  // Metadata Editor
  const [editorFolder, setEditorFolder] = useState('/tmp/mediagrabber-workspace');
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);
  const [scanningFiles, setScanningFiles] = useState(false);

  // Archive
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Radio Manager
  const [radioDbPath, setRadioDbPath] = useState('/var/lib/navidrome/navidrome.db');
  const [radioStatusText, setRadioStatusText] = useState('');
  const [radioQuery, setRadioQuery] = useState('');
  const [radioSearchType, setRadioSearchType] = useState<'name' | 'genre' | 'country'>('name');
  const [radioResults, setRadioResults] = useState<RadioStation[]>([]);
  const [radioMode, setRadioMode] = useState<'added' | 'search'>('added');
  const [manualRadioUrl, setManualRadioUrl] = useState('');
  const [manualRadioName, setManualRadioName] = useState('');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Users
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Server Manager
  const [serverTools, setServerTools] = useState<{ id: string; name: string }[]>([]);
  const [serverOutput, setServerOutput] = useState('Select a server utility to inspect runtime diagnostics.');
  const [netwatch, setNetwatch] = useState<NetwatchStatus | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [depReport, setDepReport] = useState<DependencyHealthReport | null>(null);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [updatingDeps, setUpdatingDeps] = useState<string | null>(null);
  const [depUpdateLog, setDepUpdateLog] = useState<string>('');
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Batch URL File Import
  const [importFileName, setImportFileName] = useState('');
  const [importUrls, setImportUrls] = useState<string[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importMode, setImportMode] = useState<'video' | 'audio'>('video');
  const [importing, setImporting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const scanEditorFiles = async () => {
    setScanningFiles(true);
    try {
      const res = await fetch('/api/metadata/editor/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: editorFolder }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMediaFiles(data);
      } else {
        onNotify('error', data.error || 'Failed to scan folder');
      }
    } catch {
      onNotify('error', 'Failed to scan media folder');
    } finally {
      setScanningFiles(false);
    }
  };

  const loadArchive = async () => {
    setLoadingArchive(true);
    try {
      const res = await fetch('/api/archive');
      const data = await res.json();
      setArchiveEntries(Array.isArray(data) ? data : []);
    } finally {
      setLoadingArchive(false);
    }
  };

  const listRadios = async () => {
    setRadioMode('added');
    try {
      const res = await fetch('/api/radio/list');
      const data = await res.json();
      setRadioResults(data.stations || []);
    } catch {
      onNotify('error', 'Failed to load radio stations');
    }
  };

  const checkRadioStatus = async () => {
    try {
      const res = await fetch('/api/radio/status');
      const data = await res.json();
      setRadioStatusText(`${data.station_count ?? 0} stations synced (${data.note || 'Ready'})`);
    } catch {
      setRadioStatusText('Unavailable');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      onNotify('error', 'Failed to load download stats.');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadDependencyHealth = async () => {
    setLoadingDeps(true);
    try {
      const res = await fetch('/api/server/dependencies', { cache: 'no-store' });
      if (res.ok) {
        setDepReport((await res.json()) as DependencyHealthReport);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDeps(false);
    }
  };

  const handleUpdateDependency = async (tool: 'yt-dlp' | 'spotdl' | 'gallery-dl' | 'all') => {
    if (updatingDeps) return;
    setUpdatingDeps(tool);
    setDepUpdateLog(`Updating ${tool === 'all' ? 'yt-dlp, spotdl & gallery-dl' : tool}...`);
    try {
      const res = await fetch('/api/server/dependencies/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.report) setDepReport(data.report as DependencyHealthReport);
      if (data.log) setDepUpdateLog(String(data.log));
      if (res.ok && data.ok) {
        onNotify('success', `Updated ${(data.updated || [tool]).join(', ')} successfully.`);
      } else {
        onNotify('error', data.error || `Some dependencies could not be updated: ${(data.failed || [tool]).join(', ')}`);
      }
    } catch {
      onNotify('error', 'Failed to contact server for dependency update.');
    } finally {
      setUpdatingDeps(null);
    }
  };

  const loadServerTools = async () => {
    try {
      const [toolsRes, nwRes, verRes, depRes] = await Promise.all([
        fetch('/api/utilities'),
        fetch('/api/server/netwatch'),
        fetch('/api/version/info'),
        fetch('/api/server/dependencies', { cache: 'no-store' }),
      ]);
      const toolsData = await toolsRes.json();
      setServerTools(Array.isArray(toolsData) ? toolsData : []);
      if (nwRes.ok) setNetwatch(await nwRes.json());
      if (verRes.ok) setVersionInfo(await verRes.json());
      if (depRes.ok) setDepReport((await depRes.json()) as DependencyHealthReport);
    } catch {
      // ignore
    }
  };

  const [switchingChannel, setSwitchingChannel] = useState(false);

  const checkForVersionUpdate = async (overrideChannel?: 'stable' | 'nightly') => {
    setCheckingVersion(true);
    try {
      const ch = overrideChannel || versionInfo?.selected_channel || 'nightly';
      const res = await fetch(`/api/version/info?force=1&channel=${encodeURIComponent(ch)}`);
      if (res.ok) {
        const info = (await res.json()) as VersionInfo;
        setVersionInfo(info);
        if (info.update_available) {
          onNotify('success', `New release ${info.latest} available on GitHub.`);
        } else {
          onNotify(
            'info',
            `Up to date on ${ch === 'stable' ? 'Full Releases' : 'Nightly Pre-Releases'} (${info.current}).`
          );
        }
      }
    } finally {
      setCheckingVersion(false);
    }
  };

  const handleChangeReleaseChannel = async (channel: 'stable' | 'nightly') => {
    setSwitchingChannel(true);
    try {
      const res = await fetch('/api/version/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify('error', data.error || 'Could not switch release channel.');
        return;
      }
      if (data.info) setVersionInfo(data.info as VersionInfo);
      onNotify(
        'success',
        `Update channel set to ${channel === 'stable' ? 'Full Releases (Stable)' : 'Nightly Pre-Releases'}.`
      );
    } catch {
      onNotify('error', 'Failed to save release channel.');
    } finally {
      setSwitchingChannel(false);
    }
  };

  const installVersionUpdate = () => {
    const target = versionInfo?.latest || 'latest release';
    const selectedChannel = versionInfo?.selected_channel || 'nightly';
    onConfirm(
      'Install MediaGrabber Update',
      `Download ${target} (${selectedChannel} channel), rebuild the server, and restart MediaGrabber?`,
      async () => {
        setInstallingUpdate(true);
        try {
          const res = await fetch('/api/version/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: selectedChannel }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            onNotify('error', data.error || 'Auto-update failed.');
            return;
          }
          onNotify('success', data.message || `Updated to ${target}. Restarting...`);
        } catch {
          onNotify('error', 'Failed to contact server for update.');
        } finally {
          setInstallingUpdate(false);
        }
      }
    );
  };

  const handleNetwatchAction = async (
    action: 'run' | 'enable' | 'disable' | 'restart_mediagrabber'
  ) => {
    try {
      const res = await fetch('/api/server/netwatch/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        onNotify('success', data.message || 'Action completed');
        const nwRes = await fetch('/api/server/netwatch');
        if (nwRes.ok) setNetwatch(await nwRes.json());
      } else {
        onNotify('error', data.error || 'Action failed');
      }
    } catch {
      onNotify('error', 'Failed to run watchdog action');
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.yt_base_path) {
          setDedupTarget(s.yt_base_path);
          setEditorFolder(s.yt_base_path);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'metadata' && mediaFiles.length === 0) void scanEditorFiles();
    if (activeTab === 'archive') void loadArchive();
    if (activeTab === 'stats') void loadStats();
    if (activeTab === 'radio') {
      void listRadios();
      void checkRadioStatus();
    }
    if (activeTab === 'users') void loadUsers();
    if (activeTab === 'server') void loadServerTools();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleReorganize = async () => {
    setReorgRunning(true);
    try {
      await fetch('/api/reorganize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorgExtraPath.trim() ? { path: reorgExtraPath.trim() } : {}),
      });
      const res = await fetch('/api/reorganize-logs');
      const data = await res.json();
      setReorgLogs(data.logs || []);
      onNotify('success', 'Library reorganization completed.');
      onStorageRefresh();
    } catch {
      onNotify('error', 'Failed to reorganize library');
    } finally {
      setReorgRunning(false);
    }
  };

  const handleTmpReorder = async () => {
    setTmpRunning(true);
    try {
      await fetch('/api/tmp-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tmpTarget.trim() ? { path: tmpTarget.trim() } : {}),
      });
      const res = await fetch('/api/tmp-reorder-logs');
      const data = await res.json();
      setTmpLogs(data.logs || []);
      onNotify('success', 'Tmp reorder pass completed.');
      onStorageRefresh();
    } catch {
      onNotify('error', 'Failed to reorder tmp files');
    } finally {
      setTmpRunning(false);
    }
  };

  const handleDedup = async (action: 'scan' | 'delete') => {
    const run = async () => {
      setDedupBusy(true);
      try {
        const res = await fetch('/api/deduplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, path: dedupTarget }),
        });
        const data = await res.json();
        if (data.error) {
          onNotify('error', data.error);
        } else {
          setDedupLogs(data.logs || []);
          onNotify(
            'success',
            action === 'delete'
              ? `Moved ${data.trashedCount} duplicate(s) to trash.`
              : `Scan finished: ${data.duplicateCount} duplicate(s) detected.`
          );
          onStorageRefresh();
        }
      } catch {
        onNotify('error', 'Deduplication request failed');
      } finally {
        setDedupBusy(false);
      }
    };

    if (action === 'delete') {
      onConfirm(
        'Move Duplicate Files to Trash',
        `Exact SHA-256 duplicates in ${dedupTarget} will be moved to duplicates_trash while keeping the largest copy.`,
        run
      );
    } else {
      await run();
    }
  };

  const handleDeleteArchiveEntry = async (raw: string) => {
    await fetch('/api/archive/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry: raw }),
    });
    onNotify('info', 'Removed entry from archive.txt');
    void loadArchive();
  };

  const handleSearchRadios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!radioQuery.trim()) return;
    setRadioMode('search');
    try {
      const res = await fetch('/api/radio/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: radioQuery.trim(), type: radioSearchType }),
      });
      const data = await res.json();
      setRadioResults(data.stations || []);
    } catch {
      onNotify('error', 'Radio search failed');
    }
  };

  const handleAddRadio = async (station: { url: string; name: string; homepage?: string; country?: string; tags?: string }) => {
    try {
      const res = await fetch('/api/radio/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(station),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not add station');
        return;
      }
      onNotify('success', data.message || 'Station added');
      void checkRadioStatus();
      if (radioMode === 'added') void listRadios();
    } catch {
      onNotify('error', 'Failed to add radio station');
    }
  };

  const handleRemoveRadio = async (id: string) => {
    await fetch('/api/radio/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    onNotify('info', 'Station removed');
    void listRadios();
    void checkRadioStatus();
  };

  const toggleAudioPreview = (url: string) => {
    if (playingUrl === url && audioRef.current) {
      audioRef.current.pause();
      setPlayingUrl(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {
      onNotify('error', 'Stream format not directly playable in browser preview.');
      setPlayingUrl(null);
    });
    setPlayingUrl(url);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to add user');
        return;
      }
      setNewUsername('');
      setNewPassword('');
      onNotify('success', `User '${data.user.username}' created.`);
      void loadUsers();
    } catch {
      onNotify('error', 'Failed to add user');
    }
  };

  const handleRemoveUser = (user: UserAccount) => {
    onConfirm(
      'Remove User Account',
      `Delete user '${user.username}'? This action cannot be undone.`,
      async () => {
        const res = await fetch('/api/users/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          onNotify('error', data.error || 'Failed to remove user');
          return;
        }
        onNotify('info', `Removed '${user.username}'.`);
        void loadUsers();
      }
    );
  };

  const handleSwitchUser = async (id: string) => {
    const res = await fetch('/api/users/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      onUserSwitched();
      onNotify('success', 'Switched active workspace user.');
    }
  };

  const handleRunServerTool = async (id: string) => {
    setServerOutput('Running...');
    try {
      const res = await fetch('/api/utilities/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setServerOutput((data.stdout || '') + (data.stderr ? `\nSTDERR:\n${data.stderr}` : ''));
    } catch {
      setServerOutput('Failed to execute utility.');
    }
  };

  const handleCheckHealthz = async () => {
    setServerOutput('Fetching /healthz...');
    try {
      const res = await fetch('/healthz', { cache: 'no-store' });
      const data = await res.json();
      setServerOutput(JSON.stringify(data, null, 2));
      onNotify(res.ok ? 'success' : 'error', `Health check HTTP ${res.status}`);
    } catch {
      setServerOutput('Failed to query /healthz.');
      onNotify('error', 'Health check request failed.');
    }
  };

  const handleCleanupStaleJobs = async () => {
    try {
      const res = await fetch('/api/queue/cleanup-stale', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to run stale cleanup');
        return;
      }
      onNotify('info', `Stale cleanup finished (${data.cleaned ?? 0} job(s) cleaned).`);
      void loadStats();
    } catch {
      onNotify('error', 'Stale cleanup request failed.');
    }
  };

  const handleBatchFileRead = async (file: File) => {
    try {
      const text = await file.text();
      const { urls, skipped } = parseUrlsFromTextFile(text);
      setImportFileName(file.name);
      setImportUrls(urls);
      setImportSkipped(skipped);
      if (urls.length === 0) {
        onNotify('error', `No valid HTTP/HTTPS URLs found in "${file.name}".`);
      } else {
        onNotify('success', `Parsed ${urls.length} URL(s) from "${file.name}".`);
      }
    } catch {
      onNotify('error', 'Failed to read uploaded text file.');
    }
  };

  const handleQueueImportedUrls = async () => {
    if (importUrls.length === 0 || importing) return;
    setImporting(true);
    try {
      const created = await onQueueBatch(importUrls, importMode);
      if (created.length > 0) {
        setImportUrls([]);
        setImportFileName('');
        setImportSkipped(0);
      }
    } finally {
      setImporting(false);
    }
  };

  const TABS: { id: UtilityTab; label: string; adminOnly: boolean }[] = [
    { id: 'library', label: 'Library & Deduplicate', adminOnly: true },
    { id: 'batch', label: 'Batch URL Import', adminOnly: false },
    { id: 'stats', label: 'Stats', adminOnly: false },
    { id: 'metadata', label: 'Metadata Editor', adminOnly: true },
    { id: 'archive', label: 'Archive Manager', adminOnly: true },
    { id: 'radio', label: 'Radio Manager', adminOnly: false },
    { id: 'users', label: 'Manage Users', adminOnly: true },
    { id: 'server', label: 'Server Manager', adminOnly: true },
  ];

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div
        className="flex items-center gap-1 p-1 rounded-lg border overflow-x-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              style={{
                backgroundColor: active ? 'var(--mg-accent)' : 'transparent',
                color: active ? '#ffffff' : 'var(--mg-muted)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'batch' && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                <span>Batch URL File Import</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Upload a plain-text file (<code className="font-mono">.txt</code>,{' '}
                <code className="font-mono">.list</code>, or <code className="font-mono">.csv</code>)
                containing media URLs (one per line; lines starting with <code className="font-mono">#</code> are ignored).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={batchFileInputRef}
                type="file"
                accept=".txt,.list,.csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleBatchFileRead(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => batchFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Choose Text File</span>
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleBatchFileRead(f);
            }}
            onClick={() => batchFileInputRef.current?.click()}
            className="p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--mg-bg)',
              borderColor: isDraggingFile ? 'var(--mg-accent)' : 'var(--mg-border)',
            }}
          >
            <FileUp
              className="w-6 h-6 mx-auto mb-2"
              style={{ color: isDraggingFile ? 'var(--mg-accent)' : 'var(--mg-muted)' }}
            />
            <p className="text-sm font-medium">
              {importFileName
                ? `Loaded: ${importFileName}`
                : 'Drop a URL list text file here or click to browse'}
            </p>
            <p className="text-xs mt-1 font-mono tabular-nums" style={{ color: 'var(--mg-muted)' }}>
              {importUrls.length > 0
                ? `${importUrls.length} valid URL(s) ready${importSkipped > 0 ? ` · ${importSkipped} invalid token(s) skipped` : ''}`
                : 'Supports YouTube, YT Music, Spotify, Instagram, and TikTok URLs'}
            </p>
          </div>

          {importUrls.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-semibold">Download Mode:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batch-import-mode"
                      checked={importMode === 'video'}
                      onChange={() => setImportMode('video')}
                      className="accent-[var(--mg-accent)]"
                    />
                    <span>Video (MP4/MKV)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batch-import-mode"
                      checked={importMode === 'audio'}
                      onChange={() => setImportMode('audio')}
                      className="accent-[var(--mg-accent)]"
                    />
                    <span>Audio Only (MP3)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setImportUrls([]);
                      setImportFileName('');
                      setImportSkipped(0);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
                  >
                    Clear List
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleQueueImportedUrls}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                    style={{ backgroundColor: 'var(--mg-accent)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-mono tabular-nums">
                      {importing ? 'Queuing...' : `Queue Batch (${importUrls.length})`}
                    </span>
                  </button>
                </div>
              </div>

              <div
                className="divide-y rounded-lg border max-h-64 overflow-y-auto"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
              >
                {importUrls.map((u, idx) => (
                  <div
                    key={u}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                    style={{ borderColor: 'var(--mg-border)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--mg-muted)' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono truncate">{u}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportUrls((prev) => prev.filter((item) => item !== u))}
                      className="p-1 rounded border text-red-500 border-red-500/30 shrink-0"
                      aria-label={`Remove ${u}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'library' && isAdmin && (
        <div className="flex flex-col gap-5">
          <section
            className="p-5 rounded-xl border flex flex-col gap-3"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                  <FolderSync className="w-4 h-4" />
                  <span>Reorganize Files</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                  Scan configured library paths and /var/lib/mediagrabber folders to align media files into Uploader/Year or Artist/Album folders.
                </p>
              </div>
              <button
                type="button"
                disabled={reorgRunning}
                onClick={handleReorganize}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                {reorgRunning ? 'Running...' : 'Start Reorganize'}
              </button>
            </div>
            <input
              type="text"
              value={reorgExtraPath}
              onChange={(e) => setReorgExtraPath(e.target.value)}
              placeholder="Optional extra /var or library directory to include (e.g. /var/mediagrabber)"
              className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <pre
              className="p-3 rounded-lg border text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
            >
              {reorgLogs.join('\n')}
            </pre>
          </section>

          <section
            className="p-5 rounded-xl border flex flex-col gap-3"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <CopyX className="w-4 h-4" />
                <span>Deduplicate Files (SHA-256)</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Identify exact byte-identical files in a library folder, keeping the largest copy and trashing duplicates.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={dedupTarget}
                onChange={(e) => setDedupTarget(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
              <button
                type="button"
                disabled={dedupBusy}
                onClick={() => handleDedup('scan')}
                className="px-4 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                Scan Duplicates
              </button>
              <button
                type="button"
                disabled={dedupBusy}
                onClick={() => handleDedup('delete')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 whitespace-nowrap shrink-0"
              >
                Delete Duplicates
              </button>
            </div>
            <pre
              className="p-3 rounded-lg border text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
            >
              {dedupLogs.join('\n')}
            </pre>
          </section>

          <section
            className="p-5 rounded-xl border flex flex-col gap-3"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                  <FolderInput className="w-4 h-4" />
                  <span>Tmp Reorder</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                  Recover orphaned downloads from workspace, /var, and library tmp directories into your configured final folders.
                </p>
              </div>
              <button
                type="button"
                disabled={tmpRunning}
                onClick={handleTmpReorder}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                {tmpRunning ? 'Reordering...' : 'Reorder Tmp Files'}
              </button>
            </div>
            <input
              type="text"
              value={tmpTarget}
              onChange={(e) => setTmpTarget(e.target.value)}
              placeholder="Optional extra /var or temp directory (e.g. /var/tmp/mediagrabber)"
              className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <pre
              className="p-3 rounded-lg border text-xs font-mono overflow-x-auto max-h-44 whitespace-pre-wrap"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
            >
              {tmpLogs.join('\n')}
            </pre>
          </section>
        </div>
      )}

      {activeTab === 'metadata' && isAdmin && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div>
            <h2 className="font-display text-sm font-semibold flex items-center gap-2">
              <ImagePlus className="w-4 h-4" />
              <span>Metadata &amp; Cover Editor</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
              Scan a media directory and click any item to update title, artist, album, date, description, or cover art.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={editorFolder}
              onChange={(e) => setEditorFolder(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <button
              type="button"
              disabled={scanningFiles}
              onClick={scanEditorFiles}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{scanningFiles ? 'Scanning...' : 'Scan Files'}</span>
            </button>
          </div>

          <div className="divide-y rounded-lg border overflow-hidden" style={{ borderColor: 'var(--mg-border)' }}>
            {mediaFiles.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
                No media files found in this folder.
              </div>
            ) : (
              mediaFiles.map((item) => (
                <div
                  key={item.path}
                  className="flex items-center justify-between gap-3 p-3 hover:opacity-95"
                  style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-11 h-11 rounded-md overflow-hidden border shrink-0"
                      style={{ borderColor: 'var(--mg-border)' }}
                    >
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--mg-text)' }}>
                        {item.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                        <span>{item.artist || 'Unknown Artist'}</span>
                        {item.album && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.album}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="uppercase font-mono">{item.extension}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {(item.size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditMetadata(item, scanEditorFiles)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'var(--mg-card)',
                      borderColor: 'var(--mg-border)',
                      color: 'var(--mg-text)',
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'archive' && isAdmin && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <Archive className="w-4 h-4" />
                <span>Download Archive Manager</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Manage recorded entries in archive.txt so specific videos or tracks can be re-downloaded.
              </p>
            </div>
            <button
              type="button"
              onClick={loadArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{loadingArchive ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>

          <div className="divide-y rounded-lg border" style={{ borderColor: 'var(--mg-border)' }}>
            {archiveEntries.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
                Archive is empty.
              </div>
            ) : (
              archiveEntries.map((entry) => (
                <div
                  key={entry.raw}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                  style={{ borderColor: 'var(--mg-border)' }}
                >
                  <div className="min-w-0 flex-1 font-mono truncate">
                    <span className="font-semibold uppercase mr-2" style={{ color: 'var(--mg-accent)' }}>
                      {entry.source}
                    </span>
                    <span style={{ color: 'var(--mg-text)' }}>{entry.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteArchiveEntry(entry.raw)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs text-red-500 border-red-500/40 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'radio' && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-5"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span>Navidrome Radio Manager</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Search Radio-Browser.info stations, preview streams, and manage Navidrome radio entries.
              </p>
            </div>
            {radioStatusText && (
              <span className="text-xs font-mono" style={{ color: 'var(--mg-muted)' }}>
                {radioStatusText}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              value={radioDbPath}
              onChange={(e) => setRadioDbPath(e.target.value)}
              placeholder="/var/lib/navidrome/navidrome.db"
              className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/radio/setdb', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ db_path: radioDbPath }),
                });
                onNotify('success', 'Navidrome DB path saved.');
                void checkRadioStatus();
              }}
              className="px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              Save Path
            </button>
          </div>

          <form onSubmit={handleSearchRadios} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={radioQuery}
              onChange={(e) => setRadioQuery(e.target.value)}
              placeholder="Search Radio-Browser by name, genre, or country..."
              className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <select
              value={radioSearchType}
              onChange={(e) => setRadioSearchType(e.target.value as 'name' | 'genre' | 'country')}
              className="px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              <option value="name">Name</option>
              <option value="genre">Genre</option>
              <option value="country">Country</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={listRadios}
              className="px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              Saved Stations
            </button>
          </form>

          <div className="divide-y rounded-lg border max-h-80 overflow-y-auto" style={{ borderColor: 'var(--mg-border)' }}>
            {radioResults.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
                No stations to display.
              </div>
            ) : (
              radioResults.map((st) => {
                const isPlaying = playingUrl === st.url;
                return (
                  <div
                    key={st.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3"
                    style={{ borderColor: 'var(--mg-border)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--mg-text)' }}>
                        {st.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                        {st.country && <span>{st.country}</span>}
                        {st.codec && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{st.codec}</span>
                          </>
                        )}
                        {st.bitrate ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{st.bitrate} kbps</span>
                          </>
                        ) : null}
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-xs font-mono">{st.url}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleAudioPreview(st.url)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                        style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                      >
                        {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlaying ? 'Stop' : 'Preview'}</span>
                      </button>
                      {radioMode === 'search' ? (
                        <button
                          type="button"
                          onClick={() => handleAddRadio(st)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white whitespace-nowrap shrink-0"
                          style={{ backgroundColor: 'var(--mg-accent)' }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveRadio(st.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs text-red-500 border-red-500/40 whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t flex flex-col gap-2.5" style={{ borderColor: 'var(--mg-border)' }}>
            <h3 className="text-xs font-semibold" style={{ color: 'var(--mg-muted)' }}>
              Add Stream Manually
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="url"
                value={manualRadioUrl}
                onChange={(e) => setManualRadioUrl(e.target.value)}
                placeholder="https://stream.example.com:8000/radio.mp3"
                className="flex-[2] px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
              <input
                type="text"
                value={manualRadioName}
                onChange={(e) => setManualRadioName(e.target.value)}
                placeholder="Station Name (optional)"
                className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!manualRadioUrl.trim()) return;
                  await handleAddRadio({ url: manualRadioUrl.trim(), name: manualRadioName.trim() });
                  setManualRadioUrl('');
                  setManualRadioName('');
                }}
                className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stream</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'users' && isAdmin && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-5"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div>
            <h2 className="font-display text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
              Add, remove, or switch active workspace accounts. Administrators have full access to settings and library tools.
            </p>
          </div>

          <div className="divide-y rounded-lg border" style={{ borderColor: 'var(--mg-border)' }}>
            {users.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                  style={{ borderColor: 'var(--mg-border)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar}
                      alt={u.display_name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border"
                      style={{ borderColor: 'var(--mg-border)' }}
                    />
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--mg-text)' }}>
                        {u.display_name}{' '}
                        <span className="font-mono text-xs" style={{ color: 'var(--mg-muted)' }}>
                          (@{u.username})
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                        {u.role === 'admin' ? 'Administrator' : 'Standard User'}
                        <span aria-hidden="true"> · </span>
                        <span>2FA {u.totp_enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="text-xs font-medium text-emerald-500 px-2">Active Session</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSwitchUser(u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                          style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Switch To</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs text-red-500 border-red-500/40 whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddUser} className="pt-4 border-t flex flex-col sm:flex-row gap-2.5" style={{ borderColor: 'var(--mg-border)' }}>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password (min 8 chars)"
              className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
              className="px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </form>
        </section>
      )}

      {activeTab === 'stats' && (
        <section
          className="p-5 rounded-xl border flex flex-col gap-5"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Download &amp; Library Stats</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Aggregated queue throughput, completion rate, source breakdown, and storage consumption.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void handleCleanupStaleJobs()}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                >
                  Clean Stale Jobs
                </button>
              )}
              <button
                type="button"
                disabled={loadingStats}
                onClick={() => void loadStats()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {!stats ? (
            <div className="p-8 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
              {loadingStats ? 'Calculating library & download metrics...' : 'No stats loaded yet.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Completed (History)</div>
                  <div className="font-mono tabular-nums text-xl font-semibold mt-1">{stats.history.total}</div>
                  <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                    {stats.history.recent_24h} in 24h · {stats.history.recent_7d} in 7d
                  </div>
                </div>
                <div className="p-3.5 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Success Rate</div>
                  <div className="font-mono tabular-nums text-xl font-semibold mt-1 text-emerald-500">
                    {stats.success_rate}%
                  </div>
                  <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                    {stats.queue.failed} failed in session
                  </div>
                </div>
                <div className="p-3.5 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Active Queue</div>
                  <div className="font-mono tabular-nums text-xl font-semibold mt-1">
                    {stats.queue.running + stats.queue.queued}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                    {stats.queue.running} running · {stats.queue.queued} queued
                  </div>
                </div>
                <div className="p-3.5 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Library Usage</div>
                  <div className="font-mono tabular-nums text-xl font-semibold mt-1">
                    {(stats.storage_summary.total_bytes / (1024 ** 3)).toFixed(2)} GB
                  </div>
                  <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                    {stats.storage_summary.total_files} media file(s)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border flex flex-col gap-3" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <h3 className="text-xs font-semibold">Downloads by Source</h3>
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(stats.history.by_source).map(([src, count]) => {
                      const pct = stats.history.total > 0 ? Math.round((count / stats.history.total) * 100) : 0;
                      return (
                        <div key={src} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="uppercase font-medium">{src}</span>
                            <span className="font-mono tabular-nums" style={{ color: 'var(--mg-muted)' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--mg-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: 'var(--mg-accent)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-lg border flex flex-col gap-3" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <h3 className="text-xs font-semibold">Media Folders</h3>
                  <div className="flex flex-col gap-2.5">
                    {stats.storage_summary.libraries.map((lib) => {
                      const mb = lib.size_bytes / (1024 ** 2);
                      const sizeLabel =
                        mb >= 1024 ? `${(lib.size_bytes / (1024 ** 3)).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
                      return (
                        <div
                          key={lib.name}
                          className="p-2.5 rounded-md border flex items-center justify-between gap-2 text-xs"
                          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
                        >
                          <div className="min-w-0">
                            <div className="font-medium">{lib.name}</div>
                            <div className="font-mono text-[11px] truncate" style={{ color: 'var(--mg-muted)' }}>
                              {lib.path}
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div>{sizeLabel}</div>
                            <div className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                              {lib.file_count} files
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'server' && isAdmin && (
        <div className="flex flex-col gap-5">
          <section
            className="p-5 rounded-xl border flex flex-col gap-4"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Network Watchdog</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                  Monitors gateway connectivity and interface status for unattended grabs.
                </p>
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: netwatch?.timer_active ? '#16a34a' : '#d97706' }}
              >
                {netwatch?.timer_active ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Next Check</div>
                <div className="font-mono tabular-nums text-base font-semibold mt-1">
                  {netwatch?.timer_active ? `${netwatch.next_run_seconds}s` : 'Paused'}
                </div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Failures</div>
                <div className="font-mono tabular-nums text-base font-semibold mt-1">
                  {netwatch?.consecutive_failures ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Interface</div>
                <div className="font-mono text-sm font-medium mt-1 truncate">
                  {netwatch?.iface || 'eth0'}
                </div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Gateway</div>
                <div className="font-mono tabular-nums text-sm font-medium mt-1 truncate">
                  {netwatch?.gateway || '127.0.0.1'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleNetwatchAction('run')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                Run Check Now
              </button>
              <button
                type="button"
                onClick={() => handleNetwatchAction(netwatch?.timer_enabled ? 'disable' : 'enable')}
                className="px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                {netwatch?.timer_enabled ? 'Disable Timer' : 'Enable Timer'}
              </button>
              <button
                type="button"
                onClick={() => handleNetwatchAction('restart_mediagrabber')}
                className="px-3.5 py-2 rounded-lg border text-xs font-medium text-amber-500 border-amber-500/40 whitespace-nowrap shrink-0"
              >
                Reload Services
              </button>
            </div>

            {netwatch && netwatch.recent_log.length > 0 && (
              <pre
                className="p-3 rounded-lg border text-xs font-mono overflow-x-auto max-h-36 whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
              >
                {netwatch.recent_log.join('\n')}
              </pre>
            )}
          </section>

          <section
            className="p-5 rounded-xl border flex flex-col gap-4"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  <span>Version Manager</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                  Active channel tracks{' '}
                  <a
                    href={
                      versionInfo?.branch_url ||
                      (versionInfo?.selected_channel === 'stable'
                        ? 'https://github.com/ai-mayhemyt/mediagrabber/tree/mediagrabber'
                        : 'https://github.com/ai-mayhemyt/mediagrabber/tree/mediagrabber-nightly')
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline hover:opacity-80"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    {versionInfo?.branch ||
                      (versionInfo?.selected_channel === 'stable'
                        ? 'mediagrabber'
                        : 'mediagrabber-nightly')}
                  </a>{' '}
                  · Full:{' '}
                  <a
                    href="https://github.com/ai-mayhemyt/mediagrabber/tree/mediagrabber"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                  >
                    mediagrabber
                  </a>{' '}
                  / Nightly:{' '}
                  <a
                    href="https://github.com/ai-mayhemyt/mediagrabber/tree/mediagrabber-nightly"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                  >
                    mediagrabber-nightly
                  </a>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="/api/server/export-bundle?format=zip"
                  download="mediagrabber-v2.1-pre1.zip"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bundle (.zip)</span>
                </a>
                <a
                  href="/api/server/export-jellyfin-plugin"
                  download="MediaGrabber-Jellyfin-Edition.zip"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Jellyfin Plugin (.zip)</span>
                </a>
                {versionInfo?.update_available && (
                  <button
                    type="button"
                    disabled={installingUpdate}
                    onClick={installVersionUpdate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>{installingUpdate ? 'Installing...' : `Install ${versionInfo.latest}`}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={checkingVersion}
                  onClick={() => void checkForVersionUpdate()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingVersion ? 'animate-spin' : ''}`} />
                  <span>{checkingVersion ? 'Checking...' : 'Check for Update'}</span>
                </button>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
            >
              <div>
                <div className="text-xs font-semibold">Auto-Updater Release Channel</div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                  Full Releases track <code className="font-mono">mediagrabber</code>; Nightly Pre-Releases track{' '}
                  <code className="font-mono">mediagrabber-nightly</code>.
                </p>
              </div>
              <div
                className="inline-flex rounded-lg border p-0.5 shrink-0"
                style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
              >
                <button
                  type="button"
                  disabled={switchingChannel}
                  onClick={() => void handleChangeReleaseChannel('stable')}
                  className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor:
                      versionInfo?.selected_channel === 'stable' ? 'var(--mg-accent)' : 'transparent',
                    color: versionInfo?.selected_channel === 'stable' ? '#ffffff' : 'var(--mg-muted)',
                  }}
                >
                  Full Releases
                </button>
                <button
                  type="button"
                  disabled={switchingChannel}
                  onClick={() => void handleChangeReleaseChannel('nightly')}
                  className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor:
                      (versionInfo?.selected_channel ?? 'nightly') === 'nightly'
                        ? 'var(--mg-accent)'
                        : 'transparent',
                    color:
                      (versionInfo?.selected_channel ?? 'nightly') === 'nightly'
                        ? '#ffffff'
                        : 'var(--mg-muted)',
                  }}
                >
                  Nightly Pre-Releases
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                  Current Build ({versionInfo?.channel === 'nightly' ? 'Nightly' : 'Release'}{versionInfo?.platform ? ` · ${versionInfo.platform}` : ''}{versionInfo?.is_binary ? ' · Standalone Binary' : ''})
                </div>
                <div className="font-mono text-sm font-semibold mt-1">{versionInfo?.current || 'v2.1-pre1'}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                  Latest {(versionInfo?.selected_channel ?? 'nightly') === 'stable' ? 'Full Release' : 'Nightly Pre-Release'}
                </div>
                <div className="font-mono text-sm font-semibold mt-1">{versionInfo?.latest || 'v2.1-pre1'}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs" style={{ color: 'var(--mg-muted)' }}>Last Checked</div>
                <div className="font-mono tabular-nums text-xs mt-1.5" style={{ color: 'var(--mg-muted)' }}>
                  {versionInfo?.checked_at ? new Date(versionInfo.checked_at).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>
          </section>

          <section
            className="p-5 rounded-xl border flex flex-col gap-4"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span>Pre-Flight Dependency Health ({depReport?.platform || 'host'})</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                  Inspect installed extractor binaries &amp; wrappers across Windows/Linux and run 1-click extractor updates.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={loadingDeps}
                  onClick={() => void loadDependencyHealth()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDeps ? 'animate-spin' : ''}`} />
                  <span>Scan</span>
                </button>
                <button
                  type="button"
                  disabled={updatingDeps !== null}
                  onClick={() => void handleUpdateDependency('yt-dlp')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updatingDeps === 'yt-dlp' ? 'animate-spin' : ''}`} />
                  <span>{updatingDeps === 'yt-dlp' ? 'Updating yt-dlp...' : 'Update yt-dlp'}</span>
                </button>
                <button
                  type="button"
                  disabled={updatingDeps !== null}
                  onClick={() => void handleUpdateDependency('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updatingDeps === 'all' ? 'animate-spin' : ''}`} />
                  <span>{updatingDeps === 'all' ? 'Updating All...' : 'Update All Extractors'}</span>
                </button>
              </div>
            </div>

            {!depReport ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
                {loadingDeps ? 'Probing system executables...' : 'Loading dependency status...'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {depReport.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="p-3 rounded-lg border flex flex-col gap-1.5"
                    style={{
                      backgroundColor: 'var(--mg-bg)',
                      borderColor: tool.installed
                        ? 'var(--mg-border)'
                        : tool.required
                        ? '#dc2626'
                        : '#d97706',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {tool.installed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle
                            className={`w-4 h-4 shrink-0 ${tool.required ? 'text-red-500' : 'text-amber-500'}`}
                          />
                        )}
                        <span className="text-xs font-semibold truncate">{tool.name}</span>
                        {tool.required && (
                          <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--mg-muted)' }}>
                            Required
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[11px] font-medium shrink-0"
                        style={{
                          color: tool.installed ? '#16a34a' : tool.required ? '#dc2626' : '#d97706',
                        }}
                      >
                        {tool.installed ? 'Ready' : 'Missing'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono truncate" style={{ color: 'var(--mg-muted)' }}>
                      {tool.installed
                        ? `${tool.version || 'installed'} · ${tool.path}`
                        : `Install: ${tool.install_hint}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {depUpdateLog && (
              <pre
                className="p-3 rounded-lg border text-xs font-mono overflow-x-auto max-h-40 whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                {depUpdateLog}
              </pre>
            )}
          </section>

          <section
            className="p-5 rounded-xl border flex flex-col gap-4"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div>
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span>Host Utilities</span>
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                Run built-in host inspection and user roster diagnostics.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {serverTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleRunServerTool(tool.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  {tool.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void handleCheckHealthz()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Health Check (/healthz)</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCleanupStaleJobs()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clean Stale Jobs</span>
              </button>
            </div>

            <pre
              className="p-4 rounded-lg border text-xs font-mono overflow-x-auto min-h-[120px] whitespace-pre-wrap"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              {serverOutput}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
};
