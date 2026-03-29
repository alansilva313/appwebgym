import api from '../api/api';

const SUPABASE_STORAGE_URL = 'https://sdihsjgajpserqtcfdct.supabase.co/storage/v1/object/public/gym-gifs';

export const fixUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('https://')) return url;

    // Se a URL contém localhost ou é um caminho relativo /uploads/
    // Nós redirecionamos para o Supabase Storage
    if (url.includes('/uploads/')) {
        const parts = url.split('/uploads/');
        const filename = parts[parts.length - 1];
        // Note: Seus uploads agora vão para a subpasta 'exercises/' dentro do bucket
        return `${SUPABASE_STORAGE_URL}/exercises/${filename}`;
    }

    return url;
};
