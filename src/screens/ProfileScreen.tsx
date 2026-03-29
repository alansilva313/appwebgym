import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/api';
import {
    LogOut,
    User,
    Settings,
    Shield,
    Globe,
    Edit2,
    X,
    Save,
    Scale,
    Weight,
    Ruler,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    Bell,
    Check,
    Droplets,
    Timer,
    Copy,
    UserPlus,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { useAlertStore } from '../store/useAlertStore';
import { NotificationService } from '../services/NotificationService';
import TimePickerModal from '../components/TimePickerModal';
// import { SpotifyConnect } from '../components/SpotifyConnect';

const ProfileScreen = ({ navigation }: any) => {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const logout = useAuthStore((state) => state.logout);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editData, setEditData] = useState({
        name: user?.name || '',
        weight: user?.weight?.toString() || '',
        targetWeight: user?.targetWeight?.toString() || '',
        height: user?.height?.toString() || '',
        gender: user?.gender || 'NaoInformar',
        workoutTime: user?.workoutTime || '08:00'
    });
    const [waterInterval, setWaterInterval] = useState(user?.waterReminderInterval?.toString() || '0');
    const [workoutTime, setWorkoutTime] = useState(user?.workoutTime || '08:00');
    const [showMainTimePicker, setShowMainTimePicker] = useState(false);
    const [showModalTimePicker, setShowModalTimePicker] = useState(false);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

    React.useEffect(() => {
        fetchProfile();
    }, []);

    React.useEffect(() => {
        if (user?.waterReminderInterval !== undefined) {
            setWaterInterval(user.waterReminderInterval.toString());
        }
        if (user?.workoutTime) {
            setWorkoutTime(user.workoutTime);
        }
    }, [user?.waterReminderInterval, user?.workoutTime]);

    const showAlert = useAlertStore(s => s.showAlert);

    const handleLogout = () => {
        showAlert(t('profile.logout'), t('profile.logout_confirm'), [
            { text: t('profile.cancel'), style: 'cancel' },
            { text: t('profile.logout'), onPress: () => logout(), style: 'destructive' }
        ]);
    };

    const handleResetGoal = () => {
        if (user) {
            setUser({ ...user, goal: undefined });
        }
    };

    const toggleLanguage = async () => {
        const nextLang = i18n.language === 'pt' ? 'en' : 'pt';
        await changeLanguage(nextLang);
        try {
            const response = await api.put('/auth/me', { language: nextLang });
            setUser(response.data);
        } catch (error) {
            console.error('Error saving language preference', error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editData.name || !editData.weight || !editData.height) {
            return showAlert(t('common.error'), t('register.error_mandatory'));
        }

        setLoading(true);
        try {
            const response = await api.put('/auth/me', {
                name: editData.name,
                weight: parseFloat(editData.weight.toString().replace(',', '.')),
                targetWeight: editData.targetWeight ? parseFloat(editData.targetWeight.toString().replace(',', '.')) : undefined,
                height: parseFloat(editData.height.toString().replace(',', '.')),
                gender: editData.gender,
                workoutTime: editData.workoutTime
            });
            setUser(response.data);
            setIsEditModalOpen(false);
            showAlert(t('common.success'), t('profile.update_success'));
        } catch (error) {
            showAlert(t('common.error'), t('profile.update_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        await NotificationService.sendImmediateNotification(
            "🔔 Teste de Notificação",
            "Esta é uma notificação de teste disparada pelo GYM PRO!"
        );
    };

    const handleSaveWaterReminders = async () => {
        const interval = parseInt(waterInterval);
        if (isNaN(interval)) return;

        try {
            const response = await api.put('/auth/me', {
                waterReminderInterval: interval
            });
            setUser(response.data);
            await NotificationService.scheduleWaterReminders(interval);
            showAlert(t('common.success'), t('profile.water_reminder_success'));
        } catch {
            showAlert(t('common.error'), t('profile.update_error'));
        }
    };

    const handleSaveWorkoutReminders = async () => {
        if (workoutTime.length !== 5) return;

        try {
            const response = await api.put('/auth/me', {
                workoutTime: workoutTime
            });
            setUser(response.data);
            const workouts = await api.get('/workouts');
            await NotificationService.scheduleWorkoutReminders(workoutTime, workouts.data);
            showAlert(t('common.success'), t('profile.workout_reminder_success', 'Horário de treino atualizado!'));
        } catch {
            showAlert(t('common.error'), t('profile.update_error'));
        }
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        showAlert(t('common.success'), 'Código copiado para a área de transferência!');
    };

    const formatTime = (text: string) => {
        const raw = text.replace(/[^0-9]/g, '');
        if (raw.length <= 2) return raw;
        return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
    };

    return (
        <ScrollView style={styles.container}>
            <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
                <View style={styles.avatar}><User size={50} color="#fff" /></View>
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.email}>{user?.email}</Text>

                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                        setEditData({
                            name: user?.name || '',
                            weight: user?.weight?.toString() || '',
                            targetWeight: user?.targetWeight?.toString() || '',
                            height: user?.height?.toString() || '',
                            gender: user?.gender || 'NaoInformar',
                            workoutTime: user?.workoutTime || '08:00'
                        });
                        setIsEditModalOpen(true);
                    }}
                >
                    <Edit2 size={16} color={theme.colors.background} />
                    <Text style={styles.editBtnText}>{t('profile.edit_profile')}</Text>
                </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)} layout={Layout.springify()} style={styles.section}>
                <Text style={styles.label}>{t('profile.info')}</Text>
                <View style={styles.card}>
                    <View style={styles.item}>
                        <User size={20} color={theme.colors.primary} />
                        <Text style={styles.itemText}>{user?.name}</Text>
                    </View>
                    <View style={styles.item}>
                        <Shield size={20} color={theme.colors.primary} />
                        <Text style={styles.itemText}>
                            {user?.goal ? t(`onboarding.${user.goal.toLowerCase()}`) : t('profile.goal_not_set')}
                        </Text>
                    </View>
                    <View style={[styles.item, { borderBottomWidth: 0 }]}>
                        <Settings size={20} color={theme.colors.primary} />
                        <Text style={styles.itemText}>{user?.weight}kg / {user?.height}m</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Trainer/Pairing Section 
            <Animated.View entering={FadeInDown.delay(250)} layout={Layout.springify()} style={styles.section}>
                ... hidden ...
            </Animated.View>
            */}

            <Animated.View entering={FadeInDown.delay(300)} layout={Layout.springify()} style={styles.section}>
                <Text style={styles.label}>{t('settings.title')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.item} onPress={toggleLanguage}>
                        <Globe size={20} color={theme.colors.primary} />
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 15 }}>
                            <Text style={{ color: '#fff' }}>{t('settings.language')}</Text>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                {i18n.language === 'pt' ? 'Português (BR)' : 'English'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => navigation.navigate('Measurements')}
                    >
                        <Ruler size={20} color={theme.colors.primary} />
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 15 }}>
                            <Text style={{ color: '#fff' }}>{t('measurements.title')}</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.item, { borderBottomWidth: 0 }]} onPress={handleResetGoal}>
                        <Shield size={20} color={theme.colors.primary} />
                        <Text style={styles.itemText}>{t('profile.reset_goal')}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Spotify Section 
            <Animated.View entering={FadeInDown.delay(350)} layout={Layout.springify()} style={styles.section}>
                ... hidden ...
            </Animated.View>
            */}

            <Animated.View entering={FadeInDown.delay(400)} layout={Layout.springify()} style={styles.section}>
                <Text style={styles.label}>{t('profile.notifications')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.item} onPress={handleTestNotification}>
                        <Bell size={20} color={theme.colors.primary} />
                        <Text style={styles.itemText}>{t('profile.test_notification')}</Text>
                    </TouchableOpacity>

                    <View style={[styles.item, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Droplets size={20} color={theme.colors.primary} />
                            <Text style={[styles.itemText, { fontWeight: 'bold' }]}>{t('profile.water_reminder_title')}</Text>
                        </View>
                        <View style={styles.waterIntervalRow}>
                            <TextInput
                                style={styles.waterInput}
                                value={waterInterval}
                                onChangeText={setWaterInterval}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <Text style={styles.waterHint}>{t('profile.water_reminder_interval')}</Text>
                            <TouchableOpacity style={styles.waterSaveBtn} onPress={handleSaveWaterReminders}>
                                <Check size={20} color={theme.colors.background} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.waterSubhint}>{t('profile.water_reminder_hint')}</Text>
                    </View>

                    <View style={[styles.item, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Timer size={20} color={theme.colors.primary} />
                            <Text style={[styles.itemText, { fontWeight: 'bold' }]}>Lembrete de Treino</Text>
                        </View>
                        <View style={styles.waterIntervalRow}>
                            <TouchableOpacity
                                style={styles.waterInput}
                                onPress={() => setShowMainTimePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{workoutTime}</Text>
                            </TouchableOpacity>

                            <TimePickerModal
                                visible={showMainTimePicker}
                                onClose={() => setShowMainTimePicker(false)}
                                onSelect={(time) => setWorkoutTime(time)}
                                initialTime={workoutTime}
                            />
                            <Text style={styles.waterHint}>Horário preferencial para treinar</Text>
                            <TouchableOpacity style={styles.waterSaveBtn} onPress={handleSaveWorkoutReminders}>
                                <Check size={20} color={theme.colors.background} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.waterSubhint}>Te avisaremos nos dias de treino marcados em seus planos.</Text>
                    </View>
                </View>
            </Animated.View>

            <TouchableOpacity style={styles.logout} onPress={handleLogout}>
                <LogOut size={20} color={theme.colors.error} />
                <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </TouchableOpacity>

            <Modal
                visible={isEditModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.edit_profile')}</Text>
                            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                <X size={24} color={theme.colors.white} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.inputLabel}>{t('register.full_name')}</Text>
                            <View style={styles.inputContainer}>
                                <User size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    value={editData.name}
                                    onChangeText={(v) => setEditData({ ...editData, name: v })}
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 15 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>{t('register.weight')} (kg)</Text>
                                    <View style={styles.inputContainer}>
                                        <Weight size={20} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            value={editData.weight}
                                            onChangeText={(v) => setEditData({ ...editData, weight: v })}
                                            keyboardType="numeric"
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>{t('register.height')} (m)</Text>
                                    <View style={styles.inputContainer}>
                                        <Scale size={20} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            value={editData.height}
                                            onChangeText={(v) => setEditData({ ...editData, height: v })}
                                            keyboardType="numeric"
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>
                            </View>

                            {['weight_loss', 'hypertrophy', 'slimming'].includes(user?.goal || '') && (
                                <View>
                                    <Text style={styles.inputLabel}>Peso Objetivo (kg)</Text>
                                    <View style={styles.inputContainer}>
                                        <Target size={20} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            value={editData.targetWeight}
                                            onChangeText={(v) => setEditData({ ...editData, targetWeight: v })}
                                            keyboardType="numeric"
                                            placeholder="Ex: 75"
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>
                            )}

                            <Text style={styles.inputLabel}>{t('register.gender')}</Text>
                            <View style={styles.genderSelectGroup}>
                                {['Masculino', 'Feminino', 'Outros', 'NaoInformar'].map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genderOption,
                                            editData.gender === g && styles.selectedGenderOption
                                        ]}
                                        onPress={() => setEditData({ ...editData, gender: g })}
                                    >
                                        <Text style={[
                                            styles.genderOptionText,
                                            editData.gender === g && styles.selectedGenderOptionText
                                        ]}>
                                            {t(`onboarding.sex_${g.toLowerCase() === 'naoinformar' ? 'none' : g.toLowerCase() === 'outros' ? 'other' : g.toLowerCase() === 'masculino' ? 'male' : 'female'}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Horário de Treino</Text>
                            <TouchableOpacity
                                style={styles.inputContainer}
                                onPress={() => setShowModalTimePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Timer size={20} color={theme.colors.textSecondary} />
                                <Text style={[styles.input, { paddingVertical: 12 }]}>{editData.workoutTime}</Text>
                            </TouchableOpacity>

                            <TimePickerModal
                                visible={showModalTimePicker}
                                onClose={() => setShowModalTimePicker(false)}
                                onSelect={(time) => setEditData({ ...editData, workoutTime: time })}
                                initialTime={editData.workoutTime}
                            />

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleUpdateProfile}
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
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal >
        </ScrollView >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { alignItems: 'center', padding: theme.spacing.xxl, backgroundColor: theme.colors.surface, borderBottomLeftRadius: theme.spacing.xxl, borderBottomRightRadius: theme.spacing.xxl, marginBottom: theme.spacing.md },
    avatar: { width: theme.spacing.xxl * 2.5, height: theme.spacing.xxl * 2.5, borderRadius: theme.spacing.xxl * 1.25, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.primary, marginBottom: theme.spacing.md },
    name: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: '#fff' },
    email: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg, fontSize: theme.fontSize.sm },
    editBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.spacing.lg, gap: theme.spacing.sm },
    editBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.sm },

    section: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm },
    label: { color: theme.colors.textSecondary, fontWeight: 'bold', marginBottom: theme.spacing.sm, marginLeft: theme.spacing.sm, fontSize: theme.fontSize.xs, textTransform: 'uppercase' },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.spacing.lg, padding: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
    item: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    itemText: { color: '#fff', marginLeft: theme.spacing.md, fontSize: theme.fontSize.md },
    logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm },
    logoutText: { color: theme.colors.error, fontWeight: 'bold', fontSize: theme.fontSize.md },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.colors.background, borderTopLeftRadius: theme.spacing.lg, borderTopRightRadius: theme.spacing.lg, padding: theme.spacing.lg, height: '70%', borderWidth: 1, borderColor: theme.colors.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
    modalTitle: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.white },
    modalForm: { flex: 1 },
    inputLabel: { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginLeft: theme.spacing.xs, fontWeight: '600', fontSize: theme.fontSize.sm },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, height: theme.inputHeight, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
    input: { flex: 1, color: '#fff', marginLeft: theme.spacing.sm, fontSize: theme.fontSize.md },
    saveBtn: { backgroundColor: theme.colors.primary, height: theme.buttonHeight, borderRadius: theme.borderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    saveBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fontSize.lg },
    genderSelectGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: theme.spacing.lg },
    genderOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    selectedGenderOption: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '20' },
    genderOptionText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
    selectedGenderOptionText: { color: theme.colors.primary },

    waterIntervalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingLeft: 10 },
    waterInput: { backgroundColor: theme.colors.background, width: 80, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, color: '#fff', fontWeight: 'bold', textAlign: 'center', padding: 0 },
    waterHint: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },
    waterSaveBtn: { backgroundColor: theme.colors.primary, padding: 10, borderRadius: 10 },
    waterSubhint: { color: theme.colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 8, marginLeft: 10 },

    pairingCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40'
    },
    pairingCodeText: {
        color: theme.colors.primary,
        fontWeight: '900',
        fontSize: 18,
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    }
});

export default ProfileScreen;
