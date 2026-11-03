import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { playMusic } from '@/game/audio/audioManager';
import { MENU_MUSIC } from '@/game/audio/music';
import { warmSfx } from '@/game/audio/audioManager';
import { TipBanner } from '@/game/menu/TipBanner';

/** Screens that own their music (world picks by region, battle by fight); every other screen plays the title theme. */
const OWN_MUSIC = ['/world', '/battle', '/inventory', '/missions', '/progress', '/status', '/ending'];

/**
 * No tab bar / theme provider chrome here on purpose: the game owns its
 * own full-screen viewport and its own art direction (gold/dark, matching
 * the existing battle UI) rather than adapting to system light/dark mode.
 */
export default function RootLayout() {
  const pathname = usePathname();
  useEffect(() => {
    if (!OWN_MUSIC.includes(pathname)) playMusic(MENU_MUSIC);
  }, [pathname]);
  useEffect(() => {
    warmSfx(['ui_confirm', 'ui_back', 'hit_flesh', 'slash', 'swing', 'block']);
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="slots" />
        <Stack.Screen name="world" />
        <Stack.Screen name="play" />
        <Stack.Screen name="versus" />
        <Stack.Screen name="battle" />
        <Stack.Screen name="options" />
        <Stack.Screen name="controls" />
        <Stack.Screen name="controls-edit" />
        <Stack.Screen name="credits" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="missions" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="status" />
        <Stack.Screen name="ending" />
        <Stack.Screen name="tower" />
        <Stack.Screen name="tutorial" />
        <Stack.Screen name="exit-confirm" />
      </Stack>
      <TipBanner />
    </SafeAreaProvider>
  );
}
