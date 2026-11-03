import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { MapDef, TileType } from '@/types/game';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { CHUNK_SIZE, hash2 } from './overworld';
import { SCENERY_GROUND, WORLD_TILES_W } from './worldGen';
import { startWaves, tide, waveT } from './waveClock';

/**
 * v3 of this renderer - real performance pass (see docs/AUDIT.md: "trava
 * ao andar", real device test on a Galaxy A14 5G, barely able to take a
 * step). v2 drew one native View per tile plus up to 4 more for
 * decals/foam; with CHUNK_SIZE=24 and a 5x5 loaded-chunk radius that was
 * 14,400+ tiles live at once (tens of thousands of native views counting
 * decals) - fine on a notebook/simulator, a real freeze on a budget phone,
 * and the forest-thinning pass (mapData.ts) makes 'tree' the dominant
 * terrain now, which would have made a per-tile approach far worse, not
 * better. Two changes:
 *
 * 1. Same-type horizontal runs within a chunk row are drawn as ONE
 *    background View spanning the whole run, not one per tile - the same
 *    idea the map data itself is already stored with (RLE). A wide-open
 *    water or forest chunk that used to cost up to CHUNK_SIZE views per
 *    row now usually costs 1-3. The per-tile hash dither becomes a
 *    per-RUN dither instead (still breaks up flat colour, just at a
 *    coarser grain - see shade()).
 * 2. Decals that used to render on every matching tile now render on a
 *    random FRACTION of them (tree/rock especially, now that both cover
 *    large contiguous areas instead of being sprinkled sparsely across
 *    open plains) and the purely-cosmetic per-tile speckle decals (grass
 *    tufts, sand/path/snow speckles) are gone entirely - they cost a view
 *    per tile for zero gameplay value. Trees/rocks/lava/coastline foam
 *    still read clearly; everywhere else is now just the (much cheaper)
 *    dithered run background. CHUNK_RADIUS also dropped 2->1 in
 *    WorldScreen.tsx, on top of this.
 *
 * Buildings are still NOT drawn here: a real BuildingSprite (SVG, proper
 * roof/walls/door) is drawn once per structure as an overlay in
 * WorldScreen, since there are only ~13 of them.
 */

/** Master switch for the bitmap textures below. If a device ever stutters,
 * set this to false: ground falls back to the flat dithered colours and
 * decals to the old drawn shapes. Textures cost one Image per merged run
 * of same-type tiles (same count as the run Views - not per tile). */
const TEXTURES_ENABLED = true;

/* eslint-disable @typescript-eslint/no-require-imports */
const STRIPS: Partial<Record<TileType, number[]>> = {
  grass: [require('../../../assets/textures/strip_grass_0.png'), require('../../../assets/textures/strip_grass_1.png'), require('../../../assets/textures/strip_grass_2.png')],
  water: [require('../../../assets/textures/strip_water_0.png'), require('../../../assets/textures/strip_water_1.png'), require('../../../assets/textures/strip_water_2.png')],
  path: [require('../../../assets/textures/strip_path_0.png'), require('../../../assets/textures/strip_path_1.png'), require('../../../assets/textures/strip_path_2.png')],
  snow: [require('../../../assets/textures/strip_snow_0.png'), require('../../../assets/textures/strip_snow_1.png'), require('../../../assets/textures/strip_snow_2.png')],
  stone: [require('../../../assets/textures/strip_stone_0.png'), require('../../../assets/textures/strip_stone_1.png'), require('../../../assets/textures/strip_stone_2.png')],
};
const TREE_IMGS = [require('../../../assets/textures/tree_green.png'), require('../../../assets/textures/tree_blue.png'), require('../../../assets/textures/tree_pink.png')];
const SNOW_TREE_IMGS = [require('../../../assets/textures/tree_snow.png'), require('../../../assets/textures/tree_snow2.png')];
const ROCK_IMGS = [require('../../../assets/textures/rock1.png'), require('../../../assets/textures/rock2.png'), require('../../../assets/textures/rock3.png')];
/* eslint-enable @typescript-eslint/no-require-imports */
const STRIP_TILES = 24; // each strip image is this many tiles wide (== CHUNK_SIZE, the longest possible run)

const BASE_COLORS: Partial<Record<TileType, [string, string]>> = {
  grass: ['#4a9c58', '#3f8a4c'],
  path: ['#c9a86a', '#bf9c5c'],
  water: ['#3a7bc4', '#3369ad'],
  sand: ['#dfc98f', '#d4bc7d'],
  stone: ['#a8a196', '#9b9488'],
  snow: ['#f0f4f7', '#e4ebef'],
  ash: ['#5c5450', '#524b47'],
  // Forest is now the dominant off-path terrain (see mapData.ts's
  // grass-thinning pass) - it gets the same two-tone dither treatment the
  // open-field types already had, so a big forest block doesn't read as
  // one flat green rectangle.
  tree: ['#1f5c33', '#194a29'],
  rock: ['#96938c', '#84817a'],
  cliff: ['#a9cfe0', '#94bdd1'],
};

function shade(type: TileType, tx: number, ty: number): string {
  const pair = BASE_COLORS[type];
  if (!pair) return FLAT_COLORS[type];
  return hash2(tx * 3.1, ty * 7.7) > 0.5 ? pair[0] : pair[1];
}

const FLAT_COLORS: Record<TileType, string> = {
  grass: '#4a9c58',
  path: '#c9a86a',
  water: '#3a7bc4',
  tree: '#1f5c33',
  rock: '#96938c',
  wall: '#4a4a4a',
  sand: '#dfc98f',
  flower: '#4a9c58',
  stone: '#a8a196',
  dock: '#a1794f',
  lava: '#e2531f',
  ash: '#5c5450',
  snow: '#f0f4f7',
  cliff: '#9fc4d6',
  shop: '#4a9c58',
  house: '#4a9c58',
  door: '#e8c477',
};

/** Every decal below takes `left`/`top`: the tile's own chunk-local pixel
 * position. They used to be children of a per-tile positioned wrapper
 * View (so their own styles could just be size-fractions from 0,0) - now
 * that the background is drawn as merged runs instead of one View per
 * tile, decals sit directly in the chunk and have to carry that offset
 * themselves. */
function TreeDecal({ size, tx, ty, left, top, snowy }: { size: number; tx: number; ty: number; left: number; top: number; snowy?: boolean }) {
  const wobble = hash2(tx * 9.3, ty * 4.1);
  if (TEXTURES_ENABLED) {
    const pool = snowy ? SNOW_TREE_IMGS : TREE_IMGS;
    // Mostly the dark-green tree; the blue/pink magic trees are rare.
    const idx = snowy ? (wobble > 0.5 ? 1 : 0) : wobble > 0.9 ? 2 : wobble > 0.8 ? 1 : 0;
    const d = size * 1.3;
    return (
      <Image
        source={pool[idx]}
        resizeMode="stretch"
        style={[styles.decalAbs, { width: d, height: d, left: left - (d - size) / 2, top: top + size - d }]}
      />
    );
  }
  const canopy = size * (0.62 + wobble * 0.1);
  return (
    <>
      <View style={[styles.decalAbs, { width: size * 0.14, height: size * 0.3, left: left + size * 0.43, top: top + size * 0.62, backgroundColor: '#5c3d22', borderRadius: 2 }]} />
      <View
        style={[
          styles.decalAbs,
          {
            width: canopy,
            height: canopy,
            left: left + (size - canopy) / 2,
            top: top + size * 0.08,
            borderRadius: canopy / 2,
            backgroundColor: wobble > 0.5 ? '#1f6b38' : '#245f30',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.15)',
          },
        ]}
      />
    </>
  );
}

function RockDecal({ size, tx, ty, left, top }: { size: number; tx: number; ty: number; left: number; top: number }) {
  const w = hash2(tx * 5.2, ty * 8.9);
  if (TEXTURES_ENABLED) {
    const d = size * 0.95;
    return (
      <Image
        source={ROCK_IMGS[Math.floor(w * 3) % 3]}
        resizeMode="stretch"
        style={[styles.decalAbs, { width: d, height: d, left: left + (size - d) / 2, top: top + size - d }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.decalAbs,
        {
          width: size * 0.6,
          height: size * 0.46,
          left: left + size * 0.2,
          top: top + size * 0.4,
          borderRadius: size * 0.14,
          backgroundColor: w > 0.5 ? '#96938c' : '#84817a',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.25)',
        },
      ]}
    />
  );
}

function LavaDecal({ size, tx, ty, left, top }: { size: number; tx: number; ty: number; left: number; top: number }) {
  if (hash2(tx * 6.6, ty * 2.2) < 0.75) return null;
  return (
    <View style={[styles.decalAbs, { width: size * 0.22, height: size * 0.22, left: left + size * 0.4, top: top + size * 0.35, borderRadius: size * 0.11, backgroundColor: '#ffb454' }]} />
  );
}

function FlowerDecal({ size, left, top }: { size: number; left: number; top: number }) {
  return <View style={[styles.decalAbs, { width: size * 0.22, height: size * 0.22, left: left + size * 0.39, top: top + size * 0.39, borderRadius: size * 0.11, backgroundColor: '#ffdf6e' }]} />;
}

/** Wood-plank shading across a door tile so a 3-tile-wide door doesn't
 * read as one flat gold block; `slot` is which of the 3 tiles this is. */
function DoorPlankDecal({ size, slot, left, top }: { size: number; slot: number; left: number; top: number }) {
  return (
    <>
      <View style={[styles.decalAbs, { width: size, height: size * 0.06, left, top: top + size * 0.3, backgroundColor: '#8a5a2f', opacity: 0.35 }]} />
      <View style={[styles.decalAbs, { width: size, height: size * 0.06, left, top: top + size * 0.62, backgroundColor: '#8a5a2f', opacity: 0.35 }]} />
      {slot === 1 && (
        <View style={[styles.decalAbs, { width: size * 0.1, height: size * 0.1, left: left + size * 0.45, top: top + size * 0.44, borderRadius: size * 0.05, backgroundColor: '#5b3a24' }]} />
      )}
    </>
  );
}

/** Icy cliff face: pale blue rock with pick-axe footholds (a ladder of rungs). */
function CliffDecal({ size, left, top }: { size: number; left: number; top: number }) {
  const rung = (i: number) => (
    <View key={i} style={[styles.decalAbs, { left: left + size * 0.2, top: top + size * (0.18 + i * 0.28), width: size * 0.6, height: size * 0.1, backgroundColor: '#e9f6ff', opacity: 0.85 }]} />
  );
  return (
    <>
      <View style={[styles.decalAbs, { left: left + size * 0.12, top, width: size * 0.08, height: size, backgroundColor: '#5f7f93', opacity: 0.7 }]} />
      <View style={[styles.decalAbs, { left: left + size * 0.8, top, width: size * 0.08, height: size, backgroundColor: '#5f7f93', opacity: 0.7 }]} />
      {[0, 1, 2].map(rung)}
    </>
  );
}

/** Foam on whichever edges of a water tile face land, so coastlines don't cut
 * off as a flat colour seam. Returns three layers: a static thin line, and two
 * "wash" strips (animated per chunk, see ChunkView) that roll in and out with
 * the waves and the tide. Interior ocean returns nothing, so this stays cheap. */
function foamParts(size: number, tx: number, ty: number, map: MapDef, left: number, top: number, key: string) {
  const isLand = (t: TileType) => t !== 'water' && t !== 'dock';
  const up = isLand(map.getTile(tx, ty - 1));
  const down = isLand(map.getTile(tx, ty + 1));
  const west = isLand(map.getTile(tx - 1, ty));
  const east = isLand(map.getTile(tx + 1, ty));
  if (!up && !down && !west && !east) return null;
  const t = size * 0.16;
  const w1 = size * 0.3; // wash A: wide soft band right next to the shore line
  const w2 = size * 0.14; // wash B: thin crest further out, opposite phase
  const o2 = size * 0.42;
  const base: React.ReactNode[] = [];
  const a: React.ReactNode[] = [];
  const b: React.ReactNode[] = [];
  if (up) {
    base.push(<View key={`b-u-${key}`} style={[styles.decalAbs, { left, top, width: size, height: t, backgroundColor: '#dff0f7', opacity: 0.55 }]} />);
    a.push(<View key={`a-u-${key}`} style={[styles.decalAbs, { left, top: top + t, width: size, height: w1, backgroundColor: '#eaf7fb' }]} />);
    b.push(<View key={`c-u-${key}`} style={[styles.decalAbs, { left, top: top + o2, width: size, height: w2, backgroundColor: '#d3ecf6' }]} />);
  }
  if (down) {
    base.push(<View key={`b-d-${key}`} style={[styles.decalAbs, { left, top: top + size - t, width: size, height: t, backgroundColor: '#dff0f7', opacity: 0.55 }]} />);
    a.push(<View key={`a-d-${key}`} style={[styles.decalAbs, { left, top: top + size - t - w1, width: size, height: w1, backgroundColor: '#eaf7fb' }]} />);
    b.push(<View key={`c-d-${key}`} style={[styles.decalAbs, { left, top: top + size - o2 - w2, width: size, height: w2, backgroundColor: '#d3ecf6' }]} />);
  }
  if (west) {
    base.push(<View key={`b-w-${key}`} style={[styles.decalAbs, { left, top, width: t, height: size, backgroundColor: '#dff0f7', opacity: 0.55 }]} />);
    a.push(<View key={`a-w-${key}`} style={[styles.decalAbs, { left: left + t, top, width: w1, height: size, backgroundColor: '#eaf7fb' }]} />);
    b.push(<View key={`c-w-${key}`} style={[styles.decalAbs, { left: left + o2, top, width: w2, height: size, backgroundColor: '#d3ecf6' }]} />);
  }
  if (east) {
    base.push(<View key={`b-e-${key}`} style={[styles.decalAbs, { left: left + size - t, top, width: t, height: size, backgroundColor: '#dff0f7', opacity: 0.55 }]} />);
    a.push(<View key={`a-e-${key}`} style={[styles.decalAbs, { left: left + size - t - w1, top, width: w1, height: size, backgroundColor: '#eaf7fb' }]} />);
    b.push(<View key={`c-e-${key}`} style={[styles.decalAbs, { left: left + size - o2 - w2, top, width: w2, height: size, backgroundColor: '#d3ecf6' }]} />);
  }
  return { base, a, b };
}

/** Wrapper whose opacity follows the wave clock (phase 0 or 0.5) and the tide. */
function WashLayer({ phase, children }: { phase: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const wave = 0.5 + 0.5 * Math.sin((waveT.value + phase) * Math.PI * 2);
    return { opacity: (0.08 + 0.62 * wave) * (0.5 + 0.5 * tide.value) };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

const ChunkView = React.memo(function ChunkView({ map, cx, cy }: { map: MapDef; cx: number; cy: number }) {
  const content = useMemo(() => {
    const bgRuns: React.ReactNode[] = [];
    const decals: React.ReactNode[] = [];
    const washA: React.ReactNode[] = [];
    const washB: React.ReactNode[] = [];
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    const size = map.tileSize;

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const ty = baseY + ly;
      if (ty >= map.height) break;
      const colsInRow = Math.min(CHUNK_SIZE, map.width - baseX);
      if (colsInRow <= 0) continue;

      let runStart = 0;
      let runType: TileType | null = null;
      const flush = (endLx: number) => {
        if (runType === null) return;
        bgRuns.push(
          <View
            key={`bg-${ly}-${runStart}`}
            style={{
              position: 'absolute',
              left: runStart * size,
              top: ly * size,
              width: (endLx - runStart) * size + 1,
              height: size + 1, // 1px overlap hides sub-pixel seams between rows/runs
              backgroundColor: shade(runType, baseX + runStart, ty),
              overflow: 'hidden',
            }}
          >
            {TEXTURES_ENABLED && STRIPS[runType] && (
              <Image
                source={STRIPS[runType]![Math.floor(hash2((baseX + runStart) * 1.7, ty * 2.9) * 3) % 3]}
                resizeMode="stretch"
                style={{ position: 'absolute', left: 0, top: 0, width: STRIP_TILES * size, height: size + 1 }}
              />
            )}
          </View>
        );
      };

      for (let lx = 0; lx < colsInRow; lx++) {
        const tx = baseX + lx;
        const type = map.getTile(tx, ty);
        // Building footprints render as plain ground here: the actual
        // structure is a BuildingSprite overlay drawn once in WorldScreen.
        const groundType = (type === 'house' ? SCENERY_GROUND.get(ty * WORLD_TILES_W + tx) : undefined) ?? (type === 'shop' || type === 'house' ? 'stone' : type);

        if (groundType !== runType) {
          flush(lx);
          runStart = lx;
          runType = groundType;
        }

        const left = lx * size;
        const top = ly * size;
        if (type === 'tree') {
          // ~20% of tiles get a canopy accent - the merged background run
          // underneath is already forest-coloured, this is just texture.
          if (hash2(tx * 4.4, ty * 6.1) > 0.8) {
            const snowy = map.getTile(tx - 2, ty) === 'snow' || map.getTile(tx + 2, ty) === 'snow' || map.getTile(tx, ty - 2) === 'snow' || map.getTile(tx, ty + 2) === 'snow';
            decals.push(<TreeDecal key={`d-${lx}-${ly}`} size={size} tx={tx} ty={ty} left={left} top={top} snowy={snowy} />);
          }
        } else if (type === 'rock') {
          if (hash2(tx * 4.4, ty * 6.1) > 0.62) decals.push(<RockDecal key={`d-${lx}-${ly}`} size={size} tx={tx} ty={ty} left={left} top={top} />);
        } else if (type === 'cliff') {
          decals.push(<CliffDecal key={`d-${lx}-${ly}`} size={size} left={left} top={top} />);
        } else if (type === 'lava') {
          decals.push(<LavaDecal key={`d-${lx}-${ly}`} size={size} tx={tx} ty={ty} left={left} top={top} />);
        } else if (type === 'flower') {
          decals.push(<FlowerDecal key={`d-${lx}-${ly}`} size={size} left={left} top={top} />);
        } else if (type === 'water') {
          const foam = foamParts(size, tx, ty, map, left, top, `${lx}-${ly}`);
          if (foam) {
            decals.push(...foam.base);
            washA.push(...foam.a);
            washB.push(...foam.b);
          }
        } else if (type === 'door') {
          decals.push(<DoorPlankDecal key={`d-${lx}-${ly}`} size={size} slot={((tx % 3) + 3) % 3} left={left} top={top} />);
        }
      }
      flush(colsInRow);
    }

    return { bgRuns, decals, washA, washB };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, cx, cy]);

  return (
    <View
      style={{
        position: 'absolute',
        left: cx * CHUNK_SIZE * map.tileSize,
        top: cy * CHUNK_SIZE * map.tileSize,
        width: CHUNK_SIZE * map.tileSize,
        height: CHUNK_SIZE * map.tileSize,
        overflow: 'hidden',
      }}
    >
      {content.bgRuns}
      {content.washA.length > 0 && <WashLayer phase={0}>{content.washA}</WashLayer>}
      {content.washB.length > 0 && <WashLayer phase={0.5}>{content.washB}</WashLayer>}
      {content.decals}
    </View>
  );
});

export interface ChunkCoord {
  cx: number;
  cy: number;
}

interface Props {
  map: MapDef;
  activeChunks: ChunkCoord[];
}

export function TileMapRenderer({ map, activeChunks }: Props) {
  startWaves();
  return (
    <>
      {activeChunks.map(({ cx, cy }) => (
        <ChunkView key={`${cx}-${cy}`} map={map} cx={cx} cy={cy} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  decalAbs: {
    position: 'absolute',
  },
});
