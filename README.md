# Meme Fighter RPG

RPG de ação 2D em visão de cima com lutas de arena estilo "Mortal Kombat": explore o mapa, cumpra missões, derrote chefes,
desbloqueie lutadores e jogue Versus (contra a CPU ou em 2 jogadores). Feito com Expo (SDK 57), React Native 0.86, React 19,
expo-router e TypeScript. Roda no celular (Android/iOS via Expo Go ou APK) e no navegador.

## Rodando

```bash
npm install
npx expo start            # QR code para o Expo Go; pressione "w" para abrir no navegador
npx expo start --web
npx tsc --noEmit          # checagem de tipos (deve terminar sem erros)
```

Orientação: sempre paisagem. Idiomas: português (BR), inglês, espanhol, francês e japonês (Opções).

## Testes

Todos os testes de lógica rodam no Node, sem Expo (`tools/ts-register.cjs` transpila o TypeScript na hora):

```bash
for f in tools/test-*.mjs; do node $f; done
CUTSCENES_STRICT=1 node tools/test-cutscenes.mjs   # confere também os vídeos em disco
```

| Arquivo | O que cobre |
| --- | --- |
| `test-parte01` / `test-parte2` / `test-parte3` / `test-urgente2` / `test-urgente3` / `test-dano` | combate, sprites, itens, mapa, vida persistente, armaduras, renomeações |
| `test-conta` | conta, perfil, conquistas, progresso |
| `test-cutscenes` | as 32 cutscenes (história, finais e curtas) |
| `test-versus` | grade de seleção, tela VS, abertura ROUND/LUTE! |
| `test-i18n` | os 5 idiomas têm as mesmas chaves, marcadores `{x}` iguais, sem texto fixo |
| `test-saves` | saves antigos (v1, v2, ids antigos, JSON quebrado, 3 slots) e campos novos (rival, elites, opções) com padrão seguro |
| `test-platina` / `test-platina100` | pesos da barra (soma 100), regras de nível 99/147 pontos/árvore e o teste de 100% que prova que a platina libera |
| `test-ambient` | sons por região (floresta dia/noite, caverna, vulcão, gelo, cassino, interiores): no máximo 2 loops |
| `test-rival-elite` | 5 aparições do rival e inimigos de elite |
| `test-roster-compra` | elenco do Versus: liberar pela história, comprar com diamantes (30 a 150 ou mais pelos atributos), dicas de como liberar, sem o rótulo TEM |
| `test-morte-secret` | raridade Secret (dados, bônus, cores, preços, 5 idiomas) e avisos de morte contextuais (inimigo, chefe, rival, criatura, afogamento, veneno, região, estatísticas) |
| `test-pause-timers` | pausa, timers sem limpeza e animações infinitas sem cancelamento; opções gráficas |

Auditoria de traduções (5 idiomas): `node tools/check-i18n.mjs` (ou `npm run check:i18n`): chaves faltando, duplicadas, não traduzidas e problemas de estrutura.

Testes no navegador (precisam de Playwright e de um export web):

```bash
npx expo export --platform web --output-dir dist
node tools/e2e-versus.mjs dist      # idem: e2e-conta, e2e-cutscenes, e2e-parte01, e2e-parte2, e2e-urgente1, e2e-urgente3 ...
```

## Estrutura

```
src/app/            rotas (expo-router): mapa, luta, versus, cutscene, opções ...
src/screens/        telas (WorldScreen, BattleScreen, VersusScreen, EndingScreen ...)
src/game/battle/    motor de luta, sprites (sprites.ts, spritesV2.ts gerado), IA, âncoras de mão
src/game/world/     mapa, NPCs, baús, cassino, escalada, eventos
src/game/state/     estado persistente (saves em 3 slots, missões, chefes, elenco, progresso/platina)
src/game/story/     personagens, missões, cutscenes em vídeo (cutscenes.ts, CutscenePlayer, ShortCutsceneHost)
src/game/versus/    Versus estilo Mortal Kombat: registro de lutadores, FighterSelect (dois toques), VersusSplash, versusLogic
src/game/audio/     audioManager (música, sfx, ambientes com cross-fade), ambientMix (qual ambiente toca onde)
src/game/enemies/   inimigos do mundo e elites (eliteDefs)
src/game/i18n/      textos nos 5 idiomas (translations.ts + stringsXxx.ts mesclados por extraStrings.ts)
assets/             sprites-v2 (lutadores), npc-walk, npc-portraits, avatars, legacy-art (cenários/menus),
                    audio (música, sfx, ambiente), cutscenes (MP4), icons, furniture ...
tools/              geradores de assets (Python), testes (Node) e e2e (Playwright), tools/cutscenes (renderizador dos vídeos)
docs/               AUDIT.md (diário técnico), CUTSCENES.md, HISTORIA.md, SPRITES_V2.md, MEMES.md, PODE_APAGAR.md, APK_CHECKLIST.md
```

## Sistemas principais

- **Estado e saves**: cada sistema guarda seu pedaço em `registerSaveExt` (`src/game/state/saveExt.ts`); `saveState.ts` grava 3 slots (v2) e migra saves antigos. Opções (volumes, gráficos) ficam à parte em `settingsState.ts`; a conta (perfil, conquistas, cosméticos) é global em `src/game/account/`.
- **Progresso e platina**: `progressState.ts` calcula 18 categorias (soma 100); a platina libera com todas completas (pesos e justificativa em `docs/AUDIT.md`).
- **Rival e elites**: `rivalState.ts` + `battle/battleModes.ts` (5 aparições) e `enemies/eliteDefs.ts` (6 elites sobre spawns existentes).
- **Áudio**: `audioManager.ts` (pausa global em `state/pauseState.ts`), ambientes em `assets/audio/ambient` (os novos saem de `python3 tools/make_ambient.py`).
- **Opções gráficas** (Opções > Geral): MODO LEVE, partículas do clima, ondas animadas e escurecer à noite.

## Regenerando assets (opcional; o repositório já traz os arquivos prontos)

Os scripts em `tools/` precisam de Python 3 com Pillow e numpy (e `ffmpeg` para as cutscenes).

- Sons ambiente por região: `python3 tools/make_ambient.py` (síntese determinística; precisa de numpy e ffmpeg).
- Lutadores: `python3 tools/import_sheets.py` recorta as folhas de `tools/art_src/sheets/` para `assets/sprites-v2` e gera `spritesV2.ts`.
- Avatares: `python3 tools/make_avatars.py` (ícones feitos à mão em `tools/art_src/avatars_fixed/` têm prioridade).
- Cosméticos/armaduras sobre os sprites: `python3 tools/make_wear_v2.py`.
- Cutscenes: `python3 tools/cutscenes/run.py <ids>` (usa só imagens e áudios que já existem no jogo).

## Regras do projeto

- Nada de sprites, animações, áudios ou dados inventados: o jogo só usa arte e som que existem em `assets/`.
- Saves ficam só no aparelho (AsyncStorage). Formato e migrações: `src/game/state/saveState.ts`.
- Limpezas e decisões antigas: `docs/AUDIT.md` e `docs/PODE_APAGAR.md`.

## Gerar o APK

Veja `docs/APK_CHECKLIST.md`.
