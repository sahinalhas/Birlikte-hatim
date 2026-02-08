import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

// Lazy load notifications to avoid issues on web or if module is missing
let Notifications: typeof NotificationsType | null = null;
let isInitialized = false;

const getNotifications = () => {
    if (Platform.OS === 'web') return null;
    if (Notifications) return Notifications;
    try {
        Notifications = require('expo-notifications');
    } catch (error) {
        console.warn('Failed to load expo-notifications:', error);
        return null;
    }
    return Notifications;
};


export const notificationService = {
    init() {
        if (Platform.OS === 'web' || isInitialized) return;

        const Notif = getNotifications();
        if (!Notif) return;

        Notif.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        isInitialized = true;
    },

    async requestPermissions() {
        if (Platform.OS === 'web') return false;

        const Notif = getNotifications();
        if (!Notif) return false;

        const { status: existingStatus } = await Notif.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notif.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    async scheduleJuzReminder(groupTitle: string, juzNumber: number, endDate: string) {
        if (Platform.OS === 'web') return;

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        const Notif = getNotifications();
        if (!Notif) return;

        // Calculate reminder time: 2 days before end date, or halfway if duration is short
        const end = new Date(endDate).getTime();
        const now = new Date().getTime();
        const diff = end - now;

        // Default to 1 day before if the group is short, else 2 days before
        let reminderTime = end - (24 * 60 * 60 * 1000); // 1 day before
        if (diff > (3 * 24 * 60 * 60 * 1000)) {
            reminderTime = end - (2 * 24 * 60 * 60 * 1000); // 2 days before
        }

        // If reminder time is in the past, don't schedule
        if (reminderTime <= now) return;

        await Notif.scheduleNotificationAsync({
            content: {
                title: '📖 Hatırlatma: ' + groupTitle,
                body: `${juzNumber}. cüzünüz sizi bekliyor. Grubun bitmesine az kaldı! 😊`,
                data: { type: 'juz_reminder', juzNumber },
            },
            trigger: { date: new Date(reminderTime) } as NotificationsType.NotificationTriggerInput,
        });
    },

    async cancelAllNotifications() {
        if (Platform.OS === 'web') return;
        const Notif = getNotifications();
        if (!Notif) return;
        await Notif.cancelAllScheduledNotificationsAsync();
    }
};
