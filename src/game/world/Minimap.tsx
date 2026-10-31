import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { REGION_COLORS, WORLD_CHUNKS_H, WORLD_CHUNKS_W, getRegionAtChunk } from './worldGen';
import { useI18n } from '@/game/i18n/i18n';
import { isExplored, revealAround, useExploredVersion } from '@/game/state/exploredState';
import { REGION_NAMES } from '@/game/i18n/translations';

interface Props {
  playerChunkX: number;
  playerChunkY: number;
}

/** Computed once: the region layout never changes at runtime. */
const GRID = (() => {
  const rows: string[][] = [];
  for (let cy = 0; cy < WORLD_CHUNKS_H; cy++) {
    const row: string[] = [];
    for (let cx = 0; cx < WORLD_CHUNKS_W; cx++) row.push(getRegionAtChunk(cx, cy));
    rows.push(row);
  }
  return rows;
})();

const FOG_TONES = ['#8b919c', '#7b8290'] as const;

type Run = { cx: number; cy: number; len: number; color: string; opacity: number };

/** Merges neighbouring cells of the same colour into one View per run (the
 * old one-View-per-cell grid was ~5000 Views). Unexplored cells are grey
 * "clouds" - the map only shows ground the player has walked near. */
function buildRuns(): Run[] {
  const runs: Run[] = [];
  for (let cy = 0; cy < WORLD_CHUNKS_H; cy++) {
    let cur: Run | null = null;
    for (let cx = 0; cx < WORLD_CHUNKS_W; cx++) {
      const known = isExplored(cx, cy);
      const region = GRID[cy][cx];
      const color = known ? REGION_COLORS[region as keyof typeof REGION_COLORS] : FOG_TONES[((cx >> 1) + (cy >> 1)) & 1];
      const opacity = known ? (region === 'plaza' ? 1 : 0.85) : 1;
      if (cur && cur.color === color && cur.opacity === opacity) cur.len++;
      else {
        cur = { cx, cy, len: 1, color, opacity };
        runs.push(cur);
      }
    }
  }
  return runs;
}

function GridView({ cellSize, playerChunkX, playerChunkY, version }: { cellSize: number; playerChunkX: number; playerChunkY: number; version: number }) {
  'use no memo'; // buildRuns() reads the module-level exploration store
  const runs = useMemo(() => buildRuns(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const dot = Math.max(6, cellSize * 1.6);
  return (
    <View style={{ width: cellSize * WORLD_CHUNKS_W, height: cellSize * WORLD_CHUNKS_H }}>
      {runs.map((r) => (
        <View
          key={`${r.cy}-${r.cx}`}
          style={{ position: 'absolute', left: r.cx * cellSize, top: r.cy * cellSize, width: r.len * cellSize + 0.5, height: cellSize + 0.5, backgroundColor: r.color, opacity: r.opacity }}
        />
      ))}
      <View
        pointerEvents="none"
        style={[
          styles.playerDot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            left: playerChunkX * cellSize - dot / 2 + cellSize / 2,
            top: playerChunkY * cellSize - dot / 2 + cellSize / 2,
          },
        ]}
      />
    </View>
  );
}

/** Small always-visible corner map; tap it for a bigger labeled view. */
export function Minimap({ playerChunkX, playerChunkY }: Props) {
  'use no memo'; // reads the module-level exploration store
  const { lang, t } = useI18n();
  const regionLabel = REGION_NAMES[lang];
  const [expanded, setExpanded] = useState(false);
  const version = useExploredVersion();
  // Walking uncovers the map around the player (see exploredState.ts).
  useEffect(() => {
    revealAround(playerChunkX, playerChunkY);
  }, [playerChunkX, playerChunkY]);
  // Legend only lists regions the player has already seen (no spoilers).
  const seenRegions = useMemo(() => {
    const set = new Set<string>();
    for (let cy = 0; cy < WORLD_CHUNKS_H; cy++) for (let cx = 0; cx < WORLD_CHUNKS_W; cx++) if (isExplored(cx, cy)) set.add(GRID[cy][cx]);
    return set;
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentRegion = useMemo(
    () => getRegionAtChunk(Math.max(0, Math.min(WORLD_CHUNKS_W - 1, playerChunkX)), Math.max(0, Math.min(WORLD_CHUNKS_H - 1, playerChunkY))),
    [playerChunkX, playerChunkY]
  );

  return (
    <>
      <Pressable style={styles.corner} onPress={() => setExpanded(true)}>
        <GridView cellSize={1.7} playerChunkX={playerChunkX} playerChunkY={playerChunkY} version={version} />
      </Pressable>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable style={styles.modalBg} onPress={() => setExpanded(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('minimap_title')}</Text>
            <GridView cellSize={9} playerChunkX={playerChunkX} playerChunkY={playerChunkY} version={version} />
            <Text style={styles.modalRegion}>
              {t('minimap_you_are_in')}: {regionLabel[currentRegion] ?? currentRegion}
            </Text>
            <View style={styles.legend}>
              {Object.entries(regionLabel).filter(([key]) => seenRegions.has(key)).map(([key, label]) => (
                <View key={key} style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: REGION_COLORS[key as keyof typeof REGION_COLORS] }]} />
                  <Text style={styles.legendLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.modalHint}>{t('minimap_hint')}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// re-exported so callers don't need to import worldGen directly just for this


const styles = StyleSheet.create({
  corner: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.7)',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,10,18,0.5)',
  },
  playerDot: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 14,
    backgroundColor: '#151022',
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: { color: '#FFD700', fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  modalRegion: { color: '#fff', fontWeight: '600', fontSize: 13 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 320 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { color: '#fff', fontSize: 11, opacity: 0.85 },
  modalHint: { color: '#fff', opacity: 0.5, fontSize: 11 },
});
