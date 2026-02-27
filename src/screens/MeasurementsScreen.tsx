import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Modal,
    ActivityIndicator,
    Platform,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useMeasurementStore, MeasurementData } from '../store/useMeasurementStore';
import {
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Plus,
    Calendar as CalendarIcon,
    History,
    Save,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAlertStore } from '../store/useAlertStore';

const FIELDS = [
    { key: 'weight', label: 'weight', unit: 'kg' },
    { key: 'shoulders', label: 'shoulders', unit: 'cm' },
    { key: 'chest', label: 'chest', unit: 'cm' },
    { key: 'waist', label: 'waist', unit: 'cm' },
    { key: 'hips', label: 'hips', unit: 'cm' },
    { key: 'leftArm', label: 'left_arm', unit: 'cm' },
    { key: 'rightArm', label: 'right_arm', unit: 'cm' },
    { key: 'leftThigh', label: 'left_thigh', unit: 'cm' },
    { key: 'rightThigh', label: 'right_thigh', unit: 'cm' },
    { key: 'leftCalf', label: 'left_calf', unit: 'cm' },
    { key: 'rightCalf', label: 'right_calf', unit: 'cm' },
];

const BODY_POINTS = [
    { key: 'shoulders', top: '20%', left: '48%' },
    { key: 'chest', top: '28%', left: '48%' },
    { key: 'waist', top: '38%', left: '48%' },
    { key: 'hips', top: '48%', left: '48%' },
    { key: 'leftArm', top: '32%', left: '35%' },
    { key: 'rightArm', top: '32%', left: '61%' },
    { key: 'leftThigh', top: '65%', left: '42%' },
    { key: 'rightThigh', top: '65%', left: '54%' },
    { key: 'leftCalf', top: '82%', left: '42%' },
    { key: 'rightCalf', top: '82%', left: '54%' },
];

const MeasurementsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const showAlert = useAlertStore(s => s.showAlert);
    const user = useAuthStore(state => state.user);
    const {
        measurements,
        latest,
        loading,
        fetchMeasurements,
        saveMeasurement
    } = useMeasurementStore();

    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedField, setSelectedField] = useState<any>(null);
    const [quickAddValue, setQuickAddValue] = useState('');

    useEffect(() => {
        fetchMeasurements();
    }, []);

    const handleQuickSave = async () => {
        if (!selectedField || !quickAddValue) return;
        try {
            const dataToSave: any = {
                date: new Date().toISOString().split('T')[0],
                [selectedField.key]: parseFloat(quickAddValue.replace(',', '.'))
            };
            await saveMeasurement(dataToSave);
            showAlert(t('common.success'), t('measurements.save_success'));
            setSelectedField(null);
            setQuickAddValue('');
        } catch (error) {
            showAlert(t('common.error'), t('measurements.save_error'));
        }
    };

    const handleSave = async () => {
        try {
            const dataToSave: any = {
                date: new Date().toISOString().split('T')[0],
            };

            FIELDS.forEach(f => {
                if (formData[f.key]) {
                    dataToSave[f.key] = parseFloat(formData[f.key].replace(',', '.'));
                }
            });

            await saveMeasurement(dataToSave);
            showAlert(t('common.success'), t('measurements.save_success'));
            setIsAdding(false);
            setFormData({});
        } catch (error) {
            showAlert(t('common.error'), t('measurements.save_error'));
        }
    };

    const getComparison = (key: string) => {
        if (measurements.length < 2) return null;
        const current = measurements[0][key as keyof MeasurementData] as number;
        const prev = measurements[1][key as keyof MeasurementData] as number;

        if (!current || !prev) return null;

        const diff = current - prev;
        if (diff === 0) return null;

        return {
            val: Math.abs(diff).toFixed(1),
            isUp: diff > 0,
            color: diff > 0 ? theme.colors.primary : theme.colors.error
        };
    };

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 10 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft size={28} color={theme.colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('measurements.title')}</Text>
            <TouchableOpacity onPress={() => setIsAdding(true)} style={styles.addBtn}>
                <Plus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderLatest = () => {
        if (!latest) return (
            <View style={styles.emptyContainer}>
                <History size={48} color={theme.colors.border} />
                <Text style={styles.emptyText}>{t('measurements.no_data')}</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setIsAdding(true)}>
                    <Text style={styles.emptyBtnText}>{t('measurements.add_new')}</Text>
                </TouchableOpacity>
            </View>
        );

        const anatomyImage = user?.gender === 'Feminino'
            ? require('../../assets/body-anatomy-female.png')
            : require('../../assets/body-anatomy-male.png');

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <View style={styles.anatomyContainer}>
                        <Image
                            source={anatomyImage}
                            style={styles.anatomyImg}
                            resizeMode="contain"
                        />
                        {BODY_POINTS.map((point) => (
                            <TouchableOpacity
                                key={point.key}
                                style={[styles.dot, { top: point.top as any, left: point.left as any }]}
                                onPress={() => {
                                    const field = FIELDS.find(f => f.key === point.key);
                                    setSelectedField(field);
                                    setQuickAddValue(latest ? latest[field!.key as keyof MeasurementData]?.toString() || '' : '');
                                }}
                            >
                                <View style={styles.dotTouch} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.latestMeta}>
                        <Text style={styles.updateDate}>
                            {t('measurements.latest_update', { date: new Date(latest.date).toLocaleDateString() })}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    {FIELDS.map((field, idx) => {
                        const val = latest[field.key as keyof MeasurementData];
                        const comp = getComparison(field.key);
                        if (!val) return null;

                        return (
                            <Animated.View
                                key={field.key}
                                entering={FadeInDown.delay(idx * 50)}
                                style={styles.statCard}
                            >
                                <Text style={styles.statLabel}>{t(`measurements.${field.label}`)}</Text>
                                <View style={styles.statMain}>
                                    <Text style={styles.statValue}>{val}</Text>
                                    <Text style={styles.statUnit}>{field.unit}</Text>
                                </View>
                                {comp && (
                                    <View style={styles.compRow}>
                                        {comp.isUp ? <TrendingUp size={12} color={comp.color} /> : <TrendingDown size={12} color={comp.color} />}
                                        <Text style={[styles.compText, { color: comp.color }]}>
                                            {comp.isUp ? t('measurements.diff_plus', { val: comp.val }) : t('measurements.diff_minus', { val: comp.val })}
                                        </Text>
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })}
                </View>

                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <History size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.sectionTitle}>{t('measurements.history')}</Text>
                    </View>
                    {measurements.slice(1, 5).map((m, idx) => (
                        <View key={m.id} style={styles.historyItem}>
                            <Text style={styles.historyDate}>{new Date(m.date).toLocaleDateString()}</Text>
                            <Text style={styles.historyWeight}>{m.weight}kg</Text>
                            <ChevronRight size={16} color={theme.colors.border} />
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}

            {loading && !isAdding ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : renderLatest()}


            <Modal visible={isAdding} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: (insets.bottom || 0) + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('measurements.add_new')}</Text>
                            <TouchableOpacity onPress={() => setIsAdding(false)}>
                                <Plus size={24} color={theme.colors.white} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGrid}>
                                {FIELDS.map((f) => (
                                    <View key={f.key} style={styles.inputWrap}>
                                        <Text style={styles.inputLabel}>{t(`measurements.${f.label}`)} ({f.unit})</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0.0"
                                            placeholderTextColor={theme.colors.border}
                                            keyboardType="numeric"
                                            value={formData[f.key]}
                                            onChangeText={(v) => setFormData({ ...formData, [f.key]: v })}
                                        />
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.background} />
                            ) : (
                                <>
                                    <Save size={20} color={theme.colors.background} />
                                    <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Quick Add Modal */}
            <Modal visible={!!selectedField} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { borderRadius: 24, height: 'auto' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedField && t(`measurements.${selectedField.label}`)}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedField(null)}>
                                <Plus size={24} color={theme.colors.white} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.quickInputContainer}>
                            <TextInput
                                style={styles.quickInput}
                                placeholder="0.0"
                                placeholderTextColor={theme.colors.border}
                                keyboardType="numeric"
                                value={quickAddValue}
                                onChangeText={setQuickAddValue}
                                autoFocus
                            />
                            <Text style={styles.quickUnit}>{selectedField?.unit}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                            onPress={handleQuickSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.background} />
                            ) : (
                                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    addBtn: { padding: 4 },

    scrollContent: { padding: 20 },
    heroSection: { alignItems: 'center', marginBottom: 30 },
    anatomyContainer: {
        width: '100%',
        height: 250,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: 'relative',
        overflow: 'hidden',
    },
    anatomyImg: { width: '100%', height: '95%', opacity: 0.9 },
    dot: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotTouch: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    latestMeta: { marginTop: 15 },
    updateDate: { color: theme.colors.textSecondary, fontSize: 13 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
    statMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    statValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.white },
    statUnit: { fontSize: 12, color: theme.colors.textSecondary },
    compRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    compText: { fontSize: 11, fontWeight: 'bold' },

    historySection: { marginTop: 40, marginBottom: 50 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    historyDate: { flex: 1, color: theme.colors.white, fontWeight: '500' },
    historyWeight: { color: theme.colors.textSecondary, marginRight: 15 },

    emptyContainer: { flex: 1, paddingVertical: 100, alignItems: 'center', gap: 20 },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
    emptyBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
    emptyBtnText: { color: theme.colors.background, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    modalForm: { marginBottom: 20 },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    inputWrap: { width: '47%' },
    inputLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 },
    input: {
        backgroundColor: theme.colors.background,
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 15,
        color: '#fff',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    saveBtnText: { color: theme.colors.background, fontSize: 18, fontWeight: 'bold' },
    quickInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginVertical: 30,
    },
    quickInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: theme.colors.white,
        textAlign: 'center',
        minWidth: 100,
    },
    quickUnit: {
        fontSize: 24,
        color: theme.colors.textSecondary,
        marginTop: 15,
    },
});

export default MeasurementsScreen;
