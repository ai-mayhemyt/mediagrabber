self.addEventListener('push', (event) => {
  let payload = {
    title: 'MediaGrabber',
    body: 'Download update available.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'mediagrabber-update',
    url: '/',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        ...payload,
        ...(typeof data === 'object' && data ? data : {}),
      };
    } catch {
      const text = event.data.text();
      if (text) payload.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || 'mediagrabber-update',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl).catch(() => client);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
