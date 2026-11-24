import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: 'var(--mg-card)',
        borderColor: '#f59e0b',
        color: 'var(--mg-text)',
      }}
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline — Reconnecting to MediaGrabber server</span>
    </div>
  );
};
