import { create } from 'zustand';
import api from '../api/api';

interface Workout {
    id: number;
    name: string;
    daysOfWeek: string;
    trainerId?: number;
    exercises?: any[];
}

interface WorkoutState {
    workouts: Workout[];
    loading: boolean;
    fetchWorkouts: () => Promise<void>;
    addWorkout: (workout: any) => Promise<void>;
    updateWorkout: (id: number, workoutData: any) => Promise<void>;
    deleteWorkout: (id: number) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
    workouts: [],
    loading: false,
    fetchWorkouts: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/workouts');
            set({ workouts: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching workouts:', error);
            set({ loading: false });
        }
    },
    addWorkout: async (workoutData: any) => {
        set({ loading: true });
        try {
            const response = await api.post('/workouts', workoutData);
            set((state) => ({
                workouts: [response.data, ...state.workouts],
                loading: false
            }));
        } catch (error) {
            console.error('Error adding workout:', error);
            set({ loading: false });
            throw error;
        }
    },
    updateWorkout: async (id: number, workoutData: any) => {
        set({ loading: true });
        try {
            const response = await api.put(`/workouts/${id}`, workoutData);
            set((state) => ({
                workouts: state.workouts.map(w => w.id === id ? response.data : w),
                loading: false
            }));
        } catch (error) {
            console.error('Error updating workout:', error);
            set({ loading: false });
            throw error;
        }
    },
    deleteWorkout: async (id: number) => {
        set({ loading: true });
        try {
            await api.delete(`/workouts/${id}`);
            set((state) => ({
                workouts: state.workouts.filter(w => w.id !== id),
                loading: false
            }));
        } catch (error) {
            console.error('Error deleting workout:', error);
            set({ loading: false });
            throw error;
        }
    }
}));
