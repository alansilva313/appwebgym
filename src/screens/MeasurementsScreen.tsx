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
    RefreshControl,
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
    Info,
    CheckCircle2,
    X,
    Trash2,
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
        saveMeasurement,
        deleteMeasurement
    } = useMeasurementStore();

    const [refreshing, setRefreshing] = useState(false);
    const [draftData, setDraftData] = useState<any>({});
    const [selectedField, setSelectedField] = useState<any>(null);
    const [quickAddValue, setQuickAddValue] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchMeasurements();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMeasurements();
        setRefreshing(false);
    };

    const handleDraftUpdate = () => {
        if (!selectedField || !quickAddValue) return;
        const newVal = parseFloat(quickAddValue.replace(',', '.'));
        setDraftData({ ...draftData, [selectedField.key]: newVal });
        setHasChanges(true);
        setSelectedField(null);
        setQuickAddValue('');
    };

    const handleFinalSave = async () => {
        try {
            const dataToSave: any = {
                date: new Date().toISOString().split('T')[0],
            };

            // Garantir que estamos pegando todos os campos necessários
            FIELDS.forEach(f => {
                const val = draftData[f.key] !== undefined
                    ? draftData[f.key]
                    : (latest ? latest[f.key as keyof MeasurementData] : null);

                if (val !== null && val !== undefined) {
                    dataToSave[f.key] = val;
                }
            });

            if (Object.keys(dataToSave).length <= 1) { // Só tem a data
                showAlert(t('common.error'), t('measurements.no_data_to_save', 'Preencha ao menos uma medida para salvar.'));
                return;
            }

            await saveMeasurement(dataToSave);
            showAlert(t('common.success'), t('measurements.save_success'));
            setDraftData({});
            setHasChanges(false);
        } catch (error) {
            showAlert(t('common.error'), t('measurements.save_error'));
        }
    };

    const handleOpenDeleteConfirm = (id: number) => {
        if (id) {
            setIdToDelete(id);
        }
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        try {
            await deleteMeasurement(idToDelete);
            showAlert(t('common.success'), t('measurements.delete_success', 'Avaliação excluída.'));
        } catch (error) {
            showAlert(t('common.error'), t('measurements.delete_error', 'Erro ao excluir.'));
        } finally {
            setIdToDelete(null);
        }
    };

    const getComparison = (key: string) => {
        if (!measurements || measurements.length < 2) return null;
        const currentField = measurements[0][key as keyof MeasurementData];
        const prevField = measurements[1][key as keyof MeasurementData];

        if (typeof currentField !== 'number' || typeof prevField !== 'number') return null;

        const diff = (currentField as number) - (prevField as number);
        if (Math.abs(diff) < 0.01) return null;

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
            <View style={{ width: 28 }} />
        </View>
    );

    const renderLatest = () => {
        const anatomyImage = user?.gender === 'Feminino'
            ? require('../../assets/body-anatomy-female.png')
            : require('../../assets/body-anatomy-male.png');

        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                <View style={styles.heroSection}>
                    <View style={styles.anatomyContainer}>
                        <Image
                            source={anatomyImage}
                            style={styles.anatomyImg}
                            resizeMode="contain"
                        />
                        {BODY_POINTS.map((point) => {
                            const isDrafted = draftData[point.key] !== undefined;
                            return (
                                <TouchableOpacity
                                    key={point.key}
                                    style={[
                                        styles.dot,
                                        { top: point.top as any, left: point.left as any },
                                        isDrafted && { backgroundColor: theme.colors.white, borderWidth: 2, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => {
                                        const field = FIELDS.find(f => f.key === point.key);
                                        setSelectedField(field);
                                        // Mostra o valor do draft se houver, senão o valor atual (latest)
                                        const valToShow = draftData[point.key] !== undefined
                                            ? draftData[point.key]
                                            : (latest ? latest[field!.key as keyof MeasurementData] : '');
                                        setQuickAddValue(valToShow?.toString() || '');
                                    }}
                                >
                                    <View style={styles.dotTouch} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {latest ? (
                        <View style={styles.latestMeta}>
                            <Text style={styles.updateDate}>
                                {t('measurements.latest_update', { date: new Date(latest.date).toLocaleDateString() })}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.latestMeta}>
                            <Text style={[styles.updateDate, { color: theme.colors.primary }]}>
                                {t('measurements.start_filling', 'Toque nos pontos para iniciar a avaliação')}
                            </Text>
                        </View>
                    )}
                </View>

                {hasChanges && (
                    <Animated.View entering={FadeInDown} style={styles.floatingAction}>
                        <TouchableOpacity style={styles.saveAllBtn} onPress={handleFinalSave}>
                            <CheckCircle2 size={20} color={theme.colors.background} />
                            <Text style={styles.saveBtnText}>{t('measurements.finish_assessment', 'Concluir Avaliação')}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <View style={styles.noticeBox}>
                    <Info size={16} color={theme.colors.primary} />
                    <Text style={styles.noticeText}>
                        {t('measurements.experience_notice', 'Para maior precisão, recomendamos que as medidas corporais sejam tiradas por alguém com experiência.')}
                    </Text>
                </View>

                {latest ? (
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
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('measurements.no_data')}</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setSelectedField(FIELDS[0])}>
                            <Text style={styles.emptyBtnText}>{t('measurements.add_new')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {measurements.length > 0 && (
                    <View style={styles.historySection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <History size={20} color={theme.colors.primary} />
                                <Text style={styles.sectionTitle}>{t('measurements.history')}</Text>
                            </View>
                        </View>
                        {measurements.map((m: any, idx) => (
                            <Animated.View
                                key={m.id}
                                entering={FadeInRight.delay(idx * 100)}
                                style={styles.historyCard}
                            >
                                <View style={styles.historyInfo}>
                                    <View style={styles.historyHeader}>
                                        <CalendarIcon size={14} color={theme.colors.primary} />
                                        <Text style={styles.historyDate}>
                                            {new Date(m.date).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View style={styles.historyStats}>
                                        <View style={styles.historyStatItem}>
                                            <Text style={styles.historyStatLabel}>{t('measurements.weight')}</Text>
                                            <Text style={styles.historyStatValue}>{m.weight || '--'}kg</Text>
                                        </View>
                                        <View style={styles.historyDivider} />
                                        <View style={styles.historyStatItem}>
                                            <Text style={styles.historyStatLabel}>{t('measurements.waist')}</Text>
                                            <Text style={styles.historyStatValue}>{m.waist || '--'}cm</Text>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => m.id && handleOpenDeleteConfirm(m.id)}
                                    style={styles.deleteAction}
                                    activeOpacity={0.7}
                                >
                                    <Trash2 size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}

            {loading && !hasChanges ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : renderLatest()}

            {/* Modal de confirmação removido, substituído por salvar direto no ponto */}

            {/* Quick Add Modal */}
            <Modal visible={!!selectedField} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { borderRadius: 24, height: 'auto' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedField && t(`measurements.${selectedField.label}`)}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedField(null)}>
                                <X size={24} color={theme.colors.white} />
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
                            style={styles.saveBtn}
                            onPress={handleDraftUpdate}
                        >
                            <Text style={styles.saveBtnText}>{t('common.confirm', 'Confirmar')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de confirmação personalizado */}
            <Modal visible={idToDelete !== null} animationType="fade" transparent>
                <View style={styles.confirmOverlay}>
                    <Animated.View entering={FadeInDown} style={styles.confirmContent}>
                        <View style={styles.confirmIconBg}>
                            <Trash2 size={32} color={theme.colors.error} />
                        </View>
                        <Text style={styles.confirmTitle}>{t('common.confirm_delete', 'Confirmar Exclusão')}</Text>
                        <Text style={styles.confirmDesc}>
                            {t('measurements.delete_confirm_msg', 'Deseja realmente excluir esta avaliação? Esta ação não pode ser desfeita.')}
                        </Text>

                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIdToDelete(null)}
                            >
                                <Text style={styles.confirmCancelText}>{t('common.cancel', 'Cancelar')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDelete}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.colors.white} />
                                ) : (
                                    <Text style={styles.confirmDeleteText}>{t('common.delete', 'Excluir')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
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

    noticeBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
        gap: 10,
    },
    noticeText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },

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
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    draftBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
    statValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.white },
    statUnit: { fontSize: 12, color: theme.colors.textSecondary },
    compRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    compText: { fontSize: 11, fontWeight: 'bold' },

    floatingAction: {
        marginBottom: 20,
    },
    saveAllBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },

    historySection: { marginTop: 40, marginBottom: 100 },
    sectionHeader: { marginBottom: 20 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    historyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    historyInfo: { flex: 1 },
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    historyDate: { color: theme.colors.textSecondary, fontSize: 13, textTransform: 'capitalize' },
    historyStats: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    historyStatItem: { gap: 2 },
    historyStatLabel: { color: theme.colors.textSecondary, fontSize: 11 },
    historyStatValue: { color: theme.colors.white, fontSize: 16, fontWeight: 'bold' },
    historyDivider: { width: 1, height: 25, backgroundColor: theme.colors.border },
    deleteAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },

    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    confirmContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    confirmIconBg: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmDesc: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    confirmCancelText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.error,
    },
    confirmDeleteText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },

    emptyContainer: { paddingVertical: 40, alignItems: 'center', gap: 20 },
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
