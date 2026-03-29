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
    ChevronUp,
    ChevronDown,
    Save,
    Check,
    ArrowUpDown,
    Trash2
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
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const [tempSelectedExercises, setTempSelectedExercises] = useState<any[]>([]);
    const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);

    const musclesList = React.useMemo(() => {
        const unique = Array.from(new Set(allExercises.map((e: any) => e.muscle_group)));
        return ['All', ...unique.sort()];
    }, [allExercises]);

    const showAlert = useAlertStore(s => s.showAlert);

    useEffect(() => {
        loadData();
    }, []);

    const fixUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${api.defaults.baseURL}${url}`;
    };

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
                load: (we.load || '0').toString(),
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
                load: (ex.WorkoutExercise?.load || ex.load || '0').toString(),
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

    const updateExerciseStat = (id: number, field: 'sets' | 'reps' | 'load', value: string) => {
        const filteredValue = field === 'load' ? value : value.replace(/[^0-9]/g, '');
        setSelectedExercises(prev =>
            prev.map(ex => ex.id === id ? { ...ex, [field]: filteredValue } : ex)
        );
    };

    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= selectedExercises.length) return;

        const newArr = [...selectedExercises];
        const temp = newArr[index];
        newArr[index] = newArr[newIndex];
        newArr[newIndex] = temp;
        setSelectedExercises(newArr);
    };

    const smartSort = () => {
        const priority: { [key: string]: number } = {
            'Peito': 1, 'Chest': 1,
            'Costas': 1, 'Back': 1, 'Lombar': 1,
            'Pernas': 1, 'Legs': 1, 'Quadríceps': 1, 'Posterior': 1, 'Glúteos': 1,
            'Ombros': 2, 'Shoulders': 2, 'Trapézio': 2,
            'Bíceps': 3, 'Biceps': 3,
            'Tríceps': 3, 'Triceps': 3, 'Antebraço': 3,
            'Abdominais': 4, 'Abs': 4,
            'Panturrilha': 4, 'Calves': 4
        };

        const sorted = [...selectedExercises].sort((a, b) => {
            const prioA = priority[a.muscle_group] || 5;
            const prioB = priority[b.muscle_group] || 5;
            return prioA - prioB;
        });
        setSelectedExercises(sorted);
    };

    const removeExercise = (id: number) => {
        setSelectedExercises(prev => prev.filter(ex => ex.id !== id));
    };

    const addExercise = (item: any) => {
        if (!selectedExercises.find(ex => ex.id === item.id)) {
            setSelectedExercises(prev => [...prev, { ...item, sets: '3', reps: '10', load: '0' }]);
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
                    load: ex.load || '0',
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
        (e.name?.toLowerCase().includes(search.toLowerCase())) &&
        (selectedMuscle === 'All' || e.muscle_group === selectedMuscle)
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
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {selectedExercises.length > 1 && (
                            <TouchableOpacity style={styles.sortBtn} onPress={smartSort}>
                                <ArrowUpDown size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowExercisesModal(true)}>
                            <Plus size={18} color={theme.colors.background} />
                            <Text style={styles.addBtnText}>{t('common.add')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {selectedExercises.map((ex, index) => (
                    <Animated.View key={`${ex.id}-${index}`} entering={FadeInDown.delay(index * 60)}>
                        <View style={styles.exCard}>
                            <View style={styles.reorderHandle}>
                                <TouchableOpacity onPress={() => moveExercise(index, 'up')} disabled={index === 0}>
                                    <ChevronUp size={20} color={index === 0 ? theme.colors.textSecondary + '40' : theme.colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => moveExercise(index, 'down')} disabled={index === selectedExercises.length - 1}>
                                    <ChevronDown size={20} color={index === selectedExercises.length - 1 ? theme.colors.textSecondary + '40' : theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.exInfo, { marginLeft: 8 }]}>
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
                                <View style={styles.inputWrap}>
                                    <Text style={styles.miniLabel}>KG</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.load}
                                        onChangeText={v => updateExerciseStat(ex.id, 'load', v)}
                                        placeholder="0"
                                        placeholderTextColor={theme.colors.textSecondary}
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeExercise(ex.id)}
                                    style={{ padding: 8 }}
                                    activeOpacity={0.7}
                                >
                                    <Trash2 size={18} color={theme.colors.error} />
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
                            onPress={() => { setShowExercisesModal(false); setSearch(''); setTempSelectedExercises([]); }}
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

                    <View style={{ height: 50, marginBottom: 10 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                            {musclesList.map(m => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setSelectedMuscle(m)}
                                    style={[
                                        styles.filterChip,
                                        selectedMuscle === m && { backgroundColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={{
                                        color: selectedMuscle === m ? theme.colors.background : theme.colors.textSecondary,
                                        fontWeight: 'bold',
                                        fontSize: 12
                                    }}>
                                        {m === 'All' ? t('exercises.all') : m}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
                            const isPending = !!tempSelectedExercises.find(i => i.id === item.id);
                            const alreadyAdded = !!selectedExercises.find(ex => ex.id === item.id);

                            return (
                                <View style={[styles.exListItem, (isPending || alreadyAdded) && styles.exListItemAdded]}>
                                    <TouchableOpacity
                                        style={{ flex: 1 }}
                                        onPress={() => setSelectedExerciseDetail(item)}
                                    >
                                        <Text style={[styles.exListName, alreadyAdded && { opacity: 0.5 }]}>{item.name}</Text>
                                        <Text style={styles.exListMuscle}>{item.muscle_group}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            if (alreadyAdded) return;
                                            if (isPending) {
                                                setTempSelectedExercises(tempSelectedExercises.filter(i => i.id !== item.id));
                                            } else {
                                                setTempSelectedExercises([...tempSelectedExercises, { ...item, sets: '3', reps: '10', load: '1' }]);
                                            }
                                        }}
                                        style={{ padding: 10 }}
                                    >
                                        {alreadyAdded ? (
                                            <Check size={18} color={theme.colors.textSecondary} />
                                        ) : isPending ? (
                                            <View style={styles.checkCircle}>
                                                <Check size={14} color={theme.colors.background} />
                                            </View>
                                        ) : (
                                            <Plus size={18} color={theme.colors.textSecondary} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />

                    {tempSelectedExercises.length > 0 && (
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.confirmAddBtn}
                                onPress={() => {
                                    setSelectedExercises([...selectedExercises, ...tempSelectedExercises]);
                                    setTempSelectedExercises([]);
                                    setShowExercisesModal(false);
                                    setSearch('');
                                }}
                            >
                                <Text style={styles.confirmAddText}>
                                    {t('common.add')} ({tempSelectedExercises.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Exercise Detail Modal */}
            <Modal
                visible={!!selectedExerciseDetail}
                animationType="fade"
                transparent
                onRequestClose={() => setSelectedExerciseDetail(null)}
            >
                <View style={styles.detailModalBackdrop}>
                    <Animated.View entering={FadeInDown} style={styles.detailModalContent}>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>{selectedExerciseDetail?.name}</Text>
                            <TouchableOpacity onPress={() => setSelectedExerciseDetail(null)}>
                                <X size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {(selectedExerciseDetail?.gif_urls && selectedExerciseDetail.gif_urls.length > 0) ? (
                                <View>
                                    <ScrollView
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.detailCarousel}
                                    >
                                        {selectedExerciseDetail.gif_urls.map((url: string, index: number) => (
                                            <Animated.Image
                                                key={index}
                                                source={{ uri: fixUrl(url) }}
                                                style={styles.detailGif}
                                            />
                                        ))}
                                    </ScrollView>
                                    <View style={styles.paginationDots}>
                                        {selectedExerciseDetail.gif_urls.map((_: any, i: number) => (
                                            <View key={i} style={styles.dot} />
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                <Animated.Image
                                    source={{ uri: fixUrl(selectedExerciseDetail?.gif_url) }}
                                    style={styles.detailGif}
                                    blurRadius={selectedExerciseDetail?.gif_url ? 0 : 10}
                                />
                            )}

                            <View style={styles.detailInfoContainer}>
                                <View style={styles.detailTag}>
                                    <Text style={styles.detailTagText}>{selectedExerciseDetail?.muscle_group}</Text>
                                </View>
                                <View style={[styles.detailTag, { backgroundColor: theme.colors.surface }]}>
                                    <Text style={styles.detailTagText}>{selectedExerciseDetail?.equipment}</Text>
                                </View>
                            </View>

                            <Text style={styles.detailDescription}>
                                Este exercício foca no grupo muscular {selectedExerciseDetail?.muscle_group}.
                                Execute com controle e mantenha a postura adequada durante toda a execução.
                            </Text>
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.detailAddBtn,
                                !!selectedExercises.find(i => i.id === selectedExerciseDetail?.id) && styles.detailAddBtnDisabled
                            ]}
                            onPress={() => {
                                if (!selectedExercises.find(i => i.id === selectedExerciseDetail?.id)) {
                                    if (!tempSelectedExercises.find(i => i.id === selectedExerciseDetail.id)) {
                                        setTempSelectedExercises([...tempSelectedExercises, { ...selectedExerciseDetail, sets: '3', reps: '10', load: '0' }]);
                                    }
                                }
                                setSelectedExerciseDetail(null);
                            }}
                            disabled={!!selectedExercises.find(i => i.id === selectedExerciseDetail?.id)}
                        >
                            <Text style={styles.detailAddBtnText}>
                                {!!selectedExercises.find(i => i.id === selectedExerciseDetail?.id)
                                    ? 'Já está no treino'
                                    : 'Selecionar Exercício'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
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
    sortBtn: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
    },

    // Exercise cards
    exCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    reorderHandle: {
        marginRight: 4,
        gap: 2,
        alignItems: 'center',
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
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        height: 36,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    confirmAddBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    confirmAddText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16
    },

    // Detail Modal
    detailModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20
    },
    detailModalContent: {
        backgroundColor: theme.colors.background,
        borderRadius: 30,
        padding: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1
    },
    detailGif: {
        width: 320,
        height: 250,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
    },
    detailCarousel: {
        width: '100%',
        height: 250,
        marginBottom: 10
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 20
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary
    },
    detailInfoContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20
    },
    detailTag: {
        backgroundColor: theme.colors.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40'
    },
    detailTagText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold'
    },
    detailDescription: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20
    },
    detailAddBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    detailAddBtnDisabled: {
        backgroundColor: theme.colors.surface,
        opacity: 0.5
    },
    detailAddBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default EditWorkoutScreen;
