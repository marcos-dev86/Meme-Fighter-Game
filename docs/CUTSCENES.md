# Cutscenes — todas em VÍDEO (24 de história + 16 curtas por ação, ligadas ao jogo)

Pasta prevista para os vídeos quando liberados: `assets/cutscenes/` (um arquivo por cena, nomes abaixo). Nada foi gerado.

| Arquivo | Cena | Ideia (curta, flashback/ação sem o jogador lutar) |
|---|---|---|
| `01_flashback_vovo.mp4` | Flashback do Vovô Bento | O reino antes dos memes sumirem; Vovô entrega o primeiro fragmento. |
| `02_escalada_montanha.mp4` | Escalada da montanha de neve | Dogge sobe a parede de gelo com o piolet até o cume. |
| `03_escalada_vulcao.mp4` | Escalada do vulcão | Dogge sobe a parede escura a oeste do vulcão (mesmo piolet) e planta a bandeira no cume. |
| `04_sahur_god_vs_evl.mp4` | Duelo entre NPCs | Sahur God e Sahur Evil lutam; o Sahur assiste de longe. |
| `05_cassino_porta.mp4` | Troll Face na porta do cassino | Troll bloqueia a entrada e desafia o jogador. |
| `06_final.mp4` | Final | Reunião dos memes na praça. |

Precisa de: sprites animados (as folhas novas já têm andar, soco e nocaute), cenários (já existem 12) e a ordem de entrega dos quadros.

---

## Parte reservada: criação das cutscenes (regras definidas pelo dono)
**Obrigatório: cada cutscene é um ARQUIVO DE VÍDEO** (`.mp4`), tocado pelo jogo. **Nenhuma cutscene é animada por código/React** em tempo real
(isso trava ou esquenta celulares fracos). O jogo só abre o arquivo e mostra.

- **Pasta:** `assets/cutscenes/<nome>.mp4` (nomes na tabela acima).
- **Como os vídeos serão feitos:** renderizados **offline** (aqui no ambiente, com ffmpeg) a partir do que já existe no projeto: quadros dos sprites novos
  (`assets/sprites-v2`), cenários (`assets/legacy-art/stages`) e áudio já existente. Nada de arte, som ou música inventados; se faltar quadro/áudio para uma cena,
  eu aviso antes de fazer.
- **Formato pensado para aparelho fraco:** H.264 (perfil baseline/main), 1280x720, 24–30 fps, áudio AAC mono/estéreo 96 kbps, 20–40 s por cena,
  ≈ 3–8 MB cada (as 6 juntas ≤ 40 MB). Sem canal alfa. Decodificação por hardware do aparelho (leve).
- **Reprodução no jogo (a fazer nessa parte):** componente `CutscenePlayer` com `expo-video` (hoje **não** está no `package.json`; entra nessa parte),
  botão PULAR sempre visível, volta para onde o jogador estava ao terminar, marca a cena como vista no save e, se o arquivo não existir, **pula sem travar**.
- **Quando fazer:** só quando o dono disser "pode criar os vídeos". Esta parte é **só** de cutscenes (nenhuma outra tarefa junto) para dar para revisar cada vídeo.
- **Aprovação:** envio uma cena por vez (arquivo `.mp4` para ver/baixar); ajusto antes de seguir para a próxima.

---

---

## Estado atual: 24 cutscenes de história prontas e ligadas ao jogo
Todas são arquivos `.mp4` em `assets/cutscenes/` (H.264 main, AAC, 1280x720, 30 fps). O jogo só abre o arquivo (decodificação nativa, `expo-video`).
Nada é animado por código em tempo real. Total ≈ 100 MB (as 8 do arco do mar somam ≈ 40 MB).

| Arquivo | Quando toca | Duração |
|---|---|---|
| 01_flashback_vovo | concluir "Bem-vindo a Meme-Fighter" (talk_bento) | 39 s |
| 02_rival_gadigago | concluir "O Desafio do Rival" | 27 s |
| 03_cassino_troll | chegar à Ilha Misteriosa (visit_misteriosa) | 38 s |
| 04_legiao_ferro | concluir "Confronto no Acampamento" | 32 s |
| 05_rei_dos_caes | concluir "O Rei da Ilha" | 34 s |
| 06_tres_fragmentos | concluir "Os Três Fragmentos" (lore_complete) | 40 s |
| 07_guardiao_vulcao | concluir "O Guardião do Vulcão" | 34 s |
| 08_ilha_trevas | chegar à Ilha das Trevas | 40 s |
| 09_topo_do_mundo | concluir "O Topo do Mundo" | 38 s |
| 10_cume_vulcao | concluir "O Cume do Vulcão" | 36 s |
| 11_tres_troncos | concluir as TRÊS missões dos troncos (Laranja, Anjo, Diabo) | 36 s |
| 12_subsolo_cassino | concluir "O Segredo do Subsolo" | 40 s |
| 13_pedra_moai | concluir "A Pedra Moai" | 40 s |
| 14_mar_antigos | concluir "O Menu Antigo" (mar_ruinas): os Antigos e a Tábua | 38 s |
| 15_mar_fantasma | concluir "O Naufrágio do Capitão" (mar_naufragio): o Fantasma do Capitão Meme | 38 s |
| 16_mar_atlantida | concluir "A Chave de Atlântida" (mar_chave): Atlântida, a cidade submersa | 38 s |
| 17_mar_marlene | concluir "Pergunta Existencial" (mar_marlene) | 40 s |
| 18_mar_mapa | concluir "Mapa Completo" (mar_mapa) | 38 s |
| 19_mar_leviata | concluir "O Predador do Abismo" = derrotar o Sea Beast (mar_sea_beast): a queda do Leviatã | 40 s |
| 20_mar_segredos | concluir a secreta "Quem Sabe Tudo do Mar" (sec_mar_tudo) | 40 s |
| 21_mar_paz | fecha o arco: Sea Beast + Mapa + Marlene concluídos (dispara na ÚLTIMA das três) | 38 s |
| final_uniao | final A Ilha Inteira (antes dos slides de texto) | 88 s |
| final_gloria | final O Verdadeiro Meme Fighter | 90 s |
| final_poder | final O Rei das Sombras | 90 s |

- **Regras de reprodução** (`story/CutscenePlayer.tsx`, rota `/cutscene?id=`): botão PULAR sempre visível; termina no fim, ao pular, em erro, se o arquivo faltar
  ou se não carregar em 10 s (nunca trava); música/ambiente do jogo calam durante o vídeo; pausa ao ir para segundo plano; um toque inicia na web se o autoplay for bloqueado.
- **Gatilhos** (`story/cutscenes.ts`): só tocam para missões concluídas NESTA sessão de jogo (saves antigos não recebem vídeos de repente), uma vez por save
  (bandeira `cs:<id>`), e só com o mundo livre (sem diálogo, escolha, interior, barco ou chefe aberto). O final tem prioridade.
- **Arco do mar (14–21):** feitas por `tools/cutscenes/scenes_mar.py` (fundos submersos montados com os tiles de Atlântida do pacote `new-sea-assets`, sprites de
  tritões/sereias, Poseidon, Sea Beast, baleia). Fontes copiadas em `assets/sea/cutscene-src/`. Gatilho plural: `cutscenesForMission()` devolve TODAS as cenas liberadas
  pela missão concluída (em ordem de registro) e `queueCutscenes()` as enfileira uma a uma, sem repetir as já vistas (`cs:<id>`).
- **Rever:** Opções → REVER CUTSCENES (lista as já vistas).
- **Como foram feitas:** `tools/cutscenes/engine.py` (motor PIL + ffmpeg, offline) + `scenes_a.py`, `scenes_b.py`, `finals.py`; rodar
  `python3 tools/cutscenes/run.py 02 03 ...` (ou sem argumentos para todas) regrava os mp4. `render_01.py` gerou a 01.
  Usa SÓ arte/sons existentes: cenários `legacy-art/stages`, sprites-v2, NPCs, efeitos de golpe, músicas e sfx do jogo. Nenhuma arte nova foi inventada.
- **Texto das falas:** escrito por mim a partir de `docs/HISTORIA.md` e `bossLore.ts`. Para trocar, edite as falas (`lines=[...]`) no arquivo da cena e rode de novo.
- **Verificado:** `node tools/test-cutscenes.mjs` (registro, gatilhos, arquivos, codec H.264/AAC 1280x720, finais mais longos) e `tools/e2e-cutscenes.mjs` (rota abre, vídeo toca no Chromium, PULAR, id inexistente).
- **Não verificado:** reprodução em aparelho real / APK (expo-video nativo), consumo de bateria/calor, e o gatilho em partida real jogada até cada missão.

---

## Cutscenes CURTAS por ação (repetíveis, 4–9 s) — `tools/cutscenes/shorts.py`
Tocam **toda vez** que a ação acontece (não ficam "vistas"), em overlay por cima da tela atual (`ShortCutsceneHost`), com PULAR. Interruptor nas
Opções: **CUTSCENES CURTAS: SIM/NÃO** (padrão SIM). Usam só ícones/móveis/sprites/sons que já existem; a parede de escalada é desenhada igual ao tile `cliff` do jogo.

| Arquivo | Evento |
|---|---|
| climb_montanha_sobe / climb_montanha_desce | entrar no paredão de gelo pela base / pelo topo (cooldown 15 s) |
| climb_vulcao_sobe / climb_vulcao_desce | idem, no paredão do vulcão (tx > 1700) |
| cassino_slot_dog / banana / moai / joker / gem | caça-níquel: 3 símbolos iguais daquele símbolo |
| cassino_slot_777 | caça-níquel: 3 sevens (jackpot, 9 s) |
| cassino_cara_coroa / dados / roleta / cartas | vitória no jogo (lucro > 0) |
| bau_tesouro | abrir baú/tesouro (`bau_igreja`, `volcano_cache`, `frag_b_treasure`) |
| subiu_de_nivel | subir de nível (só toca com o mundo livre) |

Regra sobe/desce: ao passar de fora para dentro do paredão, mede-se a faixa contínua de tiles `cliff` da coluna; entrou pela metade de baixo = sobe, pela de cima = desce.
Sair do paredão não toca nada. Não testado no mapa real (só paredão simulado) nem em aparelho.

