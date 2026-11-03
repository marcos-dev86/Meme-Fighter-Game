import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MoveButton } from './DPad';
import { ButtonId, useButtonRects, withAlpha } from './controlsLayout';

/**
 * The action buttons (jump, flash, shield, strong, super, aura, item).
 * Every one is an independent button: its position, size, colour and
 * visibility come from the player's saved layout (controlsLayout.ts), and
 * the default arrangement is the "flower" measured from the user's own
 * mockup (see FLOWER in controlsLayout.ts). Only red=strong and gold=super
 * were explicit colour requirements; the others are free choices.
 */

export const ACTION_COLORS = {
  jump: { bg: 'rgba(0,140,220,0.4)', border: '#00AEEF' },
  strong: { bg: 'rgba(200,45,20,0.4)', border: '#E23C14' },
  super: { bg: 'rgba(210,170,0,0.4)', border: '#FFD700' },
  flash: { bg: 'rgba(0,150,170,0.4)', border: '#26C6DA' },
  shield: { bg: 'rgba(90,140,30,0.4)', border: '#8BC34A' },
  aura: { bg: 'rgba(230,110,0,0.4)', border: '#FF7A00' },
  item: { bg: 'rgba(150,60,200,0.4)', border: '#B565E8' },
};

export const ACTION_LABELS: Record<string, string> = {
  jump: 'PULO',
  flash: 'FLASH',
  shield: '◈',
  strong: 'FORTE',
  super: 'SUPER',
  aura: 'AURA',
  item: 'ITEM',
};

interface Props {
  onJump: () => void;
  onStrong: () => void;
  onSuper: () => void;
  onFlash: () => void;
  onShieldChange: (pressed: boolean) => void;
  onAuraChange: (pressed: boolean) => void;
  onItemMenu: () => void;
  jumpReady?: boolean;
}

type ActionKey = keyof typeof ACTION_COLORS;

export function ActionCluster({ onJump, onStrong, onSuper, onFlash, onShieldChange, onAuraChange, onItemMenu, jumpReady = true }: Props) {
  const rects = useButtonRects();

  const btn = (id: ActionKey, handlers: { onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void; disabled?: boolean }) => {
    const rect = rects[id as ButtonId];
    if (rect.layout.hidden) return null;
    const custom = rect.layout.color;
    const base = ACTION_COLORS[id];
    const label = ACTION_LABELS[id];
    const small = label.length > 1;
    return (
      <MoveButton
        key={id}
        label={label}
        size={rect.size}
        fontSize={small ? rect.size * (id === 'jump' ? 0.16 : 0.18) : undefined}
        style={[
          { left: rect.cx - rect.size / 2, top: rect.cy - rect.size / 2 },
          { backgroundColor: custom ? withAlpha(custom, 0.4) : base.bg, borderColor: custom ?? base.border },
        ]}
        textColor={custom ?? undefined}
        {...handlers}
      />
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {btn('flash', { onPress: onFlash })}
      {btn('shield', { onPressIn: () => onShieldChange(true), onPressOut: () => onShieldChange(false) })}
      {btn('super', { onPress: onSuper })}
      {btn('strong', { onPress: onStrong })}
      {/* "Farmar aura": hold, don't tap - same shape as shield (onPressIn/
          onPressOut), enforced as mutually exclusive with everything else
          by Fighter.canAct()/isCharging, not by anything in this component. */}
      {btn('aura', { onPressIn: () => onAuraChange(true), onPressOut: () => onAuraChange(false) })}
      {btn('item', { onPress: onItemMenu })}
      {btn('jump', { onPress: onJump, disabled: !jumpReady })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
});
