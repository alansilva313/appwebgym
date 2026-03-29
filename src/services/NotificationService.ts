import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Importação dinâmica para evitar o crash no Expo Go Android
// O Expo Go SDK 53+ não permite o uso de expo-notifications para notificações remotas
// e pode dar erro até no carregamento do módulo se não for tratado.
const isExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGoAndroid) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.error("Falha ao carregar expo-notifications:", e);
    }
}

// Configuração global para notificações em primeiro plano
if (Notifications && Platform.OS !== 'web') {
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
        // Na Web, só pedimos permissão se estiver em modo standalone (PWA instalado)
        const isStandalone = Platform.OS === 'web' && 
            (typeof window !== 'undefined' && 
             (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone));

        if (Platform.OS === 'web' && !isStandalone) {
            console.log("No web, notificações são solicitadas apenas na versão PWA instalada.");
            return false;
        }

        if (isExpoGoAndroid || !Notifications) {
            console.log("Notificações em segundo plano não funcionam no Expo Go Android.");
            return false;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permissão de notificação negada!');
                return false;
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#BBF246',
                });
            }

            return true;
        } catch (error) {
            console.error("Erro ao solicitar permissões de notificação:", error);
            return false;
        }
    },

    async sendImmediateNotification(title: string, body: string) {
        if (isExpoGoAndroid || !Notifications) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                },
                trigger: null,
            });
        } catch (error) {
            console.error("Erro ao enviar notificação imediata:", error);
        }
    },

    async scheduleWaterReminders(intervalMinutes: number = 0) {
        if (isExpoGoAndroid || !Notifications) return;

        try {
            // Limpa agendamentos anteriores para não duplicar
            await Notifications.cancelAllScheduledNotificationsAsync();

            if (intervalMinutes === 0) {
                console.log('Lembretes de água desativados.');
                return;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "💦 Hora de hidratar!",
                    body: "Beber água agora vai acelerar seus resultados.",
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: intervalMinutes * 60,
                    repeats: true,
                },
            });

            console.log(`Lembretes de água configurados para cada ${intervalMinutes} minutos.`);
        } catch (error) {
            console.error('Erro ao agendar lembretes:', error);
        }
    },

    async scheduleWorkoutReminder(workoutName: string, seconds: number = 30) {
        if (!Notifications) return;

        try {
            // Cancela lembretes de treino anteriores para agendar o novo
            // (Evita múltiplas notificações se o usuário entrar e sair rapidamente)
            await this.cancelWorkoutReminder();

            await Notifications.scheduleNotificationAsync({
                identifier: 'workout_reminder',
                content: {
                    title: "🏋️ Treino em andamento!",
                    body: `${this.getRandomPhrase()} Toque para retomar o treino de "${workoutName}".`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: seconds,
                    repeats: false,
                },
            });
        } catch (error) {
            console.error("Erro ao agendar lembrete de treino:", error);
        }
    },

    async cancelWorkoutReminder() {
        if (!Notifications) return;
        try {
            await Notifications.dismissNotificationAsync('workout_reminder');
            await Notifications.cancelScheduledNotificationAsync('workout_reminder');
        } catch (error) {
            console.error("Erro ao cancelar lembrete de treino:", error);
        }
    },

    async scheduleWorkoutReminders(preferredTime: string, workouts: any[]) {
        if (!Notifications || !preferredTime) return;

        try {
            // Limpa lembretes antigos baseados em dias da semana
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const n of scheduled) {
                if (n.identifier.startsWith('workout_day_')) {
                    await Notifications.cancelScheduledNotificationAsync(n.identifier);
                }
            }

            if (!preferredTime.includes(':')) return;
            const [hour, minute] = preferredTime.split(':').map(Number);

            const dayMap: Record<string, number> = {
                'Sunday': 1, 'Monday': 2, 'Tuesday': 3, 'Wednesday': 4, 'Thursday': 5, 'Friday': 6, 'Saturday': 7,
                'Dom': 1, 'Seg': 2, 'Ter': 3, 'Qua': 4, 'Qui': 5, 'Sex': 6, 'Sab': 7,
                'Domingo': 1, 'Segunda': 2, 'Terça': 3, 'Quarta': 4, 'Quinta': 5, 'Sexta': 6, 'Sábado': 7
            };

            // Agrupa treinos por dia
            const workoutDays: Record<number, string[]> = {};
            workouts.forEach(w => {
                if (!w.daysOfWeek) return;
                const days = w.daysOfWeek.split(',').map((d: string) => d.trim());
                days.forEach((d: string) => {
                    const dayNum = dayMap[d];
                    if (dayNum) {
                        if (!workoutDays[dayNum]) workoutDays[dayNum] = [];
                        workoutDays[dayNum].push(w.name);
                    }
                });
            });

            // Agenda uma notificação para cada dia que tem treino
            for (const dayNumStr in workoutDays) {
                const dayNum = parseInt(dayNumStr);
                const names = workoutDays[dayNum];
                const identifier = `workout_day_${dayNum}`;

                await Notifications.scheduleNotificationAsync({
                    identifier,
                    content: {
                        title: "💪 Hoje é dia de treinar!",
                        body: `${this.getRandomPhrase()} Treinos: ${names.join(', ')}.`,
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                        weekday: dayNum,
                        hour,
                        minute,
                    }
                });
            }

            console.log('Lembretes de treino semanais agendados com sucesso.');
        } catch (error) {
            console.error("Erro ao agendar lembretes semanais:", error);
        }
    },

    motivationalPhrases: [
        "Bora! Levanta da cadeira e vamos treinar!",
        "Não dê espaço para a preguiça hoje. Foco no objetivo!",
        "Seu objetivo não vai se alcançar sozinho. Vamos lá!",
        "Treino pago é a melhor sensação do dia. Bora?",
        "A disciplina te leva onde a motivação não consegue. Partiu?",
        "Um passo de cada vez, mas sem parar. Vamos treinar!",
        "A dor é temporária, o orgulho é para sempre. Vamos nessa!",
        "Menos desculpas, mais resultados. A hora é agora!",
        "Transforme seu corpo, transforme sua mente. Bora treinar!",
        "A consistência é a chave. Não quebre a corrente hoje!"
    ],

    getRandomPhrase() {
        const index = Math.floor(Math.random() * this.motivationalPhrases.length);
        return this.motivationalPhrases[index];
    }
};
