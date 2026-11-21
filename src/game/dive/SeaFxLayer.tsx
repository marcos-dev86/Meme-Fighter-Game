import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { isGamePaused } from '@/game/state/pauseState';
import { SEA_FX_META, type FxSpawn, type SeaFxName } from './seaFx';

/* eslint-disable @typescript-eslint/no-require-imports */
// Metro exige `require` literal. Tiras geradas por tools/import_sea_fx.py a partir do pacote new-sea-assets.
const FX_SRC: Record<SeaFxName, number> = {
  splash: require('../../../assets/sea/fx/splash.png'),
  spike: require('../../../assets/sea/fx/spike.png'),
  ball_impact: require('../../../assets/sea/fx/ball_impact.png'),
  ball_fly: require('../../../assets/sea/fx/ball_fly.png'),
  blast_end: require('../../../assets/sea/fx/blast_end.png'),
  vortex: require('../../../assets/sea/fx/vortex.png'),
  bubble: require('../../../assets/sea/fx/bubble.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export interface ActiveFx extends FxSpawn {
  key: string;
}

interface OneProps {
  fx: ActiveFx;
  onDone: (key: string) => void;
  /** efeitos que sobem (bolhas) flutuam para cima enquanto tocam */
  rise?: boolean;
}

/** Toca UM efeito na posição do mundo (coordenadas do mergulho). Termina sozinho, ou fica em loop até `untilMs`. */
function OneFx({ fx, onDone }: OneProps) {
  const meta = SEA_FX_META[fx.name];
  const [frame, setFrame] = useState(0);
  const born = useRef(0);
  useEffect(() => {
    let i = 0;
    let elapsed = 0;
    const id = setInterval(() => {
      if (isGamePaused()) return;
      elapsed += meta.frameMs;
      i += 1;
      if (i >= meta.frames) {
        if (meta.loopFrom !== undefined && fx.untilMs !== undefined && elapsed < fx.untilMs) i = meta.loopFrom;
        else {
          clearInterval(id);
          onDone(fx.key);
          return;
        }
      }
      if (fx.untilMs !== undefined && elapsed >= fx.untilMs) {
        clearInterval(id);
        onDone(fx.key);
        return;
      }
      setFrame(i);
    }, meta.frameMs);
    born.current = Date.now();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const scale = fx.size / meta.w;
  const h = meta.h * scale;
  const rise = fx.name === 'bubble' ? -(frame / meta.frames) * 22 : 0;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: fx.x - fx.size / 2, top: fx.y - h / 2 + rise, width: fx.size, height: h, overflow: 'hidden' }}>
      <Image
        source={FX_SRC[fx.name]}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: -frame * fx.size, width: meta.frames * fx.size, height: h }}
        fadeDuration={0}
      />
    </View>
  );
}

/** Camada de efeitos de água. Fica DENTRO da view do mundo do mergulho (move junto com a câmera). */
export function SeaFxLayer({ items, onDone }: { items: ActiveFx[]; onDone: (key: string) => void }) {
  return (
    <>
      {items.map((fx) => (
        <OneFx key={fx.key} fx={fx} onDone={onDone} />
      ))}
    </>
  );
}
