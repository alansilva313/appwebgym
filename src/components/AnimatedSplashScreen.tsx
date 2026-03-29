import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    runOnJS,
    FadeOut,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { theme } from '../theme/theme';
import { Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Props {
    onAnimationFinish: () => void;
}

const AnimatedSplashScreen: React.FC<Props> = ({ onAnimationFinish }) => {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0);
    const logoRotation = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textY = useSharedValue(20);

    useEffect(() => {
        // Logo appearing
        scale.value = withSpring(1, { damping: 12, stiffness: 90 });
        opacity.value = withTiming(1, { duration: 800 });

        // Spin the logo slightly
        logoRotation.value = withTiming(360, {
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        });

        // Text appearing with delay
        setTimeout(() => {
            textOpacity.value = withTiming(1, { duration: 800 });
            textY.value = withSpring(0);
        }, 600);

        // Sequence to finish
        setTimeout(() => {
            // Final zoom out and fade
            scale.value = withTiming(2.5, { duration: 800, easing: Easing.bezier(0.7, 0, 0.84, 0) });
            opacity.value = withTiming(0, { duration: 600 }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationFinish)();
                }
            });
        }, 2800);
    }, []);

    const logoStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { rotate: `${logoRotation.value}deg` }
            ],
            opacity: opacity.value,
        };
    });

    const textStyle = useAnimatedStyle(() => {
        return {
            opacity: textOpacity.value,
            transform: [{ translateY: textY.value }]
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <View style={styles.gradientBg}>
                    <Zap size={80} color={theme.colors.primary} fill={theme.colors.primary} />
                </View>
                <View style={styles.glow} />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textStyle]}>
                <Text style={styles.title}>BC<Text style={{ color: theme.colors.primary }}>GYM</Text></Text>
                <Text style={styles.subtitle}>EVOLUA CADA DIA</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientBg: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary + '30',
        elevation: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.colors.primary + '10',
        zIndex: -1,
    },
    textContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.white,
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        letterSpacing: 6,
        marginTop: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});

export default AnimatedSplashScreen;
