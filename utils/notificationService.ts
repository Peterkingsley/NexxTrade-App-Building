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

export const sendLocalNotification = (title: string, body: string, icon: string = '/logo.png') => {
    if ('Notification' in window && Notification.permission === 'granted') {
        const options = {
            body,
            icon,
            vibrate: [200, 100, 200], // Vibration pattern for mobile
        };
        
        // Mobile browsers might require ServiceWorker for consistent notifications, 
        // but this works for desktop and open tabs on Android.
        new Notification(title, options);
    }
};
