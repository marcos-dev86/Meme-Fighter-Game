# O que dá para apagar do projeto (e o que NÃO apagar)

Conferido por busca: para cada arquivo de `assets/` eu procurei o caminho em `src/`, em `app.json` e nas ferramentas. Nada foi apagado por mim.
Regra de ouro: **faça um commit antes de apagar** (`git commit`), assim dá para voltar atrás.

## A) Pode apagar AGORA (nada no jogo usa; não quebra build nem teste)
| O que | Tamanho | Por quê |
|---|---|---|
| `assets/images/logo/` (pasta inteira, 6 arquivos) | 956 KB | logos antigos; o jogo usa `game-logo-gold.png` |
| `assets/images/tabIcons/` (pasta inteira) | 28 KB | ícones de abas do modelo do Expo, o jogo não tem abas |
| `assets/images/expo-badge.png`, `expo-badge-white.png`, `expo-logo.png` | pequeno | sobras do modelo do Expo |
| `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png` | pequeno | sobras do modelo do Expo |
| `assets/images/tutorial-web.png` | pequeno | sobra do modelo do Expo |
| `assets/images/logo-glow.png`, `assets/images/game-logo-text-gold.png` | pequeno | ninguém usa |
| `assets/expo.icon/` (pasta inteira) | 72 KB | ícone iOS do modelo do Expo; o `app.json` usa `assets/images/icon.png` |
| `assets/buildings/nb_casa_pequena2.png` | pequeno | casa que nunca entrou no mapa |
| `scripts/reset-project.js` (e a pasta `scripts/`) | 4 KB | script do modelo que **zera o projeto**; melhor não deixar à mão |

**Não apague** `assets/images/icon.png`, `favicon.png`, `splash-icon.png`, `android-icon-*.png`, `game-logo-gold.png` (usados no `app.json` e na tela inicial).

## B) Só dá para apagar DEPOIS de eu mudar o código (me avise e eu faço)
Hoje todos os 16 lutadores usam os sprites novos (`assets/sprites-v2`). Os desenhos antigos ainda existem como **reserva**: o
`ACTIVE.json` liga/desliga por personagem, e `src/game/battle/sprites.ts` ainda carrega os arquivos antigos. Por isso, apagar só a pasta
quebraria o build. Quando você disser que não quer mais voltar atrás, eu removo a reserva do código e aí estas pastas podem sair:
- `assets/legacy-sprites/` → pastas dos lutadores: `cara_tranquilo`, `dogge`, `dogking`, `gadigago`, `green_dragon`, `ice_dragon`, `mystic`, `ninja`, `orc`, `sahur`, `sahur_evil`, `sahur_god`, `shadow_dragon`, `soldier`, `tank_fighter`, `troll_face` (≈ 2,9 MB) e o `ORIGEM.json`.
  - **Ficam** (os NPCs do mapa usam): `footman`, `hood`, `meme-kin`, `moai`, `monk`, `tank`.
  - Os 3 dragões já tiveram o voo (idle e andar) **copiado e ampliado** para `assets/sprites-v2/<dragao>/`; o jogo não depende mais da pasta antiga deles.
- `assets/skins/` (skins antigas de Dogge e Gadigago, 2,5 MB): só servem quando o sprite novo deles é desligado; as novas estão em `assets/skins-v2/`.

## C) NÃO apague
- `tools/art_src/sheets/` (**as folhas originais que você enviou**, incluindo `orc.png`, `orc_2.png` e as dos 3 dragões): são a fonte de tudo; o importador recorta delas.
- `tools/art_src/npc_sheets/` e as demais folhas em `tools/art_src/`.
- `assets/sprites-v2/**/ORIGEM.json`, `assets/sprites-v2/ACTIVE.json`, `assets/skins-v2/`, `assets/legacy-art/`, `assets/npc-walk/`, `assets/audio/`.
- `node_modules/` e `dist/` podem ser apagados **no seu PC** a qualquer momento (o `npm install` refaz; o `dist` é gerado pelo export), mas não vão para o GitHub (`.gitignore`).

## Resumo do ganho
A) ≈ 1,5 MB · B) ≈ 5,4 MB. É pouco: o peso do app está no áudio (30 MB, `assets/audio`), que **não** recomendo mexer.
