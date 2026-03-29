import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SpotifyState {
    token: string | null;
    expiresAt: number | null;
    setAuthInfo: (token: string, expiresIn: number) => void;
    clearAuth: () => void;
    isTokenValid: () => boolean;
}

export const useSpotifyStore = create<SpotifyState>()(
    persist(
        (set, get) => ({
            token: null,
            expiresAt: null,
            setAuthInfo: (token: string, expiresIn: number) => {
                // expiresIn is usually in seconds (e.g. 3600)
                const expiresAt = Date.now() + (expiresIn * 1000);
                set({ token, expiresAt });
            },
            clearAuth: () => set({ token: null, expiresAt: null }),
            isTokenValid: () => {
                const { token, expiresAt } = get();
                if (!token || !expiresAt) return false;
                // Leave a 5-minute buffer
                return Date.now() < expiresAt - (5 * 60 * 1000);
            }
        }),
        {
            name: 'spotify-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
