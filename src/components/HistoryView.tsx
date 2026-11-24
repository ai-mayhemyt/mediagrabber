import React, { useMemo, useState } from 'react';
import { Search, Trash2, Download, QrCode, Film, Smartphone, Loader2, X, Play } from 'lucide-react';
import { HistoryItem, MediaPreviewItem, SignedFileDownload } from '../types';

interface HistoryViewProps {
  items: HistoryItem[];
  searchQuery?: string;
  onClearHistory: () => void;
  onRegrab: (url: string) => void;
  onShareQr: (url: string) => void;
  onPreviewMedia?: (media: MediaPreviewItem) => void;
  onNotify?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

const SOURCE_FILTERS: { id: 'all' | HistoryItem['source']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'ytmusic', label: 'YT Music' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'gallery', label: 'Gallery' },
];

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  searchQuery = '',
  onClearHistory,
  onRegrab,
  onShareQr,
  onPreviewMedia,
  onNotify,
}) => {
  const [sourceFilter, setSourceFilter] = useState<'all' | HistoryItem['source']>('all');
  const [query, setQuery] = useState('');
  const [signedLinks, setSignedLinks] = useState<Record<string, SignedFileDownload>>({});
  const [signingId, setSigningId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

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

  const handleSignHistoryFile = async (item: HistoryItem) => {
    if (!item.file || signingId) return;
    setSigningId(item.id);
    try {
      const res = await fetch('/api/files/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: item.file }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        onNotify?.('error', data.error || 'File is no longer available on disk.');
        return;
      }
      setSignedLinks((prev) => ({ ...prev, [item.id]: data as SignedFileDownload }));
      onNotify?.('success', 'Signed 1-hour device download link ready.');
    } catch {
      onNotify?.('error', 'Failed to generate signed download link.');
    } finally {
      setSigningId(null);
    }
  };

  const handlePreviewHistoryFile = async (item: HistoryItem) => {
    if (!item.file || !onPreviewMedia || previewingId) return;
    setPreviewingId(item.id);
    try {
      let signed = signedLinks[item.id];
      if (!signed) {
        const res = await fetch('/api/files/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: item.file }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          onNotify?.('error', data.error || 'File is no longer available on disk.');
          return;
        }
        signed = data as SignedFileDownload;
        setSignedLinks((prev) => ({ ...prev, [item.id]: signed! }));
      }
      const isAudio = /\.(mp3|m4a|aac|flac|ogg|opus|wav)$/i.test(signed.filename.toLowerCase());
      onPreviewMedia({
        inlineUrl: `${signed.url}&inline=1`,
        downloadUrl: signed.url,
        filename: signed.filename,
        size_bytes: signed.size_bytes,
        isAudio,
      });
    } catch {
      onNotify?.('error', 'Failed to launch media preview.');
    } finally {
      setPreviewingId(null);
    }
  };

  const filtered = useMemo(() => {
    const localQ = query.trim().toLowerCase();
    const globalQ = searchQuery.trim().toLowerCase();

    const matchesText = (item: HistoryItem, needle: string) =>
      item.title.toLowerCase().includes(needle) ||
      item.url.toLowerCase().includes(needle) ||
      item.source.toLowerCase().includes(needle) ||
      (item.file || '').toLowerCase().includes(needle) ||
      'completed'.includes(needle) ||
      'done'.includes(needle);

    return items.filter((item) => {
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (localQ && !matchesText(item, localQ)) return false;
      if (globalQ && !matchesText(item, globalQ)) return false;
      return true;
    });
  }, [items, sourceFilter, query, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}>
          {SOURCE_FILTERS.map((f) => {
            const active = sourceFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSourceFilter(f.id)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: active ? 'var(--mg-accent)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--mg-muted)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--mg-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter history..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none"
              style={{
                backgroundColor: 'var(--mg-card)',
                borderColor: 'var(--mg-border)',
                color: 'var(--mg-text)',
              }}
            />
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-red-500 border-red-500/40 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="p-12 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <p className="text-sm font-medium mb-1">No matching history records</p>
          <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
            Completed downloads from YouTube, Spotify, and Gallery extractors are logged here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border divide-y overflow-hidden"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2.5 p-3.5 transition-colors"
              style={{ borderColor: 'var(--mg-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-16 h-11 rounded-md overflow-hidden border shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-4 h-4" style={{ color: 'var(--mg-muted)' }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--mg-text)' }}>
                      {item.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                      <span className="uppercase font-medium">{item.source}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-xs">{item.url}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {item.file && (
                    <>
                      {onPreviewMedia && (
                        <button
                          type="button"
                          disabled={previewingId === item.id}
                          onClick={() => void handlePreviewHistoryFile(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                          style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                        >
                          {previewingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span>Preview</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={signingId === item.id}
                        onClick={() => void handleSignHistoryFile(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white whitespace-nowrap shrink-0 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--mg-accent)' }}
                      >
                        {signingId === item.id ? (
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
                    onClick={() => onRegrab(item.url)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  >
                    <Download className="w-3 h-3" />
                    <span>Grab Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareQr(item.url)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>QR</span>
                  </button>
                </div>
              </div>

              {signedLinks[item.id] && (
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
                      {signedLinks[item.id].filename}
                    </span>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--mg-muted)' }}>
                      {formatBytes(signedLinks[item.id].size_bytes)} · valid 1h
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={signedLinks[item.id].url}
                      download={signedLinks[item.id].filename}
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
                          new URL(signedLinks[item.id].url, window.location.origin).toString()
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
                          delete next[item.id];
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
