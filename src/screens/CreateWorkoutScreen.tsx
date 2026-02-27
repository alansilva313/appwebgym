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
    ActivityIndicator
} from 'react-native';
import { theme } from '../theme/theme';
import api from '../api/api';
import { useWorkoutStore } from '../store/useWorkoutStore';
import {
    Plus,
    X,
    Search,
    ChevronRight,
    Save,
    Calendar,
    Layout as LayoutIcon,
    Dumbbell
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
    const addWorkout = useWorkoutStore(s => s.addWorkout);
    const [search, setSearch] = useState('');

    const showAlert = useAlertStore(s => s.showAlert);

    useEffect(() => {
        api.get('/exercises').then((res) => setExercises(res.data));
    }, []);

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const updateExerciseStats = (id: number, field: 'sets' | 'reps', value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        setSelectedExercises(prev => prev.map(ex =>
            ex.id === id ? { ...ex, [field]: numericValue } : ex
        ));
    };

    const handleSave = async () => {
        if (!name || selectedExercises.length === 0 || selectedDays.length === 0) {
            return showAlert(t('common.error'), t('workouts.error_requirements'));
        }
        setLoading(true);
        try {
            await addWorkout({
                name,
                daysOfWeek: selectedDays.map(d => t(`days.${d}`)).join(', '),
                exercises: selectedExercises.map(ex => ({
                    exerciseId: ex.id,
                    sets: parseInt(ex.sets) || 3,
                    reps: parseInt(ex.reps) || 10
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
            setSelectedExercises(presetEx.map((ex: any) => ({ ...ex, sets: '3', reps: '10' })));
        } else if (type === 'push') {
            setName(t('presets.push_pull_legs'));
            setSelectedDays(['tue', 'fri']);
            const presetEx = exercises.filter((ex: any) =>
                ['Supino Reto', 'Bench Press', 'Desenvolvimento', 'Overhead Press'].includes(ex.name)
            );
            setSelectedExercises(presetEx.map((ex: any) => ({ ...ex, sets: '3', reps: '10' })));
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
                <TextInput
                    placeholder={t('workouts.name_placeholder')}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={theme.colors.textSecondary}
                />

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
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowExercisesModal(true)}>
                        <Plus size={18} color={theme.colors.background} />
                        <Text style={styles.addBtnText}>{t('common.add')}</Text>
                    </TouchableOpacity>
                </View>

                {selectedExercises.map((ex, index) => (
                    <Animated.View key={ex.id} entering={FadeInDown.delay(index * 100)} layout={Layout}>
                        <View style={styles.exerciseCard}>
                            <View style={{ flex: 1 }}>
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
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => setSelectedExercises(selectedExercises.filter(i => i.id !== ex.id))}
                                >
                                    <X size={20} color={theme.colors.error} />
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

            {/* Exercises Selection Modal */}
            <Modal visible={showExercisesModal} animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('workouts.add_exercise')}</Text>
                        <TouchableOpacity onPress={() => setShowExercisesModal(false)} style={styles.closeModal}>
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

                    <FlatList
                        data={exercises.filter((e: any) => e.name.toLowerCase().includes(search.toLowerCase()))}
                        keyExtractor={(item: any) => item.id.toString()}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }: { item: any }) => (
                            <TouchableOpacity
                                style={styles.exerciseListItem}
                                onPress={() => {
                                    if (!selectedExercises.find(i => i.id === item.id)) {
                                        setSelectedExercises([...selectedExercises, { ...item, sets: '3', reps: '10' }]);
                                    }
                                    setShowExercisesModal(false);
                                }}
                            >
                                <View>
                                    <Text style={styles.exerciseItemName}>{item.name}</Text>
                                    <Text style={styles.exerciseItemMuscle}>{item.muscle_group}</Text>
                                </View>
                                <ChevronRight size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    label: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 12, marginTop: 20 },
    input: { backgroundColor: theme.colors.surface, height: 56, borderRadius: 15, paddingHorizontal: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: theme.colors.border },

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
    addBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 14 },

    exerciseCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    exerciseName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
    exerciseItemMuscle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }
});

export default CreateWorkoutScreen;
