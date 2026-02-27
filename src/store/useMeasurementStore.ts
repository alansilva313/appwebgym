import { create } from 'zustand';
import api from '../api/api';

export interface MeasurementData {
    id?: number;
    date: string;
    weight: number;
    chest: number;
    waist: number;
    hips: number;
    leftArm: number;
    rightArm: number;
    leftThigh: number;
    rightThigh: number;
    leftCalf: number;
    rightCalf: number;
    shoulders: number;
}

interface MeasurementState {
    measurements: MeasurementData[];
    latest: MeasurementData | null;
    loading: boolean;
    fetchMeasurements: () => Promise<void>;
    fetchLatest: () => Promise<void>;
    saveMeasurement: (data: Omit<MeasurementData, 'id'>) => Promise<void>;
}

export const useMeasurementStore = create<MeasurementState>((set) => ({
    measurements: [],
    latest: null,
    loading: false,
    fetchMeasurements: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/measurements');
            set({ measurements: response.data });
        } catch (error) {
            console.error('Error fetching measurements:', error);
        } finally {
            set({ loading: false });
        }
    },
    fetchLatest: async () => {
        try {
            const response = await api.get('/measurements/latest');
            set({ latest: response.data });
        } catch (error) {
            console.error('Error fetching latest measurement:', error);
        }
    },
    saveMeasurement: async (data) => {
        set({ loading: true });
        try {
            await api.post('/measurements', data);
            // Refresh
            const [mRes, lRes] = await Promise.all([
                api.get('/measurements'),
                api.get('/measurements/latest')
            ]);
            set({ measurements: mRes.data, latest: lRes.data });
        } catch (error) {
            console.error('Error saving measurement:', error);
            throw error;
        } finally {
            set({ loading: false });
        }
    }
}));
