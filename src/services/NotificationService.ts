import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const isExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGoAndroid) {
    Notifications = require('expo-notifications');

    // Set notification handler to show notifications even when app is open
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export const NotificationService = {
    async requestPermissions() {
        if (isExpoGoAndroid) {
            console.log("Expo Notifications will not work in Expo Go on Android.");
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get permissions for notifications!');
            return false;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0A84FF',
            });
        }

        return true;
    },

    async sendImmediateNotification(title: string, body: string) {
        if (isExpoGoAndroid) {
            console.log("Notificações não funcionam no Expo Go Android.");
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidImportance.MAX,
            },
            trigger: null, // Enviar agora
        });
    },

    async scheduleWaterReminders(intervalMinutes: number = 0) {
        if (isExpoGoAndroid) return;

        try {
            await Notifications.cancelAllScheduledNotificationsAsync();

            if (intervalMinutes === 0) {
                console.log('Lembretes de água desativados.');
                return;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "💦 Hora de hidratar!",
                    body: "Lembre-se de beber água para manter sua performance.",
                    sound: true,
                },
                trigger: {
                    seconds: intervalMinutes * 60,
                    repeats: true,
                },
            });

            console.log(`Lembretes de água agendados a cada ${intervalMinutes} minutos.`);
        } catch (error) {
            console.error('Erro ao agendar lembretes:', error);
        }
    }
};
