import React from 'react';
import { Asset } from 'expo-asset';
import { Image, Platform, View, type ImageStyle, type ImageSourcePropType } from 'react-native';
import { getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import { ICON_SOURCES } from '@/game/ui/iconRegistry';
import { canWearCosmetics, getCosmeticAnchors } from './anchors';
import { COSMETIC_BY_ID, skinFolder } from './cosmeticDefs';
import { SKIN_SPRITES } from './skinSources';
import { getEquipped, type Equipped } from '@/game/state/cosmeticsState';

/** Retângulo (em px) em que a imagem da pose está desenhada, dentro do contêiner do personagem. */
export interface PoseBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A base visual do chapéu fica a esta fração da altura do ícone (os ícones têm margem embaixo). */
const HAT_BASE = 0.82;

const PIXELATED = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : null;

/** Sprite do corpo na pose, já com a skin equipada (se houver). */
export function getBodySprite(characterKey: string, poseKey: string, skinId: string | null): ImageSourcePropType {
  if (skinId) {
    const s = SKIN_SPRITES[characterKey]?.[skinFolder(skinId)]?.[poseKey];
    if (s) return s;
  }
  return getSprite(characterKey as never, poseKey);
}

interface LayerProps {
  characterKey: string;
  poseKey: string;
  box: PoseBox;
  /** 1 = olhando para a direita (sprite original); -1 = espelhado. */
  dir: 1 | -1;
  cosmeticId: string | null;
}

function layerSource(id: string | null) {
  if (!id) return null;
  const def = COSMETIC_BY_ID[id];
  return def?.icon ? ICON_SOURCES[def.icon] : null;
}

/** Capa: desenhada ATRÁS do sprite (renderize antes da imagem do corpo). */
export function CapeLayer({ characterKey, poseKey, box, dir, cosmeticId }: LayerProps) {
  const src = layerSource(cosmeticId);
  const a = getCosmeticAnchors(characterKey, poseKey);
  if (!src || !a) return null;
  const size = a.back.s * box.height;
  const cx = box.left + (dir === 1 ? a.back.x : 1 - a.back.x) * box.width;
  return (
    <Image
      source={src}
      resizeMode="stretch"
      style={[{ position: 'absolute', left: cx - size / 2, top: box.top + a.back.y * box.height, width: size, height: size, transform: [{ scaleX: dir }] }, PIXELATED]}
    />
  );
}

/** Chapéu: desenhado POR CIMA do sprite (renderize depois da imagem do corpo). */
export function HatLayer({ characterKey, poseKey, box, dir, cosmeticId }: LayerProps) {
  const src = layerSource(cosmeticId);
  const a = getCosmeticAnchors(characterKey, poseKey);
  if (!src || !a) return null;
  const size = a.hat.s * box.height;
  const cx = box.left + (dir === 1 ? a.hat.x : 1 - a.hat.x) * box.width;
  return (
    <Image
      source={src}
      resizeMode="stretch"
      style={[{ position: 'absolute', left: cx - size / 2, top: box.top + a.hat.y * box.height - size * HAT_BASE, width: size, height: size, transform: [{ scaleX: dir }] }, PIXELATED]}
    />
  );
}

export { canWearCosmetics };

const BODY_POSES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong'];
const preloaded = new Set<string>();
/**
 * Na web uma imagem só carrega quando aparece pela primeira vez, e o corpo piscava ao trocar de pose ou de skin.
 * Aqui carregamos todas as poses antes. No celular os sprites já vêm no pacote, então não faz nada.
 */
export function preloadBodySprites(characterKey: string, skinId: string | null) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    for (const pose of BODY_POSES) {
      const mod = getBodySprite(characterKey, pose, skinId);
      if (typeof mod !== 'number' && typeof mod !== 'object') continue;
      const uri = Asset.fromModule(mod as number).uri;
      if (!uri || preloaded.has(uri)) continue;
      preloaded.add(uri);
      const img = new window.Image();
      img.src = uri;
    }
  } catch {
    // pré-carregar é só um ganho de fluidez: nunca pode derrubar o jogo
  }
}

/**
 * Personagem parado com os cosméticos (para os menus, a loja e o perfil). `override` mostra uma combinação
 * de teste (ex.: provar um item antes de comprar); sem ele usa o que o jogador está vestindo.
 */
export function CosmeticPreview({ characterKey, height = 150, override }: { characterKey: string; height?: number; override?: Partial<Equipped> }) {
  const eq = { ...getEquipped(), ...override };
  const aspect = SPRITE_ASPECTS[characterKey as keyof typeof SPRITE_ASPECTS]?.idle ?? 0.8;
  const w = height * aspect;
  const boxW = height * 1.5;
  const box: PoseBox = { left: (boxW - w) / 2, top: height * 0.22, width: w, height };
  const wears = canWearCosmetics(characterKey);
  return (
    <View style={{ width: boxW, height: height * 1.22 }}>
      {wears && <CapeLayer characterKey={characterKey} poseKey="idle" box={box} dir={1} cosmeticId={eq.cape} />}
      <Image source={getBodySprite(characterKey, 'idle', wears ? eq.skin : null)} resizeMode="stretch" style={{ position: 'absolute', left: box.left, top: box.top, width: w, height }} />
      {wears && <HatLayer characterKey={characterKey} poseKey="idle" box={box} dir={1} cosmeticId={eq.hat} />}
    </View>
  );
}
