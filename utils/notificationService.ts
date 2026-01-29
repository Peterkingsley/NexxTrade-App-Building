// Utility to handle Browser Notifications and Push API
import axios from 'axios';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Main function to subscribe to Web Push
export const subscribeToPushNotifications = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log("Push notifications not supported");
        return;
    }

    try {
        // 1. Get Service Worker Registration
        const registration = await navigator.serviceWorker.ready;
        if (!registration) {
            console.log("Service Worker not ready");
            return;
        }

        // 2. Get Public Key from Server
        const keyRes = await axios.get('/api/push/vapid-public-key');
        const publicVapidKey = keyRes.data.publicKey;

        if (!publicVapidKey) {
            console.error("No VAPID key returned from server");
            return;
        }

        // 3. Subscribe to Push Manager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // 4. Send Subscription to Backend
        await axios.post('/api/push/subscribe', subscription, {
            headers: { 'x-user-id': userId }
        });

        console.log("Push Notification Subscription Successful");

    } catch (error) {
        console.error("Failed to subscribe to push notifications", error);
    }
};

export const sendLocalNotification = async (title: string, body: string, icon: string = '/logo.png') => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const options = {
            body,
            icon,
            vibrate: [200, 100, 200], // Vibration pattern for mobile
            tag: 'nexxtrade-alert', // Grouping tag
            requireInteraction: false
        };

        // 1. Try Service Worker Method (Required for Android/Mobile)
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                    await registration.showNotification(title, options);
                    return;
                }
            } catch (e) {
                console.log("Service Worker notification failed, falling back to classic API", e);
            }
        }
        
        // 2. Fallback to Classic API (Desktop / Browsers without SW)
        try {
            new Notification(title, options);
        } catch (e) {
            console.error("Classic Notification API failed", e);
        }
    }
};