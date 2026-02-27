import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import api from '../api/api';
import {
    ChevronLeft,
    Dumbbell,
    Timer,
    Flame,
    SkipForward,
    TrendingUp,
    Calendar,
    ChevronDown,
    ChevronUp,
    Award,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface StatsSummary {
    totalSessions: number;
    totalTimeSeconds: number;
    totalSetsCompleted: number;
    avgSessionTimeSeconds: number;
    avgRestTimeTaken: number;
    avgTimeBetweenSets: number;
    currentStreak: number;
}

interface Session {
    id: number;
    workoutName: string;
    totalTimeSeconds: number;
    totalSetsCompleted: number;
    totalExercises: number;
    avgRestTimeTaken: number;
    avgTimeBetweenSets: number;
    completedAt: string;
    exerciseLogs: any[];
}

const WorkoutHistoryScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedSession, setExpandedSession] = useState<number | null>(null);

    const topInset = insets.top > 0
        ? insets.top
        : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);
    const bottomInset = insets.bottom > 0 ? insets.bottom : 16;

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            const [summaryRes, sessionsRes] = await Promise.all([
                api.get('/workout-sessions/stats/summary'),
                api.get('/workout-sessions?limit=30'),
            ]);
            setStats(summaryRes.data);
            setSessions(sessionsRes.data);
        } catch (e) {
            console.warn('History fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatTime = (secs: number) => {
        if (secs < 60) return `${secs}s`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTimeShort = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: topInset }]}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={26} color={theme.colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Histórico</Text>
                    <View style={{ width: 36 }} />
                </View>
                <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginTop: 60 }} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: topInset }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={26} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Histórico de Treinos</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tint={theme.colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Summary stats ── */}
                {stats && (
                    <Animated.View entering={FadeIn.duration(500)}>
                        {/* Streak banner */}
                        {stats.currentStreak > 0 && (
                            <View style={styles.streakBanner}>
                                <Flame size={22} color="#FF6B35" />
                                <Text style={styles.streakText}>
                                    {stats.currentStreak} {stats.currentStreak === 1 ? 'dia' : 'dias'} seguidos!
                                </Text>
                                <Award size={20} color="#FFD700" />
                            </View>
                        )}

                        <Text style={styles.sectionTitle}>Resumo Geral</Text>

                        {/* Top metrics grid */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, styles.statCardWide]}>
                                <TrendingUp size={22} color={theme.colors.primary} />
                                <Text style={styles.statVal}>{stats.totalSessions}</Text>
                                <Text style={styles.statLbl}>Treinos realizados</Text>
                            </View>
                            <View style={[styles.statCard, styles.statCardWide]}>
                                <Timer size={22} color={theme.colors.primary} />
                                <Text style={styles.statVal}>{formatTime(stats.totalTimeSeconds)}</Text>
                                <Text style={styles.statLbl}>Tempo total treinado</Text>
                            </View>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Dumbbell size={18} color={theme.colors.primary} />
                                <Text style={styles.statVal}>{stats.totalSetsCompleted}</Text>
                                <Text style={styles.statLbl}>Séries totais</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Timer size={18} color={theme.colors.primary} />
                                <Text style={styles.statVal}>{formatTime(stats.avgSessionTimeSeconds)}</Text>
                                <Text style={styles.statLbl}>Duração média</Text>
                            </View>
                            <View style={styles.statCard}>
                                <SkipForward size={18} color={theme.colors.primary} />
                                <Text style={styles.statVal}>{stats.avgRestTimeTaken}s</Text>
                                <Text style={styles.statLbl}>Descanso médio</Text>
                            </View>
                        </View>

                        {/* Insight card */}
                        <View style={styles.insightCard}>
                            <View style={styles.insightRow}>
                                <View style={styles.insightItem}>
                                    <Text style={styles.insightLabel}>⏱ Tempo médio entre séries</Text>
                                    <Text style={styles.insightValue}>{formatTime(stats.avgTimeBetweenSets)}</Text>
                                </View>
                                <View style={styles.insightDivider} />
                                <View style={styles.insightItem}>
                                    <Text style={styles.insightLabel}>💤 Descanso médio respeitado</Text>
                                    <Text style={styles.insightValue}>{stats.avgRestTimeTaken}s / 60s</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* ── Session history ── */}
                <Text style={styles.sectionTitle}>Sessões Recentes</Text>

                {sessions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Dumbbell size={48} color={theme.colors.border} />
                        <Text style={styles.emptyText}>Nenhum treino realizado ainda.</Text>
                        <Text style={styles.emptySubtext}>Complete seu primeiro treino para ver o histórico aqui!</Text>
                    </View>
                ) : (
                    sessions.map((session, idx) => {
                        const isExpanded = expandedSession === session.id;
                        return (
                            <Animated.View key={session.id} entering={FadeInDown.delay(idx * 50)}>
                                <TouchableOpacity
                                    style={[styles.sessionCard, isExpanded && styles.sessionCardExpanded]}
                                    onPress={() => setExpandedSession(isExpanded ? null : session.id)}
                                    activeOpacity={0.85}
                                >
                                    {/* Session header */}
                                    <View style={styles.sessionCardHeader}>
                                        <View style={styles.sessionIconBg}>
                                            <Dumbbell size={20} color={theme.colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sessionName} numberOfLines={1}>{session.workoutName}</Text>
                                            <View style={styles.sessionDateRow}>
                                                <Calendar size={12} color={theme.colors.textSecondary} />
                                                <Text style={styles.sessionDate}>
                                                    {formatDate(session.completedAt)} · {formatTimeShort(session.completedAt)}
                                                </Text>
                                            </View>
                                        </View>
                                        {isExpanded
                                            ? <ChevronUp size={18} color={theme.colors.textSecondary} />
                                            : <ChevronDown size={18} color={theme.colors.textSecondary} />
                                        }
                                    </View>

                                    {/* Quick chips */}
                                    <View style={styles.sessionChips}>
                                        <View style={styles.chip}>
                                            <Timer size={12} color={theme.colors.primary} />
                                            <Text style={styles.chipText}>{formatTime(session.totalTimeSeconds)}</Text>
                                        </View>
                                        <View style={styles.chip}>
                                            <Dumbbell size={12} color={theme.colors.primary} />
                                            <Text style={styles.chipText}>{session.totalSetsCompleted} séries</Text>
                                        </View>
                                        <View style={styles.chip}>
                                            <SkipForward size={12} color={theme.colors.primary} />
                                            <Text style={styles.chipText}>{session.avgRestTimeTaken}s descanso</Text>
                                        </View>
                                    </View>

                                    {/* Expanded: per-exercise breakdown */}
                                    {isExpanded && session.exerciseLogs?.length > 0 && (
                                        <View style={styles.exerciseBreakdown}>
                                            <Text style={styles.breakdownHeader}>Detalhamento</Text>
                                            {session.exerciseLogs.map((log: any, li: number) => (
                                                <View key={li} style={styles.exLogRow}>
                                                    <Text style={styles.exLogName}>{log.exerciseName}</Text>
                                                    <View style={styles.exLogSets}>
                                                        {(log.sets || []).map((s: any, si: number) => (
                                                            <View key={si} style={styles.exLogSet}>
                                                                <Text style={styles.exLogSetNum}>S{s.setNumber}</Text>
                                                                <Text style={styles.exLogSetStat}>⏱{s.timeBetweenSets}s</Text>
                                                                <Text style={styles.exLogSetStat}>💤{s.restTimeTaken}s</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backBtn: { padding: theme.spacing.xs },
    headerTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.white },

    content: { padding: theme.spacing.md },
    sectionTitle: {
        fontSize: theme.fontSize.sm, fontWeight: 'bold', color: theme.colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1,
        marginTop: theme.spacing.md, marginBottom: theme.spacing.sm,
    },

    // ── Streak
    streakBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
        backgroundColor: '#FF6B3520', borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
        borderWidth: 1, borderColor: '#FF6B3540', marginBottom: theme.spacing.md,
    },
    streakText: { color: '#FF6B35', fontWeight: 'bold', fontSize: theme.fontSize.md },

    // ── Stats grid
    statsGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
    statCard: {
        flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.xs,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    statCardWide: { flex: 1 },
    statVal: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.white },
    statLbl: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center' },

    // ── Insight
    insightCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm, overflow: 'hidden',
    },
    insightRow: { flexDirection: 'row' },
    insightItem: { flex: 1, padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.xs },
    insightDivider: { width: 1, backgroundColor: theme.colors.border },
    insightLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center' },
    insightValue: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.primary },

    // ── Empty
    emptyContainer: { alignItems: 'center', paddingVertical: theme.spacing.xxl, gap: theme.spacing.sm },
    emptyText: { color: theme.colors.white, fontSize: theme.fontSize.md, fontWeight: 'bold' },
    emptySubtext: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: 'center' },

    // ── Session cards
    sessionCard: {
        backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md, marginBottom: theme.spacing.sm,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    sessionCardExpanded: { borderColor: theme.colors.primary + '60' },
    sessionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
    sessionIconBg: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center',
    },
    sessionName: { fontSize: theme.fontSize.md, fontWeight: 'bold', color: theme.colors.white },
    sessionDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    sessionDate: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },

    sessionChips: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: theme.colors.primary + '15', paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs - 1, borderRadius: theme.spacing.lg,
    },
    chipText: { fontSize: theme.fontSize.xs, color: theme.colors.primary, fontWeight: '600' },

    // ── Expanded exercise breakdown
    exerciseBreakdown: { marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm },
    breakdownHeader: {
        fontSize: theme.fontSize.xs, fontWeight: 'bold', color: theme.colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm,
    },
    exLogRow: { marginBottom: theme.spacing.sm },
    exLogName: { fontSize: theme.fontSize.sm, fontWeight: 'bold', color: theme.colors.white, marginBottom: 4 },
    exLogSets: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    exLogSet: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
        backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    exLogSetNum: { fontSize: theme.fontSize.xs, color: theme.colors.primary, fontWeight: 'bold' },
    exLogSetStat: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
});

export default WorkoutHistoryScreen;
