import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  /** Shrinks to its label (no 260px minimum) - for buttons inside cards/rows. */
  compact?: boolean;
  /** Stretches to fill its parent's width instead of using the fixed minimum. */
  fit?: boolean;
}

const PALETTE = {
  primary: { face: '#FFCD3C', shade: '#B9820A', text: '#4A2E00' },
  ghost: { face: '#FFE9A8', shade: '#C79A3C', text: '#5A3E10' },
  danger: { face: '#FF8A65', shade: '#C1421B', text: '#4A1200' },
};

/**
 * Chunky pixel-UI button (see docs/AUDIT.md changelog: reference style
 * requested was a flat yellow pixel-art kit). Built with two stacked
 * layers instead of a drop shadow: a darker "shade" base and a brighter
 * "face" on top offset upward, so pressing it can shift the face down
 * into the shade for a real 3D-press feel, entirely in plain RN styles.
 */
export function MenuButton({ label, onPress, variant = 'primary', disabled, compact, fit }: Props) {
  const colors = PALETTE[variant];
  return (
    <View style={[styles.shade, { backgroundColor: colors.shade }, compact && styles.shadeCompact, fit && styles.shadeFit, disabled && styles.disabled]}>
      <Pressable
        onPress={disabled ? undefined : () => {
          playSfx(variant === 'danger' ? 'ui_back' : 'ui_confirm');
          onPress();
        }}
        style={({ pressed }) => [
          styles.face,
          { backgroundColor: colors.face },
          compact && styles.faceCompact,
          pressed && !disabled && styles.facePressed,
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

export function ButtonColumn({ children }: { children: React.ReactNode }) {
  return <View style={styles.column}>{children}</View>;
}

const BEZEL = 5;

const styles = StyleSheet.create({
  column: { gap: 16 },
  shade: {
    minWidth: 260,
    borderRadius: 10,
    padding: 0,
  },
  face: {
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 14,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: BEZEL,
  },
  facePressed: {
    marginBottom: 0,
    marginTop: BEZEL,
  },
  shadeCompact: { minWidth: 0 },
  shadeFit: { minWidth: 0, alignSelf: 'stretch' },
  faceCompact: { paddingHorizontal: 16, paddingVertical: 10 },
  disabled: { opacity: 0.4 },
  label: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
});
