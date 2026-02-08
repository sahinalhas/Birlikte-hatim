import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    async requestPermissions() {
        if (Platform.OS === 'web') return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    async scheduleJuzReminder(groupTitle: string, juzNumber: number, endDate: string) {
        if (Platform.OS === 'web') return;

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

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

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📖 Hatırlatma: ' + groupTitle,
                body: `${juzNumber}. cüzünüz sizi bekliyor. Grubun bitmesine az kaldı! 😊`,
                data: { type: 'juz_reminder', juzNumber },
            },
            trigger: { date: new Date(reminderTime) } as Notifications.NotificationTriggerInput,
        });
    },

    async cancelAllNotifications() {
        if (Platform.OS === 'web') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};
