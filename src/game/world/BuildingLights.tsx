import React, { memo } from 'react';
import { View } from 'react-native';
import { facadeBox } from './BuildingSprite';

/** Lit windows (and a few lamps) per facade bitmap: [x0, y0, x1, y1] as fractions of the art. */
type R = [number, number, number, number];

function grid(xs: [number, number][], ys: [number, number][]): R[] {
  const out: R[] = [];
  for (const [y0, y1] of ys) for (const [x0, x1] of xs) out.push([x0, y0, x1, y1]);
  return out;
}

const WINDOWS: Record<string, R[]> = {
  casa1: [[0.17, 0.7, 0.37, 0.86], [0.64, 0.7, 0.83, 0.86]],
  casa2: [[0.4, 0.37, 0.58, 0.53], [0.56, 0.68, 0.74, 0.84]],
  casa3: [[0.18, 0.66, 0.32, 0.83], [0.66, 0.66, 0.8, 0.83]],
  casa4: [[0.14, 0.64, 0.31, 0.83], [0.69, 0.64, 0.86, 0.83]],
  casa5: [[0.19, 0.65, 0.33, 0.82], [0.67, 0.65, 0.81, 0.82]],
  casa6: [[0.19, 0.66, 0.34, 0.85], [0.66, 0.66, 0.81, 0.85]],
  predio1: grid(
    [[0.21, 0.35], [0.42, 0.58], [0.65, 0.8]],
    [[0.23, 0.36], [0.49, 0.64], [0.75, 0.88]],
  ),
  predio2: grid(
    [[0.256, 0.336], [0.456, 0.536], [0.656, 0.736]],
    Array.from({ length: 8 }, (_, i) => [0.15 + i * 0.094, 0.15 + i * 0.094 + 0.045] as [number, number]),
  ),
  predio3: [
    ...grid([[0.21, 0.44], [0.53, 0.77]], [[0.26, 0.4], [0.43, 0.57], [0.61, 0.75]]),
    [0.23, 0.78, 0.29, 0.86],
    [0.69, 0.78, 0.75, 0.86],
  ],
  iglu: [[0.42, 0.64, 0.58, 0.82]],
};

interface Props {
  buildingId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tileSize: number;
}

/** Warm window glow for one building; drawn above the night darkness. */
export const BuildingLights = memo(function BuildingLights({ buildingId, x, y, width, height, tileSize }: Props) {
  const box = facadeBox(buildingId, tileSize, width, height);
  if (!box) return null;
  const wins = WINDOWS[box.key];
  if (!wins) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x + box.left, top: y + box.top, width: box.iw, height: box.ih }}>
      {wins.map((w, i) => {
        const left = w[0] * box.iw;
        const top = w[1] * box.ih;
        const ww = (w[2] - w[0]) * box.iw;
        const hh = (w[3] - w[1]) * box.ih;
        const pad = Math.max(3, ww * 0.35);
        return (
          <React.Fragment key={i}>
            <View style={{ position: 'absolute', left: left - pad, top: top - pad, width: ww + pad * 2, height: hh + pad * 2, borderRadius: pad + 4, backgroundColor: 'rgba(255,170,60,0.22)' }} />
            <View style={{ position: 'absolute', left, top, width: ww, height: hh, backgroundColor: 'rgba(255,214,110,0.9)', borderRadius: 1 }} />
          </React.Fragment>
        );
      })}
    </View>
  );
});
