import { create } from 'zustand';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
    hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    showAlert: (title, message, buttons = [{ text: 'OK' }]) => {
        let safeTitle = String(title || 'Aviso');
        let safeMessage = message;

        if (typeof message === 'object' && message !== null) {
            safeMessage = (message as any).message || JSON.stringify(message);
        }

        set({
            visible: true,
            title: safeTitle,
            message: String(safeMessage),
            buttons
        });
    },
    hideAlert: () => set({ visible: false, title: '', message: '', buttons: [] }),
}));
