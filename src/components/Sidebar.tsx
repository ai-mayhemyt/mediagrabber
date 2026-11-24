import React from 'react';
import {
  ListVideo,
  History,
  Wrench,
  Settings,
  Palette,
  HardDrive,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { ActiveView, StorageMap, UserAccount } from '../types';
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
  version = 'v2.0-pre3',
  onOpenAccount,
  onOpenTheme,
  onLogout,
}) => {
  const visibleNav =
    user?.role === 'user' ? NAV_ITEMS.filter((item) => item.id !== 'settings') : NAV_ITEMS;

  return (
    <aside
      className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--mg-sidebar)',
        borderColor: 'var(--mg-border)',
      }}
    >
      <div className="p-4 flex flex-col gap-5">
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
