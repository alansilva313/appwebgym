import React from 'react';
import { Platform, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme/theme';
import { Home, Dumbbell, PlusCircle, User, History, Plus } from 'lucide-react-native';
import { s, vs, rf } from '../utils/responsive';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import EditWorkoutScreen from '../screens/EditWorkoutScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: theme.colors.border,
                    height: Platform.OS === 'web' ? 65 : 65 + insets.bottom,
                    paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom + 8,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.white,
                headerTitleStyle: { fontSize: theme.fontSize.lg },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Home size={22} color={color} />,
                    title: t('dashboard.title')
                }}
            />
            <Tab.Screen
                name="Exercises"
                component={ExerciseListScreen}
                options={{
                    tabBarIcon: ({ color }) => <Dumbbell size={22} color={color} />,
                    title: t('exercises.title')
                }}
            />
            <Tab.Screen
                name="Workout"
                component={CreateWorkoutScreen}
                options={{
                    tabBarButton: Platform.OS === 'web' ? undefined : (props: any) => {
                        const { onPress, ...rest } = props;
                        return (
                            <TouchableOpacity
                                {...rest}
                                onPress={(e) => {
                                    if (onPress) onPress(e);
                                }}
                                activeOpacity={0.8}
                                style={{
                                    top: -20,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    shadowColor: theme.colors.primary,
                                    shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3.5,
                                    elevation: 5
                                }}
                            >
                                <View style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: theme.colors.primary,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 4,
                                    borderColor: theme.colors.background
                                }}>
                                    <Plus size={32} color={theme.colors.background} strokeWidth={3} />
                                </View>
                            </TouchableOpacity>
                        );
                    },
                    tabBarIcon: Platform.OS === 'web' ? ({ color }) => (
                        <View style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            backgroundColor: theme.colors.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: -20, // Mantém o estilo flutuante no web de forma mais estável
                            borderWidth: 3,
                            borderColor: theme.colors.background,
                            shadowColor: theme.colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                        }}>
                            <Plus size={24} color={theme.colors.background} strokeWidth={3} />
                        </View>
                    ) : undefined,
                    title: t('workouts.create_title')
                }}
            />
            <Tab.Screen
                name="History"
                component={WorkoutHistoryScreen}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color }) => <History size={22} color={color} />,
                    title: t('measurements.history', 'Histórico')
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color }) => <User size={22} color={color} />,
                    title: t('profile.title')
                }}
            />
        </Tab.Navigator>
    );
};

const Navigation = () => {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'fade_from_bottom',
                    contentStyle: { backgroundColor: theme.colors.background }
                }}
            >
                {!token ? (
                    <Stack.Group screenOptions={{ animation: 'fade' }}>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </Stack.Group>
                ) : !user?.goal ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={TabNavigator} />
                        <Stack.Screen
                            name="ExerciseDetail"
                            component={ExerciseDetailScreen}
                            options={{
                                headerShown: true,
                                animation: 'slide_from_right',
                                headerTintColor: theme.colors.white,
                                headerStyle: { backgroundColor: theme.colors.background },
                                title: t('exercises.title')
                            }}
                        />
                        <Stack.Screen
                            name="WorkoutDetail"
                            component={WorkoutDetailScreen}
                            options={{ headerShown: false, animation: 'slide_from_bottom' }}
                        />
                        <Stack.Screen
                            name="EditWorkout"
                            component={EditWorkoutScreen}
                            options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="WorkoutHistory"
                            component={WorkoutHistoryScreen}
                            options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                            name="Measurements"
                            component={MeasurementsScreen}
                            options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation;
