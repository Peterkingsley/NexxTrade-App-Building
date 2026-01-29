// Service Worker for NexxTrade
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming Push Notifications from Server
self.addEventListener('push', (event) => {
  if (event.data) {
    let data;
    try {
        data = event.data.json();
    } catch(e) {
        data = { title: 'NexxTrade Alert', body: event.data.text() };
    }

    const options = {
      body: data.body,
      icon: data.icon || '/logo.png', // Ensure this file exists in public/
      badge: '/badge.png', // Optional, small icon for status bar
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/'
      },
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Open the app or focus window on click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});