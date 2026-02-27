import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import api from '../api/api';
import { Search, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fixUrl } from '../utils/url';

const ExerciseListScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('All');

    const muscles = [
        { id: 'All', label: t('exercises.all') },
        { id: 'Peito', label: t('exercises.muscles.chest') },
        { id: 'Costas', label: t('exercises.muscles.back') },
        { id: 'Pernas', label: t('exercises.muscles.legs') },
        { id: 'Ombros', label: t('exercises.muscles.shoulders') },
        { id: 'Braços', label: t('exercises.muscles.arms') },
        { id: 'Abdominais', label: t('exercises.muscles.abs') },
        { id: 'Cardio', label: t('exercises.muscles.cardio') },
    ];

    useEffect(() => {
        api.get('/exercises').then((res) => setExercises(res.data)).finally(() => setLoading(false));
    }, []);

    const filtered = exercises.filter((ex: any) =>
        ex.name.toLowerCase().includes(search.toLowerCase()) &&
        (muscleFilter === 'All' || ex.muscle_group === muscleFilter)
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Search color={theme.colors.textSecondary} size={20} />
                    <TextInput
                        placeholder={t('exercises.search_placeholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>
            <View style={{ height: 50 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                    {muscles.map(m => (
                        <TouchableOpacity
                            key={m.id}
                            onPress={() => setMuscleFilter(m.id)}
                            style={[styles.filter, muscleFilter === m.id && { backgroundColor: theme.colors.primary }]}
                        >
                            <Text style={{ color: muscleFilter === m.id ? theme.colors.background : theme.colors.textSecondary, fontWeight: 'bold' }}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInLeft.delay(index * 50)}>
                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}>
                                <Image source={{ uri: fixUrl(item.gif_url) }} style={styles.cardImage} />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName}>{item.name}</Text>
                                    <Text style={styles.cardSub}>{item.muscle_group} • {item.level}</Text>
                                </View>
                                <ChevronRight color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    contentContainerStyle={{ padding: 20 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 15, height: 50 },
    searchInput: { flex: 1, color: '#fff', marginLeft: 10 },
    filter: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, height: 40, justifyContent: 'center' },
    card: { backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 15, marginBottom: 15 },
    cardImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#fff' },
    cardInfo: { flex: 1, marginLeft: 15 },
    cardName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cardSub: { color: theme.colors.textSecondary, fontSize: 12 }
});

export default ExerciseListScreen;
