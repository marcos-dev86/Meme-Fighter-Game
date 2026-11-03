import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';

interface Props {
  size: number;
  skinColor: string;
  outfitColor: string;
  hairColor: string;
}

/**
 * A small top-down "chibi" person: shadow, body, head, hair: drawn with
 * shapes instead of a flat circle-with-a-letter (the "card colecionável"
 * look that was flagged). Not a hand-drawn sprite (no image-generation or
 * web-image tool is available here, and Pokémon's actual character art
 * is copyrighted and wasn't a legitimate source anyway: see docs/AUDIT.md),
 * but a real character silhouette instead of a UI chip.
 */
export function CharacterMarker({ size, skinColor, outfitColor, hairColor }: Props) {
  const w = size;
  const h = size * 1.15;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Ellipse cx={w / 2} cy={h * 0.92} rx={w * 0.28} ry={h * 0.07} fill="rgba(0,0,0,0.3)" />
      <Path d={`M ${w * 0.38} ${h * 0.62} L ${w * 0.38} ${h * 0.85} L ${w * 0.47} ${h * 0.85} L ${w * 0.47} ${h * 0.62} Z`} fill="#3a3a4a" />
      <Path d={`M ${w * 0.53} ${h * 0.62} L ${w * 0.53} ${h * 0.85} L ${w * 0.62} ${h * 0.85} L ${w * 0.62} ${h * 0.62} Z`} fill="#3a3a4a" />
      <Path
        d={`M ${w * 0.28} ${h * 0.42} Q ${w * 0.5} ${h * 0.34} ${w * 0.72} ${h * 0.42} L ${w * 0.68} ${h * 0.68} Q ${w * 0.5} ${h * 0.74} ${w * 0.32} ${h * 0.68} Z`}
        fill={outfitColor}
      />
      <Ellipse cx={w / 2} cy={h * 0.28} rx={w * 0.26} ry={h * 0.24} fill={skinColor} />
      <Path
        d={`M ${w * 0.24} ${h * 0.24} Q ${w * 0.2} ${h * 0.02} ${w * 0.5} ${h * 0.02} Q ${w * 0.8} ${h * 0.02} ${w * 0.76} ${h * 0.24} Q ${w * 0.7} ${h * 0.1} ${w * 0.5} ${h * 0.1} Q ${w * 0.3} ${h * 0.1} ${w * 0.24} ${h * 0.24} Z`}
        fill={hairColor}
      />
    </Svg>
  );
}
