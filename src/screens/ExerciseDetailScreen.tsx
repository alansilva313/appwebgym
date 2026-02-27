import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import api from '../api/api';
import { Dumbbell, Target, Info, Timer } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fixUrl } from '../utils/url';

const ExerciseDetailScreen = ({ route }: any) => {
    const { t } = useTranslation();
    const { exerciseId } = route.params;
    const [exercise, setExercise] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/exercises/${exerciseId}`).then((res) => setExercise(res.data)).finally(() => setLoading(false));
    }, [exerciseId]);

    if (loading) return <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
    if (!exercise) return <Text style={{ color: '#fff' }}>{t('exercises.not_found', 'Exercício não encontrado')}</Text>;

    return (
        <ScrollView style={styles.container}>
            <Animated.View entering={FadeInUp}>
                <Image source={{ uri: fixUrl(exercise.gif_url) }} style={styles.gif} resizeMode="contain" />
                <View style={styles.content}>
                    <Text style={styles.title}>{exercise.name}</Text>

                    <View style={styles.row}>
                        <View style={styles.badge}>
                            <Target size={14} color={theme.colors.primary} />
                            <Text style={styles.badgeText}>{exercise.muscle_group}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Dumbbell size={14} color={theme.colors.primary} />
                            <Text style={styles.badgeText}>{exercise.equipment}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Info size={14} color={theme.colors.primary} />
                            <Text style={styles.badgeText}>{exercise.level}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('exercises.details.execution', 'Execução')}</Text>
                        <View style={styles.msg}>
                            <Text style={styles.msgText}>{exercise.description || t('exercises.details.no_description', "Instruções em breve.")}</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <View style={styles.box}>
                            <Target size={24} color={theme.colors.primary} />
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{exercise.muscle_group}</Text>
                        </View>
                        <View style={styles.box}>
                            <Timer size={24} color={theme.colors.primary} />
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{exercise.type?.replace('_', ' ') || '-'}</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    gif: { width: '100%', height: 350, backgroundColor: '#fff' },
    content: { padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
    row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 5 },
    badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    msg: { backgroundColor: theme.colors.surface, padding: 15, borderRadius: 10 },
    msgText: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22 },
    box: { flex: 1, backgroundColor: theme.colors.surface, padding: 20, borderRadius: 15, alignItems: 'center', gap: 8 }
});

export default ExerciseDetailScreen;
