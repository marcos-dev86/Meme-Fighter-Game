import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DirectionKey } from './useDirectionalInput';
import { useButtonRects, withAlpha } from './controlsLayout';

interface Props {
  onPress: (key: DirectionKey, pressed: boolean) => void;
}

const ARROWS: Record<DirectionKey, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

/** Bigger than the old fixed 72: this is the "make the controls bigger"
 * pass (story mode + vs-cpu), see docs/AUDIT.md. */
export const DEFAULT_MOVE_SIZE = 84;
/** Battle's 1v1 mode wants "more dynamic" (its own words) controls: two
 * full control sets share one screen, so each stays more compact. */
export const DYNAMIC_MOVE_SIZE = 60;
/** World/story mode's own size, smaller than DEFAULT_MOVE_SIZE - the
 * D-pad at 84/button (252 total) was taking up close to a third of the
 * screen width on a real phone and crowding the quest HUD above it (see
 * docs/AUDIT.md, real-device screenshots). Round buttons pack more
 * tightly than the old square ones did, so this reads as a proper
 * compact D-pad rather than 4 separate floating tiles. */
export const WORLD_MOVE_SIZE = 58;

/**
 * One movement-control button: the single shared visual (bevel colour,
 * border, press feedback) used for every direction/lateral-move button in
 * the game, in every mode. Exported so BattleScreen's lateral ◀/▶/▲
 * controls can render literally this component instead of a visually-
 * similar copy - "the movement joystick must be exactly the same in every
 * mode" only actually holds if it's the same component.
 */
export function MoveButton({
  label,
  onPressIn,
  onPressOut,
  onPress,
  size = DEFAULT_MOVE_SIZE,
  fontSize,
  style,
  disabled,
  textColor,
}: {
  label: string;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onPress?: () => void;
  size?: number;
  /** Defaults to a fraction of size - override for multi-letter labels
   * (e.g. "FLASH") so they don't crowd a wider-but-not-taller button. */
  fontSize?: number;
  style?: object;
  disabled?: boolean;
  /** Custom label colour (set when the player recoloured the button). */
  textColor?: string;
}) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      hitSlop={10}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        style,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.arrow, { fontSize: fontSize ?? size * 0.36 }, textColor ? { color: textColor } : null]}>{label}</Text>
    </Pressable>
  );
}

function DPadButton({ dKey, onPress }: { dKey: DirectionKey; onPress: Props['onPress'] }) {
  const rect = useButtonRects()[dKey];
  if (rect.layout.hidden) return null;
  const color = rect.layout.color;
  return (
    <MoveButton
      label={ARROWS[dKey]}
      size={rect.size}
      style={[{ left: rect.cx - rect.size / 2, top: rect.cy - rect.size / 2 }, color ? { backgroundColor: withAlpha(color, 0.35), borderColor: color } : null]}
      textColor={color ?? undefined}
      onPressIn={() => onPress(dKey, true)}
      onPressOut={() => onPress(dKey, false)}
    />
  );
}

/** The four direction buttons. Each one is placed/sized/coloured on its
 * own by the player (see controlsLayout.ts / "EDITAR CONTROLES"). */
export function DPad({ onPress }: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <DPadButton dKey="up" onPress={onPress} />
      <DPadButton dKey="left" onPress={onPress} />
      <DPadButton dKey="right" onPress={onPress} />
      <DPadButton dKey="down" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
  },
  button: {
    position: 'absolute',
    backgroundColor: 'rgba(10,10,18,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,215,0,0.35)',
    borderColor: '#FFD700',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  arrow: {
    color: '#FFD700',
    fontWeight: '700',
  },
});
