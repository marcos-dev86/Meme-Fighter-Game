# Créditos e licenças dos assets do mar

Todos os arquivos vieram do pacote `new-sea-assets.zip` enviado por Marcos. Só estão aqui os que o jogo usa.

| Pasta | O que é | Origem e licença |
| --- | --- | --- |
| `tiles/` (e `maps/`, gerados a partir dele) | Time Fantasy Atlantis Tileset (`tf_A5_atlantisA/B.png`) | Arte de **finalbossblues** (Time Fantasy, timefantasy.net / finalbossblues.com). O `readme.txt` do próprio pacote diz que é um "FREE release for anybody to download". Ele não detalha mais nenhum termo (uso comercial, atribuição obrigatória), então **confira o site do autor antes de publicar o jogo**. Mantenha este crédito. |
| `creatures/` | Folhas de animais marinhos (moreia, polvo, águas-vivas, caranguejo, tartaruga, peixes, tamboril, baleia, algas) | O pacote **não traz autor nem licença**. Origem não verificada: confirme com quem forneceu o pacote antes de publicar. |
| `../sprites-v2/sea_beast/` | Sea Beast (Leviatã), recortado de `sea monster/folha (1).png` e `(2).png` | Sem autor nem licença no pacote. Mesma observação acima. Gerado por `tools/import_sea_beast.py`. |
| `../legacy-art/stages/stage13*.webp` | Cenário de mar aberto, recortado de `paisagens/` | Sem autor nem licença no pacote. Mesma observação acima. |

| `fx/` | Efeitos de água: Water Effect 01 (Splash, Spike) e Water Effect 2 (Water Ball, Water Blast), mais as bolhas de `tf_atlantis/char_bubbles.png` | Convertidos de grade para tira por `tools/import_sea_fx.py`. Os Water Effect não trazem autor nem licença no pacote; as bolhas são do Time Fantasy Atlantis (mesma observação da primeira linha). **Confirme antes de publicar.** |
| `emoji/` | 4 emojis do "Viral Emojis [assetpack] [sample]" (7, 54, 115, 194), 256 px reduzidos a 128 px sem suavizar | O próprio nome diz que é uma **amostra** (sample) de um pacote maior; sem licença no arquivo. **Confirme os termos antes de publicar.** |
| `cutscene-src/` | Folhas de tritões/sereias (`mer_8_*`), bolhas, tiles de Atlântida, respingo e impacto d'água usadas só **offline** para renderizar as cutscenes 14–21 (`tools/cutscenes/scenes_mar.py`) | Origem: `tf_atlantis` (Time Fantasy, ver acima) e os efeitos de água acima. Os vídeos finais ficam em `assets/cutscenes/`. |

NPCs aquáticos no mergulho: continuam com o marcador de personagem genérico do jogo (`CharacterMarker`). Os sprites de tritões/sereias do pacote (Time Fantasy) hoje aparecem **nas cutscenes**; usá-los como NPCs andando no mapa não foi feito.
