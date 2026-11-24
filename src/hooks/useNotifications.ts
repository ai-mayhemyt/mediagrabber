import { useCallback, useEffect, useMemo, useState } from 'react';
import { Job } from '../types';

const STORAGE_KEY = 'mg_notifications_enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type BrowserNotifPermission = NotificationPermission | 'unsupported';

interface UseNotificationsOptions {
  onNotify?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export function useNotifications(options?: UseNotificationsOptions) {
  const onNotify = options?.onNotify;
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState<BrowserNotifPermission>(() =>
    supported ? Notification.permission : 'unsupported'
  );
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  const syncSubscriptionState = useCallback(async () => {
    if (!supported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    if (!pushSupported) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(Boolean(sub));
      if (sub && Notification.permission === 'granted') {
        setLocalEnabled(true);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, [pushSupported, supported]);

  useEffect(() => {
    void syncSubscriptionState();
  }, [syncSubscriptionState]);

  const showLocalNotification = useCallback(
    async (title: string, body: string, tag = 'mediagrabber-alert') => {
      if (!supported || Notification.permission !== 'granted') return false;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag,
              data: { url: '/' },
            });
            return true;
          }
        }
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          tag,
        });
        return true;
      } catch {
        return false;
      }
    },
    [supported]
  );

  const enableNotifications = useCallback(async () => {
    if (!supported) {
      onNotify?.('error', 'Browser notifications are not supported in this browser.');
      return false;
    }
    if (!window.isSecureContext) {
      onNotify?.(
        'error',
        'Browser notifications require HTTPS or localhost (insecure HTTP context blocked).'
      );
      return false;
    }

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        onNotify?.('error', 'Notification permission was denied in browser settings.');
        return false;
      }

      setLocalEnabled(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // ignore
      }

      if (pushSupported) {
        try {
          const keyRes = await fetch('/api/notifications/vapid-public-key');
          if (keyRes.ok) {
            const { publicKey } = (await keyRes.json()) as { publicKey?: string };
            if (publicKey) {
              const reg = await navigator.serviceWorker.ready;
              let sub = await reg.pushManager.getSubscription();
              if (!sub) {
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey),
                });
              }
              const subRes = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sub.toJSON()),
              });
              if (subRes.ok) {
                setPushSubscribed(true);
                onNotify?.('success', 'Push notifications enabled for download updates.');
                return true;
              }
            }
          }
        } catch {
          // Fallback cleanly to local browser/SW notifications below
        }
      }

      onNotify?.('success', 'Browser notifications enabled for download completion alerts.');
      return true;
    } finally {
      setBusy(false);
    }
  }, [onNotify, pushSupported, supported]);

  const disableNotifications = useCallback(async () => {
    setBusy(true);
    try {
      if (pushSupported) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            await fetch('/api/notifications/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            }).catch(() => {});
            await sub.unsubscribe();
          }
        } catch {
          // ignore
        }
      }
      setPushSubscribed(false);
      setLocalEnabled(false);
      try {
        localStorage.setItem(STORAGE_KEY, 'false');
      } catch {
        // ignore
      }
      onNotify?.('info', 'Notifications paused.');
    } finally {
      setBusy(false);
    }
  }, [onNotify, pushSupported]);

  const toggleNotifications = useCallback(async () => {
    if (localEnabled && permission === 'granted') {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  }, [disableNotifications, enableNotifications, localEnabled, permission]);

  const sendTestNotification = useCallback(async () => {
    setBusy(true);
    try {
      let sentRemote = false;
      if (pushSubscribed) {
        const res = await fetch('/api/notifications/test', { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Number(data.sent) > 0) {
          sentRemote = true;
          onNotify?.('success', `Test push sent to ${data.sent} subscribed device(s).`);
          return;
        }
      }
      if (!sentRemote) {
        if (permission !== 'granted') {
          const ok = await enableNotifications();
          if (!ok) return;
        }
        const shown = await showLocalNotification(
          'MediaGrabber',
          'Notifications are active — you will be notified when downloads finish or fail.',
          'mediagrabber-test'
        );
        if (shown) {
          onNotify?.('success', 'Test notification displayed.');
        } else {
          onNotify?.('error', 'Unable to display browser notification in this context.');
        }
      }
    } finally {
      setBusy(false);
    }
  }, [enableNotifications, onNotify, permission, pushSubscribed, showLocalNotification]);

  const notifyJobTransition = useCallback(
    (job: Job) => {
      if (!localEnabled || permission !== 'granted') return;
      const label = job.title || job.url;
      if (job.status === 'done') {
        void showLocalNotification(
          'Download Complete',
          `${label} finished (${job.engine}).`,
          `job-${job.job_id}`
        );
      } else if (job.status === 'failed') {
        void showLocalNotification(
          'Download Failed',
          `${label} failed (${job.engine}). Check logs for details.`,
          `job-${job.job_id}`
        );
      }
    },
    [localEnabled, permission, showLocalNotification]
  );

  const notifyVersionUpdate = useCallback(
    (latest: string) => {
      if (!localEnabled || permission !== 'granted') return;
      void showLocalNotification(
        'MediaGrabber Update Available',
        `Version ${latest} is available on GitHub.`,
        `version-${latest}`
      );
    },
    [localEnabled, permission, showLocalNotification]
  );

  const isEnabled = localEnabled && permission === 'granted';

  return useMemo(
    () => ({
      supported,
      pushSupported,
      permission,
      pushSubscribed,
      isEnabled,
      busy,
      enableNotifications,
      disableNotifications,
      toggleNotifications,
      sendTestNotification,
      notifyJobTransition,
      notifyVersionUpdate,
    }),
    [
      supported,
      pushSupported,
      permission,
      pushSubscribed,
      isEnabled,
      busy,
      enableNotifications,
      disableNotifications,
      toggleNotifications,
      sendTestNotification,
      notifyJobTransition,
      notifyVersionUpdate,
    ]
  );
}
