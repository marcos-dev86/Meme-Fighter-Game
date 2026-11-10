# Sprites novos (folhas do dono) — como funciona e como trocar

## Estrutura
- Folhas originais: `tools/art_src/sheets/<personagem>.png` (orc, soldier, gadigago, dogge, sahur). **Nunca são apagadas.**
- Importador: `python3 tools/import_sheets.py [personagem ...]` recorta cada quadro da folha (fundo preto removido) e gera
  `assets/sprites-v2/<personagem>/<pose>.png` + `ORIGEM.json` + `src/game/battle/spritesV2.ts` (gerado).
- Dogge e Gadigago usam skins/chapéu/capa/arma: `python3 tools/make_wear_v2.py` (depois do importador) gera `assets/skins-v2/`
  e `src/game/cosmetics/wearV2.ts` (âncoras medidas nos quadros novos).
- **Fonte única:** os sprites novos são os únicos do jogo (os desenhos antigos e o `ACTIVE.json` foram apagados). Trocar um personagem é só reenviar a folha com o mesmo nome e rodar os 2 comandos.

## Modelo de folha reconhecido (o mesmo dos 5 enviados)
| Linha | `std` (gadigago, dogge, sahur) | `soldier` | `orc` |
|---|---|---|---|
| 0 | retrato grande + 5 passos | idem | idem |
| 1 | guarda, soco curto, soco longo, investida | guarda, jab, soco longo, recuo, carregando | frente, costas, agachado, golpe com arco |
| 2 | aura, bola, rastro, conjurar, levando golpe | explosão de gelo, bola, rastro, conjurar, levando golpe | bola grande, bola pequena, rastro, levando golpe, nocaute |
| 3 | 4 expressões + nocaute | 4 agachados, ajoelhado, nocaute | 4 rostos |

Se uma folha vier com outra contagem de quadros, o importador **para e diz qual linha não bate** (não chuta).

## Quadros no jogo
`idle, walk1-5, dash, flash (soco curto), strong (soco longo), hurt (levando golpe), ko (nocaute), charge (aura), cast (pose do
ultimate), ult (rastro do ultimate), orb, burst, portrait, exp1-4/face1-4/front/back (guardados para uso futuro)`.
O motor usa idle/walk/dash/flash/strong/hurt/ko/charge/cast/ult. Quadro que o personagem não tem cai num alternativo
(`resolvePose` em `sprites.ts`: cast→dash, hurt/ko/charge→idle).
O tamanho em tela de cada lutador **não muda**: o layout usa a proporção do idle antigo (`LEGACY_ASPECTS`).

## Limites conhecidos
- Orc: a folha não traz guarda nem soco; o idle é o retrato reduzido, `flash/cast` = agachado, `strong/dash` = golpe com arco.
- `exp1-4`, `face1-4`, `front`, `back`, `portrait`, `orb`, `burst` ainda não são usados em tela.
- Os outros 11 lutadores seguem com os sprites antigos até chegarem as folhas.


## Rodada 2: 13 personagens, idle parado, peso
- Personagens com folha: orc, soldier, gadigago, dogge, sahur, ninja, troll_face, sahur_evil, sahur_god, dogking, tank, mystic, cara_tranquilo (restam os 3 dragões no desenho antigo).
- `idle` = retrato parado reduzido à escala dos passos; `guard` = guarda. Folhas "newA/newB": ver `SHEET_CFG` (pontos de corte por folha) em `tools/import_sheets.py`.
- Peso: `tools/png_opt.py` (corpo ≤ 200 px, 256 cores). Para sem perdas: `MF_NO_OPT=1 python3 tools/import_sheets.py`.
- Depois de importar, rode `python3 tools/make_wear_v2.py` (skins/âncoras de Dogge e Gadigago).


## Rodada 3: últimas folhas (orc 2ª folha + 3 dragões)
- `orc_2.png`: 2ª folha do orc (guarda, soco, golpes, dash, KO, passos extras); orc passa a ter 29 quadros (walk1-5, guard, charge, cast, dash, dash2, flash, strong, hurt, ko, ult…).
- `shadow_dragon.png`, `ice_dragon.png`, `green_dragon.png`: layout da folha — linha 0 retrato + 5 voos (**não usados**), linha 1 explosões/quadros (no dragão de sombra o "blast" está colado ao quadro anterior, vira `strong`), linha 2 aura/redemoinho/rastro/dash/blast, linha 3 4 poses + KO.
- **Voo (idle/walk1-3/ult) dos dragões = sprites ANTIGOS**, ampliados (vizinho mais próximo + LANCZOS) para casar com a largura dos quadros novos (pedido do dono: a folha não trouxe voo bom).
- `sprites.ts`: `V2_LAYOUT_FROM_IDLE` faz o tamanho em tela dos dragões vir do idle (a largura do corpo não muda).
- Limpeza do que era antigo: `docs/PODE_APAGAR.md`.
