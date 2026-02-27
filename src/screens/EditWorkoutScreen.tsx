import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    ActivityIndicator,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import api from '../api/api';
import { useWorkoutStore } from '../store/useWorkoutStore';
import {
    Plus,
    X,
    Search,
    ChevronLeft,
    Save,
    Check,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAlertStore } from '../store/useAlertStore';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const EditWorkoutScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { workout } = route.params;
    const insets = useSafeAreaInsets();

    const parseDays = (): string[] => {
        if (!workout.daysOfWeek) return [];
        const stored = workout.daysOfWeek.split(',').map((d: string) => d.trim());
        return DAYS.filter(d => stored.includes(t(`days.${d}`)));
    };

    const [name, setName] = useState<string>(workout.name || '');
    const [selectedDays, setSelectedDays] = useState<string[]>(parseDays());
    const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
    const [allExercises, setAllExercises] = useState<any[]>([]);
    const [showExercisesModal, setShowExercisesModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const updateWorkout = useWorkoutStore(s => s.updateWorkout);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState('');

    const showAlert = useAlertStore(s => s.showAlert);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const exRes = await api.get('/exercises');
            setAllExercises(exRes.data);

            const wRes = await api.get(`/workouts/${workout.id}`);
            const workoutExercises: any[] = wRes.data.workoutExercises || [];

            const mapped = workoutExercises.map((we: any) => ({
                id: we.exercise?.id || we.exerciseId,
                name: we.exercise?.name || '',
                muscle_group: we.exercise?.muscle_group || '',
                sets: (we.sets || 3).toString(),
                reps: (we.reps || 10).toString(),
                workoutExerciseId: we.id,
            }));
            setSelectedExercises(mapped);
        } catch {
            const fallback = (workout.exercises || []).map((ex: any) => ({
                id: ex.id,
                name: ex.name || ex.exercise?.name,
                muscle_group: ex.muscle_group || ex.exercise?.muscle_group,
                sets: (ex.WorkoutExercise?.sets || ex.sets || 3).toString(),
                reps: (ex.WorkoutExercise?.reps || ex.reps || 10).toString(),
            }));
            setSelectedExercises(fallback);
        } finally {
            setInitialLoading(false);
        }
    };

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const updateExerciseStat = (id: number, field: 'sets' | 'reps', value: string) => {
        const strNum = value.replace(/[^0-9]/g, '');
        setSelectedExercises(prev =>
            prev.map(ex => ex.id === id ? { ...ex, [field]: strNum } : ex)
        );
    };

    const removeExercise = (id: number) => {
        setSelectedExercises(prev => prev.filter(ex => ex.id !== id));
    };

    const addExercise = (item: any) => {
        if (!selectedExercises.find(ex => ex.id === item.id)) {
            setSelectedExercises(prev => [...prev, { ...item, sets: '3', reps: '10' }]);
        }
        setShowExercisesModal(false);
        setSearch('');
    };

    const handleSave = async () => {
        if (!name.trim()) {
            return showAlert(t('common.error'), t('workouts.error_name', 'Informe um nome para o treino'));
        }
        if (selectedDays.length === 0) {
            return showAlert(t('common.error'), t('workouts.error_days', 'Selecione pelo menos um dia'));
        }
        if (selectedExercises.length === 0) {
            return showAlert(t('common.error'), t('workouts.error_exercises', 'Adicione pelo menos um exercício'));
        }

        setLoading(true);
        try {
            await updateWorkout(workout.id, {
                name: name.trim(),
                daysOfWeek: selectedDays.map(d => t(`days.${d}`)).join(', '),
                exercises: selectedExercises.map(ex => ({
                    exerciseId: ex.id,
                    sets: parseInt(ex.sets as any, 10) || 3,
                    reps: parseInt(ex.reps as any, 10) || 10,
                })),
            });
            showAlert(t('common.success'), t('workouts.update_success', 'Treino atualizado com sucesso!'), [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch {
            showAlert(t('common.error'), t('workouts.update_error', 'Erro ao atualizar treino'));
        } finally {
            setLoading(false);
        }
    };

    const filteredExercises = allExercises.filter((e: any) =>
        e.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Calculate the top safe area manually for cross-platform correctness
    const topInset = insets.top > 0
        ? insets.top
        : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);

    if (initialLoading) {
        return (
            <View style={[styles.container, { paddingTop: topInset + 16 }]}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
                <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginTop: 80 }} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Header — respects safe area top */}
            <View style={[styles.header, { paddingTop: topInset + theme.spacing.sm }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <ChevronLeft size={26} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {t('workouts.edit_title', 'Editar Treino')}
                </Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    style={[styles.saveHeaderBtn, loading && { opacity: 0.5 }]}
                >
                    {loading ? (
                        <ActivityIndicator size={18} color={theme.colors.background} />
                    ) : (
                        <>
                            <Save size={16} color={theme.colors.background} />
                            <Text style={styles.saveHeaderText}>{t('common.save')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + theme.spacing.xl }
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Workout name */}
                <Text style={styles.label}>{t('workouts.workout_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('workouts.name_placeholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                />

                {/* Days */}
                <Text style={styles.label}>{t('workouts.days')}</Text>
                <View style={styles.daysRow}>
                    {DAYS.map(day => {
                        const isSelected = selectedDays.includes(day);
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                                onPress={() => toggleDay(day)}
                            >
                                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                                    {t(`days.${day}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Exercises */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>
                        {t('workouts.exercises_count', { count: selectedExercises.length })}
                    </Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowExercisesModal(true)}>
                        <Plus size={18} color={theme.colors.background} />
                        <Text style={styles.addBtnText}>{t('common.add')}</Text>
                    </TouchableOpacity>
                </View>

                {selectedExercises.map((ex, index) => (
                    <Animated.View key={`${ex.id}-${index}`} entering={FadeInDown.delay(index * 60)}>
                        <View style={styles.exCard}>
                            <View style={styles.exInfo}>
                                <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                                <Text style={styles.exMuscle}>{ex.muscle_group}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.inputWrap}>
                                    <Text style={styles.miniLabel}>S</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.sets}
                                        onChangeText={v => updateExerciseStat(ex.id, 'sets', v)}
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <Text style={styles.miniLabel}>R</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.reps}
                                        onChangeText={v => updateExerciseStat(ex.id, 'reps', v)}
                                    />
                                </View>
                                <TouchableOpacity onPress={() => removeExercise(ex.id)} style={{ padding: 4 }}>
                                    <X size={20} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                ))}
            </ScrollView>

            {/* Exercise picker modal */}
            <Modal visible={showExercisesModal} animationType="slide" statusBarTranslucent>
                <View style={[styles.modal, { paddingTop: topInset }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('workouts.add_exercise')}</Text>
                        <TouchableOpacity
                            onPress={() => { setShowExercisesModal(false); setSearch(''); }}
                            style={{ padding: 4 }}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Search size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('common.search')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={search}
                            onChangeText={setSearch}
                            autoFocus={false}
                        />
                    </View>

                    <FlatList
                        data={filteredExercises}
                        keyExtractor={(item: any) => item.id.toString()}
                        contentContainerStyle={{
                            padding: theme.spacing.md,
                            paddingBottom: insets.bottom + theme.spacing.lg
                        }}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }: { item: any }) => {
                            const alreadyAdded = !!selectedExercises.find(ex => ex.id === item.id);
                            return (
                                <TouchableOpacity
                                    style={[styles.exListItem, alreadyAdded && styles.exListItemAdded]}
                                    onPress={() => !alreadyAdded && addExercise(item)}
                                    disabled={alreadyAdded}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exListName}>{item.name}</Text>
                                        <Text style={styles.exListMuscle}>{item.muscle_group}</Text>
                                    </View>
                                    {alreadyAdded ? (
                                        <Check size={18} color={theme.colors.primary} />
                                    ) : (
                                        <Plus size={18} color={theme.colors.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    headerBtn: {
        padding: theme.spacing.xs,
        minWidth: 36,
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.white,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: theme.spacing.xs,
    },
    saveHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.sm,
        minWidth: 72,
        justifyContent: 'center',
    },
    saveHeaderText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: theme.fontSize.sm,
    },

    // Content
    content: {
        padding: theme.spacing.md,
    },
    label: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    input: {
        backgroundColor: theme.colors.surface,
        height: theme.inputHeight,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        color: '#fff',
        fontSize: theme.fontSize.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },

    // Days
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    dayChip: {
        flex: 1,
        minWidth: 36,
        maxWidth: 48,
        height: theme.spacing.xxl + theme.spacing.xs,
        borderRadius: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dayChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    dayText: {
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
        fontSize: theme.fontSize.xs,
    },
    dayTextSelected: {
        color: theme.colors.background,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: theme.spacing.xs,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.sm,
    },
    addBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: theme.fontSize.sm,
    },

    // Exercise cards
    exCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm + 2,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    exInfo: { flex: 1, marginRight: theme.spacing.sm },
    exName: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
    exMuscle: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.xs,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    inputWrap: { alignItems: 'center' },
    miniLabel: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.xs - 1,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    miniInput: {
        backgroundColor: theme.colors.background,
        color: '#fff',
        width: theme.spacing.xxl + theme.spacing.xs,
        height: theme.spacing.xxl,
        textAlign: 'center',
        borderRadius: theme.borderRadius.sm,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontSize: theme.fontSize.sm,
    },

    // Modal
    modal: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        height: theme.inputHeight,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        marginLeft: theme.spacing.sm,
        fontSize: theme.fontSize.md,
    },
    exListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    exListItemAdded: { opacity: 0.5 },
    exListName: {
        color: '#fff',
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    exListMuscle: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        marginTop: 2,
    },
});

export default EditWorkoutScreen;
