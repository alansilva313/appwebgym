import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import pt from './locales/pt.json';

const resources = {
    en: { translation: en },
    pt: { translation: pt },
};

const LANGUAGE_KEY = '@gym_app_language';

const initI18n = async () => {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (!savedLanguage) {
        const systemLocales = Localization.getLocales();
        const systemLanguage = systemLocales[0]?.languageCode || 'pt';
        savedLanguage = systemLanguage.startsWith('pt') ? 'pt' : systemLanguage.startsWith('en') ? 'en' : 'pt';
    }

    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage,
            fallbackLng: 'pt',
            interpolation: {
                escapeValue: false,
            },
        });
};

initI18n();

export const changeLanguage = async (lng: string) => {
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, lng);
        await i18n.changeLanguage(lng);
    } catch (error) {
        console.error('Error changing language:', error);
    }
};

export default i18n;
