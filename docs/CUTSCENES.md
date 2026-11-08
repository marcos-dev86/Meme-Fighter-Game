# Cutscenes — roteiro (PARTE RESERVADA: só cutscenes em VÍDEO; ainda NÃO criadas, a pedido do dono)

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
