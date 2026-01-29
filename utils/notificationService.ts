// Utility to handle Browser Notifications

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
