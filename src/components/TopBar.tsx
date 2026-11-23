import React, { useEffect, useRef } from 'react';
import { QrCode, Sun, Moon, Palette, LogOut, Search, X } from 'lucide-react';
import { ActiveView } from '../types';

interface TopBarProps {
  activeView: ActiveView;
  themeMode: 'dark' | 'light';
  version?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
  onOpenTheme: () => void;
  onShareQr: () => void;
  onLogout: () => void;
}

const VIEW_LABELS: Record<ActiveView, string> = {
  queue: 'Queue & Grabber',
  history: 'Download History',
  utilities: 'Library Utilities',
  settings: 'System Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  themeMode,
  version = 'v2.0-v1',
  searchQuery,
  onSearchChange,
  onToggleTheme,
  onOpenTheme,
  onShareQr,
  onLogout,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header
      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 px-6 py-3.5 border-b shrink-0"
      style={{
        backgroundColor: 'var(--mg-bg)',
        borderColor: 'var(--mg-border)',
      }}
    >
      <div className="flex items-center gap-2 text-sm min-w-0 shrink-0">
        <span style={{ color: 'var(--mg-muted)' }} className="whitespace-nowrap shrink-0">
          MediaGrabber
        </span>
        <span
          className="font-mono text-[11px] px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-muted)',
          }}
        >
          {version}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--mg-muted)' }}>
          /
        </span>
        <h1
          className="font-display text-base font-semibold truncate"
          style={{ color: 'var(--mg-text)' }}
        >
          {VIEW_LABELS[activeView]}
        </h1>
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-md order-3 sm:order-2 w-full sm:w-auto">
        <Search
          className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--mg-muted)' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearchChange('');
              inputRef.current?.blur();
            }
          }}
          placeholder="Search queue & history (name, URL, or status)..."
          aria-label="Global search queue and history"
          className="w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs outline-none transition-colors"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: searchQuery ? 'var(--mg-accent)' : 'var(--mg-border)',
            color: 'var(--mg-text)',
          }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
            style={{ color: 'var(--mg-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span
            className="hidden md:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none"
            style={{ color: 'var(--mg-muted)' }}
          >
            ⌘K
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 order-2 sm:order-3">
        <button
          type="button"
          onClick={onOpenTheme}
          title="Open Theme Editor"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-text)',
          }}
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Theme Editor</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-text)',
          }}
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Dark</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onShareQr}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
          style={{ backgroundColor: 'var(--mg-accent)' }}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Share QR</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 hover:text-red-400"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-muted)',
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </header>
  );
};
