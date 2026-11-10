# Limpeza de código morto (feita)

Tudo o que não era usado foi removido (conferido por busca em `src/`, `app.json`, ferramentas e testes, e por `tsc --noUnusedLocals`):

- `assets/legacy-sprites/` inteira (desenhos antigos dos 16 lutadores). O jogo usa só `assets/sprites-v2/`.
  - Retratos dos NPCs que ainda eram usados foram para `assets/npc-portraits/` (footman, hood, monk, moai, tank_dog, meme-kin/*).
  - O voo antigo dos 3 dragões (fonte de `tools/import_sheets.py`) está em `tools/art_src/legacy_flight/`.
- `assets/sprites-v2/ACTIVE.json` (chave liga/desliga dos sprites novos) e o código que a lia (`usesV2`, `LEGACY_SOURCES`, `LEGACY_ASPECTS`).
- `assets/skins/` e `src/game/cosmetics/skinSources.ts` (skins antigas); âncoras antigas de cosméticos/mão em `anchors.ts` e `handAnchors.ts`.
- Ferramentas dos desenhos antigos: `make_legacy_sprites.py`, `legacy_chars.py`, `legacy_draw.py`, `test_legacy_sprites.py`, `measure_anchors.py`, `make_cosmetics.py` (a receita de matiz foi para `make_wear_v2.py`).
- Sobras do modelo Expo e logos antigos em `assets/images/`, `assets/expo.icon/`, `scripts/reset-project.js` (e o script `reset-project` do `package.json`), `assets/buildings/nb_casa_pequena2.png`.
- Módulos sem uso: `src/game/world/UpgradeShopOverlay.tsx`, `src/components/ui/collapsible.tsx`; importações e variáveis não usadas (BattleScreen, WorldScreen etc.).

## NÃO apague
- `tools/art_src/sheets/` (folhas originais), `tools/art_src/avatars_fixed/` (ícones corrigidos), `tools/art_src/legacy_flight/`.
- `assets/sprites-v2/**/ORIGEM.json`, `assets/skins-v2/`, `assets/legacy-art/` (cenários e menus), `assets/npc-walk/`, `assets/npc-portraits/`, `assets/audio/`, `assets/cutscenes/`.
- `src/game/state/legacyIds.ts` e `LEGACY_KEY` em `saveState.ts` (migração de saves antigos).
