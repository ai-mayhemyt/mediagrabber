import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveView,
  HistoryItem,
  Job,
  MediaFileItem,
  StorageMap,
  ThemeColors,
  ToastMessage,
  UserAccount,
} from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { QueueView } from './components/QueueView';
import { HistoryView } from './components/HistoryView';
import { UtilitiesView } from './components/UtilitiesView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useNotifications } from './hooks/useNotifications';
import {
  AccountModal,
  ConfirmDialog,
  JobLogModal,
  MetadataEditorModal,
  QrModal,
  ScheduleModal,
  THEME_PRESETS,
  ThemeModal,
  ToastContainer,
} from './components/Modals';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('queue');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [storage, setStorage] = useState<StorageMap>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [appVersion, setAppVersion] = useState('v2.0-pre4');

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [themeColors, setThemeColors] = useState<ThemeColors>(THEME_PRESETS.default.colors);

  // Modals
  const [logJob, setLogJob] = useState<Job | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; prefillUrl?: string }>({
    open: false,
  });
  const [editingMedia, setEditingMedia] = useState<{
    item: MediaFileItem;
    onSaved: () => void;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const notify = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const notifications = useNotifications({ onNotify: notify });
  const prevJobStatusesRef = useRef<Map<string, Job['status']> | null>(null);
  const lastNotifiedVersionRef = useRef<string | null>(null);

  const askConfirm = useCallback(
    (title: string, message: string, onAccept: () => void) => {
      setConfirmState({
        open: true,
        title,
        message,
        onConfirm: () => {
          setConfirmState((s) => ({ ...s, open: false }));
          onAccept();
        },
      });
    },
    []
  );

  const applyThemeColors = useCallback((colors: ThemeColors, isLight?: boolean) => {
    const root = document.documentElement;
    root.style.setProperty('--mg-bg', colors.bg);
    root.style.setProperty('--mg-sidebar', colors.sidebar);
    root.style.setProperty('--mg-card', colors.card);
    root.style.setProperty('--mg-border', colors.border);
    root.style.setProperty('--mg-text', colors.text);
    root.style.setProperty('--mg-accent', colors.accent);

    if (typeof isLight === 'boolean') {
      setThemeMode(isLight ? 'light' : 'dark');
      if (isLight) root.classList.remove('dark');
      else root.classList.add('dark');
    }
    setThemeColors(colors);
  }, []);

  const applyUserTheme = useCallback(
    (u: UserAccount) => {
      if (u.theme_colors) {
        applyThemeColors(u.theme_colors, u.theme === 'light');
      } else {
        const preset = u.theme === 'light' ? THEME_PRESETS.light : THEME_PRESETS.default;
        applyThemeColors(preset.colors, u.theme === 'light');
      }
    },
    [applyThemeColors]
  );

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const u = (await res.json()) as UserAccount;
        setUser(u);
        applyUserTheme(u);
      } else if (res.status === 401) {
        setUser(null);
      }
    } catch {
      // ignore
    } finally {
      setAuthChecked(true);
    }
  }, [applyUserTheme]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Job[];
        const nextStatuses = new Map<string, Job['status']>();
        const prevStatuses = prevJobStatusesRef.current;

        for (const job of data) {
          nextStatuses.set(job.job_id, job.status);
          if (prevStatuses) {
            const oldStatus = prevStatuses.get(job.job_id);
            if (
              (oldStatus === 'queued' || oldStatus === 'running') &&
              (job.status === 'done' || job.status === 'failed')
            ) {
              const label = job.title || job.url;
              if (job.status === 'done') {
                notify('success', `Download complete: ${label}`);
              } else {
                notify('error', `Download failed: ${label}`);
              }
              notifications.notifyJobTransition(job);
            }
          }
        }
        prevJobStatusesRef.current = nextStatuses;

        setJobs(data);
        setLogJob((curr) => (curr ? data.find((j) => j.job_id === curr.job_id) || curr : null));
      }
    } catch {
      // ignore
    }
  }, [notifications, notify]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      if (res.ok) {
        setStorage(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchMe();
    fetch('/api/version/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.current) {
          const shortVer = String(data.current).split(/\s+/)[0] || 'v2.0-pre4';
          setAppVersion(shortVer);
        }
        if (
          data?.update_available &&
          data?.latest &&
          lastNotifiedVersionRef.current !== data.latest
        ) {
          lastNotifiedVersionRef.current = data.latest;
          notify(
            'info',
            `MediaGrabber ${data.latest} is available (currently on ${data.current}).`
          );
          notifications.notifyVersionUpdate(String(data.latest));
        }
      })
      .catch(() => {});
  }, [fetchMe, notifications, notify]);

  useEffect(() => {
    if (!user) return;
    void fetchQueue();
    void fetchHistory();
    void fetchStorage();

    const interval = setInterval(() => {
      void fetchQueue();
    }, 1500);
    return () => clearInterval(interval);
  }, [user, fetchQueue, fetchHistory, fetchStorage]);

  useEffect(() => {
    if (!user) return;
    if (activeView === 'history') void fetchHistory();
    if (activeView === 'queue') void fetchStorage();
  }, [user, activeView, fetchHistory, fetchStorage]);

  const persistTheme = async (colors: ThemeColors, isLight?: boolean) => {
    if (!user) return;
    await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        colors,
        theme: isLight ? 'light' : 'dark',
      }),
    });
  };

  const handleToggleTheme = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    const preset = nextMode === 'light' ? THEME_PRESETS.light : THEME_PRESETS.default;
    applyThemeColors(preset.colors, nextMode === 'light');
    await persistTheme(preset.colors, nextMode === 'light');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAccountOpen(false);
    setScheduleModal({ open: false });
    setLogJob(null);
    setQrUrl(null);
    setEditingMedia(null);
    setUser(null);
    setActiveView('queue');
    notify('info', 'Logged out of MediaGrabber.');
  };

  const handleAuthSuccess = (authenticatedUser: UserAccount) => {
    setUser(authenticatedUser);
    applyUserTheme(authenticatedUser);
    setActiveView('queue');
  };

  const handleGrab = async (urls: string[], mode: 'video' | 'audio'): Promise<string[]> => {
    const res = await fetch('/api/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      notify('error', err.error || 'Failed to queue URLs.');
      return [];
    }
    const data = await res.json().catch(() => ({}));
    const jobIds: string[] = Array.isArray(data.job_ids)
      ? data.job_ids
      : data.job_id
      ? [data.job_id]
      : [];
    notify('success', `Queued ${urls.length} media ${urls.length === 1 ? 'job' : 'jobs'}.`);
    await fetchQueue();
    setTimeout(() => {
      void fetchHistory();
      void fetchStorage();
    }, 1200);
    return jobIds;
  };

  const handleCancel = (id: string) => {
    askConfirm('Cancel Job', 'Stop this active download job?', async () => {
      await fetch(`/api/cancel/${id}`, { method: 'POST' });
      notify('info', 'Job cancelled.');
      void fetchQueue();
    });
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/remove/${id}`, { method: 'DELETE' });
    void fetchQueue();
  };

  const handleRetry = (id: string) => {
    askConfirm(
      'Retry Download',
      'Remove the existing archive entry and re-queue this URL?',
      async () => {
        const res = await fetch(`/api/retry/${id}`, { method: 'POST' });
        if (res.ok) {
          notify('success', 'Job re-queued.');
          void fetchQueue();
        }
      }
    );
  };

  const handleClearArchive = (id: string) => {
    askConfirm(
      'Clear Archive Entry',
      'Remove this URL from archive.txt and delete the completed job card?',
      async () => {
        await fetch(`/api/clear-archive/${id}`, { method: 'POST' });
        notify('info', 'Archive entry cleared.');
        void fetchQueue();
      }
    );
  };

  const handleClearCompleted = () => {
    askConfirm(
      'Clear Completed Jobs',
      'Remove all finished, failed, and cancelled jobs from the queue list?',
      async () => {
        await fetch('/api/clear-completed', { method: 'POST' });
        notify('info', 'Completed jobs cleared.');
        void fetchQueue();
      }
    );
  };

  const handleClearHistory = () => {
    askConfirm(
      'Clear Download History',
      'Delete all recorded download history items?',
      async () => {
        await fetch('/api/history/clear', { method: 'POST' });
        setHistory([]);
        notify('info', 'History cleared.');
      }
    );
  };

  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-muted)' }}
      >
        Loading MediaGrabber…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
          onOpenTheme={() => setThemeOpen(true)}
          onAuthenticated={handleAuthSuccess}
          onNotify={notify}
        />
        <ThemeModal
          open={themeOpen}
          colors={themeColors}
          themeMode={themeMode}
          onPreview={(colors, isLight) => applyThemeColors(colors, isLight)}
          onApply={(colors, isLight) => {
            applyThemeColors(colors, isLight);
            notify('success', 'Theme updated.');
          }}
          onClose={() => setThemeOpen(false)}
        />
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      </>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-text)' }}
    >
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        user={user}
        storage={storage}
        version={appVersion}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenTheme={() => setThemeOpen(true)}
        onLogout={handleLogout}
        onGrab={handleGrab}
        onNotify={notify}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeView={activeView}
          themeMode={themeMode}
          version={appVersion}
          searchQuery={searchQuery}
          notificationsEnabled={notifications.isEnabled}
          notificationsBusy={notifications.busy}
          onSearchChange={setSearchQuery}
          onToggleNotifications={() => void notifications.toggleNotifications()}
          onToggleTheme={handleToggleTheme}
          onOpenTheme={() => setThemeOpen(true)}
          onShareQr={() => setQrUrl(window.location.href)}
          onLogout={handleLogout}
          onPwaInstalled={() => notify('success', 'MediaGrabber installed as an app.')}
        />

        <main className="flex-1 p-5 sm:p-6 overflow-y-auto">
          {activeView === 'queue' && (
            <QueueView
              jobs={jobs}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              onGrab={handleGrab}
              onCancel={handleCancel}
              onRemove={handleRemove}
              onRetry={handleRetry}
              onClearArchive={handleClearArchive}
              onClearCompleted={handleClearCompleted}
              onViewLog={(job) => setLogJob(job)}
              onShareQr={(url) => setQrUrl(url)}
              onOpenSchedule={(prefillUrl) => setScheduleModal({ open: true, prefillUrl })}
              onNotify={notify}
            />
          )}

          {activeView === 'history' && (
            <HistoryView
              items={history}
              searchQuery={searchQuery}
              onClearHistory={handleClearHistory}
              onRegrab={async (url) => {
                await handleGrab([url], 'video');
                setActiveView('queue');
              }}
              onShareQr={(url) => setQrUrl(url)}
              onNotify={notify}
            />
          )}

          {activeView === 'utilities' && (
            <UtilitiesView
              currentUser={user}
              onEditMetadata={(item, onSaved) => setEditingMedia({ item, onSaved })}
              onUserSwitched={() => {
                void fetchMe();
                setActiveView('queue');
              }}
              onQueueBatch={async (urls, mode) => {
                const ids = await handleGrab(urls, mode);
                if (ids.length > 0) {
                  setActiveView('queue');
                }
                return ids;
              }}
              onStorageRefresh={() => void fetchStorage()}
              onNotify={notify}
              onConfirm={askConfirm}
            />
          )}

          {activeView === 'settings' && user?.role === 'admin' && (
            <SettingsView
              onNotify={notify}
              onStorageRefresh={() => void fetchStorage()}
              notifications={{
                isEnabled: notifications.isEnabled,
                pushSubscribed: notifications.pushSubscribed,
                permission: notifications.permission,
                busy: notifications.busy,
                onToggle: async () => {
                  await notifications.toggleNotifications();
                },
                onTest: notifications.sendTestNotification,
              }}
            />
          )}
        </main>
      </div>

      <JobLogModal job={logJob} onClose={() => setLogJob(null)} />
      <QrModal url={qrUrl} onClose={() => setQrUrl(null)} />
      <ScheduleModal
        open={scheduleModal.open}
        prefillUrl={scheduleModal.prefillUrl}
        onClose={() => setScheduleModal({ open: false })}
        onNotify={notify}
      />
      <AccountModal
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onUpdated={(updated) => setUser(updated)}
        onLogout={handleLogout}
        onNotify={notify}
      />
      <ThemeModal
        open={themeOpen}
        colors={themeColors}
        themeMode={themeMode}
        onPreview={(colors, isLight) => applyThemeColors(colors, isLight)}
        onApply={async (colors, isLight) => {
          applyThemeColors(colors, isLight);
          await persistTheme(colors, isLight);
          notify('success', 'Theme saved.');
        }}
        onClose={() => setThemeOpen(false)}
      />
      <MetadataEditorModal
        item={editingMedia?.item || null}
        onClose={() => setEditingMedia(null)}
        onSaved={() => editingMedia?.onSaved()}
        onNotify={notify}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={confirmState.onConfirm}
      />
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      <OfflineIndicator />
    </div>
  );
}
