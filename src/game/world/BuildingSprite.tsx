import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { BuildingType } from './worldGen';

/* eslint-disable @typescript-eslint/no-require-imports */
const FACADES = {
  casa1: { src: require('../../../assets/buildings/casa1.png'), aspect: 300 / 300 },
  casa2: { src: require('../../../assets/buildings/casa2.png'), aspect: 253 / 300 },
  casa3: { src: require('../../../assets/buildings/casa3.png'), aspect: 136 / 142 },
  casa4: { src: require('../../../assets/buildings/casa4.png'), aspect: 118 / 133 },
  casa5: { src: require('../../../assets/buildings/casa5.png'), aspect: 136 / 139 },
  casa6: { src: require('../../../assets/buildings/casa6.png'), aspect: 136 / 136 },
  predio1: { src: require('../../../assets/buildings/predio1.png'), aspect: 160 / 247 },
  predio2: { src: require('../../../assets/buildings/predio2.png'), aspect: 213 / 300 },
  predio3: { src: require('../../../assets/buildings/predio3.png'), aspect: 89 / 245 },
  iglu: { src: require('../../../assets/buildings/iglu.png'), aspect: 182 / 124 },
  nb_loja24: { src: require('../../../assets/buildings/nb_loja24.png'), aspect: 288 / 258 },
  nb_hotel: { src: require('../../../assets/buildings/nb_hotel.png'), aspect: 303 / 489 },
  nb_madeira: { src: require('../../../assets/buildings/nb_madeira.png'), aspect: 261 / 312 },
  nb_cassino: { src: require('../../../assets/buildings/nb_cassino.png'), aspect: 640 / 440 },
  nb_cassino_gigante: { src: require('../../../assets/buildings/nb_cassino_gigante.png'), aspect: 3520 / 1320 },
  nb_casa_pedra: { src: require('../../../assets/buildings/nb_casa_pedra.png'), aspect: 336 / 234 },
};
/* eslint-enable @typescript-eslint/no-require-imports */

type FacadeKey = keyof typeof FACADES;

/** Which bitmap each building uses and how tall the art is drawn, in
 * TILES (width follows from the art's own aspect ratio). Footprints in
 * worldGen.ts are sized to match, so the solid area == what you see; tall
 * art simply overhangs the tiles above its footprint. */
const FACADE_BY_BUILDING: Record<string, { key: FacadeKey; h: number }> = {
  casa_dogge: { key: 'casa1', h: 5 },
  casa_gadigago: { key: 'casa3', h: 5 },
  casa_iracema: { key: 'casa5', h: 5 },
  casa_montanha: { key: 'iglu', h: 4 },
  descanso_vulcao: { key: 'nb_hotel', h: 8 }, // Hotel (arte nova)
  salao_camp: { key: 'nb_casa_pedra', h: 3.6 }, // casa de pedra (arte nova)
  plaza_shop: { key: 'casa2', h: 6 },
  loja_vulcao: { key: 'nb_loja24', h: 5 }, // loja 24h (arte nova, no lugar da repetida do plaza_shop)
  loja_abandonada: { key: 'nb_madeira', h: 5 }, // casa de madeira (arte nova, no lugar da repetida do casa_dogge)
  loja_misteriosa: { key: 'nb_cassino_gigante', h: 66 }, // cassino gigante (176x66 tiles)
  salao_geral: { key: 'predio2', h: 11 },
  guilda: { key: 'predio3', h: 9 },
};

/** Where a building's bitmap facade is drawn inside its footprint (null = drawn with SVG, no bitmap). */
export function facadeBox(buildingId: string, tileSize: number, width: number, height: number) {
  const facade = FACADE_BY_BUILDING[buildingId];
  if (!facade) return null;
  const f = FACADES[facade.key];
  const ih = tileSize * facade.h;
  const iw = ih * f.aspect;
  return { key: facade.key as string, left: (width - iw) / 2, top: height - ih, iw, ih };
}

interface Props {
  width: number;
  height: number;
  type: BuildingType;
  tileSize?: number; // px per tile, to size the facade art
  buildingId?: string; // picks a bitmap facade when it has one (see FACADE_BY_BUILDING)
  variant?: number; // picks wall/roof colour + a couple of trim details so buildings aren't identical
}

const WALL_COLORS = ['#e8d9b5', '#d9c9a3', '#e3cdb0', '#ddd0b8'];
const ROOF_COLORS_HOUSE = ['#8a3b2b', '#6b3f6e', '#2f6b4a'];
const ROOF_COLOR_SHOP = '#2b5f8a';
const ROOF_COLOR_HALL = '#5b3a8a';
const ROOF_COLOR_GUILD = '#8a6a2b';
const TRIM_COLORS = ['#5b4a34', '#4a3b52', '#33513f'];

function CaveEntrance({ width, height, variant = 0 }: { width: number; height: number; variant?: number }) {
  const rock = variant % 2 === 0 ? '#6b6b70' : '#5f5f68';
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Ellipse cx={width / 2} cy={height + height * 0.03} rx={width * 0.52} ry={height * 0.06} fill="#000" opacity={0.18} />
      {/* rocky hillside mound instead of walls+roof - a cave isn't a house */}
      <Path
        d={`M 0 ${height} L ${width * 0.04} ${height * 0.4} Q ${width * 0.5} ${-height * 0.08} ${width * 0.96} ${height * 0.4} L ${width} ${height} Z`}
        fill={rock}
        stroke="#3a3a3e"
        strokeWidth={width * 0.008}
      />
      {[0.2, 0.42, 0.65, 0.82].map((f, i) => (
        <Ellipse key={i} cx={width * f} cy={height * (0.35 + (i % 2) * 0.2)} rx={width * 0.03} ry={height * 0.02} fill="#000" opacity={0.12} />
      ))}
      {/* dark archway mouth */}
      <Path
        d={`M ${width * 0.32} ${height} L ${width * 0.32} ${height * 0.58} Q ${width * 0.5} ${height * 0.32} ${width * 0.68} ${height * 0.58} L ${width * 0.68} ${height} Z`}
        fill="#0d0d10"
      />
      <Path
        d={`M ${width * 0.32} ${height} L ${width * 0.32} ${height * 0.58} Q ${width * 0.5} ${height * 0.32} ${width * 0.68} ${height * 0.58}`}
        fill="none"
        stroke="#2a2a2e"
        strokeWidth={width * 0.012}
      />
    </Svg>
  );
}

/**
 * Real proportioned building silhouette (roof / walls / door / windows),
 * drawn with react-native-svg since no bitmap building art exists or can
 * be sourced (see the copyright note in docs/AUDIT.md). v3 (this pass):
 * two more roof palettes for the hall/guild buildings from the new
 * archipelago, plus a dedicated cave-mouth render (a cave shouldn't look
 * like a house with a pitched roof).
 *
 * The door is drawn at the horizontal center of the bottom edge, matching
 * where worldGen.ts places the (now 3-tile-wide) walkable door, so the
 * art and the collision line up - the drawn door is a little narrower
 * than the walkable strip on purpose, so it reads as a doorway rather
 * than a garage door, while the extra width stays walkable either side.
 */
export function BuildingSprite({ width, height, type, buildingId, tileSize, variant = 0 }: Props) {
  if (type === 'cave') return <CaveEntrance width={width} height={height} variant={variant} />;

  const facade = buildingId ? FACADE_BY_BUILDING[buildingId] : undefined;
  if (facade) {
    const f = FACADES[facade.key];
    // Art height is fixed in tiles; width follows the art's aspect ratio.
    // Anchored bottom-centre so the drawn door sits on the walkable door.
    const ih = (tileSize ?? height / 5) * facade.h;
    const iw = ih * f.aspect;
    return (
      <View style={{ width, height }} pointerEvents="none">
        <Image source={f.src} resizeMode="stretch" style={{ position: 'absolute', width: iw, height: ih, left: (width - iw) / 2, top: height - ih }} />
      </View>
    );
  }

  const wallColor = WALL_COLORS[variant % WALL_COLORS.length];
  const roofColor = type === 'shop' ? ROOF_COLOR_SHOP : type === 'hall' ? ROOF_COLOR_HALL : type === 'guild' ? ROOF_COLOR_GUILD : ROOF_COLORS_HOUSE[variant % ROOF_COLORS_HOUSE.length];
  const trim = TRIM_COLORS[variant % TRIM_COLORS.length];
  const hasChimney = type === 'house' && variant % 2 === 0;
  const hasSign = type === 'shop' || type === 'guild';

  const roofHeight = height * 0.4;
  const wallTop = roofHeight * 0.58;
  const wallHeight = height - wallTop;

  const doorW = width * 0.3;
  const doorH = wallHeight * 0.56;
  const doorX = width / 2 - doorW / 2;
  const doorY = height - doorH;

  const windowSize = Math.min(width, height) * 0.1;
  const windowY = wallTop + wallHeight * 0.24;
  const windowXs = type === 'shop' || type === 'hall' ? [width * 0.16, width * 0.32, width * 0.68, width * 0.84] : [width * 0.2, width * 0.8];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* ground shadow so the building doesn't look like it's floating on the grass */}
      <Ellipse cx={width / 2} cy={height + height * 0.03} rx={width * 0.52} ry={height * 0.06} fill="#000" opacity={0.18} />

      <Rect x={width * 0.03} y={wallTop} width={width * 0.94} height={wallHeight} fill={wallColor} stroke={trim} strokeWidth={width * 0.008} />
      {/* corner posts for a bit of built-up depth */}
      <Rect x={width * 0.03} y={wallTop} width={width * 0.03} height={wallHeight} fill="#000" opacity={0.08} />
      <Rect x={width * 0.94} y={wallTop} width={width * 0.03} height={wallHeight} fill="#000" opacity={0.08} />

      <Polygon
        points={`0,${roofHeight} ${width / 2},0 ${width},${roofHeight} ${width * 0.95},${roofHeight} ${width / 2},${roofHeight * 0.16} ${width * 0.05},${roofHeight}`}
        fill={roofColor}
      />
      <Rect x={0} y={roofHeight * 0.84} width={width} height={roofHeight * 0.16} fill={roofColor} opacity={0.88} />
      {/* ridge shading: darker under-eave so the roof reads as two angled planes, not a flat triangle */}
      <Polygon points={`${width / 2},0 ${width},${roofHeight} ${width * 0.95},${roofHeight} ${width / 2},${roofHeight * 0.16}`} fill="#000" opacity={0.14} />
      {[0.3, 0.5, 0.7].map((f, i) => (
        <Line key={i} x1={width * f * 0.5 + width * 0.02} y1={roofHeight * f} x2={width - (width * f * 0.5 + width * 0.02)} y2={roofHeight * f} stroke="#000" opacity={0.08} strokeWidth={width * 0.006} />
      ))}

      {hasChimney && (
        <>
          <Rect x={width * 0.68} y={roofHeight * 0.1} width={width * 0.08} height={roofHeight * 0.55} fill={trim} />
          <Rect x={width * 0.665} y={roofHeight * 0.06} width={width * 0.09} height={roofHeight * 0.08} fill={trim} />
        </>
      )}

      {type === 'shop' && (
        <>
          <Rect x={width * 0.06} y={wallTop} width={width * 0.88} height={height * 0.06} fill="#f2c94c" stroke={trim} strokeWidth={width * 0.005} />
          {/* hanging sign */}
          <Line x1={width * 0.5} y1={wallTop} x2={width * 0.5} y2={wallTop - height * 0.05} stroke={trim} strokeWidth={width * 0.008} />
          <Rect x={width * 0.38} y={wallTop - height * 0.11} width={width * 0.24} height={height * 0.07} rx={width * 0.01} fill="#efe0bd" stroke={trim} strokeWidth={width * 0.006} />
        </>
      )}

      {windowXs.map((wx, i) => (
        <React.Fragment key={i}>
          <Rect x={wx - windowSize / 2} y={windowY} width={windowSize} height={windowSize} fill="#f0d98c" stroke={trim} strokeWidth={width * 0.005} />
          <Line x1={wx} y1={windowY} x2={wx} y2={windowY + windowSize} stroke={trim} strokeWidth={width * 0.004} />
          <Line x1={wx - windowSize / 2} y1={windowY + windowSize / 2} x2={wx + windowSize / 2} y2={windowY + windowSize / 2} stroke={trim} strokeWidth={width * 0.004} />
          {/* shutters */}
          <Rect x={wx - windowSize * 0.9} y={windowY} width={windowSize * 0.28} height={windowSize} fill={trim} opacity={0.75} />
          <Rect x={wx + windowSize * 0.62} y={windowY} width={windowSize * 0.28} height={windowSize} fill={trim} opacity={0.75} />
        </React.Fragment>
      ))}

      <Path
        d={`M ${doorX} ${doorY + doorH} L ${doorX} ${doorY + doorH * 0.3} Q ${doorX} ${doorY} ${doorX + doorW / 2} ${doorY} Q ${doorX + doorW} ${doorY} ${doorX + doorW} ${doorY + doorH * 0.3} L ${doorX + doorW} ${doorY + doorH} Z`}
        fill="#5b3a24"
        stroke="#3a2414"
        strokeWidth={width * 0.005}
      />
      <Line x1={doorX + doorW / 2} y1={doorY} x2={doorX + doorW / 2} y2={doorY + doorH} stroke="#3a2414" strokeWidth={width * 0.004} opacity={0.6} />
      <Rect x={doorX + doorW * 0.78} y={doorY + doorH * 0.48} width={doorW * 0.1} height={doorW * 0.1} rx={doorW * 0.05} fill="#f2c94c" />

      {/* little planter box either side of the door for a lived-in feel */}
      <Rect x={doorX - width * 0.09} y={height - height * 0.05} width={width * 0.07} height={height * 0.05} fill="#7a5a3a" />
      <Ellipse cx={doorX - width * 0.055} cy={height - height * 0.05} rx={width * 0.045} ry={height * 0.018} fill="#4a8a4f" />
    </Svg>
  );
}
