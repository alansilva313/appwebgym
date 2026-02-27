import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme/theme';
import { Home, Dumbbell, PlusCircle, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: theme.colors.border,
                    height: theme.spacing.xxl + theme.spacing.lg,
                    paddingBottom: theme.spacing.sm,
                    paddingTop: theme.spacing.xs,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: { fontSize: theme.fontSize.xs },
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.white,
                headerTitleStyle: { fontSize: theme.fontSize.lg },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                    title: t('dashboard.title')
                }}
            />
            <Tab.Screen
                name="Exercises"
                component={ExerciseListScreen}
                options={{
                    tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
                    title: t('exercises.title')
                }}
            />
            <Tab.Screen
                name="Workout"
                component={CreateWorkoutScreen}
                options={{
                    tabBarIcon: ({ color }) => <PlusCircle size={24} color={color} />,
                    title: t('workouts.create_title')
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
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
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!token ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
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
                                headerTintColor: theme.colors.white,
                                headerStyle: { backgroundColor: theme.colors.background },
                                title: t('exercises.title')
                            }}
                        />
                        <Stack.Screen
                            name="WorkoutDetail"
                            component={WorkoutDetailScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="EditWorkout"
                            component={EditWorkoutScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="WorkoutHistory"
                            component={WorkoutHistoryScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="Measurements"
                            component={MeasurementsScreen}
                            options={{ headerShown: false }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation;
