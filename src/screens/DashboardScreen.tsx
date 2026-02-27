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
    ActivityIndicator
} from 'react-native';
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
    Ruler
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NotificationService } from '../services/NotificationService';

const DashboardScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const { todayAmount, monthData, fetchToday, fetchMonth, addWater } = useHydrationStore();
    const { latest: lastMeasure, fetchLatest } = useMeasurementStore();
    const { workouts, fetchWorkouts, loading: workoutsLoading } = useWorkoutStore();
    const [refreshing, setRefreshing] = useState(false);
    const [showBMIInfo, setShowBMIInfo] = useState(false);

    const waterGoal = user?.weight ? Math.round(user.weight * 35) : 2000;
    const waterProgress = Math.min((todayAmount / waterGoal) * 100, 100);
    const isGoalReached = todayAmount >= waterGoal;

    const generateHydrationDays = () => {
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
    };

    const hydrationDays = generateHydrationDays();

    useEffect(() => {
        const setupNotifications = async () => {
            const hasPermission = await NotificationService.requestPermissions();
            if (hasPermission) {
                await NotificationService.scheduleWaterReminders(user?.waterReminderInterval || 0);
            }
        };
        setupNotifications();
    }, [todayAmount]);

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



    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchWorkouts(), fetchToday(), fetchMonth(), fetchLatest()]);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchWorkouts();
        fetchToday();
        fetchMonth();
        fetchLatest();
    }, []);

    const imcValue = calculateIMC();
    const imcCategory = imcValue ? getIMCCategory(parseFloat(imcValue)) : null;
    const idealWeight = getIdealWeight();

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <Animated.View entering={FadeIn.duration(800)}>
                    <Text style={styles.welcomeText}>{t('dashboard.welcome_user', { name: user?.name })}</Text>
                    <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>

                    {/* Water Intake Card */}
                    <View style={styles.card}>
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
                                style={[styles.addButton, isGoalReached && styles.addButtonDisabled]}
                                onPress={() => !isGoalReached && addWater(250)}
                                disabled={isGoalReached}
                            >
                                {isGoalReached ? (
                                    <CheckCircle2 size={18} color={theme.colors.textSecondary} />
                                ) : (
                                    <Plus size={18} color={theme.colors.background} />
                                )}
                                <Text style={[styles.addButtonText, isGoalReached && styles.addButtonTextDisabled]}>
                                    {isGoalReached ? 'OK' : t('dashboard.hydration_add', { amount: 250 })}
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
                            {hydrationDays.map((day) => {
                                const progress = Math.min((day.amount / waterGoal) * 100, 100);
                                const reached = day.amount >= waterGoal;
                                return (
                                    <View key={day.date} style={styles.dayCol}>
                                        <View style={[
                                            styles.dayCircle,
                                            day.isToday && styles.todayCircle,
                                            day.isFuture && styles.futureCircle,
                                            reached && !day.isFuture && styles.reachedCircle
                                        ]}>
                                            <View style={[
                                                styles.dayProgress,
                                                { height: `${progress}%` },
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
                                            {day.isToday ? 'Hoje' : day.isFuture ? 'Fut.' : 'Ont.'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>


                    <View style={styles.card}>
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
                    </View>


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

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Target size={20} color={theme.colors.primary} />
                                <Text style={styles.cardTitle}>{t('dashboard.current_goal')}</Text>
                            </View>
                        </View>
                        <Text style={styles.goalText}>
                            {user?.goal ? t(`onboarding.${user.goal.toLowerCase()}`) : t('dashboard.goal_not_set')}
                        </Text>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('dashboard.your_workouts')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Workout')}>
                            <Text style={styles.seeAll}>{t('dashboard.create_new')}</Text>
                        </TouchableOpacity>
                    </View>

                    {workouts.length === 0 ? (
                        <View style={styles.emptyWorkouts}>
                            <Activity size={40} color={theme.colors.border} />
                            <Text style={styles.emptyText}>{t('dashboard.no_workouts')}</Text>
                        </View>
                    ) : (
                        workouts.map((workout: any) => (
                            <TouchableOpacity
                                key={workout.id}
                                style={styles.workoutItem}
                                onPress={() => navigation.navigate('WorkoutDetail', { workout })}
                            >
                                <View>
                                    <Text style={styles.workoutName}>{workout.name}</Text>
                                    <Text style={styles.workoutDays}>{workout.daysOfWeek}</Text>
                                </View>
                                <ChevronRight color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))
                    )}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg },
    welcomeText: { fontSize: 24, fontWeight: 'bold', color: theme.colors.white },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    cardTitle: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

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
    workoutName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.white },
    workoutDays: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    emptyWorkouts: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: 15 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.colors.surface, width: '100%', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.white },
    modalText: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 24 },
    closeBtn: { backgroundColor: theme.colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
    closeBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 }
});

export default DashboardScreen;
