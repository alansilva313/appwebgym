import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Vibration,
    Platform,
    StatusBar,
    Image,
    Share as RNShare,
    ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import WorkoutShareCard from '../components/WorkoutShareCard';
import { useAuthStore } from '../store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import api from '../api/api';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { fixUrl } from '../utils/url';
import {
    Play,
    ChevronLeft,
    Dumbbell,
    Check,
    Timer,
    SkipForward,
    CheckCircle2,
    ChevronRight,
    Trash2,
    Pencil,
    BarChart2,
    Zap,
    Trophy,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAlertStore } from '../store/useAlertStore';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SetLog {
    setNumber: number;
    completedAt: string;
    timeBetweenSets: number;  // seconds since last set (or session start)
    restTimeTaken: number;    // actual rest taken in seconds
    restTimeOffered: number;  // offered rest (60s)
}

interface ExerciseLog {
    exerciseId: number;
    exerciseName: string;
    muscleGroup: string;
    sets: SetLog[];
}

const WorkoutDetailScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { workout } = route.params;
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);

    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const deleteWorkout = useWorkoutStore(s => s.deleteWorkout);

    // ── Session state ──────────────────────────────────────────────────────
    const [sessionActive, setSessionActive] = useState(false);
    const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
    const [completedSets, setCompletedSets] = useState<Record<number, number>>({});
    const [restTimer, setRestTimer] = useState(0);
    const [restActive, setRestActive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [sessionDone, setSessionDone] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [sharingModalVisible, setSharingModalVisible] = useState(false);

    // ── Metrics tracking ───────────────────────────────────────────────────
    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
    const lastSetTimestampRef = useRef<number>(0);  // ms — when last set was completed
    const restStartRef = useRef<number>(0);          // ms — when rest started
    const sessionSavedRef = useRef(false);

    const timerRef = useRef<any>(null);
    const restRef = useRef<any>(null);
    const shareRef = useRef<any>(null);

    // Safe area
    const topInset = insets.top > 0
        ? insets.top
        : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);
    const bottomInset = insets.bottom > 0 ? insets.bottom : 16;

    useEffect(() => {
        fetchWorkoutDetails();
        const unsubscribe = navigation.addListener('focus', () => fetchWorkoutDetails());
        return () => {
            clearInterval(timerRef.current);
            clearInterval(restRef.current);
            unsubscribe();
        };
    }, []);

    // Trigger saveSession when sessionDone turns true
    useEffect(() => {
        if (sessionDone) {
            saveSession(elapsed, exerciseLogs);
        }
    }, [sessionDone, elapsed, exerciseLogs]);

    useEffect(() => {
        if (sessionActive && !sessionDone) {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [sessionActive, sessionDone]);

    useEffect(() => {
        if (restActive && restTimer > 0) {
            restRef.current = setInterval(() => {
                setRestTimer(r => {
                    if (r <= 1) {
                        clearInterval(restRef.current);
                        setRestActive(false);
                        Vibration.vibrate(500);
                        return 0;
                    }
                    return r - 1;
                });
            }, 1000);
        }
        return () => clearInterval(restRef.current);
    }, [restActive]);

    const fetchWorkoutDetails = async () => {
        try {
            const res = await api.get(`/workouts/${workout.id}`);
            setExercises(res.data.workoutExercises || res.data.exercises || []);
        } catch {
            setExercises(workout.exercises || []);
        } finally {
            setLoading(false);
        }
    };

    const showAlert = useAlertStore(s => s.showAlert);

    const handleDeleteWorkout = () => {
        showAlert(
            t('workouts.delete_title', 'Excluir treino'),
            t('workouts.delete_confirm', 'Tem certeza que deseja excluir este treino?'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('workouts.delete_btn', 'Excluir'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteWorkout(workout.id);
                            navigation.goBack();
                        } catch {
                            showAlert(t('common.error'), t('workouts.delete_error', 'Erro ao excluir treino'));
                        }
                    }
                }
            ]
        );
    };

    const startSession = () => {
        const now = Date.now();
        // Initialize exercise logs for tracking
        setExerciseLogs(exercises.map(ex => ({
            exerciseId: ex.exercise?.id || ex.exerciseId,
            exerciseName: ex.exercise?.name || ex.name || '',
            muscleGroup: ex.exercise?.muscle_group || ex.muscle_group || '',
            sets: [],
        })));
        sessionSavedRef.current = false;
        lastSetTimestampRef.current = now;
        restStartRef.current = 0;
        setSessionActive(true);
        setCurrentExerciseIdx(0);
        setCompletedSets({});
        setElapsed(0);
        setSessionDone(false);
    };

    const completeSet = (exerciseIdx: number, totalSets: number) => {
        const now = Date.now();
        const currentEx = exercises[exerciseIdx];
        const exerciseId = currentEx?.exercise?.id || currentEx?.exerciseId;
        const doneSets = completedSets[exerciseIdx] || 0;
        const newCount = doneSets + 1;

        // --- Calculate timing metrics ---
        const timeBetweenSets = lastSetTimestampRef.current > 0
            ? Math.round((now - lastSetTimestampRef.current) / 1000)
            : 0;
        const restTimeTaken = restActive && restStartRef.current > 0
            ? Math.round((now - restStartRef.current) / 1000)
            : 0;

        // --- Record this set in exerciseLogs ---
        setExerciseLogs(prev => prev.map((log, i) => {
            if (log.exerciseId === exerciseId || i === exerciseIdx) {
                return {
                    ...log,
                    sets: [...log.sets, {
                        setNumber: newCount,
                        completedAt: new Date().toISOString(),
                        timeBetweenSets,
                        restTimeTaken,
                        restTimeOffered: 60,
                    }],
                };
            }
            return log;
        }));

        lastSetTimestampRef.current = now;
        setCompletedSets(prev => ({ ...prev, [exerciseIdx]: newCount }));

        // Start rest timer
        restStartRef.current = now;
        setRestTimer(60);
        setRestActive(true);

        // Advance to next exercise or finish
        if (newCount >= totalSets && exerciseIdx < exercises.length - 1) {
            setTimeout(() => setCurrentExerciseIdx(exerciseIdx + 1), 500);
        } else if (newCount >= totalSets && exerciseIdx === exercises.length - 1) {
            setTimeout(() => {
                setSessionDone(true);
                Vibration.vibrate([0, 300, 100, 300]);
            }, 500);
        }
    };

    const skipRest = () => {
        const now = Date.now();
        if (restStartRef.current > 0) {
            const actualRest = Math.round((now - restStartRef.current) / 1000);
            // Update last set's restTimeTaken
            setExerciseLogs(prev => {
                const updated = [...prev];
                const log = updated[currentExerciseIdx];
                if (log && log.sets.length > 0) {
                    const last = log.sets[log.sets.length - 1];
                    log.sets[log.sets.length - 1] = { ...last, restTimeTaken: actualRest };
                }
                return updated;
            });
        }
        clearInterval(restRef.current);
        setRestActive(false);
    };

    const saveSession = async (finalElapsed: number, logs: ExerciseLog[]) => {
        if (sessionSavedRef.current) return;
        sessionSavedRef.current = true;

        const allSets = logs.flatMap(l => l.sets);
        const totalSetsCompleted = allSets.length;
        const avgRestTimeTaken = allSets.length > 0
            ? Math.round(allSets.reduce((a, s) => a + s.restTimeTaken, 0) / allSets.length)
            : 0;
        const timeBetweenSetsArr = allSets.map(s => s.timeBetweenSets).filter(t => t > 0);
        const avgTimeBetweenSets = timeBetweenSetsArr.length > 0
            ? Math.round(timeBetweenSetsArr.reduce((a, b) => a + b, 0) / timeBetweenSetsArr.length)
            : 0;

        try {
            await api.post('/workout-sessions', {
                workoutId: workout.id,
                workoutName: workout.name,
                totalTimeSeconds: finalElapsed,
                totalSetsCompleted,
                totalExercises: exercises.length,
                avgRestTimeTaken,
                avgTimeBetweenSets,
                exerciseLogs: logs,
            });
        } catch (e) {
            console.warn('Failed to save session:', e);
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const uri = await captureRef(shareRef, {
                format: 'png',
                quality: 0.8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: t('workouts.share_title', 'Compartilhar meu treino'),
                    mimeType: 'image/png',
                    UTI: 'public.png',
                });
            }
        } catch (error) {
            console.error('Sharing error:', error);
            showAlert(t('common.error'), t('workouts.share_error', 'Erro ao preparar compartilhamento.'));
        } finally {
            setIsSharing(false);
            setSharingModalVisible(false);
        }
    };

    const totalExercises = exercises.length;
    const allSets = exercises.reduce((acc, ex) => acc + (ex.sets || 3), 0);

    // ── STATE: SESSION DONE ──────────────────────────────────────────────────
    if (sessionDone) {
        const completedSetsArr = exerciseLogs.flatMap(l => l.sets);
        const avgRest = completedSetsArr.length > 0
            ? Math.round(completedSetsArr.reduce((a, s) => a + s.restTimeTaken, 0) / completedSetsArr.length)
            : 0;
        const timesArr = completedSetsArr.map(s => s.timeBetweenSets).filter(t => t > 0);
        const avgBetween = timesArr.length > 0
            ? Math.round(timesArr.reduce((a, b) => a + b, 0) / timesArr.length)
            : 0;

        return (
            <View style={[styles.container, { paddingTop: topInset }]}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
                <ScrollView contentContainerStyle={styles.doneScroll}>
                    <Animated.View entering={FadeIn.duration(600)} style={styles.doneContainer}>
                        <CheckCircle2 size={80} color={theme.colors.primary} />
                        <Text style={styles.doneTitle}>{t('workouts.session_done', 'Treino Concluído! 💪')}</Text>

                        {/* ── Summary cards ── */}
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryCard}>
                                <Timer size={20} color={theme.colors.primary} />
                                <Text style={styles.summaryValue}>{formatTime(elapsed)}</Text>
                                <Text style={styles.summaryLabel}>{t('workouts.session_time', 'Duração')}</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Dumbbell size={20} color={theme.colors.primary} />
                                <Text style={styles.summaryValue}>{completedSetsArr.length}</Text>
                                <Text style={styles.summaryLabel}>{t('workouts.sets_done', 'Séries')}</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <SkipForward size={20} color={theme.colors.primary} />
                                <Text style={styles.summaryValue}>{avgRest}s</Text>
                                <Text style={styles.summaryLabel}>{t('workouts.avg_rest', 'Descanso médio')}</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <ChevronRight size={20} color={theme.colors.primary} />
                                <Text style={styles.summaryValue}>{avgBetween}s</Text>
                                <Text style={styles.summaryLabel}>{t('workouts.avg_between', 'Entre séries')}</Text>
                            </View>
                        </View>

                        {/* ── Per-exercise breakdown ── */}
                        <Text style={styles.breakdownTitle}>{t('workouts.breakdown', 'Detalhe por exercício')}</Text>
                        {exerciseLogs.map((log, i) => (
                            <View key={i} style={styles.breakdownCard}>
                                <Text style={styles.breakdownExName}>{log.exerciseName}</Text>
                                <Text style={styles.breakdownMuscle}>{log.muscleGroup}</Text>
                                {log.sets.map((s, si) => (
                                    <View key={si} style={styles.setRow}>
                                        <Text style={styles.setRowNum}>Série {s.setNumber}</Text>
                                        <View style={styles.setRowStats}>
                                            <Text style={styles.setRowStat}>⏱ {s.timeBetweenSets}s</Text>
                                            <Text style={styles.setRowStat}>💤 {s.restTimeTaken}s</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}

                        <View style={styles.doneBtns}>
                            <TouchableOpacity
                                style={styles.shareSocialBtn}
                                onPress={() => setSharingModalVisible(true)}
                            >
                                <Zap size={18} color={theme.colors.background} />
                                <Text style={styles.shareSocialBtnText}>{t('workouts.share_social', 'Compartilhar Stories')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.historyBtn}
                                onPress={() => {
                                    setSessionActive(false);
                                    setSessionDone(false);
                                    navigation.navigate('WorkoutHistory');
                                }}
                            >
                                <BarChart2 size={18} color={theme.colors.primary} />
                                <Text style={styles.historyBtnText}>{t('workouts.view_history', 'Ver histórico')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.doneBtn}
                                onPress={() => {
                                    setSessionActive(false);
                                    setSessionDone(false);
                                    navigation.goBack();
                                }}
                            >
                                <Text style={styles.doneBtnText}>{t('workouts.finish_session', 'Finalizar')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>


                <Modal visible={sharingModalVisible} animationType="fade" transparent>
                    <View style={styles.shareModalOverlay}>
                        <View style={styles.shareModalContent}>
                            <Text style={styles.shareModalTitle}>{t('workouts.share_preview', 'Prévia do Stories')}</Text>

                            <ScrollView style={styles.sharePreviewScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.sharePreviewContainer}>
                                    <View ref={shareRef} collapsable={false} style={styles.shareRefWrapper}>
                                        <WorkoutShareCard
                                            workoutName={workout.name}
                                            duration={formatTime(elapsed)}
                                            totalSets={completedSetsArr.length}
                                            userName={user?.name || 'Guerreiro(a)'}
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.shareModalBtns}>
                                <TouchableOpacity
                                    style={styles.shareCancelBtn}
                                    onPress={() => setSharingModalVisible(false)}
                                >
                                    <Text style={styles.shareCancelBtnText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.shareConfirmBtn}
                                    onPress={handleShare}
                                    disabled={isSharing}
                                >
                                    {isSharing ? (
                                        <ActivityIndicator color={theme.colors.background} />
                                    ) : (
                                        <>
                                            <Trophy size={20} color={theme.colors.background} />
                                            <Text style={styles.shareConfirmBtnText}>{t('workouts.share_now', 'Compartilhar')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // ── STATE: ACTIVE SESSION ────────────────────────────────────────────────
    if (sessionActive) {
        const currentEx = exercises[currentExerciseIdx];
        const doneSets = completedSets[currentExerciseIdx] || 0;
        const totalSets = currentEx?.sets || 3;
        const progress = ((currentExerciseIdx + (doneSets / totalSets)) / exercises.length) * 100;

        return (
            <View style={[styles.container, { paddingTop: topInset }]}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

                <View style={styles.sessionHeader}>
                    <TouchableOpacity onPress={() => {
                        showAlert(
                            t('workouts.stop_session', 'Parar treino?'),
                            t('workouts.stop_confirm', 'Tem certeza que deseja parar o treino?'),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                { text: t('workouts.stop_btn', 'Parar'), style: 'destructive', onPress: () => setSessionActive(false) }
                            ]
                        );
                    }}>
                        <ChevronLeft size={28} color={theme.colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{workout.name}</Text>
                    <View style={styles.elapsedBadge}>
                        <Timer size={14} color={theme.colors.primary} />
                        <Text style={styles.elapsedText}>{formatTime(elapsed)}</Text>
                    </View>
                </View>

                <View style={styles.progressBg}>
                    <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                    {currentExerciseIdx + 1}/{exercises.length} — {t('workouts.exercise', 'exercício')}
                </Text>

                {/* Rest modal */}
                <Modal transparent visible={restActive} animationType="fade">
                    <View style={styles.restOverlay}>
                        <View style={styles.restCard}>
                            <Timer size={40} color={theme.colors.primary} />
                            <Text style={styles.restTitle}>{t('workouts.rest', 'Descanse!')}</Text>
                            <Text style={styles.restTimer}>{restTimer}s</Text>
                            <TouchableOpacity style={styles.skipRest} onPress={skipRest}>
                                <SkipForward size={18} color={theme.colors.background} />
                                <Text style={styles.skipRestText}>{t('workouts.skip_rest', 'Pular descanso')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <ScrollView contentContainerStyle={[styles.sessionContent, { paddingBottom: bottomInset + 20 }]}>
                    <Animated.View entering={FadeInDown.duration(400)} key={currentExerciseIdx} style={styles.currentExCard}>
                        {currentEx?.exercise?.gif_url ? (
                            <Image
                                source={{ uri: fixUrl(currentEx.exercise.gif_url) }}
                                style={styles.exGif}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.exIconBg}>
                                <Dumbbell size={32} color={theme.colors.primary} />
                            </View>
                        )}
                        <Text style={styles.currentExName}>{currentEx?.exercise?.name || currentEx?.name}</Text>
                        <Text style={styles.currentExMuscle}>{currentEx?.exercise?.muscle_group || currentEx?.muscle_group}</Text>

                        <View style={styles.setsGrid}>
                            {Array.from({ length: totalSets }).map((_, i) => (
                                <View key={i} style={[styles.setCircle, i < doneSets && styles.setCircleDone]}>
                                    {i < doneSets
                                        ? <Check size={16} color={theme.colors.background} />
                                        : <Text style={styles.setCircleText}>{i + 1}</Text>
                                    }
                                </View>
                            ))}
                        </View>

                        <Text style={styles.setsInfo}>
                            {currentEx?.reps || 10} {t('workouts.reps', 'repetições')} × Série {doneSets + 1}/{totalSets}
                        </Text>

                        <TouchableOpacity
                            style={[styles.completeSetBtn, doneSets >= totalSets && styles.completeSetBtnDisabled]}
                            onPress={() => completeSet(currentExerciseIdx, totalSets)}
                            disabled={doneSets >= totalSets}
                        >
                            <Check size={22} color={theme.colors.background} />
                            <Text style={styles.completeSetText}>
                                {doneSets >= totalSets
                                    ? t('workouts.exercise_done', 'Exercício completo!')
                                    : t('workouts.complete_set', 'Concluir Série')}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {exercises.slice(currentExerciseIdx + 1).map((ex, i) => (
                        <View key={i} style={styles.nextExItem}>
                            <Text style={styles.nextExLabel}>{t('workouts.next', 'Próximo')}</Text>
                            <Text style={styles.nextExName}>{ex?.exercise?.name || ex?.name}</Text>
                            <Text style={styles.nextExSets}>{ex.sets}×{ex.reps}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    // ── STATE: DEFAULT DETAIL ────────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: topInset }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={26} color={theme.colors.white} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('WorkoutHistory')}
                        style={styles.historyIconBtn}
                    >
                        <BarChart2 size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EditWorkout', { workout })}
                        style={styles.editBtn}
                    >
                        <Pencil size={18} color={theme.colors.primary} />
                        <Text style={styles.editBtnText}>{t('common.edit', 'Editar')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteWorkout} style={styles.deleteBtn}>
                        <Trash2 size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}>
                <Animated.View entering={FadeIn.duration(500)}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                            <Dumbbell size={14} color={theme.colors.primary} />
                            <Text style={styles.metaText}>{totalExercises} {t('workouts.exercises', 'exercícios')}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                            <Timer size={14} color={theme.colors.primary} />
                            <Text style={styles.metaText}>{allSets} {t('workouts.total_sets', 'séries')}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                            <ChevronRight size={14} color={theme.colors.primary} />
                            <Text style={styles.metaText}>{workout.daysOfWeek}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionLabel}>{t('workouts.exercise_list', 'Lista de Exercícios')}</Text>

                    {loading ? (
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    ) : exercises.length === 0 ? (
                        <Text style={styles.emptyText}>{t('workouts.no_exercises', 'Nenhum exercício neste treino.')}</Text>
                    ) : (
                        exercises.map((ex: any, idx: number) => (
                            <Animated.View key={idx} entering={FadeInDown.delay(idx * 80)} style={styles.exCard}>
                                <View style={styles.exIconSmall}>
                                    <Dumbbell size={20} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exName}>{ex?.exercise?.name || ex?.name}</Text>
                                    <Text style={styles.exMuscle}>{ex?.exercise?.muscle_group || ex?.muscle_group}</Text>
                                </View>
                                <View style={styles.exBadgeRow}>
                                    <View style={styles.exBadge}>
                                        <Text style={styles.exBadgeText}>{ex.sets}×{ex.reps}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    )}
                </Animated.View>
            </ScrollView>

            <View style={[styles.startBtnContainer, { bottom: bottomInset + 12 }]}>
                <TouchableOpacity
                    style={[styles.startBtn, exercises.length === 0 && { opacity: 0.4 }]}
                    onPress={startSession}
                    disabled={exercises.length === 0}
                >
                    <Play size={24} color={theme.colors.background} />
                    <Text style={styles.startBtnText}>{t('workouts.start', 'Iniciar Treino')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    },
    backBtn: { padding: theme.spacing.xs },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    historyIconBtn: { padding: theme.spacing.xs },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
        backgroundColor: theme.colors.primary + '20',
        paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1, borderColor: theme.colors.primary + '40',
    },
    editBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: theme.fontSize.sm },
    deleteBtn: { padding: theme.spacing.xs },

    scrollContent: { padding: theme.spacing.md },
    workoutName: { fontSize: theme.fontSize.xxxl, fontWeight: 'bold', color: theme.colors.white, marginBottom: theme.spacing.sm },
    metaRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.lg },
    metaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
        backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs, borderRadius: theme.spacing.lg,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    metaText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, fontWeight: '600' },
    sectionLabel: { fontSize: theme.fontSize.sm, fontWeight: 'bold', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm },
    loadingText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 30 },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 30 },

    exCard: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md,
        marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border,
    },
    exIconSmall: {
        width: theme.spacing.xxl + theme.spacing.xs, height: theme.spacing.xxl + theme.spacing.xs,
        borderRadius: (theme.spacing.xxl + theme.spacing.xs) / 2,
        backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center',
    },
    exName: { color: theme.colors.white, fontWeight: 'bold', fontSize: theme.fontSize.md },
    exMuscle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, marginTop: 2 },
    exBadgeRow: { alignItems: 'flex-end' },
    exBadge: { backgroundColor: theme.colors.primary + '25', paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
    exBadgeText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: theme.fontSize.sm },

    startBtnContainer: { position: 'absolute', left: theme.spacing.md, right: theme.spacing.md },
    startBtn: {
        backgroundColor: theme.colors.primary, height: theme.buttonHeight + 4, borderRadius: theme.borderRadius.lg,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm,
        shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
    },
    startBtnText: { color: theme.colors.background, fontSize: theme.fontSize.lg, fontWeight: 'bold' },

    // ── Session
    sessionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    },
    sessionTitle: { color: theme.colors.white, fontWeight: 'bold', fontSize: theme.fontSize.lg, flex: 1, textAlign: 'center' },
    elapsedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    elapsedText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: theme.fontSize.sm },

    progressBg: { height: 6, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.md, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
    progressLabel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, marginTop: 6, marginBottom: 8 },

    sessionContent: { padding: theme.spacing.md },
    currentExCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
        alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md,
    },
    exIconBg: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md,
    },
    exGif: {
        width: '100%', height: 180, borderRadius: theme.borderRadius.md,
        backgroundColor: '#fff', marginBottom: theme.spacing.md,
    },
    currentExName: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.white, textAlign: 'center', marginBottom: 4 },
    currentExMuscle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
    setsGrid: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center', marginBottom: theme.spacing.md },
    setCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
    setCircleDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    setCircleText: { color: theme.colors.textSecondary, fontWeight: 'bold', fontSize: theme.fontSize.md },
    setsInfo: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginBottom: theme.spacing.lg },
    completeSetBtn: {
        backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center',
        gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md, width: '100%', justifyContent: 'center',
    },
    completeSetBtnDisabled: { opacity: 0.4 },
    completeSetText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.lg },

    nextExItem: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md,
        marginBottom: theme.spacing.sm, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    nextExLabel: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, fontWeight: 'bold', marginRight: theme.spacing.sm, textTransform: 'uppercase' },
    nextExName: { color: theme.colors.white, fontWeight: '600', fontSize: theme.fontSize.md, flex: 1 },
    nextExSets: { color: theme.colors.primary, fontWeight: 'bold', fontSize: theme.fontSize.sm },

    // ── Rest
    restOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    restCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xxl,
        alignItems: 'center', width: '80%', borderWidth: 1, borderColor: theme.colors.border,
    },
    restTitle: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.white, marginTop: theme.spacing.sm },
    restTimer: { fontSize: 64, fontWeight: 'bold', color: theme.colors.primary, marginVertical: theme.spacing.md },
    skipRest: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
        backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm,
    },
    skipRestText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.md },

    // ── Session Done
    doneScroll: { flexGrow: 1, padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
    doneContainer: { alignItems: 'center', paddingTop: theme.spacing.lg },
    doneTitle: { fontSize: theme.fontSize.xxxl, fontWeight: 'bold', color: theme.colors.white, textAlign: 'center', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'center', marginBottom: theme.spacing.lg, width: '100%' },
    summaryCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md, alignItems: 'center', width: '46%',
        borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.xs,
    },
    summaryValue: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.white },
    summaryLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center' },

    breakdownTitle: { fontSize: theme.fontSize.md, fontWeight: 'bold', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: theme.spacing.sm },
    breakdownCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md, marginBottom: theme.spacing.sm, width: '100%',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    breakdownExName: { fontSize: theme.fontSize.md, fontWeight: 'bold', color: theme.colors.white },
    breakdownMuscle: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: theme.colors.border },
    setRowNum: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.fontSize.sm },
    setRowStats: { flexDirection: 'row', gap: theme.spacing.md },
    setRowStat: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },

    doneBtns: { flexDirection: 'column', gap: theme.spacing.sm, width: '100%', marginTop: theme.spacing.md },
    historyBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm,
        borderWidth: 1, borderColor: theme.colors.primary,
        height: theme.buttonHeight, borderRadius: theme.borderRadius.md,
    },
    historyBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: theme.fontSize.md },
    doneBtn: {
        backgroundColor: theme.colors.primary, height: theme.buttonHeight,
        borderRadius: theme.borderRadius.md, width: '100%', alignItems: 'center', justifyContent: 'center',
    },
    doneBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.lg },

    // ── Share Modal
    shareSocialBtn: {
        backgroundColor: theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: theme.spacing.sm, height: theme.buttonHeight, borderRadius: theme.borderRadius.md,
        width: '100%', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: theme.spacing.xs,
    },
    shareSocialBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.md },
    shareModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    shareModalContent: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 20, width: '100%', maxHeight: '90%', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    shareModalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.white, marginBottom: 20 },
    sharePreviewScroll: { width: '100%', marginBottom: 20 },
    sharePreviewContainer: { width: '100%', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
    shareRefWrapper: { width: 1080, height: 1920, transform: [{ scale: 0.28 }], marginTop: -690, marginBottom: -690 }, // Scale down 1080p to fit screen
    shareModalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
    shareCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
    shareCancelBtnText: { color: theme.colors.textSecondary, fontWeight: 'bold' },
    shareConfirmBtn: { flex: 2, height: 50, borderRadius: 12, backgroundColor: theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    shareConfirmBtnText: { color: theme.colors.background, fontWeight: 'bold' },
});

export default WorkoutDetailScreen;
