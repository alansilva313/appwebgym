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
    Platform
} from 'react-native';
import { theme } from '../theme/theme';
import api from '../api/api';
import { useWorkoutStore } from '../store/useWorkoutStore';
import {
    Plus,
    X,
    Search,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Save,
    Calendar,
    Layout as LayoutIcon,
    Dumbbell,
    ArrowUpDown,
    Check,
    Trash2
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useAlertStore } from '../store/useAlertStore';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const CreateWorkoutScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
    const [showExercisesModal, setShowExercisesModal] = useState(false);
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(false);
    const workouts = useWorkoutStore(s => s.workouts);
    const addWorkout = useWorkoutStore(s => s.addWorkout);
    const [search, setSearch] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const [showNameModal, setShowNameModal] = useState(false);
    const [tempSelectedExercises, setTempSelectedExercises] = useState<any[]>([]);
    const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);

    const muscles = React.useMemo(() => {
        const unique = Array.from(new Set(exercises.map((e: any) => e.muscle_group)));
        return ['All', ...unique.sort()];
    }, [exercises]);

    const PRESET_NAMES = [
        'Peito', 'Peito e Tríceps', 'Peito e Bíceps', 'Costas', 'Costas e Bíceps',
        'Costas e Tríceps', 'Pernas', 'Pernas (Treino A)', 'Pernas (Treino B)',
        'Ombros', 'Bíceps', 'Tríceps', 'Abdominais', 'Cardio', 'Treino A',
        'Treino B', 'Treino C', 'Treino D', 'Full Body', 'Push (Empurrar)',
        'Pull (Puxar)', 'Legs (Pernas)', 'Aeróbico', 'Superior', 'Inferior'
    ];

    const showAlert = useAlertStore(s => s.showAlert);

    useEffect(() => {
        api.get('/exercises').then((res) => setExercises(res.data));
    }, []);

    const fixUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${api.defaults.baseURL}${url}`;
    };

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const updateExerciseStats = (id: number, field: 'sets' | 'reps' | 'load', value: string) => {
        // For sets/reps keep only numbers, for load allow decimals or kg/lb if needed (but usually numeric for calc)
        const filteredValue = field === 'load' ? value : value.replace(/[^0-9]/g, '');
        setSelectedExercises(prev => prev.map(ex =>
            ex.id === id ? { ...ex, [field]: filteredValue } : ex
        ));
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

    const handleSave = async () => {
        if (!name || selectedExercises.length === 0 || selectedDays.length === 0) {
            return showAlert(t('common.error'), t('workouts.error_requirements'));
        }

        // --- Duplicate Check ---
        const currentDaysTranslated = selectedDays.map(d => t(`days.${d}`));
        const hasDuplicate = workouts.some(w => {
            const sameName = w.name.toLowerCase() === name.toLowerCase();
            const daysArr = w.daysOfWeek.split(', ').map(d => d.trim());
            const hasCommonDay = currentDaysTranslated.some(d => daysArr.includes(d));
            return sameName && hasCommonDay;
        });

        if (hasDuplicate) {
            return showAlert(
                t('common.attention', 'Atenção'),
                `Já existe um treino de "${name}" cadastrado para pelo menos um dos dias selecionados.`
            );
        }

        setLoading(true);
        try {
            await addWorkout({
                name,
                daysOfWeek: currentDaysTranslated.join(', '),
                exercises: selectedExercises.map(ex => ({
                    exerciseId: ex.id,
                    sets: parseInt(ex.sets) || 3,
                    reps: parseInt(ex.reps) || 10,
                    load: ex.load || '0'
                }))
            });
            showAlert(t('common.success'), t('workouts.save_success'));
            navigation.navigate('Dashboard');
        } catch {
            showAlert(t('common.error'), t('workouts.error_save'));
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (type: string) => {
        if (type === 'full') {
            setName(t('presets.full_body'));
            setSelectedDays(['mon', 'wed', 'fri']);
            // Look for common exercises to pre-add using common names (PT and EN)
            const presetEx = exercises.filter((ex: any) =>
                ['Agachamento', 'Squat', 'Supino Reto', 'Bench Press', 'Levantamento Terra', 'Deadlift', 'Puxada Pulley', 'Lat Pulldown'].includes(ex.name)
            );
            setSelectedExercises(presetEx.map((ex: any) => ({ ...ex, sets: '3', reps: '10', load: '0' })));
        } else if (type === 'push') {
            setName(t('presets.push_pull_legs'));
            setSelectedDays(['tue', 'fri']);
            const presetEx = exercises.filter((ex: any) =>
                ['Supino Reto', 'Bench Press', 'Desenvolvimento', 'Overhead Press'].includes(ex.name)
            );
            setSelectedExercises(presetEx.map((ex: any) => ({ ...ex, sets: '3', reps: '10', load: '0' })));
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Presets Section */}
                <Text style={styles.label}>{t('presets.title')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                    <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('full')}>
                        <LayoutIcon size={16} color={theme.colors.primary} />
                        <Text style={styles.presetText}>{t('presets.full_body')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('push')}>
                        <Dumbbell size={16} color={theme.colors.primary} />
                        <Text style={styles.presetText}>{t('presets.push_pull_legs')}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Name Input */}
                <Text style={styles.label}>{t('workouts.workout_name')}</Text>
                <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowNameModal(true)}
                >
                    <Text style={{ color: name ? theme.colors.white : theme.colors.textSecondary, fontSize: 16 }}>
                        {name || t('workouts.name_placeholder')}
                    </Text>
                </TouchableOpacity>

                {/* Days Selector */}
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

                {/* Exercises Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>{t('workouts.exercises_count', { count: selectedExercises.length })}</Text>
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
                    <Animated.View 
                        key={ex.id} 
                        entering={Platform.OS === 'web' ? undefined : FadeInDown.delay(index * 100)} 
                        layout={Platform.OS === 'web' ? undefined : Layout}
                    >
                        <View style={styles.exerciseCard}>
                            <View style={styles.reorderHandle}>
                                <TouchableOpacity onPress={() => moveExercise(index, 'up')} disabled={index === 0}>
                                    <ChevronUp size={20} color={index === 0 ? theme.colors.textSecondary + '40' : theme.colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => moveExercise(index, 'down')} disabled={index === selectedExercises.length - 1}>
                                    <ChevronDown size={20} color={index === selectedExercises.length - 1 ? theme.colors.textSecondary + '40' : theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.exerciseName}>{ex.name}</Text>
                                <Text style={styles.exerciseMuscle}>{ex.muscle_group}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.inputWrap}>
                                    <Text style={styles.inputMiniLabel}>S</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.sets}
                                        onChangeText={v => updateExerciseStats(ex.id, 'sets', v)}
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <Text style={styles.inputMiniLabel}>R</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.reps}
                                        onChangeText={v => updateExerciseStats(ex.id, 'reps', v)}
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <Text style={styles.inputMiniLabel}>KG</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        style={styles.miniInput}
                                        value={ex.load}
                                        onChangeText={v => updateExerciseStats(ex.id, 'load', v)}
                                        placeholder="0"
                                        placeholderTextColor={theme.colors.textSecondary}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.removeBtn, { padding: 8 }]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedExercises(selectedExercises.filter(i => i.id !== ex.id))}
                                >
                                    <Trash2 size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                ))}

                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.background} />
                    ) : (
                        <>
                            <Save size={24} color={theme.colors.background} />
                            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Workout Name Selection Modal */}
            <Modal visible={showNameModal} animationType="slide" transparent>
                <View style={[styles.modal, { marginTop: 100, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Escolha o Treino</Text>
                        <TouchableOpacity onPress={() => setShowNameModal(false)} style={styles.closeModal}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={PRESET_NAMES}
                        keyExtractor={(item) => item}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.exerciseListItem}
                                onPress={() => {
                                    setName(item);
                                    setShowNameModal(false);
                                }}
                            >
                                <Text style={styles.exerciseItemName}>{item}</Text>
                                <ChevronRight size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    />

                    <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <Text style={[styles.label, { marginTop: 0 }]}>Ou digite um nome personalizado:</Text>
                        <TextInput
                            placeholder="Ex: Treino de Força"
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor={theme.colors.textSecondary}
                            onSubmitEditing={() => setShowNameModal(false)}
                        />
                        <TouchableOpacity
                            style={[styles.saveBtn, { height: 50, marginTop: 15 }]}
                            onPress={() => setShowNameModal(false)}
                        >
                            <Text style={styles.saveBtnText}>Usar este nome</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Exercises Selection Modal */}
            <Modal visible={showExercisesModal} animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('workouts.add_exercise')}</Text>
                        <TouchableOpacity onPress={() => { setShowExercisesModal(false); setTempSelectedExercises([]); }} style={styles.closeModal}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchContainer}>
                        <Search size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            placeholder={t('common.search')}
                            style={styles.modalSearch}
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={{ height: 50, marginBottom: 10 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                            {muscles.map(m => (
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
                        data={exercises.filter((e: any) =>
                            e.name.toLowerCase().includes(search.toLowerCase()) &&
                            (selectedMuscle === 'All' || e.muscle_group === selectedMuscle)
                        )}
                        keyExtractor={(item: any) => item.id.toString()}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }: { item: any }) => {
                            const isPending = !!tempSelectedExercises.find(i => i.id === item.id);
                            const alreadyAdded = !!selectedExercises.find(i => i.id === item.id);

                            return (
                                <View style={[styles.exerciseListItem, (isPending || alreadyAdded) && { backgroundColor: theme.colors.surface }]}>
                                    <TouchableOpacity
                                        style={{ flex: 1 }}
                                        onPress={() => setSelectedExerciseDetail(item)}
                                    >
                                        <Text style={[styles.exerciseItemName, alreadyAdded && { opacity: 0.5 }]}>{item.name}</Text>
                                        <Text style={styles.exerciseItemMuscle}>{item.muscle_group}</Text>
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
                                            <Check size={20} color={theme.colors.textSecondary} />
                                        ) : isPending ? (
                                            <View style={styles.checkCircle}>
                                                <Check size={14} color={theme.colors.background} />
                                            </View>
                                        ) : (
                                            <Plus size={20} color={theme.colors.textSecondary} />
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
                    <Animated.View 
                        entering={Platform.OS === 'web' ? undefined : FadeInDown} 
                        style={styles.detailModalContent}
                    >
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    label: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 12, marginTop: 24 },
    input: { backgroundColor: theme.colors.surface, height: 56, borderRadius: 15, paddingHorizontal: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center' },

    presetsRow: { flexDirection: 'row', marginBottom: 10 },
    presetChip: { backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
    presetText: { color: theme.colors.white, fontWeight: '600', fontSize: 13 },

    daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    dayChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    dayChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    dayText: { color: theme.colors.textSecondary, fontWeight: 'bold', fontSize: 12 },
    dayTextSelected: { color: theme.colors.background },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    addBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 6 },
    sortBtn: { backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center' },
    addBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 13 },
    exerciseCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    reorderHandle: { marginRight: 8, gap: 4, alignItems: 'center' },
    exerciseName: { color: theme.colors.white, fontWeight: 'bold', fontSize: 15 },
    exerciseMuscle: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    inputWrap: { alignItems: 'center' },
    inputMiniLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    miniInput: { backgroundColor: theme.colors.background, color: '#fff', width: 45, height: 40, textAlign: 'center', borderRadius: 8, fontWeight: 'bold', borderWidth: 1, borderColor: theme.colors.border },
    removeBtn: { padding: 4 },

    saveBtn: { backgroundColor: theme.colors.primary, height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 50 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: theme.colors.background, fontSize: 18, fontWeight: 'bold' },

    modal: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingTop: 60, alignItems: 'center' },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    closeModal: { padding: 4 },
    modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 20, paddingHorizontal: 16, height: 56, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border },
    modalSearch: { flex: 1, color: '#fff', marginLeft: 12, fontSize: 16 },
    exerciseListItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
    exerciseItemName: { color: '#fff', fontSize: 17, fontWeight: '600' },
    exerciseItemMuscle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
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
        width: 320, // Approximate width of modal content
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

export default CreateWorkoutScreen;
