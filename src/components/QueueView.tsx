import React, { useMemo, useState } from 'react';
import {
  ClipboardPaste,
  Download,
  Trash2,
  Terminal,
  QrCode,
  RotateCcw,
  ArchiveX,
  X,
  Film,
  Music,
  Image as ImageIcon,
  FolderCheck,
  CalendarClock,
  Loader2,
  CheckCircle2,
  Layers,
  Smartphone,
  Play,
  Subtitles,
  Scissors,
  ListVideo,
} from 'lucide-react';
import { GrabOptions, Job, MediaPreviewItem, SignedFileDownload } from '../types';

interface QueueViewProps {
  jobs: Job[];
  searchQuery?: string;
  onClearSearch?: () => void;
  onGrab: (urls: string[], mode: 'video' | 'audio', options?: GrabOptions) => Promise<string[]>;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onClearArchive: (id: string) => void;
  onClearCompleted: () => void;
  onViewLog: (job: Job) => void;
  onShareQr: (url: string) => void;
  onPreviewMedia?: (media: MediaPreviewItem) => void;
  onOpenSchedule: (prefillUrl?: string) => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}

const STATUS_STYLES: Record<Job['status'], { color: string; label: string }> = {
  queued: { color: '#d97706', label: 'Queued' },
  running: { color: '#3b5bdb', label: 'Downloading' },
  done: { color: '#16a34a', label: 'Completed' },
  failed: { color: '#dc2626', label: 'Failed' },
  cancelled: { color: '#6b7280', label: 'Cancelled' },
};

export function parseBatchUrls(raw: string): string[] {
  const tokens = raw
    .split(/[\r\n]+/)
    .flatMap((line) => line.split(/[\s,]+/))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(tokens));
}

export const QueueView: React.FC<QueueViewProps> = ({
  jobs,
  searchQuery = '',
  onClearSearch,
  onGrab,
  onCancel,
  onRemove,
  onRetry,
  onClearArchive,
  onClearCompleted,
  onViewLog,
  onShareQr,
  onPreviewMedia,
  onOpenSchedule,
  onNotify,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [embedSubtitles, setEmbedSubtitles] = useState(false);
  const [sponsorBlock, setSponsorBlock] = useState(false);
  const [playlistMode, setPlaylistMode] = useState<'single' | 'playlist'>('single');
  const [submitting, setSubmitting] = useState(false);
  const [submittingCount, setSubmittingCount] = useState(0);
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([]);
  const [signedLinks, setSignedLinks] = useState<Record<string, SignedFileDownload>>({});
  const [signingJobId, setSigningJobId] = useState<string | null>(null);
  const [previewingJobId, setPreviewingJobId] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let idx = 0;
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024;
      idx++;
    }
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const handleSignJobFile = async (jobId: string) => {
    if (signingJobId) return;
    setSigningJobId(jobId);
    try {
      const res = await fetch('/api/files/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        onNotify('error', data.error || 'Could not generate temporary download link.');
        return;
      }
      setSignedLinks((prev) => ({ ...prev, [jobId]: data as SignedFileDownload }));
      onNotify('success', 'Signed 1-hour device download link ready.');
    } catch {
      onNotify('error', 'Failed to generate device download link.');
    } finally {
      setSigningJobId(null);
    }
  };

  const handlePreviewJobFile = async (job: Job) => {
    if (!onPreviewMedia || previewingJobId) return;
    setPreviewingJobId(job.job_id);
    try {
      let signed = signedLinks[job.job_id];
      if (!signed) {
        const res = await fetch('/api/files/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: job.job_id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          onNotify('error', data.error || 'Media file is unavailable for playback.');
          return;
        }
        signed = data as SignedFileDownload;
        setSignedLinks((prev) => ({ ...prev, [job.job_id]: signed! }));
      }
      const lower = signed.filename.toLowerCase();
      const isAudio =
        job.mode === 'audio' || /\.(mp3|m4a|aac|flac|ogg|opus|wav)$/i.test(lower);
      onPreviewMedia({
        inlineUrl: `${signed.url}&inline=1`,
        downloadUrl: signed.url,
        filename: signed.filename,
        size_bytes: signed.size_bytes,
        isAudio,
      });
    } catch {
      onNotify('error', 'Failed to launch media preview.');
    } finally {
      setPreviewingJobId(null);
    }
  };

  const parsedUrls = useMemo(() => parseBatchUrls(urlInput), [urlInput]);

  const hasYoutubeUrl = useMemo(
    () =>
      parsedUrls.some(
        (u) =>
          u.toLowerCase().includes('youtube.com') ||
          u.toLowerCase().includes('youtu.be')
      ),
    [parsedUrls]
  );

  const appendPastedText = (rawText: string) => {
    const incoming = parseBatchUrls(rawText);
    if (incoming.length === 0) return;
    setUrlInput((prev) => {
      const existing = parseBatchUrls(prev);
      const merged = Array.from(new Set([...existing, ...incoming]));
      return merged.join('\n');
    });
    onNotify(
      'info',
      incoming.length > 1
        ? `Split ${incoming.length} URLs for batch submission.`
        : 'Pasted URL into queue input.'
    );
  };

  const handlePasteButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        appendPastedText(text);
      } else {
        onNotify('info', 'Clipboard is empty.');
      }
    } catch {
      onNotify('error', 'Clipboard access was denied. Paste directly with Ctrl/Cmd+V.');
    }
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const incoming = parseBatchUrls(pasted);
    if (incoming.length > 1 || /[\r\n]/.test(pasted)) {
      e.preventDefault();
      appendPastedText(pasted);
    }
  };

  const submitBatch = async () => {
    if (parsedUrls.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmittingCount(parsedUrls.length);
    try {
      const options: GrabOptions = {
        embed_subtitles: mode === 'video' ? embedSubtitles : false,
        sponsorblock: sponsorBlock,
        playlist_mode: playlistMode,
      };
      const createdIds = await onGrab(parsedUrls, mode, options);
      if (createdIds.length > 0) {
        setActiveBatchIds(createdIds);
      }
      setUrlInput('');
    } finally {
      setSubmitting(false);
      setSubmittingCount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitBatch();
  };

  const completedCount = jobs.filter(
    (j) => j.status === 'done' || j.status === 'failed' || j.status === 'cancelled'
  ).length;

  const queuedJobsCount = jobs.filter((j) => j.status === 'queued').length;
  const runningJobsCount = jobs.filter((j) => j.status === 'running').length;
  const activeJobsCount = queuedJobsCount + runningJobsCount;

  const batchSummary = useMemo(() => {
    if (activeBatchIds.length === 0) return null;
    const matched = jobs.filter((j) => activeBatchIds.includes(j.job_id));
    if (matched.length === 0) return null;
    const total = matched.length;
    const queued = matched.filter((j) => j.status === 'queued').length;
    const running = matched.filter((j) => j.status === 'running').length;
    const done = matched.filter((j) => j.status === 'done').length;
    const failed = matched.filter((j) => j.status === 'failed' || j.status === 'cancelled').length;
    const avgProgress = Math.round(
      matched.reduce((acc, j) => acc + (j.progress || 0), 0) / total
    );
    const inFlight = queued + running;
    return { total, queued, running, done, failed, avgProgress, inFlight };
  }, [activeBatchIds, jobs]);

  const processingCount = batchSummary && batchSummary.inFlight > 0 ? batchSummary.running : runningJobsCount;
  const waitingCount = batchSummary && batchSummary.inFlight > 0 ? batchSummary.queued : queuedJobsCount;
  const inFlightBatchOrQueue = processingCount + waitingCount;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredJobs = useMemo(() => {
    if (!normalizedSearch) return jobs;
    return jobs.filter((job) => {
      const statusLabel = STATUS_STYLES[job.status]?.label?.toLowerCase() || '';
      return (
        (job.title || '').toLowerCase().includes(normalizedSearch) ||
        job.url.toLowerCase().includes(normalizedSearch) ||
        (job.uploader || '').toLowerCase().includes(normalizedSearch) ||
        job.engine.toLowerCase().includes(normalizedSearch) ||
        job.status.toLowerCase().includes(normalizedSearch) ||
        statusLabel.includes(normalizedSearch) ||
        (job.file || '').toLowerCase().includes(normalizedSearch) ||
        job.job_id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [jobs, normalizedSearch]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <section
        className="p-5 rounded-xl border flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <Layers className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            <h2 className="font-display text-sm font-semibold">Batch Grab & Queue</h2>

            {(parsedUrls.length > 0 || submitting || inFlightBatchOrQueue > 0) && (
              <div
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-mono tabular-nums whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
                aria-live="polite"
              >
                {submitting || inFlightBatchOrQueue > 0 ? (
                  <Loader2
                    className="w-3 h-3 animate-spin shrink-0"
                    style={{ color: 'var(--mg-accent)' }}
                  />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--mg-accent)' }}
                  />
                )}
                <span>
                  {submitting
                    ? `${submittingCount} queuing`
                    : [
                        inFlightBatchOrQueue > 0
                          ? `${processingCount} processing · ${waitingCount} waiting`
                          : null,
                        parsedUrls.length > 0
                          ? `${parsedUrls.length} ${parsedUrls.length === 1 ? 'URL' : 'URLs'} in input`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            {submitting ? (
              <div
                className="inline-flex items-center gap-2 font-medium whitespace-nowrap"
                style={{ color: 'var(--mg-accent)' }}
              >
                <span className="font-mono tabular-nums">
                  Batch processing · {submittingCount}{' '}
                  {submittingCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            ) : batchSummary && batchSummary.inFlight > 0 ? (
              <div className="flex items-center gap-3">
                <span
                  className="font-mono tabular-nums font-medium whitespace-nowrap"
                  style={{ color: 'var(--mg-accent)' }}
                >
                  Batch {batchSummary.done}/{batchSummary.total} · {batchSummary.avgProgress}%
                </span>
                <div
                  className="hidden sm:block w-20 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--mg-border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${batchSummary.avgProgress}%`,
                      backgroundColor: 'var(--mg-accent)',
                    }}
                  />
                </div>
              </div>
            ) : batchSummary && batchSummary.total > 1 ? (
              <div className="inline-flex items-center gap-2 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono tabular-nums" style={{ color: 'var(--mg-text)' }}>
                  Batch complete · {batchSummary.done}/{batchSummary.total} done
                </span>
                <button
                  type="button"
                  onClick={() => setActiveBatchIds([])}
                  className="hover:underline"
                  style={{ color: 'var(--mg-muted)' }}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <span className="font-mono tabular-nums whitespace-nowrap" style={{ color: 'var(--mg-muted)' }}>
                {activeJobsCount > 0
                  ? `${activeJobsCount} in queue`
                  : 'Paste one or multiple URLs below'}
              </span>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onPaste={handleTextareaPaste}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void submitBatch();
                  }
                }}
                rows={Math.min(6, Math.max(2, parsedUrls.length || 2))}
                placeholder="Paste one or multiple URLs (YouTube, YT Music, Spotify, Instagram, TikTok) — one per line"
                className="w-full min-h-[58px] max-h-52 px-4 py-3 pr-24 rounded-lg border text-sm font-mono outline-none resize-y transition-colors"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
              />
              <button
                type="button"
                onClick={handlePasteButton}
                className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--mg-card)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 items-start">
              <button
                type="submit"
                disabled={submitting || parsedUrls.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <Download className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Queuing...'
                    : parsedUrls.length > 1
                    ? `Grab Batch (${parsedUrls.length})`
                    : 'Grab'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onOpenSchedule(parsedUrls[0])}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
                title="Schedule Download"
              >
                <CalendarClock className="w-4 h-4" />
                <span>Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => onShareQr(parsedUrls[0] || window.location.href)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
                title="Generate QR Code for URL"
              >
                <QrCode className="w-4 h-4" />
                <span>QR</span>
              </button>
            </div>
          </div>

          {parsedUrls.length > 0 && (
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--mg-muted)' }}>
              <span className="font-mono tabular-nums">
                {parsedUrls.length} {parsedUrls.length === 1 ? 'URL' : 'URLs'} queued for batch submission
              </span>
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="hover:underline"
              >
                Clear input
              </button>
            </div>
          )}

          {hasYoutubeUrl && (
            <div
              className="flex flex-wrap items-center gap-5 px-3.5 py-2.5 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--mg-bg)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="grab-mode"
                  checked={mode === 'video'}
                  onChange={() => setMode('video')}
                  className="accent-[var(--mg-accent)]"
                />
                <span>Video (MP4/MKV)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="grab-mode"
                  checked={mode === 'audio'}
                  onChange={() => setMode('audio')}
                  className="accent-[var(--mg-accent)]"
                />
                <span>Audio Only (MP3)</span>
              </label>
              <span className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                For YouTube Music tracks, choose Audio Only.
              </span>
            </div>
          )}

          <div
            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs"
            style={{
              backgroundColor: 'var(--mg-bg)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <label
                className={`inline-flex items-center gap-2 ${
                  mode === 'audio' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title="Download and embed English subtitles into video file"
              >
                <input
                  type="checkbox"
                  checked={mode === 'video' && embedSubtitles}
                  disabled={mode === 'audio'}
                  onChange={(e) => setEmbedSubtitles(e.target.checked)}
                  className="accent-[var(--mg-accent)]"
                />
                <Subtitles className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                <span>Embed Subtitles</span>
              </label>

              <label
                className="inline-flex items-center gap-2 cursor-pointer"
                title="Remove sponsored segments automatically via SponsorBlock"
              >
                <input
                  type="checkbox"
                  checked={sponsorBlock}
                  onChange={(e) => setSponsorBlock(e.target.checked)}
                  className="accent-[var(--mg-accent)]"
                />
                <Scissors className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                <span>SponsorBlock</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <ListVideo className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-muted)' }} />
              <div
                className="inline-flex rounded-md border p-0.5"
                style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setPlaylistMode('single')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: playlistMode === 'single' ? 'var(--mg-accent)' : 'transparent',
                    color: playlistMode === 'single' ? '#ffffff' : 'var(--mg-muted)',
                  }}
                >
                  Single Video
                </button>
                <button
                  type="button"
                  onClick={() => setPlaylistMode('playlist')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: playlistMode === 'playlist' ? 'var(--mg-accent)' : 'transparent',
                    color: playlistMode === 'playlist' ? '#ffffff' : 'var(--mg-muted)',
                  }}
                >
                  Full Playlist
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Active Queue</span>
            <span aria-hidden="true" style={{ color: 'var(--mg-muted)' }}>
              ·
            </span>
            <span className="font-mono tabular-nums text-xs" style={{ color: 'var(--mg-muted)' }}>
              {normalizedSearch
                ? `${filteredJobs.length} of ${jobs.length} matching "${searchQuery.trim()}"`
                : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
            </span>
          </div>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--mg-card)',
                borderColor: 'var(--mg-border)',
                color: 'var(--mg-text)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Completed</span>
            </button>
          )}
        </div>

        {jobs.length === 0 ? (
          <div
            className="p-12 rounded-xl border text-center"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <p className="text-sm font-medium mb-1">No download jobs in queue</p>
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              Paste a YouTube, Spotify, Instagram, or TikTok URL above and click Grab to start.
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="p-10 rounded-xl border text-center flex flex-col items-center gap-2"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <p className="text-sm font-medium">No queue jobs match "{searchQuery.trim()}"</p>
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              Try searching by title, URL, source engine, or status (queued, downloading, completed, failed).
            </p>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="mt-1 px-3 py-1.5 rounded-lg border text-xs font-medium"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredJobs.map((job) => {
              const st = STATUS_STYLES[job.status];
              const isSquare = job.engine === 'SPOTIFY' || job.engine === 'YT MUSIC';
              const isPortrait = job.engine === 'GALLERY';
              return (
                <article
                  key={job.job_id}
                  className="p-4 rounded-xl border flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--mg-card)',
                    borderColor: 'var(--mg-border)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div
                      className={`shrink-0 rounded-lg overflow-hidden border flex items-center justify-center ${
                        isSquare ? 'w-16 h-16' : isPortrait ? 'w-16 h-20' : 'w-28 h-16'
                      }`}
                      style={{
                        backgroundColor: 'var(--mg-bg)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      {job.thumbnail ? (
                        <img
                          src={job.thumbnail}
                          alt={job.title || job.url}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : isSquare ? (
                        <Music className="w-5 h-5" style={{ color: 'var(--mg-muted)' }} />
                      ) : isPortrait ? (
                        <ImageIcon className="w-5 h-5" style={{ color: 'var(--mg-muted)' }} />
                      ) : (
                        <Film className="w-5 h-5" style={{ color: 'var(--mg-muted)' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--mg-text)' }}>
                            {job.title || job.url}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
                            <span className="font-semibold" style={{ color: st.color }}>
                              {st.label}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{job.engine}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{job.job_id.slice(0, 8)}</span>
                            {job.options?.embed_subtitles && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span style={{ color: 'var(--mg-accent)' }}>Subtitles</span>
                              </>
                            )}
                            {job.options?.sponsorblock && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span style={{ color: 'var(--mg-accent)' }}>SponsorBlock</span>
                              </>
                            )}
                            {job.options?.playlist_mode === 'playlist' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span style={{ color: 'var(--mg-accent)' }}>Playlist</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs truncate mt-1" style={{ color: 'var(--mg-muted)' }}>
                            {job.url}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onViewLog(job)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                            style={{
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-text)',
                            }}
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Log</span>
                          </button>
                          {job.status === 'done' && job.file && (
                            <>
                              {onPreviewMedia && (
                                <button
                                  type="button"
                                  disabled={previewingJobId === job.job_id}
                                  onClick={() => void handlePreviewJobFile(job)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                                  style={{
                                    borderColor: 'var(--mg-border)',
                                    color: 'var(--mg-text)',
                                  }}
                                >
                                  {previewingJobId === job.job_id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  <span>Preview</span>
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={signingJobId === job.job_id}
                                onClick={() => void handleSignJobFile(job.job_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--mg-accent)' }}
                                title="Generate temporary 1-hour link to save directly to iPad/iPhone Files or another device"
                              >
                                {signingJobId === job.job_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Smartphone className="w-3 h-3" />
                                )}
                                <span>Send to Device</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onShareQr(job.url)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                            style={{
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-text)',
                            }}
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </button>

                          {job.status === 'running' ? (
                            <button
                              type="button"
                              onClick={() => onCancel(job.job_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium text-red-500 border-red-500/40 whitespace-nowrap shrink-0"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          ) : (
                            <>
                              {job.status !== 'queued' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onRetry(job.job_id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium text-amber-500 border-amber-500/40 whitespace-nowrap shrink-0"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Retry</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onClearArchive(job.job_id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                                    style={{
                                      borderColor: 'var(--mg-border)',
                                      color: 'var(--mg-muted)',
                                    }}
                                  >
                                    <ArchiveX className="w-3 h-3" />
                                    <span>Clear Archive</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => onRemove(job.job_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                                style={{
                                  borderColor: 'var(--mg-border)',
                                  color: 'var(--mg-muted)',
                                }}
                              >
                                <X className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--mg-muted)' }}>
                      <span>Progress</span>
                      <span className="font-mono tabular-nums">{Math.round(job.progress || 0)}%</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--mg-border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${job.progress || 0}%`,
                          backgroundColor:
                            job.status === 'failed'
                              ? '#dc2626'
                              : job.status === 'done'
                              ? '#16a34a'
                              : 'var(--mg-accent)',
                        }}
                      />
                    </div>
                  </div>

                  {job.file && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono truncate"
                      style={{
                        backgroundColor: 'var(--mg-bg)',
                        borderColor: 'var(--mg-border)',
                        color: 'var(--mg-text)',
                      }}
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{job.file}</span>
                    </div>
                  )}

                  {signedLinks[job.job_id] && (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-md border text-xs"
                      style={{
                        backgroundColor: 'var(--mg-bg)',
                        borderColor: 'var(--mg-accent)',
                        color: 'var(--mg-text)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <Smartphone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
                        <span className="font-medium truncate max-w-xs">
                          {signedLinks[job.job_id].filename}
                        </span>
                        <span className="font-mono tabular-nums" style={{ color: 'var(--mg-muted)' }}>
                          {formatBytes(signedLinks[job.job_id].size_bytes)} · valid 1h
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={signedLinks[job.job_id].url}
                          download={signedLinks[job.job_id].filename}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white whitespace-nowrap shrink-0"
                          style={{ backgroundColor: 'var(--mg-accent)' }}
                        >
                          <Download className="w-3 h-3" />
                          <span>Save to Device</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            onShareQr(
                              new URL(signedLinks[job.job_id].url, window.location.origin).toString()
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                          style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                        >
                          <QrCode className="w-3 h-3" />
                          <span>QR Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSignedLinks((prev) => {
                              const next = { ...prev };
                              delete next[job.job_id];
                              return next;
                            })
                          }
                          aria-label="Dismiss signed download link"
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: 'var(--mg-muted)' }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
