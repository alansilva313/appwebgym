import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { theme } from '../theme/theme';
import { Dumbbell, Timer, Zap, Trophy, ShieldCheck } from 'lucide-react-native';

interface WorkoutShareCardProps {
    workoutName: string;
    duration: string;
    totalSets: number;
    userName: string;
    calories?: number;
}

const WorkoutShareCard = ({ workoutName, duration, totalSets, userName, calories }: WorkoutShareCardProps) => {
    return (
        <View style={styles.captureContainer}>
            <ImageBackground
                source={require('../../assets/auth-bg.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <Dumbbell size={32} color={theme.colors.background} />
                        </View>
                        <Text style={styles.appName}>GYMBRO</Text>
                    </View>

                    <View style={styles.mainInfo}>
                        <View style={styles.trophyContainer}>
                            <Trophy size={60} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.userName}>{userName.toUpperCase()}</Text>
                        <Text style={styles.congratsText}>CONCLUIU MAIS UM TREINO!</Text>

                        <View style={styles.divider} />

                        <Text style={styles.workoutName}>{workoutName}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Timer size={24} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{duration}</Text>
                            <Text style={styles.statLabel}>DURAÇÃO</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Zap size={24} color={theme.colors.primary} />
                            <Text style={statValueStyle(totalSets)}>{totalSets}</Text>
                            <Text style={styles.statLabel}>SÉRIES</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Trophy size={24} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{calories || 0}</Text>
                            <Text style={styles.statLabel}>KCAL</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Acompanhe meu progresso no GYMBRO</Text>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const statValueStyle = (val: number) => [styles.statValue, { minWidth: 40, textAlign: 'center' as const }];

const styles = StyleSheet.create({
    captureContainer: {
        width: 1080,
        height: 1920,
        backgroundColor: theme.colors.background,
    },
    background: {
        flex: 1,
        justifyContent: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    content: {
        flex: 1,
        padding: 80,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    appName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 8,
    },
    mainInfo: {
        alignItems: 'center',
        width: '100%',
    },
    trophyContainer: {
        marginBottom: 40,
        padding: 30,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userName: {
        color: theme.colors.primary,
        fontSize: 48,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
    },
    congratsText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 2,
        opacity: 0.8,
    },
    divider: {
        width: 100,
        height: 4,
        backgroundColor: theme.colors.primary,
        marginVertical: 40,
        borderRadius: 2,
    },
    workoutName: {
        color: '#fff',
        fontSize: 56,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 60,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        alignItems: 'center',
        gap: 15,
    },
    statValue: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    footer: {
        marginBottom: 40,
    },
    footerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 20,
        fontStyle: 'italic',
    },
});

export default WorkoutShareCard;
