import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = 'https://bcgym-9ipt.vercel.app/api';

const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
