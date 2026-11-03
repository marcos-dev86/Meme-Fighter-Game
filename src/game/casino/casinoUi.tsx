import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ROULETTE_WHEEL, rouletteColor, rouletteLabel } from './casinoMath';

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Um dado com as pintinhas desenhadas (sem emoji). */
export function DieFace({ value, size = 46 }: { value: number; size?: number }) {
  const cell = size / 3;
  const pip = Math.max(6, size * 0.17);
  return (
    <View style={[styles.die, { width: size, height: size, borderRadius: size * 0.2 }]}>
      {(PIP_LAYOUT[value] ?? []).map((g) => (
        <View
          key={g}
          style={{
            position: 'absolute',
            left: (g % 3) * cell + (cell - pip) / 2,
            top: Math.floor(g / 3) * cell + (cell - pip) / 2,
            width: pip,
            height: pip,
            borderRadius: pip / 2,
            backgroundColor: '#1a1020',
          }}
        />
      ))}
    </View>
  );
}

const RANK_LABEL = (r: number) => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

/** Carta de baralho: o naipe vermelho é um losango, o preto é um círculo. */
export function PlayingCard({ rank, hidden, red = true, height = 78 }: { rank: number; hidden?: boolean; red?: boolean; height?: number }) {
  const width = height * 0.7;
  if (hidden) {
    return (
      <View style={[styles.card, styles.cardBack, { width, height }]}>
        <View style={styles.cardBackInner} />
      </View>
    );
  }
  const color = red ? '#d9253b' : '#1a1020';
  return (
    <View style={[styles.card, { width, height }]}>
      <Text style={[styles.cardRank, { color, fontSize: height * 0.3 }]}>{RANK_LABEL(rank)}</Text>
      {red ? (
        <View style={{ width: height * 0.2, height: height * 0.2, backgroundColor: color, transform: [{ rotate: '45deg' }], marginTop: 4 }} />
      ) : (
        <View style={{ width: height * 0.22, height: height * 0.22, backgroundColor: color, borderRadius: height * 0.11, marginTop: 4 }} />
      )}
    </View>
  );
}

const POCKET_COLOR = { red: '#d9253b', black: '#15151c', green: '#1f9d55' } as const;

/** Roda da roleta americana: 38 bolsos em círculo e uma bolinha que anda de bolso em bolso. */
export function RouletteWheel({ ballIndex, size = 132, centerNumber }: { ballIndex: number; size?: number; centerNumber: number | null }) {
  const r = size / 2 - 9;
  const c = size / 2;
  const count = ROULETTE_WHEEL.length;
  const place = (i: number, d: number) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { left: c + Math.cos(a) * r - d / 2, top: c + Math.sin(a) * r - d / 2 };
  };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.wheelBase, { width: size, height: size, borderRadius: size / 2 }]} />
      {ROULETTE_WHEEL.map((n, i) => (
        <View key={i} style={[{ position: 'absolute', width: 13, height: 13, borderRadius: 7, backgroundColor: POCKET_COLOR[rouletteColor(n)], borderWidth: 1, borderColor: '#caa64a' }, place(i, 13)]} />
      ))}
      <View style={[{ position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#555' }, place(ballIndex, 9)]} />
      <View style={[styles.wheelCenter, { left: c - 24, top: c - 24, backgroundColor: centerNumber === null ? '#2a1a10' : POCKET_COLOR[rouletteColor(centerNumber)] }]}>
        {centerNumber !== null && <Text style={styles.wheelCenterText}>{rouletteLabel(centerNumber)}</Text>}
      </View>
    </View>
  );
}

export { POCKET_COLOR };

const styles = StyleSheet.create({
  die: { backgroundColor: '#f4f4f4', borderWidth: 2, borderColor: '#b9b9c4' },
  card: { backgroundColor: '#f7f7f2', borderRadius: 7, borderWidth: 2, borderColor: '#b9b9c4', alignItems: 'center', justifyContent: 'center' },
  cardBack: { backgroundColor: '#7a1d34', borderColor: '#caa64a' },
  cardBackInner: { width: '70%', height: '78%', borderWidth: 2, borderColor: '#caa64a', borderRadius: 4 },
  cardRank: { fontWeight: '900' },
  wheelBase: { position: 'absolute', backgroundColor: '#3b2314', borderWidth: 3, borderColor: '#caa64a' },
  wheelCenter: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#caa64a', alignItems: 'center', justifyContent: 'center' },
  wheelCenterText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
