import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getSettings } from '@/game/state/settingsState';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning';

let lastAt = 0;

/** Vibrates for hits, chests and level-ups when "RESPOSTA TÁTIL" is on (options). Silent on the web. */
export function haptic(kind: HapticKind = 'light') {
  if (Platform.OS === 'web' || !getSettings().haptics) return;
  const now = Date.now();
  if (now - lastAt < 35) return;
  lastAt = now;
  try {
    switch (kind) {
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'select':
        void Haptics.selectionAsync();
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // unsupported device
  }
}
