import 'react-native-gesture-handler';
import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';
import Navigation from './src/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from './src/theme/theme';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomAlert from './src/components/CustomAlert';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';

// Keep the splash screen visible while we fetch resources (native only)
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function App() {
  // On web, skip splash entirely and render immediately
  const [appIsReady, setAppIsReady] = useState(Platform.OS === 'web');
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip on web

    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && Platform.OS !== 'web') {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <View style={styles.container}>
          <StatusBar style="light" />
          {showAnimatedSplash ? (
            <AnimatedSplashScreen onAnimationFinish={() => setShowAnimatedSplash(false)} />
          ) : (
            <>
              <Navigation />
              <CustomAlert />
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

