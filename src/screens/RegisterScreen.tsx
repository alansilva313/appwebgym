import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/api';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useAlertStore } from '../store/useAlertStore';

const RegisterScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const showAlert = useAlertStore((state) => state.showAlert);
    const setToken = useAuthStore((state) => state.setToken);
    const setUser = useAuthStore((state) => state.setUser);

    const handleRegister = async () => {
        const { name, email, password } = formData;
        if (!name || !email || !password) return showAlert(t('common.error', 'Erro'), t('register.error_mandatory'));
        setLoading(true);
        try {
            const response = await api.post('/auth/register', { name, email, password });
            setToken(response.data.token);
            setUser(response.data.user);
        } catch (error: any) {
            showAlert(t('register.error_failed'), error.response?.data?.error || t('register.error_create_account'));
        } finally { setLoading(false); }
    };

    return (
        <ImageBackground
            source={require('../../assets/auth-bg.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft color={theme.colors.white} size={24} />
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
                        <Text style={styles.title}>{t('register.title')}</Text>
                        <Text style={styles.subtitle}>Crie sua conta e comece a treinar hoje mesmo.</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>{t('register.full_name')}</Text>
                            <View style={styles.inputContainer}>
                                <User size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    placeholder="Ex: João Silva"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={v => setFormData({ ...formData, name: v })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>{t('register.email')}</Text>
                            <View style={styles.inputContainer}>
                                <Mail size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    placeholder="email@exemplo.com"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    style={styles.input}
                                    value={formData.email}
                                    onChangeText={v => setFormData({ ...formData, email: v })}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>{t('register.password')}</Text>
                            <View style={styles.inputContainer}>
                                <Lock size={20} color={theme.colors.textSecondary} />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    style={styles.input}
                                    value={formData.password}
                                    onChangeText={v => setFormData({ ...formData, password: v })}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                            {loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>{t('register.submit')}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>
                                Já tem uma conta? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Faça login</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 120,
        paddingBottom: 40
    },
    header: {
        marginBottom: 40
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff'
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 8
    },
    form: {
        gap: 20
    },
    inputWrapper: {
        gap: 8,
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        paddingHorizontal: theme.spacing.md,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    input: {
        flex: 1,
        color: '#fff',
        marginLeft: theme.spacing.sm,
        fontSize: 16
    },
    button: {
        backgroundColor: theme.colors.primary,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: theme.colors.white,
        fontSize: 18,
        fontWeight: 'bold'
    },
    link: {
        alignItems: 'center',
        marginTop: 10
    },
    linkText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15
    }
});

export default RegisterScreen;
