import React, { useMemo, useState } from 'react';
import { Search, Trash2, Download, QrCode, Film } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryViewProps {
  items: HistoryItem[];
  searchQuery?: string;
  onClearHistory: () => void;
  onRegrab: (url: string) => void;
  onShareQr: (url: string) => void;
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
}) => {
  const [sourceFilter, setSourceFilter] = useState<'all' | HistoryItem['source']>('all');
  const [query, setQuery] = useState('');

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
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors"
              style={{ borderColor: 'var(--mg-border)' }}
            >
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

              <div className="flex items-center gap-1.5 shrink-0">
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
          ))}
        </div>
      )}
    </div>
  );
};
