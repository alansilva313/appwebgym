import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ImageBackground } from 'react-native';
import { theme } from '../theme/theme';
import Animated, {
    FadeInUp,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    Layout
} from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/api';
import { Mail, Lock, Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { useAlertStore } from '../store/useAlertStore';

const LoginScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const showAlert = useAlertStore((state) => state.showAlert);
    const setToken = useAuthStore((state) => state.setToken);
    const setUser = useAuthStore((state) => state.setUser);

    const floatAnim = useSharedValue(0);

    React.useEffect(() => {
        floatAnim.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatAnim.value }]
    }));

    const handleLogin = async () => {
        if (!email || !password) return showAlert('Erro', t('login.error_fill_fields'));
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            setToken(response.data.token);
            setUser(response.data.user);
            if (response.data.user.language) {
                await changeLanguage(response.data.user.language);
            }
        } catch (error: any) {
            showAlert(t('login.error_login_failed'), error.response?.data?.error || t('login.error_check_credentials'));
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
                <View style={styles.header}>
                    <Animated.View
                        entering={FadeInUp.delay(100).duration(1000)}
                        style={floatingStyle}
                    >
                        <View style={styles.logoContainer}>
                            <Dumbbell size={40} color={theme.colors.white} />
                        </View>
                    </Animated.View>
                    <Animated.Text entering={FadeInUp.delay(300)} style={styles.title}>{t('app_name')}</Animated.Text>
                    <Animated.Text entering={FadeInUp.delay(450)} style={styles.subtitle}>{t('app_subtitle')}</Animated.Text>
                </View>

                <Animated.View
                    entering={FadeInDown.delay(600)}
                    layout={Layout.springify()}
                    style={styles.form}
                >
                    <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                            <Mail size={20} color={theme.colors.textSecondary} />
                            <TextInput
                                placeholder={t('login.email')}
                                placeholderTextColor={theme.colors.textSecondary}
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color={theme.colors.textSecondary} />
                            <TextInput
                                placeholder={t('login.password')}
                                placeholderTextColor={theme.colors.textSecondary}
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>{t('login.login_button')}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.link}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.linkText}>
                            {t('login.no_account')} <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{t('login.sign_up')}</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
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
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    container: {
        flex: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center'
    },
    header: {
        alignItems: 'center',
        marginBottom: 50
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 2
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4
    },
    form: {
        gap: 16
    },
    inputWrapper: {
        gap: 8,
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
        marginTop: 20
    },
    linkText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15
    }
});

export default LoginScreen;
