import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StatusBar, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme/theme';
import { Target, TrendingDown, RefreshCcw, Coffee, ChevronRight, ArrowLeft } from 'lucide-react-native';
import api from '../api/api';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';

const { width, height: screenHeight } = Dimensions.get('window');

const OnboardingScreen = () => {
    const { t } = useTranslation();
    const setUser = useAuthStore((state) => state.setUser);
    const user = useAuthStore((state) => state.user);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const [birthDate, setBirthDate] = useState<string>('');
    const [weight, setWeight] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    const [selectedSex, setSelectedSex] = useState<string | null>(null);

    const insets = useSafeAreaInsets();
    const topInset = insets.top || 24;
    const bottomInset = insets.bottom || 20;

    const slides = [
        {
            id: 'welcome',
            title: t('onboarding.title'),
            subtitle: t('onboarding.subtitle'),
            image: require('../../assets/onboarding-1.png'),
            type: 'intro'
        },
        {
            id: 'tracking',
            title: t('onboarding.step1_title'),
            subtitle: t('onboarding.step1_subtitle'),
            image: require('../../assets/onboarding-2.png'),
            type: 'intro'
        },
        {
            id: 'personal_data',
            title: t('onboarding.step1', 'Seus Dados'),
            subtitle: 'Precisamos de algumas informações básicas para calcular seu IMC e personalizar seu treino.',
            type: 'form'
        },
        {
            id: 'sex',
            title: t('register.gender', 'Sexo'),
            subtitle: 'Essas informações nos ajudam a ser mais precisos nos cálculos de saúde.',
            type: 'sex'
        },
        {
            id: 'goal',
            title: t('onboarding.step2_title'),
            subtitle: t('onboarding.step2_subtitle'),
            type: 'goals'
        }
    ];

    const formatWeight = (text: string) => {
        let value = text.replace(',', '.').replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        const match = value.match(/^\d{0,3}(\.\d{0,1})?/);
        return match ? match[0] : '';
    };

    const formatHeight = (text: string) => {
        const raw = text.replace(/[^0-9]/g, '');
        if (raw.length === 0) return '';
        if (raw.length === 1) return raw;
        if (raw.length === 2) return `${raw[0]}.${raw[1]}`;
        return `${raw[0]}.${raw.slice(1, 3)}`;
    };

    const formatBirthDate = (text: string) => {
        const raw = text.replace(/[^0-9]/g, '');
        if (raw.length <= 2) return raw;
        if (raw.length <= 4) return `${raw.slice(0, 2)}/${raw.slice(2)}`;
        return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    };

    const calculateAge = (dateStr: string) => {
        if (dateStr.length !== 10) return null;
        const [day, month, year] = dateStr.split('/');
        const birth = new Date(Number(year), Number(month) - 1, Number(day));
        const today = new Date();
        let currentAge = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            currentAge--;
        }
        return currentAge;
    };

    const goals = [
        { id: 'hypertrophy', icon: Target, label: t('onboarding.hypertrophy') },
        { id: 'weight_loss', icon: TrendingDown, label: t('onboarding.weight_loss') },
        { id: 'maintain_weight', icon: RefreshCcw, label: t('onboarding.maintain_weight') },
        { id: 'slimming', icon: Coffee, label: t('onboarding.slimming') },
    ];

    const sexes = [
        { id: 'Masculino', label: t('onboarding.sex_male') },
        { id: 'Feminino', label: t('onboarding.sex_female') },
        { id: 'Outros', label: t('onboarding.sex_other') },
        { id: 'NaoInformar', label: t('onboarding.sex_none') },
    ];

    const handleNext = async () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleFinish = async () => {
        if (selectedGoal && user) {
            try {
                let calculatedAge: number | undefined;
                let isoBirthDate: string | undefined;

                if (birthDate.length === 10) {
                    calculatedAge = calculateAge(birthDate) || undefined;
                    const [d, m, y] = birthDate.split('/');
                    isoBirthDate = `${y}-${m}-${d}`;
                }

                const response = await api.put('/auth/me', {
                    goal: selectedGoal,
                    age: calculatedAge,
                    birthDate: isoBirthDate,
                    weight: weight ? parseFloat(weight) : undefined,
                    height: height ? parseFloat(height) : undefined,
                    gender: selectedSex
                });
                setUser(response.data);
            } catch (error) {
                console.error('Error saving onboarding data:', error);
            }
        }
    };

    const isButtonDisabled = () => {
        if (currentIndex === 2) return birthDate.length !== 10 || !weight || !height;
        if (currentIndex === 3) return !selectedSex;
        if (currentIndex === 4) return !selectedGoal;
        return false;
    };

    const renderSlide = ({ item }: { item: any }) => {
        if (item.type === 'intro') {
            return (
                <View style={styles.slide}>
                    <Image source={item.image} style={styles.slideImage} contentFit="cover" />
                    <View style={styles.overlay} />
                    <View style={styles.slideContent}>
                        <Animated.Text entering={FadeInDown.delay(200)} style={styles.slideTitle}>{item.title}</Animated.Text>
                        <Animated.Text entering={FadeInDown.delay(400)} style={styles.slideSubtitle}>{item.subtitle}</Animated.Text>
                    </View>
                </View>
            );
        }

        if (item.type === 'form') {
            return (
                <View style={[styles.slide, styles.formSlide]}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{item.title}</Text>
                        <Text style={styles.formSubtitle}>{item.subtitle}</Text>
                    </View>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputSection}>
                        <Animated.View entering={FadeInDown.delay(200)} style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Data de Nascimento</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    placeholder="DD/MM/AAAA"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={birthDate}
                                    onChangeText={(text) => setBirthDate(formatBirthDate(text))}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    style={styles.input}
                                />
                            </View>
                        </Animated.View>
                        <Animated.View entering={FadeInDown.delay(300)} style={styles.inputRow}>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Peso (kg)</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        placeholder="00.0"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={weight}
                                        onChangeText={(text) => setWeight(formatWeight(text))}
                                        keyboardType="numeric"
                                        style={styles.input}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Altura (m)</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        placeholder="0.00"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={height}
                                        onChangeText={(text) => setHeight(formatHeight(text))}
                                        keyboardType="numeric"
                                        style={styles.input}
                                    />
                                </View>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </View>
            );
        }

        if (item.type === 'sex') {
            return (
                <View style={[styles.slide, styles.formSlide]}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{item.title}</Text>
                        <Text style={styles.formSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.goalList}>
                        {sexes.map((sex, index) => {
                            const isSelected = selectedSex === sex.id;
                            return (
                                <Animated.View key={sex.id} entering={FadeInDown.delay(100 * index)}>
                                    <TouchableOpacity
                                        style={[styles.goalItem, isSelected && styles.selectedGoalItem]}
                                        onPress={() => setSelectedSex(sex.id)}
                                    >
                                        <Text style={[styles.goalLabel, isSelected && styles.selectedGoalLabel]}>
                                            {sex.label}
                                        </Text>
                                        {isSelected && <View style={styles.radioActive} />}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>
            );
        }

        if (item.type === 'goals') {
            return (
                <View style={[styles.slide, styles.formSlide]}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{item.title}</Text>
                        <Text style={styles.formSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.goalList}>
                        {goals.map((goal, index) => {
                            const Icon = goal.icon;
                            const isSelected = selectedGoal === goal.id;
                            return (
                                <Animated.View key={goal.id} entering={FadeInDown.delay(100 * index)}>
                                    <TouchableOpacity
                                        style={[styles.goalItem, isSelected && styles.selectedGoalItem]}
                                        onPress={() => setSelectedGoal(goal.id)}
                                    >
                                        <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                                            <Icon size={24} color={isSelected ? theme.colors.white : theme.colors.primary} />
                                        </View>
                                        <Text style={[styles.goalLabel, isSelected && styles.selectedGoalLabel]}>
                                            {goal.label}
                                        </Text>
                                        {isSelected && <View style={styles.radioActive} />}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                scrollEnabled={false} // Force navigation via buttons for control
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
            />

            <View style={[styles.footer, { paddingBottom: bottomInset + 20 }]}>
                <View style={styles.pagination}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index ? styles.activeDot : null
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.buttonContainer}>
                    {currentIndex > 0 && (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <ArrowLeft color={theme.colors.white} size={24} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            isButtonDisabled() ? styles.disabledButton : null,
                            currentIndex === 0 ? { flex: 1 } : { flex: 1, marginLeft: 16 }
                        ]}
                        onPress={handleNext}
                        disabled={isButtonDisabled()}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentIndex === slides.length - 1 ? t('onboarding.finish') : (currentIndex === 0 ? t('onboarding.get_started') : t('onboarding.next'))}
                        </Text>
                        <ChevronRight color={theme.colors.white} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    slide: {
        width: width,
        height: screenHeight,
    },
    slideImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)', // Slight darken
    },
    slideContent: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 220, // Leave space for footer
    },
    slideTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: theme.colors.white,
        lineHeight: 42,
    },
    slideSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 12,
        lineHeight: 24,
    },
    formSlide: {
        paddingTop: 80,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.background,
    },
    formHeader: {
        marginBottom: 40,
    },
    formTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    formSubtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginTop: 8,
        lineHeight: 22,
    },
    inputSection: {
        gap: 20,
    },
    inputWrapper: {
        gap: 8,
    },
    inputLabel: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
    },
    inputContainer: {
        height: 56,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        color: theme.colors.white,
        fontSize: 16,
    },
    goalList: {
        gap: 16,
    },
    goalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectedGoalItem: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    selectedIconContainer: {
        backgroundColor: theme.colors.primary,
    },
    goalLabel: {
        fontSize: 16,
        color: theme.colors.white,
        fontWeight: '600',
        flex: 1,
    },
    selectedGoalLabel: {
        color: theme.colors.white,
    },
    radioActive: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 6,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.white,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingHorizontal: 24,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    activeDot: {
        width: 24,
        backgroundColor: theme.colors.primary,
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    nextButton: {
        height: 56,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    nextButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default OnboardingScreen;
