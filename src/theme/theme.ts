import { s, vs, rf } from '../utils/responsive';

export const theme = {
    colors: {
        background: '#0F0F0F',
        surface: '#1E1E1E',
        primary: '#BBF246',
        secondary: '#D0FD3E',
        white: '#FFFFFF',
        text: '#FFFFFF',
        textSecondary: '#A0A0A0',
        border: '#333333',
        error: '#FF4D4D',
        success: '#4BB543',
        card: '#252525'
    },
    spacing: {
        xs: s(4),
        sm: s(8),
        md: s(16),
        lg: s(24),
        xl: s(32),
        xxl: s(40),
    },
    borderRadius: {
        sm: s(8),
        md: s(12),
        lg: s(20),
        xl: s(30),
    },
    fontSize: {
        xs: rf(11),
        sm: rf(13),
        md: rf(15),
        lg: rf(17),
        xl: rf(20),
        xxl: rf(24),
        xxxl: rf(30),
        display: rf(36),
    },
    inputHeight: vs(52),
    buttonHeight: vs(56),
};

