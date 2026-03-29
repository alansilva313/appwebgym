import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Modal,
    ActivityIndicator,
    Image,
    StatusBar,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import api from '../api/api';
import {
    Activity,
    Target,
    ChevronRight,
    Scale,
    Droplets,
    Plus,
    Info,
    X,
    CheckCircle2,
    Ruler,
    Zap,
    TrendingUp,
    TrendingDown,
    Dumbbell,
    UserX
} from 'lucide-react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSpring,
    interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NotificationService } from '../services/NotificationService';
import { useAlertStore } from '../store/useAlertStore';

const HydrationDot = ({ day, waterGoal }: any) => {
    const progress = Math.min((day.amount / waterGoal) * 100, 100);
    const reached = day.amount >= waterGoal;

    // Wave ring animation for Today
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.4);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.4);

    useEffect(() => {
        if (day.isToday) {
            scale1.value = withRepeat(withTiming(1.8, { duration: 2500 }), -1, false);
            opacity1.value = withRepeat(withTiming(0, { duration: 2500 }), -1, false);

            // Offset second ring
            scale2.value = withDelay(1250, withRepeat(withTiming(1.8, { duration: 2500 }), -1, false));
            opacity2.value = withDelay(1250, withRepeat(withTiming(0, { duration: 2500 }), -1, false));
        } else {
            scale1.value = 1;
            opacity1.value = 0;
            scale2.value = 1;
            opacity2.value = 0;
        }
    }, [day.isToday]);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale1.value }],
        opacity: opacity1.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale2.value }],
        opacity: opacity2.value,
    }));

    // Smooth filling animation
    const animatedHeight = useAnimatedStyle(() => ({
        height: withSpring(`${progress}%`, { damping: 15 }),
    }));

    return (
        <View style={styles.dayCol}>
            <View style={[
                styles.dayCircle,
                day.isToday && styles.todayCircle,
                day.isFuture && styles.futureCircle,
                reached && !day.isFuture && styles.reachedCircle
            ]}>
                {day.isToday && (
                    <View style={StyleSheet.absoluteFill}>
                        <Animated.View style={[styles.waveRing, ring1Style]} />
                        <Animated.View style={[styles.waveRing, ring2Style]} />
                    </View>
                )}

                <Animated.View style={[
                    styles.dayProgress,
                    animatedHeight,
                    reached && { backgroundColor: theme.colors.success + '80' }
                ]} />
                <Text style={[
                    styles.dayNum,
                    day.isToday && { color: theme.colors.primary },
                    reached && !day.isFuture && { color: theme.colors.white }
                ]}>
                    {day.dayNum}
                </Text>
            </View>
            <Text style={styles.dayLabel}>
                {day.isToday ? 'Hoje' : day.isFuture ? 'Fut.' : (day.date === new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] ? 'Ont.' : formatDateShort(day.date))}
            </Text>
        </View>
    );
};

const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).split(' de')[0];
};

const MuscleVolumeBar = ({ label, sets }: { label: string, sets: number }) => {
    const getColor = (s: number) => {
        if (!s || s === 0) return theme.colors.border + '40';
        if (s < 10) return '#f1c40f'; // Yellow
        if (s < 20) return '#e67e22'; // Orange
        return '#e74c3c'; // Red
    };

    const progress = Math.min((sets / 30) * 100, 100);

    return (
        <View style={styles.muscleBarRow}>
            <View style={styles.muscleBarInfo}>
                <Text style={styles.muscleBarLabel}>{label}</Text>
                <Text style={styles.muscleBarValue}>{sets} {sets === 1 ? 'série' : 'séries'}</Text>
            </View>
            <View style={styles.muscleProgressBg}>
                <Animated.View
                    style={[
                        styles.muscleProgressFill,
                        { width: `${progress}%`, backgroundColor: getColor(sets) }
                    ]}
                />
            </View>
        </View>
    );
};

const MuscleHeatMap = ({ data }: { data: any }) => {
    const { t } = useTranslation();

    const crucialMuscles = ['Peito', 'Costas', 'Ombros', 'Quadríceps', 'Bíceps', 'Tríceps'];
    const neglected = crucialMuscles.filter(m => (data[m] || 0) === 0);

    const categories = [
        { title: 'Superior', muscles: ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'] },
        { title: 'Inferior', muscles: ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha'] },
        { title: 'Core e Outros', muscles: ['Abdominais', 'Lombar', 'Trapézio'] }
    ];

    return (
        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                    <View style={[styles.cardIcon, { backgroundColor: '#e74c3c' }]}>
                        <Zap size={18} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.cardTitle}>{t('dashboard.heatmap_title', 'Volume por Grupo (7 dias)')}</Text>
                        <Text style={styles.cardSubtitle}>{t('dashboard.heatmap_subtitle', 'Total de séries acumuladas')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.muscleGridContainer}>
                {categories.map((cat, idx) => (
                    <View key={idx} style={styles.muscleCategory}>
                        <Text style={styles.categoryTitle}>{cat.title}</Text>
                        {cat.muscles.map(m => (
                            <MuscleVolumeBar key={m} label={m} sets={data[m] || 0} />
                        ))}
                    </View>
                ))}
            </View>

            <View style={styles.heatMapLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.border + '40' }]} />
                    <Text style={styles.legendText}>Inativo</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#f1c40f' }]} />
                    <Text style={styles.legendText}>Baixo</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#e67e22' }]} />
                    <Text style={styles.legendText}>Ideal</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
                    <Text style={styles.legendText}>Alto</Text>
                </View>
            </View>

            {neglected.length > 0 && (
                <View style={[styles.neglectedAlert, { marginTop: 20 }]}>
                    <View style={styles.alertIconBadge}>
                        <TrendingUp size={14} color="#fff" />
                    </View>
                    <Text style={styles.neglectedText}>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>FOCO SEMANAL: </Text>
                        Você ainda não treinou {neglected.join(', ')} esta semana.
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};

const DashboardScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const { todayAmount, monthData, fetchToday, fetchMonth, addWater } = useHydrationStore();
    const { latest: lastMeasure, fetchLatest } = useMeasurementStore();
    const { workouts, fetchWorkouts, loading: workoutsLoading } = useWorkoutStore();
    const [refreshing, setRefreshing] = useState(false);
    const [showBMIInfo, setShowBMIInfo] = useState(false);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [updatingWeightValue, setUpdatingWeightValue] = useState('');
    const [showWaterModal, setShowWaterModal] = useState(false);
    const [updatingWaterValue, setUpdatingWaterValue] = useState('');
    const setUser = useAuthStore((state) => state.setUser);
    const showAlert = useAlertStore(s => s.showAlert);
    const insets = useSafeAreaInsets();

    // Fallback height for different OS
    const topPadding = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 44 : 24);

    const waterGoal = user?.weight ? Math.round(user.weight * 35) : 2000;
    const waterProgress = Math.min((todayAmount / waterGoal) * 100, 100);
    const isGoalReached = todayAmount >= waterGoal;

    const hydrationDays = React.useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = -1; i <= 5; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const foundData = monthData.find(d => d.date === dateString);
            days.push({
                date: dateString,
                dayNum: date.getDate(),
                isToday: i === 0,
                isFuture: i > 0,
                amount: foundData ? foundData.amount : (i === 0 ? todayAmount : 0)
            });
        }
        return days;
    }, [monthData, todayAmount]);

    useEffect(() => {
        let isMounted = true;
        const setupNotifications = async () => {
            if (!user) return;

            // Na Web, só faz setup se for PWA (evita pops de permissão e bugs de navegação)
            const isStandalone = Platform.OS === 'web' && 
                (typeof window !== 'undefined' && 
                 (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone));

            if (Platform.OS === 'web' && !isStandalone) return;

            const hasPermission = await NotificationService.requestPermissions();
            if (hasPermission && isMounted) {
                await NotificationService.scheduleWaterReminders(user.waterReminderInterval || 0);
                if (user.workoutTime) {
                    await NotificationService.scheduleWorkoutReminders(user.workoutTime, workouts);
                }
            }
        };
        setupNotifications();
        return () => { isMounted = false; };
    }, [user?.waterReminderInterval, user?.workoutTime, workouts]);

    const handleUnlinkTrainer = async () => {
        showAlert(
            t('dashboard.unlink_title', 'Desvincular Personal'),
            t('dashboard.unlink_confirm', 'Deseja realmente desvincular seu personal trainer? Você não terá mais acesso aos treinos atribuídos por ele.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('dashboard.unlink_btn', 'Desvincular'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/trainer/unlink');
                            await fetchWorkouts();
                            // Update local user state
                            if (user) {
                                setUser({ ...user, trainerId: undefined, trainer: undefined });
                            }
                            showAlert(t('common.success'), t('dashboard.unlink_success', 'Personal desvinculado com sucesso!'));
                        } catch (error) {
                            showAlert(t('common.error'), t('dashboard.unlink_error', 'Falha ao desvincular personal.'));
                        }
                    }
                }
            ]
        );
    };

    const calculateIMC = () => {
        if (!user?.weight || !user?.height) return null;
        const imc = user.weight / (user.height * user.height);
        return imc.toFixed(1);
    };

    const getIdealWeight = () => {
        if (!user?.height) return null;

        // Se não tiver gênero definido, usa a média do IMC 22
        if (!user.gender || user.gender === 'NaoInformar' || user.gender === 'Outros') {
            return (22 * (user.height * user.height)).toFixed(1);
        }

        const heightInInches = (user.height * 100) / 2.54;
        const inchesOver5Feet = Math.max(0, heightInInches - 60);

        let idealWeight;
        if (user.gender === 'Masculino') {
            idealWeight = 50 + (2.3 * inchesOver5Feet);
        } else {
            idealWeight = 45.5 + (2.3 * inchesOver5Feet);
        }

        return idealWeight.toFixed(1);
    };

    const getIMCCategory = (imc: number) => {
        if (imc < 18.5) return { label: t('dashboard.bmi_categories.underweight'), color: '#3498db' };
        if (imc < 25) return { label: t('dashboard.bmi_categories.normal'), color: theme.colors.success };
        if (imc < 30) return { label: t('dashboard.bmi_categories.overweight'), color: '#f1c40f' };
        return { label: t('dashboard.bmi_categories.obese'), color: theme.colors.error };
    };



    const [activeSession, setActiveSession] = useState<any>(null);
    const [heatmapData, setHeatmapData] = useState<{ [key: string]: number }>({});
    const [loadingHeatmap, setLoadingHeatmap] = useState(false);

    const fetchHeatMapData = async () => {
        try {
            setLoadingHeatmap(true);
            const res = await api.get(`/workout-sessions/stats/heatmap?t=${Date.now()}`);
            setHeatmapData(res.data);
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
        } finally {
            setLoadingHeatmap(false);
        }
    };

    const fetchActiveSession = async () => {
        try {
            const res = await api.get('/workout-sessions/active');
            setActiveSession(res.data);
        } catch (error) {
            console.error('Error fetching active session:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchWorkouts(),
            fetchToday(),
            fetchMonth(),
            fetchLatest(),
            fetchActiveSession(),
            fetchHeatMapData()
        ]);
        setRefreshing(false);
    };

    const handleUpdateWeight = async () => {
        if (!updatingWeightValue) return;

        try {
            const res = await api.put('/auth/me', {
                weight: parseFloat(updatingWeightValue.replace(',', '.'))
            });
            setUser(res.data);
            setShowWeightModal(false);
            setUpdatingWeightValue('');
            fetchLatest(); // Atualiza medidas também
        } catch (error) {
            console.error('Error updating weight:', error);
        }
    };

    const handleUpdateWater = async () => {
        const amount = parseInt(updatingWaterValue);
        if (isNaN(amount) || amount <= 0) return;

        try {
            await addWater(amount);
            setShowWaterModal(false);
            setUpdatingWaterValue('');
        } catch (error) {
            console.error('Error adding water:', error);
        }
    };

    useEffect(() => {
        fetchWorkouts();
        fetchToday();
        fetchMonth();
        fetchLatest();
        fetchActiveSession();
        fetchHeatMapData();

        const unsubscribe = navigation.addListener('focus', () => {
            fetchActiveSession();
            fetchWorkouts();
            fetchHeatMapData();
        });

        return unsubscribe;
    }, []);

    const imcValue = calculateIMC();
    const imcCategory = imcValue ? getIMCCategory(parseFloat(imcValue)) : null;
    const idealWeight = getIdealWeight();

    const getWeightProgress = () => {
        if (!user?.targetWeight || !user?.initialWeight || !user?.weight) return null;

        const initial = user.initialWeight;
        const current = user.weight;
        const target = user.targetWeight;

        let progress = 0;
        let diffToTarget = Math.abs(current - target);
        let totalDiff = Math.abs(initial - target);

        if (totalDiff === 0) return null;

        const isLossGoal = target < initial;
        let isRegressing = false;

        if (isLossGoal) {
            // Weight Loss Goal
            progress = ((initial - current) / (initial - target)) * 100;
            isRegressing = current > initial;
        } else {
            // Weight Gain / Hypertrophy Goal
            progress = ((current - initial) / (target - initial)) * 100;
            isRegressing = current < initial;
        }

        return {
            progress: Math.max(-100, Math.min(progress, 100)),
            remaining: diffToTarget.toFixed(1),
            isLossGoal,
            isRegressing,
            initial,
            current,
            target
        };
    };

    const isWorkoutForToday = (daysString: string) => {
        if (!daysString) return false;
        const daysMap: Record<number, string> = {
            0: 'Dom',
            1: 'Seg',
            2: 'Ter',
            3: 'Qua',
            4: 'Qui',
            5: 'Sex',
            6: 'Sáb'
        };
        const today = new Date().getDay();
        const todayStr = daysMap[today];
        return daysString.toLowerCase().includes(todayStr.toLowerCase());
    };

    const weightProgress = getWeightProgress();

    return (
        <View style={[styles.container, { paddingTop: topPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <Animated.View entering={FadeIn.duration(800)}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Animated.Text entering={FadeInDown.delay(100)} style={styles.welcomeText}>
                                {t('dashboard.welcome_user', { name: user?.name })}
                            </Animated.Text>
                            <Animated.Text entering={FadeInDown.delay(150)} style={styles.subtitle}>
                                {t('dashboard.subtitle')}
                            </Animated.Text>
                        </View>
                        <Animated.Image
                            entering={FadeIn.delay(200)}
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                        />
                    </View>

                    {/* Quick Access to Workouts */}
                    {!activeSession && (
                        <Animated.View entering={FadeInDown.delay(180)} style={{ marginBottom: 20 }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 14,
                                    borderRadius: theme.borderRadius.md,
                                    gap: 10,
                                }}
                                onPress={() => {
                                    const todayWorkouts = workouts.filter((w: any) => isWorkoutForToday(w.daysOfWeek));
                                    if (todayWorkouts.length === 1) {
                                        navigation.navigate('WorkoutDetail', { workout: todayWorkouts[0] });
                                    } else {
                                        navigation.navigate('Workout');
                                    }
                                }}
                            >
                                <Dumbbell size={20} color={theme.colors.background} />
                                <Text style={{ color: theme.colors.background, fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {workouts.some((w: any) => isWorkoutForToday(w.daysOfWeek))
                                        ? t('dashboard.start_today', 'Iniciar Treino de Hoje')
                                        : t('dashboard.quick_workout', 'Acessar Meus Treinos')}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* XP and Level Card */}
                    <Animated.View
                        entering={FadeInDown.delay(200)}
                        layout={Layout.springify()}
                        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '30', marginBottom: 20 }]}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ padding: 8, backgroundColor: theme.colors.primary + '20', borderRadius: 12 }}>
                                    <Zap size={20} color={theme.colors.primary} fill={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t('dashboard.level')}</Text>
                                    <Text style={{ color: theme.colors.white, fontSize: 22, fontWeight: 'bold' }}>Lvl {user?.level || 1}</Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>{user?.xp || 0} XP Total</Text>
                                <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' }}>+{1000 - ((user?.xp || 0) % 1000)} XP para Lvl {(user?.level || 1) + 1}</Text>
                            </View>
                        </View>

                        <View style={styles.progressBarBg}>
                            <Animated.View
                                layout={Layout}
                                style={[
                                    styles.progressBarFill,
                                    { width: `${((user?.xp || 0) % 1000) / 10}%` }
                                ]}
                            />
                        </View>
                    </Animated.View>

                    {/* Trainer Info Card */}
                    {user?.trainer && (
                        <Animated.View
                            entering={FadeInDown.delay(220)}
                            layout={Layout.springify()}
                            style={[styles.card, { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary + '20', borderWidth: 1, marginBottom: 20 }]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: theme.colors.primary, fontWeight: 'black', fontSize: 18 }}>{user.trainer.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t('dashboard.linked_trainer', 'Seu Personal Trainer')}</Text>
                                        <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: 'bold' }}>{user.trainer.name}</Text>
                                        {user.trainer.licenseNumber && (
                                            <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: 'bold' }}>CREF: {user.trainer.licenseNumber}</Text>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={handleUnlinkTrainer}
                                    style={{ padding: 10, backgroundColor: theme.colors.error + '10', borderRadius: 12 }}
                                >
                                    <UserX size={20} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Weight Progress Card */}
                    {weightProgress && (
                        <Animated.View
                            entering={FadeInDown.delay(250)}
                            layout={Layout.springify()}
                            style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: 20 }]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {weightProgress.isRegressing ? (
                                        <TrendingDown size={20} color={theme.colors.error} />
                                    ) : (
                                        <TrendingUp size={20} color={theme.colors.primary} />
                                    )}
                                    <Text style={styles.cardTitle}>{t('dashboard.weight_progress_title')}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity
                                        style={styles.updateWeightBtn}
                                        onPress={() => {
                                            setUpdatingWeightValue(user?.weight?.toString() || '');
                                            setShowWeightModal(true);
                                        }}
                                    >
                                        <Scale size={14} color={theme.colors.primary} />
                                        <Text style={styles.updateWeightBtnText}>{t('dashboard.weight_update_btn')}</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.progressBadge, weightProgress.isRegressing && { backgroundColor: theme.colors.error + '20' }]}>
                                        <View style={[
                                            styles.progressBadgeFill,
                                            { width: `${Math.abs(weightProgress.progress)}%` },
                                            weightProgress.isRegressing && { backgroundColor: theme.colors.error + '30' }
                                        ]} />
                                        <Text style={[styles.progressBadgeText, weightProgress.isRegressing && { color: theme.colors.error }]}>
                                            {weightProgress.isRegressing ? '-' : ''}{Math.round(Math.abs(weightProgress.progress))}%
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.weightProgressLabels}>
                                <View>
                                    <Text style={styles.weightLabel}>Inicial</Text>
                                    <Text style={styles.weightValue}>{weightProgress.initial}kg</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={styles.weightLabel}>Atual</Text>
                                    <Text style={[styles.weightValue, { color: weightProgress.isRegressing ? theme.colors.error : theme.colors.primary }]}>
                                        {weightProgress.current}kg
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.weightLabel}>Objetivo</Text>
                                    <Text style={styles.weightValue}>{weightProgress.target}kg</Text>
                                </View>
                            </View>

                            <View style={styles.progressBarBg}>
                                <Animated.View
                                    entering={FadeInDown.delay(350)}
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.max(0, weightProgress.progress)}%` },
                                        weightProgress.isRegressing && { width: '100%', backgroundColor: theme.colors.error + '20' }
                                    ]}
                                />
                                {weightProgress.isRegressing && (
                                    <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.abs(weightProgress.progress))}%`, backgroundColor: theme.colors.error, position: 'absolute', left: 0 }]} />
                                )}
                            </View>

                            <View style={styles.weightFooter}>
                                <Text style={styles.weightRemaining}>
                                    {parseFloat(weightProgress.remaining) <= 0
                                        ? t('dashboard.weight_reached_goal')
                                        : t('dashboard.weight_remaining_msg', { amount: weightProgress.remaining })}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Active Session (Resume) Card */}
                    {activeSession && (
                        <Animated.View entering={FadeInDown.delay(220)} layout={Layout.springify()} style={[styles.card, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '40', borderWidth: 1, marginBottom: 20 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                                <View style={{ padding: 10, backgroundColor: theme.colors.primary, borderRadius: 12 }}>
                                    <Activity size={20} color={theme.colors.background} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Treino em andamento</Text>
                                    <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: 'bold' }}>{activeSession.workoutName}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: theme.colors.surface, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border }}
                                    onPress={async () => {
                                        try {
                                            await api.delete(`/workout-sessions/${activeSession.id}`);
                                            setActiveSession(null);
                                            NotificationService.cancelWorkoutReminder();
                                        } catch (e) {
                                            console.error('Error cancelling session:', e);
                                        }
                                    }}
                                >
                                    <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold', fontSize: 12 }}>Descartar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 2, backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                                    onPress={async () => {
                                        try {
                                            if (!activeSession?.workoutId) return;

                                            // Busca o treino específico de forma garantida
                                            let wk = workouts.find(w => w.id === activeSession.workoutId);

                                            if (!wk) {
                                                const res = await api.get(`/workouts/${activeSession.workoutId}`);
                                                wk = res.data;
                                            }

                                            if (wk) {
                                                navigation.navigate('WorkoutDetail', {
                                                    workout: wk,
                                                    resumeSessionId: activeSession.id
                                                });
                                            }
                                        } catch (e) {
                                            console.error('Erro ao retomar treino:', e);
                                        }
                                    }}
                                >
                                    <Text style={{ color: theme.colors.background, fontWeight: 'bold', fontSize: 12 }}>Continuar Treino</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Water Intake Card */}
                    <Animated.View
                        entering={FadeInDown.delay(250)}
                        layout={Layout.springify()}
                        style={styles.card}
                    >
                        <View style={styles.cardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Droplets size={20} color={isGoalReached ? theme.colors.success : theme.colors.primary} />
                                <Text style={styles.cardTitle}>{t('dashboard.hydration')}</Text>
                            </View>
                            <Text style={[styles.waterStatus, isGoalReached && { color: theme.colors.success }]}>
                                {todayAmount}ml / {waterGoal}ml
                            </Text>
                        </View>

                        <View style={styles.waterProgressContainer}>
                            <View style={styles.progressBarBg}>
                                <Animated.View
                                    layout={Layout}
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${waterProgress}%` },
                                        isGoalReached && { backgroundColor: theme.colors.success }
                                    ]}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.updateWeightBtn, isGoalReached && { opacity: 0.5 }]}
                                onPress={() => !isGoalReached && setShowWaterModal(true)}
                                disabled={isGoalReached}
                            >
                                <Droplets size={14} color={isGoalReached ? theme.colors.textSecondary : theme.colors.primary} />
                                <Text style={[styles.updateWeightBtnText, isGoalReached && { color: theme.colors.textSecondary }]}>
                                    {isGoalReached ? t('dashboard.hydration_reached', 'Meta Atingida') : t('dashboard.hydration_update', 'Registrar')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {isGoalReached && (
                            <Animated.View entering={FadeInDown} style={styles.goalReachedBadge}>
                                <CheckCircle2 size={14} color={theme.colors.success} />
                                <Text style={styles.goalReachedText}>{t('dashboard.hydration_limit_msg')}</Text>
                            </Animated.View>
                        )}

                        <View style={styles.timelineContainer}>
                            {hydrationDays.map((day) => (
                                <HydrationDot key={day.date} day={day} waterGoal={waterGoal} />
                            ))}
                        </View>
                    </Animated.View>

                    {/* BMI Card */}
                    <Animated.View
                        entering={FadeInDown.delay(300)}
                        layout={Layout.springify()}
                        style={styles.card}
                    >
                        <View style={styles.cardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Scale size={20} color={theme.colors.primary} />
                                <Text style={styles.cardTitle}>{t('dashboard.bmi_card')}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowBMIInfo(true)}>
                                <Info size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.imcContent}>
                            <View>
                                <Text style={styles.imcValue}>{imcValue || '--'}</Text>
                                {imcCategory && (
                                    <View style={[styles.badge, { backgroundColor: imcCategory.color + '20' }]}>
                                        <Text style={[styles.imcCategory, { color: imcCategory.color }]}>
                                            {imcCategory.label}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.imcIndicatorContainer}>
                                <View style={styles.imcBar}>
                                    <View style={[styles.imcBarActive, {
                                        backgroundColor: imcCategory?.color || theme.colors.border,
                                        width: imcValue ? `${Math.min(parseFloat(imcValue) * 2, 100)}%` : '0%'
                                    }]} />
                                </View>
                                <Text style={styles.weightInfo}>{user?.weight}kg / {user?.height}m</Text>
                            </View>
                        </View>
                        {idealWeight && (
                            <View style={styles.idealWeightContainer}>
                                <Text style={styles.idealWeightText}>
                                    {t('dashboard.ideal_weight_obs', 'Seu peso ideal de acordo com sua altura deve ser:')}
                                    {' '}
                                    <Text style={{ color: theme.colors.primary }}>{idealWeight}kg</Text>
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Muscle Heat Map */}
                    <MuscleHeatMap data={heatmapData} />

                    {/* Measurements Card */}
                    <Animated.View
                        entering={FadeInDown.delay(350)}
                        layout={Layout.springify()}
                    >
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => navigation.navigate('Measurements')}
                        >
                            <View style={styles.cardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ruler size={20} color={theme.colors.primary} />
                                    <Text style={styles.cardTitle}>{t('measurements.title')}</Text>
                                </View>
                                <ChevronRight size={18} color={theme.colors.textSecondary} />
                            </View>
                            {lastMeasure ? (
                                <View style={styles.measureSummary}>
                                    <View style={styles.measureItem}>
                                        <Text style={styles.measureLabel}>{t('measurements.waist')}</Text>
                                        <Text style={styles.measureVal}>{lastMeasure.waist}cm</Text>
                                    </View>
                                    <View style={styles.measureDivider} />
                                    <View style={styles.measureItem}>
                                        <Text style={styles.measureLabel}>{t('measurements.chest')}</Text>
                                        <Text style={styles.measureVal}>{lastMeasure.chest}cm</Text>
                                    </View>
                                    <View style={styles.measureDivider} />
                                    <View style={styles.measureItem}>
                                        <Text style={styles.measureLabel}>{t('measurements.hips')}</Text>
                                        <Text style={styles.measureVal}>{lastMeasure.hips}cm</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.emptyMeasures}>
                                    <Text style={styles.emptyMeasuresText}>{t('measurements.no_data')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Goal Card */}
                    <Animated.View
                        entering={FadeInDown.delay(400)}
                        layout={Layout.springify()}
                        style={styles.card}
                    >
                        <View style={styles.cardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Target size={20} color={theme.colors.primary} />
                                <Text style={styles.cardTitle}>{t('dashboard.current_goal')}</Text>
                            </View>
                        </View>
                        <Text style={styles.goalText}>
                            {user?.goal ? t(`onboarding.${user.goal.toLowerCase()}`) : t('dashboard.goal_not_set')}
                        </Text>
                    </Animated.View>

                    <View>
                        {/* Trainer Workouts Section */}
                        {workouts.some(w => w.trainerId) && (
                            <View style={{ marginBottom: 20 }}>
                                <View style={[styles.sectionHeader, { marginTop: 0, marginBottom: 12 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Dumbbell size={18} color={theme.colors.primary} />
                                        <Text style={[styles.sectionTitle, { fontSize: 16 }]}>{t('dashboard.trainer_workouts', 'Ficha do Personal')}</Text>
                                    </View>
                                </View>
                                {workouts.filter(w => w.trainerId).map((workout: any, index: number) => {
                                    const isToday = isWorkoutForToday(workout.daysOfWeek);
                                    return (
                                        <Animated.View key={`trainer-workout-${workout.id}`} entering={FadeInDown.delay(450 + index * 100)} layout={Layout.springify()}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.workoutItem,
                                                    isToday ? styles.workoutItemToday : styles.workoutItemOther,
                                                    { borderLeftWidth: 4, borderLeftColor: theme.colors.primary }
                                                ]}
                                                onPress={() => navigation.navigate('WorkoutDetail', { workout })}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <Text style={[styles.workoutName, isToday && { color: theme.colors.primary }]}>
                                                            {workout.name}
                                                        </Text>
                                                        {isToday && (
                                                            <View style={styles.todayBadge}>
                                                                <Text style={styles.todayBadgeText}>HOJE</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.workoutDays}>{workout.daysOfWeek}</Text>
                                                </View>
                                                <ChevronRight color={isToday ? theme.colors.primary : theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )}

                        {/* User Workouts Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('dashboard.your_workouts')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Workout')}>
                                <Text style={styles.seeAll}>{t('dashboard.create_new')}</Text>
                            </TouchableOpacity>
                        </View>

                        {workouts.filter(w => !w.trainerId).length === 0 ? (
                            <Animated.View entering={FadeInDown.delay(450)} style={styles.emptyWorkouts}>
                                <Activity size={40} color={theme.colors.border} />
                                <Text style={styles.emptyText}>{t('dashboard.no_workouts')}</Text>
                            </Animated.View>
                        ) : (
                            workouts.filter(w => !w.trainerId).map((workout: any, index: number) => {
                                const isToday = isWorkoutForToday(workout.daysOfWeek);
                                return (
                                    <Animated.View key={`workout-${workout.id || index}`} entering={FadeInDown.delay(450 + index * 100)} layout={Layout.springify()}>
                                        <TouchableOpacity
                                            style={[
                                                styles.workoutItem,
                                                isToday ? styles.workoutItemToday : styles.workoutItemOther
                                            ]}
                                            onPress={() => navigation.navigate('WorkoutDetail', { workout })}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <Text style={[styles.workoutName, isToday && { color: theme.colors.primary }]}>
                                                        {workout.name}
                                                    </Text>
                                                    {isToday && (
                                                        <View style={styles.todayBadge}>
                                                            <Text style={styles.todayBadgeText}>HOJE</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.workoutDays}>{workout.daysOfWeek}</Text>
                                            </View>
                                            <ChevronRight color={isToday ? theme.colors.primary : theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            <Modal
                visible={showBMIInfo}
                transparent
                animationType="fade"
                onRequestClose={() => setShowBMIInfo(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('dashboard.bmi_info_title', 'Sobre o IMC')}</Text>
                            <TouchableOpacity onPress={() => setShowBMIInfo(false)}>
                                <X size={24} color={theme.colors.white} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalText}>
                            {t('dashboard.bmi_explanation', 'O Índice de Massa Corporal (IMC) é uma medida internacional usada para calcular se uma pessoa está no peso ideal. \n\nIMPORTANTE: O IMC não diferencia massa muscular de gordura. Atletas e pessoas com muita massa muscular podem ter um IMC elevado sem estarem acima do peso.')}
                        </Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowBMIInfo(false)}>
                            <Text style={styles.closeBtnText}>{t('common.close', 'Fechar')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Weight Update Modal */}
            <Modal
                visible={showWeightModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWeightModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('dashboard.weight_update_modal_title')}</Text>
                            <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                                <X size={24} color={theme.colors.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weightInputSection}>
                            <Text style={styles.modalText}>{t('dashboard.weight_update_modal_desc')}</Text>

                            <View style={styles.weightInputWrapper}>
                                <TextInput
                                    style={styles.bigWeightInput}
                                    value={updatingWeightValue}
                                    onChangeText={setUpdatingWeightValue}
                                    keyboardType="numeric"
                                    placeholder="00.0"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    autoFocus
                                />
                                <Text style={styles.kgLabel}>kg</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity
                                style={[styles.closeBtn, { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                                onPress={() => setShowWeightModal(false)}
                            >
                                <Text style={[styles.closeBtnText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.closeBtn, { flex: 2 }]}
                                onPress={handleUpdateWeight}
                            >
                                <Text style={styles.closeBtnText}>{t('dashboard.weight_update_modal_save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Water Update Modal */}
            <Modal
                visible={showWaterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWaterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('dashboard.hydration_update_modal_title')}</Text>
                            <TouchableOpacity onPress={() => setShowWaterModal(false)}>
                                <X size={24} color={theme.colors.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weightInputSection}>
                            <Text style={styles.modalText}>{t('dashboard.hydration_update_modal_desc')}</Text>

                            <View style={styles.weightInputWrapper}>
                                <TextInput
                                    style={styles.bigWeightInput}
                                    value={updatingWaterValue}
                                    onChangeText={setUpdatingWaterValue}
                                    keyboardType="numeric"
                                    placeholder="250"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    autoFocus
                                />
                                <Text style={styles.kgLabel}>ml</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity
                                style={[styles.closeBtn, { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                                onPress={() => setShowWaterModal(false)}
                            >
                                <Text style={[styles.closeBtnText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.closeBtn, { flex: 2 }]}
                                onPress={handleUpdateWater}
                            >
                                <Text style={styles.closeBtnText}>{t('dashboard.hydration_update_modal_save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg },
    welcomeText: { fontSize: 24, fontWeight: 'bold', color: theme.colors.white, marginBottom: 4 },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
    logo: { width: 45, height: 45, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    cardTitle: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cardSubtitle: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '500' },

    // Water Styles
    waterStatus: { color: theme.colors.white, fontWeight: 'bold' },
    waterProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressBarBg: { flex: 1, height: 10, backgroundColor: theme.colors.border, borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 5 },
    addButton: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, gap: 4, minWidth: 80, justifyContent: 'center' },
    addButtonDisabled: { backgroundColor: theme.colors.border, opacity: 0.5 },
    addButtonText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 12 },
    addButtonTextDisabled: { color: theme.colors.textSecondary },

    goalReachedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: theme.colors.success + '15', padding: 8, borderRadius: 8, justifyContent: 'center' },
    goalReachedText: { color: theme.colors.success, fontSize: 12, fontWeight: 'bold' },

    timelineContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 },
    dayCol: { alignItems: 'center', gap: 6 },
    dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    dayProgress: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.primary + '40', width: '100%' },
    todayCircle: { borderWidth: 1.5, borderColor: theme.colors.primary },
    futureCircle: { opacity: 0.4 },
    reachedCircle: { backgroundColor: theme.colors.success },
    dayNum: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textSecondary, zIndex: 1 },
    dayLabel: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: 'bold', textTransform: 'uppercase' },

    waveRing: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        zIndex: -1,
    },

    // IMC Styles
    imcContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    imcValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.white },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
    imcCategory: { fontSize: 12, fontWeight: 'bold' },
    imcIndicatorContainer: { flex: 1, marginLeft: 25 },
    imcBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    imcBarActive: { height: '100%', borderRadius: 4 },
    weightInfo: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'right' },
    measureSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    measureItem: { flex: 1, alignItems: 'center' },
    measureLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
    measureVal: { fontSize: 16, fontWeight: 'bold', color: theme.colors.white },
    measureDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
    emptyMeasures: { padding: 10, alignItems: 'center' },
    emptyMeasuresText: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic' },
    idealWeightContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    idealWeightText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },

    goalText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.white },
    seeAll: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
    workoutItem: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    workoutItemToday: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '05', borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
    workoutItemOther: { opacity: 0.7 },
    workoutName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.white },
    workoutDays: { fontSize: 12, color: theme.colors.textSecondary },
    todayBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    todayBadgeText: { color: theme.colors.background, fontSize: 9, fontWeight: '900' },
    emptyWorkouts: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: 15 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.colors.surface, width: '100%', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.white },
    modalText: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 24 },
    closeBtn: { backgroundColor: theme.colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
    closeBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },

    // Weight Progress Styles
    progressBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        minWidth: 50,
        alignItems: 'center',
    },
    progressBadgeFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary + '30',
    },
    progressBadgeText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    weightProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        marginBottom: 8,
    },
    weightLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    weightValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    weightFooter: {
        marginTop: 12,
        alignItems: 'center',
    },
    weightRemaining: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    updateWeightBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    updateWeightBtnText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    weightInputSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    weightInputWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginTop: 20,
    },
    bigWeightInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: theme.colors.primary,
        textAlign: 'center',
        minWidth: 120,
    },
    kgLabel: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    // Muscle Volume Grid Styles
    muscleGridContainer: {
        paddingVertical: 10,
    },
    muscleCategory: {
        marginBottom: 20,
    },
    categoryTitle: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 10,
    },
    muscleBarRow: {
        marginBottom: 12,
    },
    muscleBarInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    muscleBarLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    muscleBarValue: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    muscleProgressBg: {
        height: 6,
        backgroundColor: theme.colors.border + '30',
        borderRadius: 3,
        overflow: 'hidden',
    },
    muscleProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    heatMapLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '20',
    },
    neglectedAlert: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary + '15',
        borderRadius: 12,
        padding: 12,
        marginTop: 15,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
    },
    alertIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    neglectedText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
    },
});

export default DashboardScreen;
