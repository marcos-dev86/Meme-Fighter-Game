import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DPad } from '@/game/input/DPad';
import { ActionCluster } from '@/game/input/ActionCluster';
import { PauseButton } from '@/game/menu/PauseMenu';
import {
  BUTTON_IDS,
  ButtonId,
  COLOR_CHOICES,
  MAX_SCALE,
  MIN_SCALE,
  getControlsLayout,
  getDefaultCenters,
  persistControlsLayout,
  resetButtonLayout,
  resetControlsLayout,
  setButtonLayout,
  useButtonRects,
  useControlsLayout,
} from '@/game/input/controlsLayout';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

const noop = () => {};

const LABELS: Record<ButtonId, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
  jump: 'PULO',
  flash: 'FLASH',
  shield: '◈',
  strong: 'FORTE',
  super: 'SUPER',
  aura: 'AURA',
  item: 'ITEM',
  pause: 'II',
};

/**
 * "EDITAR CONTROLES": a live preview of the real controls. Tap any button
 * to select it, drag it anywhere, and use the panel to make it bigger or
 * smaller, change its colour, remove it (optional - it stays here as a
 * dashed ghost so you can bring it back) or reset it. Everything is saved
 * on the device and used by story mode, building interiors and the fights.
 */
export function ControlsEditScreen() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useControlsLayout();
  const rects = useButtonRects();
  const [selected, setSelected] = useState<ButtonId | null>(null);
  const [panelTop, setPanelTop] = useState(false);

  const live = useRef({ width, height, insets });
  live.current = { width, height, insets };

  const sel = selected ? layout[selected] : null;

  /** Keeps a button's centre on screen for a given offset. */
  const clampOffset = (id: ButtonId, dx: number, dy: number, size: number) => {
    const { width: W, height: H, insets: ins } = live.current;
    const def = getDefaultCenters(W, H, ins)[id];
    const half = size / 2;
    return {
      dx: Math.min(W - half - def.cx, Math.max(half - def.cx, dx)),
      dy: Math.min(H - half - def.cy, Math.max(half - def.cy, dy)),
    };
  };

  const rescale = (id: ButtonId, delta: number) => {
    const cur = getControlsLayout()[id];
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((cur.scale + delta) * 10) / 10));
    const base = rects[id].size / cur.scale;
    setButtonLayout(id, { scale, ...clampOffset(id, cur.dx, cur.dy, base * scale) });
    void persistControlsLayout();
  };

  const patch = (id: ButtonId, p: Parameters<typeof setButtonLayout>[1]) => {
    setButtonLayout(id, p);
    void persistControlsLayout();
  };

  return (
    <View style={styles.root}>
      {/* The real controls, inert, so you see exactly what you'll get. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DPad onPress={noop} />
        <ActionCluster onJump={noop} onStrong={noop} onSuper={noop} onFlash={noop} onShieldChange={noop} onAuraChange={noop} onItemMenu={noop} />
        <PauseButton onPress={noop} />
      </View>

      {/* One drag handle per button (removed ones stay as dashed ghosts). */}
      {BUTTON_IDS.map((id) => (
        <Handle
          key={id}
          id={id}
          selected={selected === id}
          onSelect={() => setSelected(id)}
          clampOffset={clampOffset}
        />
      ))}

      <View style={[styles.panel, panelTop ? { top: insets.top + 8 } : { bottom: insets.bottom + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('controls_edit_title')}</Text>
          <Pressable style={styles.chip} onPress={() => setPanelTop((v) => !v)} hitSlop={6}>
            <Text style={styles.chipText}>{panelTop ? '▼' : '▲'}</Text>
          </Pressable>
        </View>
        {selected && sel ? (
          <>
            <View style={styles.row}>
              <Text style={styles.selName}>{LABELS[selected]}</Text>
              <Stepper onMinus={() => rescale(selected, -0.1)} onPlus={() => rescale(selected, 0.1)} value={sel.scale} />
              <Pressable style={[styles.chip, sel.hidden ? styles.chipOn : styles.chipDanger]} onPress={() => patch(selected, { hidden: !sel.hidden })}>
                <Text style={styles.chipText}>{sel.hidden ? t('controls_edit_restore') : t('controls_edit_remove')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => void resetButtonLayout(selected)}>
                <Text style={styles.chipText}>{t('controls_edit_reset_one')}</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable style={[styles.swatch, styles.swatchDefault, sel.color === null && styles.swatchOn]} onPress={() => patch(selected, { color: null })}>
                <Text style={styles.swatchDefaultText}>{t('controls_edit_default_color')}</Text>
              </Pressable>
              {COLOR_CHOICES.map((c) => (
                <Pressable key={c} style={[styles.swatch, { backgroundColor: c }, sel.color === c && styles.swatchOn]} onPress={() => patch(selected, { color: c })} />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.hint}>{t('controls_edit_hint')}</Text>
        )}
        <View style={styles.row}>
          <MenuButton compact variant="ghost" label={t('controls_edit_reset')} onPress={() => void resetControlsLayout()} />
          <MenuButton compact label={t('controls_edit_done')} onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

function Handle({
  id,
  selected,
  onSelect,
  clampOffset,
}: {
  id: ButtonId;
  selected: boolean;
  onSelect: () => void;
  clampOffset: (id: ButtonId, dx: number, dy: number, size: number) => { dx: number; dy: number };
}) {
  const rect = useButtonRects()[id];
  const start = useRef({ dx: 0, dy: 0 });
  const sizeRef = useRef(rect.size);
  sizeRef.current = rect.size;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const clampRef = useRef(clampOffset);
  clampRef.current = clampOffset;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        selectRef.current();
        const l = getControlsLayout()[id];
        start.current = { dx: l.dx, dy: l.dy };
      },
      onPanResponderMove: (_e, g) => {
        setButtonLayout(id, clampRef.current(id, start.current.dx + g.dx, start.current.dy + g.dy, sizeRef.current));
      },
      onPanResponderRelease: () => void persistControlsLayout(),
      onPanResponderTerminate: () => void persistControlsLayout(),
    }),
  ).current;

  const pad = 4;
  const hidden = rect.layout.hidden;
  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.handle,
        {
          left: rect.cx - rect.size / 2 - pad,
          top: rect.cy - rect.size / 2 - pad,
          width: rect.size + pad * 2,
          height: rect.size + pad * 2,
          borderRadius: id === 'pause' ? 16 : (rect.size + pad * 2) / 2,
        },
        hidden && styles.handleGhost,
        selected && styles.handleSelected,
      ]}
    >
      {hidden && <Text style={styles.ghostLabel}>{LABELS[id]}</Text>}
    </View>
  );
}

function Stepper({ onMinus, onPlus, value }: { onMinus: () => void; onPlus: () => void; value: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onMinus} hitSlop={8}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{Math.round(value * 100)}%</Text>
      <Pressable style={styles.stepBtn} onPress={onPlus} hitSlop={8}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10131c' },
  panel: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,18,0.9)',
    borderColor: 'rgba(255,215,0,0.6)',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 10,
    maxWidth: 420,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  hint: { color: '#fff', opacity: 0.8, fontSize: 11, textAlign: 'center', maxWidth: 380 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  selName: { color: '#10131c', backgroundColor: '#FFD700', fontWeight: '900', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  chip: { backgroundColor: '#3a3f55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: '#3E8E41' },
  chipDanger: { backgroundColor: '#B3392B' },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  swatch: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchDefault: { width: 'auto', paddingHorizontal: 8, backgroundColor: '#3a3f55', justifyContent: 'center' },
  swatchDefaultText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  swatchOn: { borderColor: '#fff', borderWidth: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFCD3C', alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#4A2E00', fontWeight: '900', fontSize: 18, marginTop: -2 },
  stepValue: { color: '#fff', fontWeight: '700', fontSize: 12, minWidth: 40, textAlign: 'center' },
  handle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    borderStyle: 'dashed',
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleGhost: { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.06)' },
  handleSelected: { borderColor: '#FFD700', borderStyle: 'solid', borderWidth: 3, backgroundColor: 'rgba(255,215,0,0.1)' },
  ghostLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 11 },
});
