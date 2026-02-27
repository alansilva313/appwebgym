import { create } from 'zustand';
import api from '../api/api';

interface HydrationState {
    todayAmount: number;
    monthData: { date: string, amount: number }[];
    loading: boolean;
    fetchToday: () => Promise<void>;
    fetchMonth: () => Promise<void>;
    addWater: (amount: number) => Promise<void>;
}

export const useHydrationStore = create<HydrationState>((set) => ({
    todayAmount: 0,
    monthData: [],
    loading: false,
    fetchToday: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/hydration/today');
            set({ todayAmount: response.data.amount });
        } catch (error) {
            console.error('Error fetching hydration:', error);
        } finally {
            set({ loading: false });
        }
    },
    fetchMonth: async () => {
        try {
            const response = await api.get('/hydration/month');
            set({ monthData: response.data });
        } catch (error) {
            console.error('Error fetching month hydration:', error);
        }
    },
    addWater: async (amount: number) => {
        try {
            const response = await api.post('/hydration', { amount });
            set({ todayAmount: response.data.amount });
            // re-fetch month after adding water to update chart
            useHydrationStore.getState().fetchMonth();
        } catch (error) {
            console.error('Error adding water:', error);
        }
    }
}));
