# Meme-Fighter: Auditoria Técnica e Arquitetura

## Atualização: o travamento de verdade (performance) + arena de luta descentralizada

Duas correções concretas a partir de prints de teste real no celular do
dono do projeto (não simulação - viu o "Expo Go não está respondendo",
que é o diálogo nativo do Android pra thread de JS travada).

**Performance de verdade**: `getWorldTile()` fazia de 15 a 20 verificações
(vários `inRect` em prédios, conectores, pontos de desembarque, clareamentos)
TODA VEZ que era chamada - e o renderizador chama ela pra cada tile visível,
toda vez que a tela redesenha. Rápido o bastante num notebook pra passar
despercebido, mas é exatamente o tipo de custo que se acumula em um celular
de verdade rodando pelo Expo Go (que já tem overhead proprio). Resolvido
"assando" o mapa inteiro (grama, prédios, conectores, tudo) numa tabela
plana UMA vez (na primeira chamada, não no carregamento do app), e depois
disso cada `getWorldTile()` é só um acesso de array. Medi antes de declarar
resolvido: 2 milhões de chamadas depois de pronta a tabela levam 54ms no
meu ambiente de teste (era da ordem de segundos multiplicado pelo número de
tiles em tela, por quadro, antes). Reverifiquei que nada de conectividade
mudou (mesmo script de sempre, tudo passou).

**Arena de luta fora do centro**: bug matemático, não de orientação -
existia antes mesmo dessa sessão. O React Native escala um elemento em
torno do PRÓPRIO CENTRO por padrão, e a lista de transformação era
`[translateX, translateY, scale]`, ou seja: primeiro desloca, DEPOIS
escala em torno de onde acabou de deslocar - não em torno do centro da
tela. Isso empurra a arena pra baixo e pra direita, com uma folga de
`ARENA*(1-escala)/2` pra cima e pra esquerda, exatamente o padrão visto
no print (barra preta em cima e na esquerda, luta espremida no canto).
Como a escala quase nunca é exatamente 1 num aparelho de verdade, esse
bug aparecia sempre, em qualquer celular - só não em telas que por acaso
batem 1280x720 exato. A conta certa simplifica bastante: já que a escala
não move o centro, só precisa mandar o centro do próprio elemento pro
centro da tela (`largura/2 - ARENA_LARGURA/2`), sem depender da escala
de jeito nenhum.

Os botões vazios da tela de luta no print mais recente não têm uma causa
separada identificada - o mais provável é serem um sintoma do mesmo tipo
de travamento (quadro incompleto), não um bug à parte nos botões em si;
o texto dos botões usa caracteres normais, não haveria motivo pra sumir
sozinho. Se continuar depois dessas duas correções, preciso de mais
detalhe (o quê exatamente trava, em qual tela, depois de qual ação).

O "cenário estranho" (foto de choça na praia) não é bug - é a arte
original de `stage3.webp`, que já vinha no projeto desde o zip original,
nunca foi tocada por mim. Só parecia errado porque a arena bugada
mostrava só um pedacinho dela.

## Atualização: sistema de missão de verdade (11 missões), história documentada, correção do erro de build

**O erro de build** (`Unable to resolve module .../hood/idle.png`): não é
bug no código - o arquivo existe e foi entregue no lote 2 (confirmado via
`git log`). O erro significa que o processo de mesclar os lotes entregues
só está sobrescrevendo arquivos que já existiam, sem adicionar pastas
novas (`assets/legacy-sprites/hood/`, `orc/`, etc.). Pra eliminar esse
tipo de erro de vez, essa entrega vem como o projeto INTEIRO, não só os
arquivos alterados - troca "confiar que a mesclagem funcionou" por
"não tem nada pra mesclar errado".

**Sigma Boy**: era o NPC que eu tinha nomeado só de `'???'` por não saber
o nome pretendido (é o personagem `moai.png` dos assets - uma estátua de
pedra). Renomeado para o nome de verdade.

**Sistema de missão**: até essa sessão, toda missão era só
"falar → aceitar → lutar → recompensa" (o padrão usado pra
rival/acampamento/ilha do Rei). Isso não dava pra missão de exploração
("ache X coisas"), então o sistema de quest ganhou tipos de verdade
(`battle`/`discover`/`collect`/`talk` em `questState.ts`), progresso
contável pras do tipo `collect` (`incrementQuestProgress`), e um HUD de
missão de verdade no canto superior esquerdo (`MissionHud.tsx`) mostrando
nome + progresso + dica - sem apontar exatamente onde, como pedido.

Isso alimentou 8 missões novas (rival/acampamento/ilha do Rei já
existiam), a maioria ligada à história dos 3 fragmentos (ver
`docs/HISTORIA.md`): achar o monumento quebrado, a loja abandonada, e o
"tesouro sem sentido" revela pedaços de uma inscrição que só faz sentido
juntando as 3 (`loreState.ts`), mais achados na caverna e na montanha de
neve. Total: 11 missões de verdade, longe das 35 pedidas mas um salto
real a partir de 3.

Como sempre, os pontos novos (achados perto da caverna, o guardião, o
resgate na neve) caíram em terreno de rocha sólida na extração da
imagem - mesma correção de sempre, clareamentos pontuais garantidos por
código em vez de torcer pra sorte da classificação. Testado com o mesmo
flood-fill de sempre.

**`docs/HISTORIA.md`** (novo): a história completa por trás do mapa (o
artefato partido em 3, quem é quem entre os vilões, o Sigma Boy sem
explicação de propósito) e um roteiro sincero do que falta pra chegar em
35 missões - não fingindo que já está tudo lá.

## Atualização: orientação da tela + mapa reescrito a partir do desenho (extração de imagem)

Duas coisas nessa sessão, motivadas por teste real no celular do dono do
projeto: os controles apareciam vazios/fora do lugar e o modo história
travava, e o mapa "não tinha nada a ver" com o desenho de referência dele.

**Orientação**: o `app.json` que ele mandou agora tem `"orientation":
"portrait"`, mas o jogo inteiro (arena de 1280x720, HUD de luta, DPad) foi
feito para tela larga. Com o app preso em retrato, `useWindowDimensions()`
devolve uma tela estreita e alta, e a conta `Math.min(largura/1280,
altura/720)` da arena vira um número minúsculo - por isso a arena
renderizava como uma caixinha no canto em vez de ocupar a tela. Corrigido
voltando para `"landscape"` (é o valor original do projeto, então isso
pode ter sido de mexer na pasta errada por engano). Não achei confirmação
de que isso também explica o travamento no modo história, mas testei o
tempo de carregamento do mapa novo (2ms) e não achei nenhum gargalo de
performance introduzido por mim - se travar de novo com a orientação
certa, preciso de mais detalhe pra investigar (que aparelho, o que
aparece na tela quando trava).

**Mapa**: reescrito do zero a partir da imagem de referência
(`mapa.jpg`), não mais gerado por algoritmo. Processo: k-means pra achar
a paleta real por trás do ruído do JPEG, cada pixel classificado pela cor
mais próxima dessa paleta, filtro de maioria 3x3 pra limpar ruído
residual, tratamento especial pro labirinto (o cinza ali significa
parede/corredor, não pedra solta como no resto do mapa), e escala 2x (2
tiles por pixel de origem) pra manter as proporções exatas do desenho
E deixar o mundo maior. Prédios, estátua, monumento e iglu foram
posicionados medindo os blobs de cor de verdade na imagem (não
estimados a olho) - script de detecção de blob por cor, não coordenada
chutada.

Esse novo terreno traçado da arte não foi desenhado pensando em
conectividade de jogo (é arte, não um mapa de engine), então vários
prédios (caverna, salão, guilda, casa da montanha) ficaram cercados de
pedra sólida no resultado extraído. Resolvido com o mesmo tipo de correção
já usada antes pras pontes entre ilhas: corredores construídos ligando
cada um deles até o spawn, e um "clareamento" no cluster da praça
principal (as 4 estruturas ficam bem próximas na arte original, então a
área ao redor delas virou passagem garantida em vez de depender do que
saiu da classificação ali). Testei tudo com um flood-fill de verdade
depois de cada ajuste, não só visualmente: toda porta anda, todo marco
principal é alcançável a pé do spawn, e as ilhas de balsa (Misteriosa,
Vulcão, Trevas, fragmentos, o acampamento e a ilha do doggo, que não
apareceram no desenho dele então ficaram numa faixa extra ao sul do mapa
traçado) continuam INALCANÇÁVEIS a pé de propósito.

Footman e Tank (família do doggo) ganharam retrato de verdade (mesma
técnica do Hood/Monk/Moai) - eram os dois personagens enviados que ainda
não tinham arte própria no jogo.

### Ainda falta
Mesma lista de antes: névoa de guerra, sistema de nível/habilidades, HUD
de missão, mecânica da estátua, a história dos 3 fragmentos, conteúdo de
verdade pra cassino/vulcão/caverna/salão, as 35 missões, cutscene de
abertura.

## Atualização: arquipélago novo (mapa de referência do dono do projeto) + balsa

O dono do projeto mandou 6 desenhos (feitos no Aseprite, 1920x1080) como
referência exata do mapa completo, bem maior que o que existia. Esse é o
primeiro lote em cima disso - fundação (mapa + navegação), não o conteúdo
todo (isso é claramente maior que uma sessão só: história dos 3 fragmentos,
35 missões, sistema de nível, névoa de guerra, cassino, etc. ainda faltam,
ver "Próximos passos").

**Mundo expandido**: grade de 30x20 pra 46x30 chunks, só pra leste/sul (o
mapa antigo - montanha, vila do fogo, florestas, praça - não foi tocado).
O mar existente foi alargado pra cobrir a área nova.

**Arquipélago novo**, todos como regiões de chunk (então aparecem certo no
minimapa): Ilha das Trevas (labirinto + boss final), Ilha Misteriosa
(cassino/apostas), Vulcão (boss precursor), e um trio de ilhas fragmento
ligadas por pontes curtas entre si (sem precisar de balsa entre elas,
só pra entrar/sair do grupo - exatamente como pedido). As 3 ilhas
distantes (Trevas/Misteriosa/Vulcão) são propositalmente INALCANÇÁVEIS a
pé - só de balsa, por design.

**Labirinto de verdade**: gerado por algoritmo (busca em profundidade
randomizada com atalhos extras pra não ser um corredor único), não
desenhado à mão - 19x7 células, bem maior que o desenho de referência
(que era só inspiração, como ele mesmo disse). Testei conectividade:
100% dos tiles andáveis do labirinto são alcançáveis a partir da entrada.

**Balsa**: pescador no cais, tela de destino mostra as 4 ilhas com preço e
cadeado se ainda não desbloqueada, cobra Memecoin de verdade
(`spendCoins`), tem uma animação de travessia de 8s (dentro da janela de
5 a 20s pedida) com barco balançando e o pescador a bordo, e só então
troca o jogador de lugar (teleporte de posição + câmera juntos, sem
"voar" pela tela). Ilha Misteriosa e o trio de fragmentos começam
desbloqueados (são as "do lado da ilha principal"); Vulcão e Trevas
destravam completando as missões do capitão/Rei dos Cães que já existiam
- gate temporário e sincero até existir uma missão de verdade pra cada
uma.

**Marcos novos na ilha principal**: caverna (só a entrada por enquanto,
o "gigante por dentro" ainda não foi construído), salão geral, guilda (a
resposta pro "?" do desenho: um prédio de missões, ainda sem conteúdo
próprio), campo de treino (clareira oval reaproveitando os tiles, sem
mecânica de treino ainda), estátua e o monumento quebrado na ilha 3 (só
os pontos no mapa - o texto/escolha deles ainda não existe), e o iglu
(tile reservado, ainda sem o trava-até-derrotar-o-boss-final de verdade).
`BuildingSprite.tsx` ganhou um tipo dedicado pra caverna (entrada na
rocha, não uma casa com telhado) e paletas novas pra salão/guilda.

**Verificação**: script dedicado (não só o tsc) conferindo que toda porta
continua andável, os 3 marcos + treino + estátua do mapa principal são
alcançáveis a pé do spawn, o labirinto está conectado, as 3 ilhas
fragmento se conectam entre si sem balsa, e as 3 ilhas distantes
continuam INALCANÇÁVEIS a pé (isso é intencional, não um bug) - mais
`tsc --noEmit` limpo no projeto inteiro depois.

### Próximos passos (não é pouca coisa, então registrando pra não perder o fio)
- Névoa de guerra + minimapa com zoom ao tocar
- Sistema de nível/habilidades + loja sem cura automática
- HUD de missão (nome, progresso, dica) no canto superior esquerdo
- A mecânica da estátua (2 escolhas + rejeitar, só na primeira vez)
- A história dos 3 fragmentos (inscrição em 3 partes, o artefato escondido)
- Conteúdo de verdade pra cassino, vulcão (boss), caverna (4+ missões),
  salão geral (NPCs), e as 35 missões - isso sozinho é o grosso do
  trabalho que falta
- Cutscene de abertura na casa do Dogge

## Atualização: vilões de verdade (Legião Cinzenta + Rei dos Cães) e inventário em grade

Sessão focada em três pedidos do dono do projeto: personagens novos jogáveis,
inventário estilo grade (Minecraft) e ajustes de controle/mapa. Nada de missão
nova complexa nem mapa maior nessa rodada a pedido dele - ele está recriando o
mapa inteiro no Aseprite (1920x1080) pra eu usar como referência exata, então
o trabalho aqui evitou de propósito qualquer coisa em `worldGen.ts`/
`TileMapRenderer.tsx`/`BuildingSprite.tsx` depois do primeiro lote.

**Três lutadores novos**: Orc e Soldado (Legião Cinzenta, nome pensado pra não
copiar time de outro jogo - mesmo raciocínio do Professor Carvalho lá embaixo)
e o Rei dos Cães (chefão da ilha). Sprites recortados dos pacotes enviados com
PIL (cada animação era uma tira horizontal de quadros 100x100 ou 32x32) e
salvos no padrão já usado por Dogge/Gadigago (`idle/walk1-3/dash/flash/
strong/ult`, um PNG por pose). O Rei dos Cães usa arte nativa de 32px:
em vez de esconder isso, ampliei 4x com nearest-neighbor de propósito, pra
ficar "pixel art retro grosso" e não borrado. Nenhum dos três tinha arte de
efeito de ultimate pronta, então o "ult" de cada um reaproveita o quadro mais
dramático do próprio personagem com um leve tingimento de cor, sem inventar
imagem nova do zero.

**Camadas de força**: Dogge, Gadigago (protagonistas) e o Capitão Ferro
(soldado, LÍDER da Legião) ficam no mesmo patamar de força. O Orc é só um
guarda comum da Legião, então ficou deliberadamente mais fraco (padrão/
"mook"). O Rei dos Cães é chefão: vida e dano acima de todo o resto. Os 5
aparecem no seletor do modo 1v1 (`VersusScreen.tsx`), que deixou de ser
"trocar entre 2" pra ciclar por uma lista.

**NPCs e diálogo por status**: acampamento medieval (guarda + capitão) e ilha
(rei + 2 guardas) ganharam presença de verdade no mundo, reaproveitando o slot
`kind: 'enemy'` que já existia sem uso. Duas missões novas (`camp_showdown`,
`island_boss`) seguem exatamente o mesmo modelo da missão do rival: falar
oferece a luta, vencer marca completa e paga recompensa - só que agora isso
tá generalizado em `QUEST_BATTLE_DEFS` (`questState.ts`) em vez de hard-coded
pro rival, então dialogo/oponente/estágio/recompensa vêm todos de um lugar só
e não têm como desalinhar entre tela de mundo e tela de batalha.
Hood, Monk e o Moai (mascote/meme) entraram como NPCs de conversa com
retrato próprio (`portraitSprite`), sem virar lutador - não tem moveset/stats
pra eles, então forçar isso teria sido só encher o roster com dado inventado.

**Inventário**: `InventoryScreen.tsx` reescrito como grade fixa de slots
(3 linhas de 9 + barra de acesso rápido de 9), com bisel claro/escuro nas
bordas do slot imitando profundidade entalhada, slot vazio aparecendo vazio
em vez de sumir da lista. É a convenção visual de "grade de slots", não os
arquivos de textura do Minecraft em si (esses são da Mojang).

**Controle**: `DPad`/botões de ataque agora compartilham um único componente
(`MoveButton`, em `DPad.tsx`) usado em história, vs CPU e 1v1 - maior por
padrão, com uma versão "dinâmica" mais compacta só pro 1v1 (dois jogadores
dividindo a tela). Dash (double tap numa direção, 300ms, extraído pra
`tapDash.ts` pra história e batalha usarem o mesmo detector) e escudo
chegaram no modo história, reaproveitando `Fighter.startDash`/`startShield`
em vez de reinventar física.

**Verificação**: `tsc --noEmit` limpo no projeto inteiro depois de cada bloco
de mudança (não só no final).

## Atualização: primeira missão de verdade (desafio do rival)

Você pediu pra eu escolher o próximo passo sozinho. A fala do Gadigago
("um dia a gente marca uma luta de verdade") já plantava o gancho, então
usei ele: agora é uma missão real, não só um NPC decorativo parado na
praça.

**Como funciona**: falar com o Gadigago oferece o desafio (ACEITAR /
AGORA NÃO). Aceitar leva direto pra uma batalha real contra ele (mesmo
`Fighter`/`CpuController` fiéis ao original, sem nenhum atalho). Vencer
marca a missão como completa e dá 40 Memecoins de recompensa, com uma
tela de vitória diferente da batalha comum. Perder não trava nada: falar
com ele de novo reoferece a luta. Depois de vencer uma vez, as falas dele
mudam pra reconhecer que você ganhou, e ele para de oferecer revanche
(a missão acabou).

**Arquitetura**: `questState.ts` segue o mesmo padrão de singleton
compartilhado do `playerState.ts` (sobrevive navegar mundo, batalha,
mundo). Sem persistência em disco ainda, mesma limitação honesta de
sempre. Corrigi no meio do caminho um buraco real: a primeira versão só
reoferecia o desafio se a missão nunca tivesse começado; se você
aceitasse e perdesse, ficava sem jeito de tentar de novo depois de sair
da tela de batalha. Agora reoferece tanto no estado "não começou" quanto
"aceito mas não venceu".

Verificado com o servidor de dev real: `/world` (onde a oferta de missão
aparece) e `/battle` com os parâmetros exatos da missão
(`questId=rival_battle`), os dois HTTP 200 sem erro. O sandbox ficou
instável no meio da checagem (processo em segundo plano caiu sem motivo
aparente umas duas vezes), tentei de novo até confirmar de verdade em vez
de assumir que tinha funcionado.

## Atualização: visual, idiomas, rival, revisão geral

Uma coisa que não fiz, direto: **não copiei o mapa do Pokémon FireRed.**
O mapa e o design de cada cidade são conteúdo protegido da Nintendo/Game
Freak, trocar nomes de personagem não muda isso. O que fiz em vez disso:
usei a mesma referência de gênero (RPG top-down 16-bit, tile-based,
paleta natural) que é estilo, não propriedade de ninguém, pra deixar o
mundo bonito de um jeito original. Pela mesma razão não busquei sprite do
Gray nem nenhuma arte da Pokémon na web: essas são artes com direitos
autorais, e eu não tenho (nem usaria) uma ferramenta pra baixar assets de
jogo comercial pra dentro do seu projeto.

Dito isso, o resto foi tudo:

1. **Mapa sem blocos.** Prédios agora são desenhados de verdade (SVG:
   telhado, parede, porta, janelas, cor diferente por loja/casa) em vez de
   um retângulo de cor sólida. Terreno ganhou textura: grama/água/caminho
   variam de tom por tile (baseado num hash determinístico, não
   aleatório de verdade, então o mundo continua igual toda vez que
   carrega), árvores viraram copa+tronco de verdade, pedras ganharam
   forma de pedregulho, lava tem borbulhas ocasionais. Instalei
   `react-native-svg` pra isso (nenhuma outra lib nova).
2. **NPCs sem "card colecionável".** Trocado o círculo+letra por um
   personagenzinho de verdade desenhado em SVG (sombra, corpo, cabeça,
   cabelo) por NPC, com cores próprias. Sem gerador de imagem nem busca
   na web disponíveis aqui, é a melhor arte que dá pra fazer sem imagem
   pronta: vetor de verdade, não uma foto de personagem, mas também não é
   mais um chip de UI.
3. **Rival: Gadigago.** Parado na praça perto do Vovô Bento, com sprite
   de verdade (reaproveitado da batalha, não placeholder). Faz o papel do
   "Gray" do FireRed sem reusar nada da Nintendo.
4. **5 idiomas em Opções**: Português (padrão), Inglês, Espanhol, Francês,
   Japonês. Traduzido: todo o chrome de UI (menus, HUD, pausa, loja,
   inventário, diálogo). Não traduzido ainda: as falas dos NPCs, que
   continuam em português. Localizar toda a narrativa é um trabalho bem
   maior que a interface, e isso ficaria mentindo se eu dissesse que está
   pronto.
5. **Revisão de botões**: passei por cada tela conferindo se todo botão
   leva a algo. Os únicos que ainda não fazem nada de verdade são os que
   dependem de sistemas que não existem ainda (som, como você mesmo
   apontou).
6. **Sem travessão em lugar nenhum**: varri o projeto inteiro, incluindo
   comentários de código, não só o que aparece na tela.

**Verificação**: além do de sempre (`tsc`, `expo export` web + android),
rodei o servidor de dev real de novo e chequei especificamente se o SVG
está saindo no HTML renderizado (não só "não deu erro"): confirmei
`<svg` e `polygon` de verdade na resposta de `/world`, e o texto em
japonês saindo corretamente (sem problema de codificação) em `/options`.
O que eu genuinamente não consigo fazer é *olhar* pro jogo rodando e
julgar se ficou bonito do jeito que você imaginou. Isso depende do seu
olho, quando puder testar.

## Atualização: NPCs, moeda, loja, itens, interiores próprios

Tudo que foi pedido, na mesma rodada porque tudo se conecta:

1. **Moeda própria: Memecoin (MC).** Óbvio pro nome de um jogo chamado
   Meme-Fighter. Estado do jogador (moedas + inventário + o que já foi
   coletado) vive num módulo compartilhado (`playerState.ts`): não é um
   estado de componente, porque precisa sobreviver a navegar entre
   telas (mundo → loja → inventário → batalha → volta). Ainda não salva
   em disco (isso é a fase de save do roadmap), reseta ao reiniciar o
   app: é uma limitação honesta, não escondida.
2. **Loja de verdade** (`ShopOverlay`): comprar de fato gasta Memecoin
   (`spendCoins`) e adiciona o item (`addItem`); se não tiver dinheiro
   suficiente, avisa, não finge que comprou.
3. **Itens que existem de fato** em 3 fontes, como pedido: baús dentro de
   estruturas, achados escondidos no mapa (esconderijos, não em cima da
   estrada), e presentes de NPC na primeira conversa. Inventário mostra o
   que você realmente tem.
4. **NPCs amigáveis**: 7 no total, espalhados por toda região (praça,
   floresta, montanha, vila de fogo, mar), confirmando que os caminhos
   levam a algum lugar com potencial de lore. Nomes originais, não
   "Professor Carvalho": essa referência era estilo (mentor que dá boas-
   vindas), não uma licença pra reusar um personagem específico da
   Nintendo. Preparado pra próxima leva: `NpcKind` já distingue
   friendly/enemy/meme por cor, só falta criar os outros tipos.
5. **Interior próprio pra cada estrutura**: 6 prédios, cada um com nome,
   morador (ou não) e loot (ou não) diferentes. O layout de parede vem de
   3 modelos (loja/casa aconchegante/casa simples), não são 6 plantas
   inéditas: mas quem mora e o que tem dentro é único por prédio, que é
   o que faz cada lugar parecer seu de verdade.

**Sobre a verificação desta vez**: depois do bug do `resolveAssetSource`,
não confio mais só em `tsc`/`export` pra pegar problema de avaliação em
tempo de execução. Rodei o servidor de dev de verdade de novo: mas
descobri no processo que rodar o servidor numa chamada e checar numa
chamada seguinte não funciona neste sandbox (processos em segundo plano
não sobrevivem entre execuções separadas). Corrigido fazendo tudo: subir
servidor, esperar, testar rota, derrubar servidor: numa única execução.
Testei `/`, `/world`, `/battle`, `/versus`, `/inventory`: todas HTTP 200,
zero ocorrência de erro nas respostas.

## Atualização: corrigido o crash "Image.default.resolveAssetSource"

Bug real, obrigado por mandar o print e o log do terminal: sem os dois
eu não teria achado a causa exata rápido.

**O que estava acontecendo:** `src/game/battle/sprites.ts` calculava a
proporção de cada sprite chamando `Image.resolveAssetSource(...)` no
momento em que o módulo carrega. Isso funciona numa tela normal do app,
mas o Expo Router também executa cada módulo uma vez no **Node.js**, do
lado do servidor, pra pré-renderizar cada rota (é o "Static rendering"
que aparece no log): e nesse ambiente Node, `Image.resolveAssetSource`
simplesmente não existe. O log que você mandou confirma isso na própria
URL do bundle que quebrou: `resolver.environment=node`.

Isso também explica por que eu não peguei esse bug antes: eu testava com
`expo export`, que aparentemente tolera/ignora esse erro específico
durante a pré-renderização de rotas dinâmicas (a `/battle` recebe
parâmetros por query string) em vez de falhar o build inteiro. O
`expo start --web` que você rodou é mais rígido: ele expôs o problema na
hora. Anotado: de agora em diante, pra qualquer coisa que toque em API de
imagem/asset, `expo export` sozinho não é suficiente.

**Correção**: em vez de perguntar pra API em tempo de execução (que
claramente não é confiável em todo ambiente: Node/SSR, web no navegador,
nativo são 3 contextos diferentes), medi a proporção real de cada um dos
16 sprites direto no arquivo PNG (Python/PIL, não estimativa) e deixei
esses números fixos no código. Mais simples, mais rápido, e não depende
de nenhuma API de plataforma: essas imagens não mudam de tamanho, não
tinha por que calcular isso toda vez.

**Verificação desta vez foi com o servidor de verdade rodando**, não só
`tsc`/`export`: subi `expo start --web` de verdade neste ambiente e bati
com `curl` em `/battle`, `/`, `/world`, `/versus` e `/play`: todas
voltaram HTTP 200, zero ocorrência de "resolveAssetSource", "TypeError"
ou "Server Error" nas respostas. É a mesma verificação que o seu
navegador faria, não uma simulação.

## Atualização: modo de luta reescrito fiel ao original

Você pediu fidelidade ao JavaScript original, então desta vez o processo
foi diferente: reli `fighter.js` e `battle-scene.js` inteiros do zero
(não confiei na minha primeira leitura, de algumas mensagens atrás) e
comparei linha a linha com o que eu tinha portado. Encontrei bugs de
verdade, não só "podia ser melhor":

**Bugs de fidelidade corrigidos:**
- **`canAct()` estava incompleto.** Faltava excluir `isShielding` e
  `dashTimer`: na prática isso permitia atacar durante o escudo ou no
  meio de um dash, o que o original nunca permite.
- **Hitbox do golpe calculada errado.** Eu tinha centralizado no meio do
  sprite; o original estende a partir da BORDA da hurtbox (`hb.x2`/`hb.x1`): isso muda o alcance real de cada golpe.
- **Pulo e dash não existiam.** O original tem os dois (pulo simples com
  gravidade, dash por duplo-toque na direção); a primeira versão só tinha
  movimento lateral.
- **Fighters se sobrepunham.** Faltava a separação automática
  (`_resolveSeparation`) que empurra os dois lutadores quando as hurtboxes
  se sobrepõem.
- **Cronômetro errado**: 60s em vez de 120s (o valor real do original).
- **Ultimate não existia de verdade**: faltava o botão, faltava usar a
  pose de dash (não "strong"), faltava o efeito `ult.png` desenhado por
  cima do personagem.
- **Bug visual real, visível no seu print**: eu tinha forçado
  `aspectRatio: 1` (quadrado) pra todo sprite. Sprites não são quadrados: isso fazia o Gadigago (proporção bem diferente do Dogge) flutuar numa
  altura errada em vez de ficar com os pés no chão. Corrigido calculando a
  proporção real de cada sprite (`Image.resolveAssetSource`), igual o
  original fazia com `naturalWidth/naturalHeight`.
- **IA da CPU reativa demais.** A primeira versão decidia de novo a cada
  frame (60x/seg), o que parece nervoso/errático. O original comita a uma
  decisão e segura por 300-600ms: reescrevi pra ter esse mesmo estado
  persistente.

**Verificação desta vez foi bem além de "compila".** Escrevi um script que
simula lutas de verdade rodando a classe `Fighter` isolada: 44 checagens
automáticas: andar, dash (distância percorrida, cooldown), pulo (sobe e
desce exatamente na altura do chão), golpe conectando E errando por
distância, escudo reduzindo dano pela fração certa, ultimate recusado
abaixo de 100% de energia e aceito em 100%, hitstun bloqueando ação, K.O.
disparando exatamente em 0 de vida, e a exclusão de ação durante
escudo/dash. 43 passaram de cara; a 1 que falhou foi um erro no MEU teste
(non facing errado pro cenário): reescrevi o teste com a orientação que o
jogo de verdade usa e passou.

Continua fiel à decisão de arquitetura já tomada (Views, não Skia, ver
seção G.2): nada disso precisou do renderer mudar, só a lógica e o
desenho de cada sprite.

## Atualização: detalhe do mundo, navegação, pausa, prédios entráveis

Pela ordem pedida (deixando o modo de luta padrão de fora, como
combinado: "no final, depois de fazer tudo isso"):

1. **Tiles menores.** 32px (era 48px) com mais tiles por chunk (24×24, era
   16×16): o chunk continua cobrindo a mesma área física de antes (nada
   ficou menor no mapa geral), só tem mais detalhe dentro de cada um.
   Mundo passou de 480×320 pra 720×480 tiles (345.600 no total).
2. **Estradas curvas.** Perto da praça continuam retas de propósito (pra
   não bagunçar os prédios já posicionados no cruzamento), mas a partir de
   ~2,5 chunks de distância passam a curvar com duas ondas senoidais
   combinadas: testei escaneando onde a estrada realmente passa em várias
   alturas do mapa e confirmei que ela varia de verdade (não é mais uma
   coluna fixa), sem perder conexão com nenhuma região.
3. **Minimapa** (canto superior direito, toca pra expandir): grade
   30×20 colorida por região com a posição do jogador marcada, pensado
   direto pra resolver o "os caminhos não levaram a lugar nenhum": agora
   dá pra ver onde cada coisa fica antes de ir.
4. **Botão de pause** no centro superior, substituindo o link "MENU" que
   ficava no canto. Abre "VOLTAR" / "OPÇÕES" / "INVENTÁRIO" / "SAIR": o
   loop do jogo para de verdade enquanto o menu está aberto (não só
   visualmente). Inventário é uma tela real, vazia de propósito (não
   existem itens ainda).
5. **Vida/energia/golpes no mundo.** O jogador no mundo agora usa a mesma
   classe `Fighter` da batalha: vida e energia de verdade na HUD, dois
   botões de ataque que tocam a animação certa. Sem inimigo pra acertar
   ainda (não criei nenhum, como pedido), mas a base é a mesma que vai
   servir quando os inimigos/NPCs existirem.
6. **Lojas e casas entráveis.** Cada prédio tem uma porta (tile específico,
   não é o prédio inteiro que abre) que leva a um interior: mesmo layout
   pra todos por enquanto (ver "o que falta" no README), mas é um espaço
   real, anda lá dentro, sai pela porta e volta pro exato ponto de fora.
7. **Botões maiores**: D-Pad (56→72px) e os controles de toque da
   batalha (mesma mudança): estavam pequenos demais pra celular de
   verdade, como você apontou.

**Correção no meio do caminho, pra registrar**: a primeira versão das
barras de vida/energia no mundo forçava um re-render do componente
inteiro a cada frame (60x/seg) pra manter a barra atualizada: exatamente
o tipo de coisa que a arquitetura original evita. Troquei por *shared
values* do Reanimated antes de entregar (mesmo padrão já usado pra
câmera/posição), sem nenhum re-render por frame.

Verificado: além do `tsc`/`expo export` de sempre, reescrevi o script de
checagem do mundo pra essa escala nova: as 6 portas existem e abrem pro
lado de fora corretamente, a estrada continua sem bloqueio real, os
prédios não invadem o cruzamento, e o mato/floresta gera normal longe do
rio.

## Atualização: mundo grande + menu próprio

Três coisas, na ordem do que foi pedido:

1. **Menu sem a arte antiga.** As telas de menu (`início`, `jogar`, `versus`,
   `opções`, `sair`) não usam mais os PNGs originais como fundo: eles
   tinham texto/botões desenhados na própria imagem, e meus botões novos
   ficavam desalinhados por cima, duplicando texto (era visível no
   screenshot que você mandou). Interface própria agora: fundo com
   gradiente animado (cores de anoitecer, ciclando via Reanimated, sem
   asset nenhum) + partículas subindo tipo vaga-lume, e botões no estilo
   pixel-art amarelo que você mandou de referência (duas camadas: uma
   base mais escura, uma face mais clara por cima deslocada: pra simular
   profundidade/pressão sem depender de sombra do sistema).
2. **Luta**: não mexi, como combinado ("vamos deixar isso para depois").
3. **Mundo grande de verdade.** 30×20 chunks (16×16 tiles cada = 480×320
   tiles, 153.600 no total) gerado por código, não desenhado tile a tile: impossível de fazer à mão nesse tamanho. Tem: praça central com 1 loja
   + 3 casas + chafariz (6×4 chunks, dentro do "4 a 6" pedido), duas
   florestas grandes (oeste e leste, bem maiores que a praça antiga
   inteira), um rio serpenteando pela floresta oeste, montanha nevada
   (canto superior esquerdo), vila de fogo com lava/cinzas e casas (canto
   superior direito), mar com um píer de pesca curto saindo da costa
   (canto inferior direito), e uma estrada em cruz ligando praça a todas
   as regiões. **Sem obstáculos extras, missões ou NPCs ainda**: você
   pediu pra deixar isso pra depois, não coloquei.

**Verificação real, não só visual**: escrevi um script que anda o mundo
inteiro checando (a) o ponto de spawn é andável, (b) a transição
costa→píer→mar não tem buraco sólido no meio, (c) a estrada norte-sul não
tem nenhum bloqueio do topo à base do mapa, (d) os prédios da praça não
invadem o cruzamento das estradas. Todos passaram. Também rodei
`tsc --noEmit` e `expo export` (web + android) depois da troca de arquitetura
(mapa passou de array fixo pra `getTile(x,y)` sob demanda, porque um mundo
desse tamanho não cabe como array literal).

## Atualização: correção de borda + telas + battle system

Três coisas entregues nesta rodada:

1. **Bug da borda corrigido.** A colisão em si já estava correta (testada
   com números reais, não só lida no código: ver commit do
   `verify-collision.ts`); o problema era falta de reação: parar numa
   parede acontecia em silêncio. Agora existe feedback de "esbarrão"
   (pequeno recuo + retorno) e, mais importante, **a Praça Central agora
   tem uma saída de verdade** no lado norte, ligada a um segundo mapa
   ("Estrada Externa"): andar até aquele ponto da borda realmente leva a
   outro lugar, e dá pra voltar. O resto da borda continua sólida, só que
   agora com reação visível.
2. **Todas as telas de menu** (início, jogar, versus, opções, controles,
   créditos, sair) portadas para rotas reais do Expo Router, usando a arte
   original como fundo (não mais coordenadas de clique medidas em pixel: ver decisão G.1 abaixo).
3. **Sistema de batalha portado e jogável de verdade**: classe `Fighter`
   migrada de `fighter.js` quase 1:1 (mesmos números de dano/velocidade de
   Dogge e Gadigago, mesma máquina de estados, mesmo frame data de
   ataque), rodando dentro de uma arena virtual 1280×720 escalada pra
   tela. Versus (CPU ou 2 jogadores) → seleção de personagem/arena →
   luta com movimento, escudo, dois golpes (flash/forte), barras de
   vida/energia, rounds (melhor de 3) e tela de vitória.

**Recortado desta entrega, de propósito** (para não travar tudo tentando
portar 100% de uma vez: ver "próxima fase" no fim deste documento):
golpe ultimate ainda não está no controle de toque, sem partículas de
acerto, sem menu de pausa em batalha, IA da CPU é simples. Nada disso
está fingido como pronto: o que existe, existe de verdade e foi
verificado com `tsc --noEmit` limpo e `expo export` bem-sucedido (Android
*e* web, 1600+/1100+ módulos, todos os 51 assets resolvidos).

---

Documento de referência do projeto. Escrito depois de extrair e ler
integralmente o `Meme_Figther_2_0.zip` (todo o JS, HTML, CSS e assets),
antes de qualquer código novo ser escrito. Serve como base para as
próximas fases: não é um relatório descartável.

---

## A. Estrutura do projeto recebido

```
Meme Figther 2.0/
├── index.html
├── style.css
├── src/
│   ├── main.js                    (117 linhas: boot, asset loading, game loop)
│   ├── engine/
│   │   ├── sprite.js               (AssetLoader, Button, GameConfig)
│   │   ├── input.js                 (Input, KEYMAP_P1/P2, SceneManager)
│   │   └── physics.js               (constantes de arena/gravidade)
│   ├── fighters/
│   │   ├── fighter.js               (442 linhas: classe base dos lutadores)
│   │   ├── dogge.js                 (18 linhas: stats do Dogge)
│   │   └── gadigago.js              (18 linhas: stats do Gadigago)
│   └── scenes/
│       ├── battle-scene.js          (657 linhas: combate completo)
│       ├── versus-scene.js          (359 linhas: seleção de modo/lutador/arena)
│       ├── menu-scene.js, play-menu-scene.js, story-menu-scene.js
│       ├── dialogue-scene.js, options-scene.js, controls-info-scene.js
│       ├── credits-scene.js, coming-soon-scene.js, exit-confirm-scene.js
├── assets/
│   ├── background/screen/*.png      (6 telas de menu, arte "pintada", ~19MB)
│   ├── background/stage/*.webp      (3 arenas de batalha)
│   ├── sprite/{dogge,gadigago}/*.png (8 poses cada, PNG individual por pose)
│   └── effects/escudo.gif
└── Use Esses Arquivos no Jogo/       (pasta paralela: ver seção F.2)
    ├── sprites/, stage/, effects/    (mesmos assets em .webp + arquivos .import do Godot)
    └── theme/main_theme.tres         (recurso de tema do Godot Engine)
```

**2.732 linhas de JavaScript no total.** Nenhum `package.json`, nenhum
bundler, nenhum `.git`, nenhum README. É um site estático puro: abre
`index.html` num servidor simples (ou file://) e roda.

Todo esse projeto original está preservado, sem alterações, em
`legacy/battle-web/` dentro do novo repositório: nada foi descartado.

---

## B. Como o Battle System funciona hoje

O "motor" é pequeno e feito à mão, mas é **coerente e já resolve os
problemas certos**:

- **`SceneManager`** (`input.js`) mantém uma cena ativa por vez; cada cena
  implementa `enter/exit/update/draw/onClick/onMouseMove`. Trocar de tela é
  `sceneManager.change('nome', dadosOpcionais)`.
- **`Fighter`** (`fighter.js`) é uma máquina de estados
  (`idle/walk/dash/flash/strong/shield/hurt/ko`) com:
  - dados de ataque por *frame* (`startup/active/recovery`, alcance, dano,
    ganho de energia): é literalmente frame data de jogo de luta, feito
    corretamente;
  - hurtbox e hitbox calculadas geometricamente a partir de posição/largura
    (`getHurtbox`, `getActiveHitbox`);
  - altura sempre derivada da proporção real de cada sprite (nunca estica
    imagem), ancorada pelos pés;
  - escudo com custo de energia e redução de dano, hitstun proporcional ao
    dano recebido, KO quando vida chega a zero.
- **`Dogge`/`Gadigago`** só sobrescrevem números (`drawWidth`, `speed`,
  `dashSpeed`, danos): a lógica é 100% compartilhada. Adicionar um
  personagem novo é escrever uma subclasse de ~15 linhas.
- **`BattleScene`** orquestra tudo: `HumanController` (teclado, dash por
  duplo toque na direção) e `CpuController` (IA simples baseada em
  distância + reação a ataques do oponente com chance de escudo), rounds
  (melhor de N), cronômetro, resolução de hit por overlap de caixas,
  partículas, pausa, e uma tela de vitória/derrota com **dois fluxos
  diferentes** dependendo do contexto.

**Achado importante:** o `BattleScene.enter(data)` já aceita
`data.onVictory` (callback) e `data.defeatExitTarget` (para onde ir ao
perder): e o `story-menu-scene.js` já usa isso para montar um Capítulo 1
completo:

```
DialogueScene (intro) → BattleScene (1 round vs CPU) → DialogueScene (final) → menu
```

Ou seja, **a interface WORLD → ENCOUNTER → BATTLE → RESULT → WORLD pedida
na seção 15 do briefing já existe e já funciona**, só que hoje "WORLD" é
um botão de menu, não um mapa explorável. Isso muda a natureza da tarefa
de "inventar uma integração" para "trocar o que chama `sceneManager.change
('battle', {...})`": bem menos arriscado.

---

## C. Assets: o que existe e como reaproveitar

| Tipo | Conteúdo | Observação |
|---|---|---|
| Sprites de personagem | 8 poses × 2 personagens, PNG individual (não spritesheet), resoluções variadas (ex.: Dogge idle 146×164, ult 488×242) | Reaproveitáveis diretamente na batalha. **Não servem para o RPG top-down**: são desenhados de perfil (visão lateral de luta), um RPG top-down precisa de sprite visto de cima, com direções cima/baixo/esquerda/direita: é arte nova, não reaproveitamento. |
| Arenas de batalha | 3 `.webp` (stage1 1920×960, stage2 tamanho não confirmado, stage3 480×360) | Resoluções inconsistentes entre arenas: stage3 vai parecer nitidamente pior em tela cheia. Vale re-exportar todas no mesmo tamanho quando houver tempo. |
| Telas de menu | 6 PNG, ~1750×1490 cada, **~19MB no total (91% do zip)** | Arte "pintada" com texto e botões desenhados dentro da própria imagem; o código mede posição de clique em pixels por cima. Funciona, mas é pesado para um app mobile e não se adapta a proporções de tela diferentes. Ver decisão em G. |
| Efeitos | 1 GIF (escudo, 800×800) | Canvas não anima GIF (só mostra o 1º frame): o "brilho pulsante" do escudo já é feito via escala/opacidade no código, contornando isso. Nenhuma mudança necessária. |
| Áudio | **Nenhum arquivo de áudio no projeto** | Nem música nem efeitos sonoros existem ainda, apesar de estarem na lista de "o que pode existir" do briefing. É trabalho 100% novo quando chegar a hora. |

### C.1 Bug concreto encontrado

`main.js` carrega `assets/background/screen/opções.png`, mas o arquivo
real no disco se chama `op#U00e7#U00f5es.png` (um escape de caracteres
acentuados no estilo usado pelo Godot ao exportar para Android). Hoje isso
falha silenciosamente: o `AssetLoader` captura o erro, loga no console e
o jogo continua rodando, só que a tela de OPÇÕES nunca mostra a arte de
fundo (cai no fallback cinza escuro). É uma renomeação de arquivo pra
corrigir, não um bug de lógica.

### C.2 A pasta "Use Esses Arquivos no Jogo"

Confirmei por busca no código (`grep`) que **nenhum arquivo JS referencia
essa pasta**. Os arquivos `.import` e o `main_theme.tres` são metadados do
**Godot Engine** (`res://`, `gd_resource`, `CompressedTexture2D`): o jogo
atual não usa Godot em lugar nenhum, é HTML5 Canvas puro. Minha leitura é
que isso é resíduo de uma tentativa anterior em Godot, ou de um pacote de
assets que veio empacotado num projeto Godot. Não apaguei nada: está
preservada em `legacy/battle-web/Use Esses Arquivos no Jogo/`: mas
recomendo tratá-la como não-ativa até você confirmar se há algo ali que
precisa ser resgatado.

---

## D. Tecnologias em uso hoje

JavaScript puro (ES6 classes), sem bundler, sem gerenciador de pacotes,
sem TypeScript. Scripts carregados via `<script src="...">` em sequência
no `index.html`, dependendo de escopo global (`class Fighter` fica
disponível globalmente para `dogge.js` porque a tag `<script>` dele vem
depois no HTML). Renderização via **Canvas 2D** (`ctx.drawImage`,
`save/restore/translate/scale` para flips). Input por teclado
(`keydown`/`keyup`) e mouse (clique/hover nos menus): **nada de touch**.

O game loop já usa `requestAnimationFrame` com delta-time, e mantém a
lógica de jogo fora do ciclo de render de qualquer framework (porque não
há framework): arquiteturalmente é exatamente o padrão pedido na seção 26
do briefing (loop separado). Isso facilita a portabilidade conceitual.

---

## E. Compatibilidade com Expo/React Native

| | O que | Decisão |
|---|---|---|
| **Reutilizar (lógica, migrada para TS)** | Máquina de estados do `Fighter`, frame data de ataque, cálculo de hit/hurtbox, fluxo de rounds, IA da CPU, detecção de duplo-toque para dash | Portar como classes/funções TypeScript puras: não dependem de DOM, só de números e `Set`/objetos. |
| **Adaptar** | Renderização (canvas `drawImage` → ver decisão de renderer em G), input (teclado → touch), `SceneManager` (→ Expo Router para telas "de menu"; um controlador de estado próprio para a troca de fases *dentro* da batalha, que precisa trocar a 60fps e não combina com navegação por rotas) |: |
| **Não migra direto** | Qualquer uso de `document`, `canvas.getContext('2d')`, `new Image()`, `window.open()` (usado no botão SIM da tela de sair) | Precisa de reimplementação nativa, não existe equivalente direto em React Native fora da Web. |
| **Migra como asset** | PNGs/WebPs de sprite e arena | Copiam direto para `assets/`. As 6 telas de menu (19MB) funcionam como `<Image>`, mas são candidatas a otimização (seção F) antes de ir pra produção. |
| **Isolar** | Projeto inteiro original | Preservado em `legacy/battle-web/`, intocado, como referência até cada peça ser portada de fato. |

---

## F. Problemas encontrados

1. **Bug de asset**: fundo de OPÇÕES não carrega por causa do nome de
   arquivo mal codificado (`op#U00e7#U00f5es.png` vs `opções.png`
   esperado). Corrigir é renomear o arquivo (ou ajustar o `main.js`): vou
   sinalizar isso como item de correção rápida no legado, não mexi nele
   porque a instrução era não alterar o projeto atual sem necessidade.
2. **Pasta duplicada de origem Godot**, não referenciada por nada: risco
   de confusão futura, zero risco de quebra hoje. Ver C.2.
3. **Zero tooling**: sem `package.json`, sem TypeScript, sem bundler: o
   ponto de partida real do lado Expo é do zero, o que já era esperado.
4. **19MB de arte de menu** com texto/botões desenhados na própria imagem
   e coordenadas de clique medidas manualmente em pixel: funciona, mas
   não escala pra RPG (telas novas de inventário, quests, diálogo variável
   não podem depender de arte pintada estática) e pesa no tamanho do app.
5. **Resolução inconsistente entre arenas** (stage1 1920×960 vs stage3
   480×360): diferença visível de nitidez entre arenas.
6. **Áudio inexistente**: música e efeitos sonoros são trabalho 100% novo.
7. **Sprites são de perfil (luta), não top-down (RPG)**: é o achado mais
   importante para o modo história: o personagem "Dogge" que anda no mapa
   vai precisar de arte nova (cima/baixo/esquerda/direita), a arte atual
   de luta não serve pra isso além de placeholder temporário.
8. **Input 100% teclado/mouse**: controles de toque não existem em lugar
   nenhum do projeto original; tive que criar do zero (feito para
   movimentação no mapa; controles de toque para a *batalha* ainda ficam
   pendentes pra Fase 4).

Nenhum desses problemas bloqueia o que foi construído agora: são todos
itens pra fila de trabalho manual/futuro, listados também no README.

---

## G. Arquitetura recomendada

### G.1 Estrutura de pastas (o que foi efetivamente criado)

```
meme-fighter-rpg/
├── src/
│   ├── app/                 (rotas do Expo Router: hoje só "index")
│   ├── game/
│   │   ├── core/             (useGameLoop)
│   │   ├── world/             (TileMapRenderer, maps/)
│   │   ├── camera/            (Camera.ts)
│   │   ├── collision/         (collision.ts)
│   │   └── input/              (useDirectionalInput, DPad)
│   ├── screens/              (WorldScreen: composição das telas)
│   ├── components/           (herdado do template Expo, ver README)
│   ├── constants/, hooks/     (herdado do template Expo)
│   └── types/                (game.ts: tipos compartilhados)
├── assets/
│   └── legacy-sprites/        (subconjunto copiado do jogo original, ver README)
├── legacy/
│   └── battle-web/            (projeto original, intocado)
└── docs/
    └── AUDIT.md                (este arquivo)
```

Segui a proposta da seção 5 do briefing de perto, com duas diferenças
deliberadas: (1) o Expo Router aqui usa `src/app/` em vez de `app/` na
raiz: é o que o próprio `create-expo-app` gerou nesta versão do
template, então segui o padrão da ferramenta em vez de forçar a estrutura
original; (2) ainda não criei `physics/`, `entities/`, `quests/`,
`dialogue/`, `events/`, `inventory/`, `save/`, `multiplayer/` como pastas
vazias: prefiro criar cada uma quando a Fase correspondente realmente
começar, em vez de esqueletos sem código dentro (isso é só estética de
pasta, não muda o plano).

### G.2 Decisão técnica: como desenhar o jogo (renderer)

Esta é a decisão que mais afeta tudo o que vem depois, então vale detalhar
as opções como a seção 37 do briefing pediu:

**Opção A: Skia (`@shopify/react-native-skia`) desde já, para tudo.**
Vantagem: é o equivalente mais próximo do Canvas 2D que o código atual já
usa (`drawImage`, transformações, tudo com API parecida): portar
`Fighter.draw()`/`BattleScene.draw()` seria quase tradução direta.
Desvantagem: é um módulo nativo: **não funciona no app Expo Go comum**,
exige criar um development build (`npx expo prebuild` + `expo run:android`
ou EAS Build) antes de testar qualquer coisa, mesmo a Fase 1.

**Opção B: Views/Image nativos agora (Fases 1–3), Skia só na Fase 4
(integração da batalha).: Escolhida.**
Vantagem: Fase 1 roda no Expo Go padrão, sem build customizado: você
escaneia o QR code e já vê o personagem andando. A movimentação no mapa
não precisa de nada que só o Skia oferece. Quando a Fase 4 exigir desenhar
partículas, hitboxes e sprites sobrepostos como a batalha atual faz, aí
sim migrar o *viewport de jogo* pra Skia: é uma troca isolada (só a
camada de renderização), sem tocar a lógica de colisão/câmera/estado que
já vai estar pronta. Desvantagem: dois modelos de renderização coexistem
por um tempo (Views para o mundo, Skia para a batalha) até uma eventual
unificação.
**Escolhi essa opção** porque ela respeita a seção 36 do briefing
("verificar se [a biblioteca] é realmente necessária" antes de instalar)
:  Skia não é necessário para mapa/player/câmera/colisão, então não faz
sentido pagar o custo de build customizado antes da hora.

**Opção C: WebView com o jogo HTML5 atual, quase sem alteração.**
Vantagem: reaproveitamento máximo, rapidíssimo de montar.
Desvantagem: contraria diretamente o pedido de arquitetura "de verdade" em
Expo/React Native/TypeScript (seção 3): fica um app nativo com um jogo
web dentro, não um jogo nativo; performance e integração com o resto do
app (navegação, HUD, save) ficam limitadas. Não recomendo como caminho
principal, mas é uma ponte válida se em algum momento o prazo apertar.

### G.3 Outras decisões já tomadas na Fase 1

- **Sem dependências novas** além do que `create-expo-app` já instala
  (Expo SDK 57, RN 0.86, Reanimated 4, Gesture Handler, Safe Area
  Context). Movimento e câmera usam `react-native-reanimated`
  (`useSharedValue`), que já vem no template: zero pacotes adicionados.
- **Loop de jogo fora do React**: posição do jogador fica numa `ref`, não
  em `state`; câmera e posição na tela usam *shared values* do Reanimated,
  atualizados a 60fps sem re-renderizar a árvore de componentes. Só
  direção do sprite e o quadro da animação de andar (mudam poucas vezes
  por segundo) passam por `useState`, porque nesses casos um re-render
  pequeno é inofensivo e simplifica o código.
- **Orientação da tela travada em paisagem** (`app.json`): a arte de
  batalha existente é 16:9 (1280×720 / 1920×960); manter tudo em paisagem
  evita ter dois layouts completamente diferentes para mundo e batalha.

---

## H. Roadmap

O roadmap da seção 30 do briefing está confirmado como está: a ordem
(mundo → NPC/diálogo → quests → integração de batalha → save → multiplayer
local → batalha multiplayer → cloud save) já é a sequência de menor risco
possível: cada fase só começa quando a anterior tem uma base sólida
testável.

```
FASE 0: Auditoria .......................... ENTREGUE (este documento)
FASE 1: Base do RPG (mapa/player/câmera/colisão) ENTREGUE (ver README)
FASE 2: NPC / interação / diálogo .......... próxima
FASE 3: Quests / flags / progressão
FASE 4: Integração do battle system existente
FASE 5: Save local
FASE 6: Multiplayer local (exploração)
FASE 7: Multiplayer local (batalha)
FASE 8: Cloud save
```

Nada de multiplayer foi implementado ou mesmo esboçado em código
ainda: como pedido explicitamente, a prioridade foi ter uma base de
exploração sólida primeiro.

## Parte 29: barcos, ilha de gelo e montanha escalável
- Cada parada do barco agora fica num cais marrom do desenho (ou num píer autoral onde o desenho não tem cais): `FERRY_DOCKS` em `worldGen.ts` (chegada, barqueiro, barco).
- Barcos com navegador (`FerryBoats.tsx`) e um Barqueiro por cais (falar abre o menu do barco).
- A ilha de gelo (oeste) não tem mais ponte: só se chega de barco (`gelo`, liberada após `lore_complete`). A montanha de neve é um platô fechado; a única entrada é a parede de gelo (`cliff`), que só se escala com o item `piolet` (vendido na Loja do Gelo).
- Missões do capítulo 6 reescritas (visitar a ilha, comprar o piolet, escalar, topo). Total continua 35.

## Parte 31 — XP, níveis, 55 missões, economia

- **XP/nível** (`game/items/levels.ts`, `playerState.ts`): XP de monstros (`enemyDefs.xp` × nível do inimigo), missões (`reward.xp` ou padrão por tipo) e lutas. XP por nível = 30 + 16n + 4n² (n = nível−1), máx. nível 50. Cada nível = 1 ponto de status.
- **Atributos** (`upgrades.ts`, `UpgradeShopOverlay.tsx`): o Maximilian agora cobra PONTOS, não moedas: custo por nível do atributo [1,1,2,2,3,3,4,4,5]. Saves antigos carregam com nível 1 / 0 pontos (campos opcionais).
- **Missões** (`missionsDogge.ts`): 55 no total. Novo objetivo `chain` (etapas em ordem: falar, entrar, baú/coleta, matar N, casino, nível; `give`/`take` de itens) + `level`, `casino`, `hasItem`, `upgrade{count}`. A entrega da Guilda (`guild_package`) pega o Pacote Lacrado com o Mestre Gaspar e leva à Iara.
- **Economia**: `PRICE_MULT = 1.4` em `itemDefs.ts` (todos os itens vendidos) e passagens de barco +40% em `islandState.ts`.

## Parte 32 — progresso 0→100%, interiores, barco

- **Progresso / platina** (`state/progressState.ts`, `screens/ProgressScreen.tsx`, rota `/progress`): 11 categorias com peso (missões 35, mapa 10, NPCs 10, baús 10, ilhas 5, prédios 5, nível 5 [alvo 15], pontos gastos 5, loja 5, cassino 3, monstros 7 = 100). Aparece no HUD (🏆N%), no menu de pausa e na tela de Missões. Em 100% dispara um aviso único de platina (flag `__platinum` em `questProgress`).
- **Interiores**: os "blocos invisíveis" eram a colisão por tile de mobília maior que a arte. Agora a colisão usa retângulos exatos da mobília (`furnitureBoxes`, `resolveMoveBoxes` em `collision.ts`) com uma caixa só nos pés do personagem. Animação de andar (walk1-3) dentro das casas, e trava anti-quique nas escadas.
- **Barcos**: sprites reais (`assets/boats/boat_{up,down,left,right}_{1,2,3}.png`, da folha enviada) nos barcos atracados e na viagem.
- **Viagem de barco**: `seaRoute.ts` (A* no mar) + `stepSail` no `WorldScreen`: o barco navega até a ilha escolhida (7-18 s, câmera acompanha), botão PULAR VIAGEM, passagem cobrada ao partir. `FerryOverlay` só escolhe o destino (`onDepart`).

## Parte 33 — áudio, opções, nível 99, raridade, mochila

- **Áudio** (`src/game/audio/`): `audioManager.ts` (expo-audio: 1 música em loop com fade entre faixas + pool de 3 players por efeito), `audioAssets.ts` (todos os mp3 empacotados), `music.ts` (tabela de qual faixa toca onde), `haptics.ts` (expo-haptics, desligado na web). Arquivos em `assets/audio/{music,sfx}`: para trocar um som, troque o mp3 com o mesmo nome. Músicas do Kevin MacLeod são CC BY 4.0 (crédito na tela de Créditos).
- **Opções** em páginas: SONS (sliders MÚSICAS / EFEITOS SONOROS), JOGO (autosave), CONTROLES (editar controles + RESPOSTA TÁTIL), IDIOMA. Config salva em `settingsState.ts` (`musicVolume`, `sfxVolume`, `haptics`, `tips`).
- **Nível 99** (`levels.ts`): curva original até o nível 15, depois +55 XP por nível (~290k no total). Níveis 2-50 dão 1 ponto de status, 51-99 dão 2 (147 pontos). A platina exige nível 99 e todos os atributos no máximo (100 pontos).
- **Progresso**: pesos rebalanceados (missões 33, mapa 9, NPCs 9, baús 9, ilhas 5, prédios 4, nível 12, pontos 5, loja 4, cassino 3, monstros 7). Meta de monstros: 300.
- **Raridade** (`rarity.ts`, `itemDefs.ts`): comum / incomum / raro / épico / lendário em todos os itens, com `weight` (kg) por item.
- **Mochila** (`bags.ts`, `playerState.ts`): limite de espaços e de peso, 5 mochilas com efeitos (pano, couro, explorador, arcana, Rei Meme). Cheia = baú/coleta fica no chão (nada se perde); itens de história ignoram o limite. Mochilas de couro e explorador são vendidas (praça e loja do gelo); arcana e do Rei Meme virarão recompensas (chefe/torre).
- **Save extensions** (`saveExt.ts`): módulos registram dados próprios em `SaveData.ext` (usado nas próximas partes).
- Velocidade ao andar agora inclui o atributo Velocidade (+3%/nível) e o bônus da mochila.

## Parte 34 — dia/noite, clima, ondas, lojas por ciclo, rotina dos NPCs, dicas

- **Ciclo dia/noite** (`state/timeState.ts`): 10 min de dia + 10 min de noite (tempo real, só corre com o mundo aberto e sem pausa), 45 s de entardecer/amanhecer suaves. Relógio do jogo 06:00–18:00 dia, 18:00–06:00 noite. Salvo no save (`ext.time`). `world/NightOverlay.tsx` (véu azul escuro com "buraco" de luz em volta do jogador + tom laranja no crepúsculo), `world/BuildingLights.tsx` (janelas acesas por fachada, medidas sobre as imagens) e `world/DayNightLayers.tsx` (relógio ☀/🌙 no topo). À noite a ilha principal toca `forest_night` e a de gelo `frozen_wastes`.
- **Clima** (`state/weatherState.ts`, `world/WeatherLayer.tsx`): sorteio determinístico por ilha a cada 3 min de jogo: chuva, tempestade (trovão + clarão), neblina, neve, nevasca e cinzas (vulcão). Sons ambiente sintetizados em `assets/audio/ambient/{rain,wind,waves}.mp3` (volume próprio: slider AMBIENTE em SONS). `audioManager.setAmbient(key, nível)`.
- **Ondas e marés** (`world/waveClock.ts`, `TileMapRenderer.tsx`): a espuma da costa agora tem duas faixas que vão e vêm em fases opostas (ciclo de 4,8 s) e a maré (2 por ciclo) muda o alcance. Um `Animated.View` por chunk, então o custo é baixo. Som de ondas perto da costa e navegando.
- **Lojas por ciclo** (`items/shopCycle.ts`, `ShopOverlay.tsx`): comida fresca (morango, leite, pão, banana) só de dia; à noite entram Cogumelo Lunar, Elixir da Lua e Poção Noturna. **Ofertas relâmpago**: 2 itens por loja, −30%, 1–3 unidades, trocam a cada 2 min (salvas em `ext.shopFlash`).
- **Rotina dos NPCs** (`world/npcRoutine.ts`, `OutdoorNpcs.tsx`): 17 moradores têm ponto de manhã, de tarde e de noite (uns dormem 💤) e caminham entre eles. Nunca somem: a seta de missão e o botão FALAR seguem a posição atual. Guardas, soldados, barqueiros e estátuas ficam parados.
- **Dicas** (`state/tipsState.ts`, `menu/TipBanner.tsx`): cartão na primeira vez de noite, chuva, neblina, neve, cinzas, pontos de status, mochila cheia, falar com NPC, cais, loja e oferta relâmpago. Pode pular (OK) ou desligar ("DICAS NO JOGO" em JOGO). Salvo por jogo em `ext.tips`.
- **Melhoramentos** (`upgrades.ts`): por nível, vida +12, aura +15%, velocidade +4%, força +10% (nível 10: +108 vida, +135% aura, +36% velocidade, +90% dano).

## Parte 35 — status, habilidades, chefes, torre, rival

- **Status em luta** (`battle/Fighter.ts`): queimar (4,5 de dano/s), congelar (velocidade ×0,45 e sem dash), envenenar (2,4/s) e atordoar (não age). Cada lutador tem `onHitStatus` (chance, duração, em quais golpes), `immune`, e os ícones aparecem sob a barra de vida; o sprite ganha tom de cor e 💫 no atordoamento.
- **Chefes com fases** (`state/bossState.ts`): 8 chefes, um por ilha. Cinco novos esperando no mapa (ninja na ilha principal, encapuzado na Misteriosa, dragão verde nos Fragmentos, dragão do gelo, dragão sombrio nas Trevas) e três da história (capitão do acampamento, rei dos cães, guardião do vulcão). Aos 50% de vida entram na **fase 2** (+25% de dano, +20% de velocidade, status mais frequentes, energia cheia, 1,1 s de invulnerabilidade) e a CPU fica mais agressiva (`CpuController.enrage`). Primeira vitória dá a recompensa completa; revanche dá 20%. Marcadores 💀 e botão DESAFIAR no mundo (`world/BossMarkers.tsx`, `WorldScreen`).
- **Árvore de habilidades** (`items/skills.ts`, `state/skillState.ts`, `menu/SkillTreeView.tsx`): uma árvore por personagem (Dogge: BRASA / GUARDIÃO / LENDA; Gadigago: GELO / ÁGIL / LENDA), 16 pontos por árvore, gasta os mesmos pontos de status dos atributos. REDISTRIBUIR custa 500 MC e devolve os pontos. Acesso: botão 🌳 na loja do Maximilian e HABILIDADES no menu de pausa (`/skills`). Efeitos valem na luta e no mundo.
- **Torre dos Desafios** (`state/towerState.ts`, `battle/battleModes.ts`, `screens/TowerScreen.tsx`, rota `/tower`): andares infinitos de 1 round (90 s), vida do inimigo +7% e dano +3,5% por andar; chefe a cada 10, rival a cada 25; 35% da vida restante passa ao próximo andar; checkpoint a cada 10 andares; ranking local top 10; marcos de recompensa nos andares 10, 25 (mochila Rei Meme) e 50. **A torre só é gravada ao salvar pelo menu de pausa.**
- **Rival** (`state/rivalState.ts`): depois da missão do rival, o botão REVANCHE aparece perto dele; cada vitória deixa o rival mais forte (vida/dano) e libera status (congelar, depois envenenar, depois atordoar) e rende mais moedas e XP.
- **Recompensas**: `bag_arcane` (Dragão do Gelo) e `bag_king` (torre andar 25).
- **Traduções**: 29 chaves novas nos 5 idiomas. Nomes e descrições das habilidades estão só em português.
- **Verificado no build web**: luta contra chefe (banner de fase 2 + recompensa), torre (andar 1 → 2 → sair → ranking), árvore (aprender/redistribuir), revanche do rival, menu de pausa com 8 botões.
- **Pendente**: peso de chefes/torre/habilidades na barra de progresso (rebalanceamento completo na Parte 37). Sons/vibração dos status não foram testados em aparelho real.

## Parte 36 — correções, STATUS, lojas, ícones, torre

- **Ícones pixel-art no lugar de emojis** (`assets/icons/*.png`, `game/ui/iconRegistry.ts`, `game/ui/GameIcon.tsx`): 91 ícones (16x16 ampliados 4x, sem suavização). `GameIcon` desenha um ícone; `IconLabel` põe ícone + texto lado a lado. Itens sem imagem própria, mochilas, atributos, status de luta (`STATUS_ICON`), clima (`WEATHER_ICON`), cassino, missões, progresso, tutorial, torre e HUD usam ícones. Os ícones vieram das capturas enviadas (recuperados em 16x16), do pacote de armaduras (`Black_Outline`: chapéus, capas, anéis, amuletos) e de desenhos novos no mesmo estilo. Para recriar: `tools/make_icons.py` (o registro `iconRegistry.ts` é gerado a partir da pasta). Varredura final: 0 emojis em `src/` e nas traduções; ficam só os símbolos ▲▼◀▶◈▸ do D-pad.
- **Textos novos** (`game/i18n/strings36.ts`, gerado por `tools/strings36.py`, mesclado por `extraStrings.ts` no fim de `translations.ts`): 22 chaves nos 5 idiomas. Chaves antigas removidas: `pause_skills`, `pause_tower`, `open_upgrade_shop`, `upgrade_shop_title`, `upgrade_shop_subtitle`.
- **Clima**: partículas reduzidas para cerca de 1/3; nova opção PARTÍCULAS DO CLIMA em OPÇÕES > JOGO (`settings.weatherParticles`; desligada fica só o tom do clima). Jogo novo: os primeiros 8 min de jogo têm tempo limpo em todas as ilhas (`CLEAR_START_MS`); o mundo já começava às ~07:30.
- **Pausa de verdade** (`state/pauseState.ts`): pausar silencia efeitos e ambientes (chuva, vento, ondas; a música continua) e congela relógio dia/noite, clima (animação), trovão, ondas, inimigos, barcos, efeitos de luta e o tempo de jogo da partida. A batalha liga o mesmo estado ao pausar e, enquanto aberta, congela o relógio do mundo por baixo (`setBattleOpen`). O menu de pausa (um `Modal`) agora só aparece com o mundo em foco; antes cobria STATUS, MISSÕES etc.
- **STATUS** (`screens/StatusScreen.tsx`, rota `/status`; substitui `/skills`): hub com ÁRVORE DE HABILIDADES e PONTOS DE PODER (`menu/PowerPointsView.tsx`, os 4 atributos; saiu da loja do Maximilian). O botão TORRE saiu do menu de pausa. Missões `upgrade_one`/`upgrade_5`, dica `tip_points`, diálogo do Maximilian e `tut_9_b` atualizados.
- **Árvore de habilidades** (`items/skills.ts`, `items/skillText.ts`, `menu/SkillTreeView.tsx`): por personagem, 5 ramos de 5 habilidades (custos 1, 1, 2, 2, 3) e uma linha final de 4 (5, 5, 5, 8; as 3 primeiras exigem o fim de dois ramos, a última exige as três): 29 habilidades e 68 pontos por árvore. Dogge: BRASA, GUARDIÃO, FEROZ, FÔLEGO, PRESA. Gadigago: GELO, ÁGIL, VENENO, SOMBRA, VIGOR. Efeitos novos no `Fighter`: `critChance/critMult`, `lifesteal`, `statusTargetDmgMult`, `startEnergy`, além de bônus separado de FLASH, FORTE e SUPER. Nomes, ramos e descrições nos 5 idiomas (as descrições são montadas dos efeitos). Saves antigos: a antiga habilidade final (`d_c`/`g_c`) é removida e os 4 pontos voltam.
- **Lojas** (`items/itemDefs.ts`, `items/shopCycle.ts`, `world/ShopOverlay.tsx`, `world/InteriorOverlay.tsx`): MARINA = comuns (comidas, poções P/M, energia, mochilas); MAXIMILIAN = batalha (`BATTLE_STOCK`: armas, escudo, bomba, poções G, buffs), botão ITENS DE BATALHA. Estoque noturno e ofertas relâmpago separados por vendedor (`shopKey` próprio, `vendor`).
- **Torre dos Desafios como prédio** (`worldGen.ts` `TOWER`, `world/TowerSprite.tsx`, `assets/buildings/torre_desafios.png`): nas Ilhas Fragmentadas, retângulo 4x6 sólido com porta em (1591, 1030), a ~30 passos do cais oeste (busca em largura no grid: alcançável, inclusive com folga 2x2). Botão ENTRAR perto da porta abre `/tower`.
- **Pés na batalha** (`BattleScreen.tsx`): chão por cenário, medido sobre as artes já recortadas para a arena 1280x720: `stage_1` y=600 (trilha), `stage_2` y=670 (deque), `stage_3` y=630 (piso do cais).
- **Verificado no build web (Playwright, 844x390)**: pausa no mundo (relógio e chuva parados) e na luta (cronômetro parado); STATUS, aprender habilidade, pré-requisito e Pontos de Poder; migração do save antigo; lojas da Marina e do Maximilian; torre e ENTRAR; 3 cenários de luta; clima limpo nos 8 primeiros minutos (teste direto da função).
- **Não verificado**: som e vibração no aparelho, desempenho no celular, crítico/roubo de vida/bônus em alvo com status numa luta real (compilam e a lógica é curta), e as telas da árvore em en/es/fr/ja (só em português).

## Parte 37 — cassino, cosméticos e luta de acordo com o lugar

- **Cenário, clima e hora na luta** (`game/battle/battleContext.ts`, `BattleSkyOverlay.tsx`, `state/worldPosition.ts`): lutas que começam no mundo (chefe, rival, missão e torre) leem a posição do jogador (a WorldScreen a publica a cada tick). O cenário depende de onde a luta começou: perto de um cais (12 tiles) ou da beira d'água = RIO OUTONAL (`stage_3`, o deque); perto de prédios (14 tiles) = VILAREJO (`stage_2`); o resto (mato, floresta, montanha, neve, cinzas) = MONTANHAS (`stage_1`). A torre mantém o cenário trocando a cada andar (só clima e hora vêm do mundo). VERSUS não tem ambiente. O clima do mundo naquele instante cai de leve sobre a luta (`WeatherLayer` com `intensity` 0,55, sem raio) e respeita a opção PARTÍCULAS DO CLIMA. A hora do dia escurece o cenário (não os lutadores) à noite, deixa laranja no entardecer e rosado no amanhecer; cada ilha ganha um tom próprio (gelo, vulcão, trevas, misteriosa). Corrige um erro antigo: a `BattleScreen` ignorava o `stageKey` que o chefe, o rival e a torre definiam. O entardecer e o amanhecer já existiam no mundo (45 s cada, de um ciclo de 20 min).
- **Cassino com 5 jogos** (`world/CasinoOverlay.tsx`, `casino/casinoMath.ts`, `casino/casinoUi.tsx`): CAÇA-NÍQUEL e CARA OU COROA (já existiam; apostas do cara ou coroa agora 10/20/50/100 para o pagamento ser sempre inteiro), DADOS (2 dados: MENOR 2–6 e MAIOR 8–12 pagam x2,3; número exato de 2 a 12 paga de x34 a x5,75), ROLETA AMERICANA (0, 00 e 1–36; cor e par/ímpar x2, dúzia x3, número cheio x36; 0 e 00 perdem as apostas externas) e CARTAS (MAIOR OU MENOR com baralho infinito; o multiplicador muda com a carta aberta e o empate perde). Cada jogo tem apostas mínima e máxima visíveis. A aposta sai ao começar e o prêmio entra quando o resultado aparece (se sair no meio, paga ao fechar). Ganhos do cassino não recebem o bônus de moedas da mochila. Todo lucro líquido conta como vitória para a missão do cassino e para o progresso. Sem texto emoji: dados, cartas e a roda são desenhados.
- **Simulação** (`tools/casino-sim.mjs`, Node 22+, usa o mesmo `casinoMath.ts`): 1.000.000 de rodadas por jogo. Vantagem da casa simulada: caça-níquel 4,91%, cara ou coroa 5,10%, dados MENOR/MAIOR 4,18%/4,04% (número exato 3,7% a 6,4%, mistura 5,84%), roleta 5,0% a 5,5% (mistura 5,01%), cartas 4,46% (escolha aleatória) e 5,13% (sempre a mais provável). Conta exata (sem sorteio): caça-níquel 4,79%, cara ou coroa 5,00%, dados 4,17% a 6,25%, roleta 5,26%, cartas 5,13%. Todas entre 3% e 7%.
- **Cosméticos** (`cosmetics/*`, `state/cosmeticsState.ts`, `menu/CosmeticBrowser.tsx`, `world/CosmeticShopOverlay.tsx`): 18 itens só visuais: 8 chapéus, 6 capas e 4 skins. Preço por raridade: comum 150, incomum 350, raro 800, épico 1800, lendário 4000 MC. Compra só com moedas, na costureira Dona Iracema (casa da praça, botão COSTUREIRA): dá para provar antes de comprar e o item comprado já sai vestido. STATUS > VISUAL é o guarda-roupa, com pré-visualização do personagem. Chapéus e capas usam os ícones do pacote de armaduras (duas capas extras por troca de tonalidade). As skins são o sprite recolorido por tonalidade (Gelo, Floresta, Sombra, Ouro), pré-gerado em `assets/skins` (64 PNGs) por `tools/make_cosmetics.py`.
- **Âncoras** (`cosmetics/anchors.ts`, medidas na silhueta por `tools/measure_anchors.py`): por personagem (Dogge e Gadigago) e por pose (parado, 3 quadros de caminhada, dash, flash, forte), com o chapéu pela base na cabeça e a capa atrás, e espelhadas quando o personagem olha para a esquerda. Aparecem no mundo (andando, 4 direções: esquerda e direita espelham, cima e baixo usam o último lado), dentro das casas, nos menus (preview) e na luta (p1). Para ajustar uma pose, edite os números do `anchors.ts`.
- **Salvamento e progresso**: ext `cosmetics` (`owned` + `equipped`). Nova categoria de progresso Cosméticos (meta: ter 8 itens, peso 3; o peso das missões baixou de 33 para 30 para a soma continuar 100). A meta é 8 de 18 de propósito: ter todos custa 24.250 MC.
- **Observação**: `preloadBodySprites` usa `expo-asset`, que já vem com o Expo mas não está listado no `package.json`; só roda na web (evita o corpo piscar ao trocar de pose ou skin). No celular os sprites já vêm no pacote.
- **Verificado no build web (Playwright, 844x390)**: as 5 abas do cassino, 6 rodadas de cada jogo com o saldo sempre igual ao resultado mostrado, apostas bloqueadas sem moedas, luta de chefe no cais à noite com chuva (cenário Rio Outonal), entardecer e amanhecer, loja da costureira (provar, bloquear sem dinheiro, comprar), guarda-roupa, salvar e recarregar, e cosméticos no mundo, no interior e na luta com Dogge e Gadigago.
- **Não verificado**: som e vibração no aparelho, desempenho no celular, a luta em Vilarejo por posição real (só a regra, por teste direto: praça = vilarejo) e os textos novos em en/es/fr/ja na tela (só em português).

## Parte 38 — história, escolhas, finais, segredos, elenco e estruturas

- **Estado da história** (`state/storyFlags.ts`, ext `story`): bandeiras, escolhas feitas (com a ordem), jogos de cassino vencidos e o final. Sem dependências do resto do jogo, para a lista de missões o consultar sem ciclos de import. Saves antigos entram vazios.
- **Diálogo com escolhas** (`dialogue/ChoiceOverlay.tsx`, `story/storyChoices.ts`): 10 escolhas, abertas ao tocar em FALAR no NPC certo (mundo e interiores) quando a condição vale e a escolha ainda não foi feita. Cada opção soma pontos (U/G/P), dá itens/moedas/pontos de status e aciona bandeiras. `story/storyDialogue.ts` troca as falas dos NPCs conforme as escolhas (a missão em cadeia ativa de um NPC ainda vence).
- **Motor de missões** (`missionTypes.ts`, `questState.ts`): `branch` (missão de caminho: só existe se a escolha foi feita com aquela opção), `optional` (não segura a missão final), `secret` ("???" até descobrir, ver `isMissionRevealed`), objetivo/passo `flag`, `reward.cosmetic` e `storyPts`. O HUD guia pela história principal. Uma bandeira nova reavalia as missões.
- **Revisão das missões** (`missionsDogge.ts`): 9 missões de enchimento foram juntadas às vizinhas (enter_home, upgrade_5, level_5, hunt_bats, hunt_spiders, coins_150, chests_4, buy_sword, enter_casino), com os requisitos reencaminhados (validado: 46 missões principais, sem ciclo e todas alcançáveis). Mais 16 missões em `missionsStory.ts`: 6 de caminho e 10 secretas. No máximo 59 possíveis num mesmo save.
- **Segredos**: NPCs `mercador_noturno` (só à noite) e `cantora_chuva` (só na chuva) via `OutdoorPlacement.only` + `world/npcActive.ts`; baú `bau_igreja` ao lado da igreja; bandeiras por evento: chefe sem dano (`BattleScreen`), andar 25 da torre, as 5 primas (`reportTalk`), três setes no caça-níquel. A Coroa (`hat_crown`) é cosmético exclusivo de missão (a loja não vende; o guarda-roupa mostra trancado).
- **Finais** (`story/storyEnding.ts`, `screens/EndingScreen.tsx`, rota `/ending`): textos nos 5 idiomas, 5 falas + título + créditos, com cenas montadas com ativos existentes (cenários, sprites, ícones e o clima de chuva). Dispara quando a missão final é concluída e o save ainda não tem final; fica salvo.
- **Progresso** (`progressState.ts`): 100% exige tudo o que dá para fazer: missões possíveis (26%), mapa, NPCs (inclui os secretos), baús, ilhas, prédios, nível, atributos, loja inteira, vencer nos 5 jogos do cassino, TODOS os cosméticos (inclui as skins e o exclusivo), 300 monstros, as 10 escolhas e chegar a um final.
- **Modo leve** (`settings.lightMode`): substitui o botão PARTÍCULAS DO CLIMA. Não tira nenhum efeito: chuva e neve caem com cerca de 30% das partículas (25% na luta), as faíscas de golpe pela metade e os menus com metade das partículas. Saves/configurações antigas com partículas desligadas viram modo leve.
- **Elenco do VERSUS** (`state/rosterState.ts`, `VersusScreen`): 11 lutadores, 2 liberados (Dogge e Gadigago) e os outros desbloqueados na CONTA (vale para todos os mundos) por conquistas: chefe derrotado pela 1ª vez (soldado, rei dos cães, tanque, ninja, místico e os 3 dragões) ou andar 10 da torre (orc). A faixa de lutadores mostra os bloqueados com cadeado e como liberar; o oponente da CPU pode ser qualquer um.
- **Itens no VERSUS** (`battle/versusLoadout.ts`, `LoadoutMenu.tsx`): antes da luta há um sorteio de 4 itens de batalha; o jogador escolhe 2 (pode sortear de novo 1 vez ou lutar sem itens) e o outro lado recebe 2 sorteados. O botão ITEM usa esses itens (uso único, não vêm da mochila); a CPU usa os dela (cura quando está baixa, bomba e buffs de vez em quando). No modo 2 jogadores o jogador 2 recebe seus itens, mas só o jogador 1 tem botão para usá-los.
- **Sprites com ult nova**: `ult.png` de orc, soldier, tank_fighter e dogking trocados pelos novos (as outras 7 poses eram idênticas) e as proporções do `ult` em `SPRITE_ASPECTS` atualizadas. As futuras skins desses lutadores devem sair deles (o gerador `tools/make_cosmetics.py` lê `assets/legacy-sprites`).
- **Estruturas novas** (`worldGen.ts` `SCENERY`, `world/SceneryLayer.tsx`, `assets/buildings/nb_*.png`): igreja, lanchonete, 2 prédios de tijolo, casa vermelha, casa pequena, barraca de feira, carrinho de sorvete e casa de madeira em volta da praça, sólidas e sem interior. A arte repetida de 4 prédios foi trocada (Loja do Vulcão = loja 24h, Descanso do Vulcão = hotel, Loja Abandonada = casa de madeira, Salão do Acampamento = casa de pedra). Busca em largura: nenhuma porta, cais ou torre deixou de ser alcançável. O chão sob cada estrutura é o do tile da frente.
- **Verificado no build web**: escolha do Bento (intro, opções, recompensa e fala nova), os 3 finais com saves injetados (cada um no caminho certo), NPCs secretos à noite e na chuva e a missão deles ("???" até achar), missões e progresso, MODO LEVE nas Opções, elenco bloqueado (2 de 11), sorteio, uso de item na luta e a praça com as estruturas.
- **Não verificado**: as outras 9 escolhas na tela (só a do Bento), a missão final real até o fim, o som, a vibração e o desempenho no celular, e as escolhas (texto da história) em en/es/fr/ja (como o resto dos diálogos dos NPCs, só em português).

## Parte 39 — game feel do combate e raridade com efeito real

**Plano de execução, Parte 1.** Branch local `feature/parte01-combate-game-feel-raridade` (sem push).

### O que mudou
- **Flash branco ao levar golpe** (`battle/Fighter.ts`, `screens/BattleScreen.tsx`): `takeHit` liga `hitFlashTimer` (130 ms, mais fraco se o golpe foi bloqueado). A tela desenha, por cima do sprite, a MESMA imagem do quadro atual com `tintColor` branco, então o flash segue a silhueta de qualquer lutador (dragões e sprites de proporções diferentes incluídos) em vez de um retângulo. O tint vermelho de dor também passou a seguir a silhueta. Nada disso altera posição, hitbox, dano, estados ou animações: são só timers de aparência (`tickVisuals`).
- **Números de dano** (`battle/combatFx.ts`): vermelhos, nascem pequenos, "estouram" e sobem ~56 px com desaceleração, somem no último terço. Tamanho cresce com o dano e com a intensidade (comum < FORTE < crítico/SUPER; bloqueio é discreto). Números seguidos no mesmo alvo sobem um degrau e alternam de lado, então nunca ficam exatamente sobrepostos. O crítico leva o destaque `CRÍTICO!` (chave `battle_crit`, 5 idiomas, em `i18n/stringsCombate.ts`). Nascem na cabeça do atingido, abaixo da barra de vida.
- **Impacto** (`combatFx.ts`): flash de impacto + faíscas em cone na direção do golpe, recuo e "amassado" do atingido (base nos pés), tremor curto da arena só em golpes FORTE/crítico/SUPER (3 a 7 px, 140 ms). Os efeitos só são CRIADOS depois do acerto resolvido: não atrasam comando, golpe nem animação. O `SpriteEffect` de impacto que já existia foi mantido (o crítico agora usa o de FORTE, maior).
- **Leveza**: tetos fixos (56 partículas, 28 no MODO LEVE; 8 números), sem alocação por quadro além dos efeitos novos, MODO LEVE corta faíscas e tremor pela metade. Os efeitos avançam também em `roundEnd` (antes as partículas do golpe final ficavam congeladas na tela) e são zerados a cada round/revanche. Pausa congela tudo (o loop já pausava).
- **Raridade com efeito real** (`items/rarity.ts` puro, `gearDefs.ts`, `gear.ts`, `itemDefs.ts`): tabela `RARITY_BONUS`, aplicada POR CIMA do valor próprio do item (comum = neutro, nada do que já existia muda):

| Raridade | Dano da arma | Dano recebido (escudo) | Cura | Energia | Chance de status (arma) |
|---|---|---|---|---|---|
| Comum | x1,00 | x1,00 | x1,00 | x1,00 | 0% |
| Incomum | x1,03 | x0,97 | x1,05 | x1,05 | 0% |
| Rara | x1,06 | x0,94 | x1,10 | x1,10 | 8% |
| Épica | x1,10 | x0,90 | x1,15 | x1,15 | 12% |
| Lendária | x1,15 | x0,85 | x1,20 | x1,20 | 18% |

  Armas de raridade rara+ aplicam status ao acertar (só na luta; chance pela raridade): Espada (rara) congela, Martelo (raro) atordoa, Machado (épico) queima. Hoje, com as raridades atuais: Adaga x1,10; Sabre x1,215; Porrete x1,257; Espada x1,325; Martelo x1,378; Machado x1,485 (antes x1,35). O escudo (incomum) passa de x0,70 para x0,679. Só a 1ª arma e o 1º escudo equipados contam (não acumula), o proc leva a marca `src:'gear'` (não duplica se o setup rodar de novo) e o multiplicador de chance da árvore de habilidades continua valendo por cima. Chefes imunes continuam imunes.
- **Descrições** (`items/itemBonusText.ts`, `skillText.ts`): linhas de bônus nos 5 idiomas na cor da raridade, no Inventário e na Loja (os números saem da mesma tabela do combate, então não divergem; um teste confere item por item).

### Verificado
- `npx tsc --noEmit`: 0 erros (antes e depois). `node tests/unit/combate/game-feel-e-raridade.test.mjs`: 65/65 (tabela de raridade, contas de dano/guarda/cura/energia, procs com 20 mil sorteios, textos nos 5 idiomas sem `{}` sobrando, limites dos efeitos, flash/reação em TODOS os 11 lutadores, sem mudar dano/hitstun/hitbox).
- `node tests/e2e/combate/game-feel.e2e.mjs <dist>`: **90/90** no Expo Web + Chromium (Playwright), luta real contra a CPU, 10 oponentes: flash em todos (maior episódio 150 ms; começa em 1,00 e decai), caixa do flash igual à do sprite com diferença 0,00 px em ~800 quadros, prova por pixels (flash 92 a 97% branco vs 0 a 6% no sprite normal, em gadigago, mystic, dogking, ninja, 3 dragões), números vermelhos (100%), sobem ~54 px relativos à arena, somem, vivem 0,8 a 1,1 s, FORTE (~40 px) maior que comum (~27 px), nenhum par sobreposto (menor distância ~12 px), pausa congela e retoma, luta completa termina e a revanche começa limpa, sem erros de JS. Com `CRIT=1` em um build de teste (crítico garantido só na cópia): 50/50, `CRÍTICO!` aparece e o número é maior.
- Desempenho no navegador do servidor: mediana de quadro 16,7 ms (60 fps), p95 16,8 ms, normal e MODO LEVE. **Não representa o Galaxy A14.**

### Achados preexistentes (não causados por esta parte; confirmados no commit original)
1. **Faltam `assets/legacy-art/` e `assets/legacy-sprites/` no repositório** (108 arquivos: sprites de todos os lutadores, telas de menu, cenários de luta e `escudo.gif`). `npx expo export` falha sem eles. Para testar, usei uma cópia descartável FORA do repositório com placeholders geométricos nas proporções reais de `SPRITE_ASPECTS` (nada disso foi commitado nem entregue). Os testes validam lógica, geometria e renderização, **não a arte real**. Antes do APK é preciso restaurar essas pastas. **Resolvido na "Parte Urgente 1" (abaixo): as pastas foram recriadas.**
2. **Erro React #418 (hidratação) na web** em `/battle` sempre que o oponente da URL difere do padrão do HTML estático (`gadigago`): idêntico no código original.
3. **Arena em `scale(0)` na web** com o oponente padrão: em 6 de 6 cargas do código original a arena fica invisível (a hidratação não remonta e `useWindowDimensions` fica em 0x0 até um resize). Só na exportação web, não no APK. Não corrigido aqui para não mexer em todas as telas; vai para a revisão de Expo Web da Parte 5. O teste de navegador contorna com um resize e imprime NOTA.

### Limitações / não verificado
- Som, vibração, desempenho e a sensação do impacto no celular (Galaxy A14 5G) **não foram testados em aparelho**.
- Os status das armas só valem na luta (BattleScreen); no mundo (`WorldScreen.resolveSwing`) só dano e guarda por raridade, porque inimigos do mundo não usam o sistema de status.
- Hoje não há arma/escudo lendário, e só Machado é épico; as linhas lendárias existem na tabela e nos testes, mas não aparecem em nenhum item ainda.
- Rebalanceamento: armas e escudo ficaram um pouco mais fortes (ver valores acima). É intencional ("raridade com consequência"); ajuste a tabela `RARITY_BONUS` se quiser menos.

### Como rodar
`node tests/unit/combate/game-feel-e-raridade.test.mjs` (sem dependências novas). Navegador: `npx expo export --platform web --output-dir dist` e `node tests/e2e/combate/game-feel.e2e.mjs dist` (usa o Playwright já instalado no ambiente, que NÃO está no `package.json`; variáveis opcionais: `ONLY`, `VISUAL`, `SHOTS_DIR`, `CRIT=1`, `PLAYWRIGHT_PATH`).

## Parte Urgente 1 — recriação dos assets perdidos (`assets/legacy-sprites`, `assets/legacy-art`)

Contexto: as pastas `assets/legacy-sprites` e `assets/legacy-art` nunca estiveram no Git e foram apagadas do computador. Esta parte devolve o que o jogo precisa para compilar e rodar, usando o que o Marcos conseguiu recuperar (ZIP com sprites soltos e pacotes) e desenhando o resto por código. Nada foi inventado como "arquivo original": `assets/legacy-sprites/ORIGEM.json` registra, quadro a quadro, de onde veio cada PNG e o tamanho dele.

### Origem de cada lutador (11 lutadores x 8 quadros: idle, walk1-3, dash, flash, strong, ult)
| Personagem | Origem |
|---|---|
| Dogge, Gadigago | **Originais recuperados.** As skins de `assets/skins/*/floresta` são deslocamentos de matiz dos originais (`tools/make_cosmetics.py`); a inversão do deslocamento devolve os quadros com os mesmos tamanhos da tabela do jogo. |
| Dogking, Tank | Quadros reais dos pacotes EvilDog e TankDog (Idle, Run1-3, Attack1 = flash, Attack4 = strong), ampliados x4 sem suavizar. O dash é o Run4 com riscos de velocidade. O ult é uma bola de energia gerada. |
| Dragão verde, dragão de gelo | Quadros reais de bater asas (178x202). O ult é gerado. |
| Orc, Soldier, Mystic, Dragão sombrio | **Desenhados do zero por código** (`tools/legacy_chars.py` + `tools/legacy_draw.py`): formas em alta resolução, amostradas em grade baixa, brilho/sombra e contorno de 1 px; membros por cinemática inversa, então cada pose é uma pose de verdade. **Sem armas nem itens**: o jogo já tem espadas, escudos e cajados no inventário, e um item desenhado no sprite confundiria com o item equipado. Os poucos quadros antigos serviram só de referência. |
| Ninja | Uma imagem solta recuperada (encapuzado) + poses geradas por código (ver limitações). |
| Cara Tranquilo, Troll Face | Uma imagem de cada, enviada pelo Marcos (reduzida), + poses geradas. **Só os arquivos**: ainda não estão no jogo (entram na Urgente 2). |
| Retratos (footman, tank, hood, monk, moai, meme-kin x5) | Footman/Tank: quadro Idle dos pacotes x4. Os demais: desenhados do zero (32x32, ampliados x4). |

`assets/legacy-art/`: 6 telas de menu (historia, inicio, jogar, opcoes, sair, versus), 3 cenários (`stage1-3.webp`) e `effects/escudo.gif` (10 quadros), todos 1280x720 (escudo 128x128), gerados por `tools/make_legacy_art.py` (arquivo preexistente, não modificado).

### Mudanças no código
- `src/game/battle/sprites.ts`: `SPRITE_ASPECTS` reescrito a partir dos tamanhos reais dos PNGs. **Novo `LAYOUT_ASPECTS` + `getLayoutAspect()`**: a altura de um lutador em jogo é `drawWidth / proporção do idle` (`Fighter.getReferenceHeight`). Como o idle recriado tem outro tamanho de quadro que o antigo, usar o idle novo mudaria o tamanho em tela de vários personagens. `LAYOUT_ASPECTS` guarda a proporção do desenho antigo (orc, soldier, dogking, tank, ninja, mystic), então a altura em jogo não muda. Dogge e Gadigago não precisam (os PNGs são os originais).
- `BattleScreen.tsx` e `WorldScreen.tsx` passam a usar `getLayoutAspect` em `createFighter`.
- `Fighter.ts`: `drawWidth` do dragão sombrio 440 -> 400. O dragão foi redesenhado (144x104, mais compacto); com 440 ele ficaria com cerca de 317 px de altura, maior que os outros dragões. Com 400 fica com ~289 px (verde 272, gelo 284). **Muda o tamanho do dragão sombrio em jogo**: se preferir o antigo, é só voltar o número, mas a altura passa de 289 px para 317 px.
- `tests/e2e/combate/game-feel.e2e.mjs`: `DRAW_WIDTH.shadow_dragon` 440 -> 400, e o limite da prova por pixels do flash caiu de 45% para 15% do retângulo (os desenhos novos, como o manto estreito do mystic e as asas, ocupam menos do retângulo; a cobertura exata continua checada com diferença <= 1,5 px e o flash foi conferido a olho nas capturas).

### Verificado
- `python3 -I tests/assets/sprites-legados.test.py`: **512 verificações, 0 falhas, 0 avisos** (todo `require` de `src/` existe; 8 quadros por lutador; tamanho de cada PNG = `SPRITE_ASPECTS`; mesma altura nas poses de corpo; pés na base; corpo centrado; pelo menos 6 quadros distintos; arquivos de Cara Tranquilo e Troll Face).
- `npx tsc --noEmit`: 0 erros.
- `npx expo export --platform web` numa cópia descartável **sem nenhum placeholder** (o script de placeholders gerou 0 arquivos: o repositório agora está completo): exportou.
- `node tests/e2e/combate/sprites-cenarios-e-retratos.e2e.mjs <dist>`: **44/44** (os 11 lutadores abrem em `/battle`, altura em tela igual ao desenho original, nenhuma imagem com 404, sem erro de JS), com capturas conferidas a olho.
- `node tests/e2e/combate/game-feel.e2e.mjs <dist>`: após o ajuste do limite do flash, **90/90 em uma execução**; em outras duas houve 1 e 2 falhas **intermitentes** na medição dos números de dano (`cada número sobe...`). Rodando o mesmo teste no build anterior (sprites antigos) também apareceram falhas intermitentes desse tipo e uma em que o Gadigago foi derrubado antes do flash. Ou seja, é instabilidade do teste contra a CPU do jogo, não dos sprites novos, mas **não consegui um 90/90 repetido**.

### Limitações / não verificado
- **Não testado em aparelho** (Galaxy A14 5G). Nada de som/desempenho aqui.
- Ninja, Cara Tranquilo e Troll Face partem de **uma única imagem** cada; os 8 quadros usam poses geradas por código (inclinação, agachar, pernas e braços simples), não animação desenhada à mão.
- Os ult são **bolas de energia geradas** (não os originais).
- A associação dos quadros soltos do ZIP com Ninja e Mystic foi uma dedução (nome do arquivo e aparência).
- Tank, Dogking e Footman (retrato) mantêm o machado/espada/lança que já fazem parte dos quadros dos pacotes originais. Os personagens desenhados por mim não têm item.
- O orc/soldier/mystic originais tinham quadros minúsculos (27x23, 21x26...); os novos têm mais detalhe, por isso `LAYOUT_ASPECTS`.

### Como regenerar
`python3 tools/make_legacy_sprites.py --src <pasta legacy-sprites extraída do ZIP>` (determinístico, ~2 s; opções `--only a,b`, `--aspects`) e `python3 tools/make_legacy_art.py --out assets/legacy-art`. Depois `python3 -I tests/assets/sprites-legados.test.py`.

## Parte Urgente 2 — Troll Face e Cara Tranquilo no jogo (Versus + história)

Os dois já tinham os 8 quadros (Urgente 1, a partir da arte enviada pelo Marcos). Agora são lutadores de verdade, estão no VERSUS e na história.

### Lutadores (`Fighter.ts`, `CharacterKey` ganhou `troll_face` e `cara_tranquilo`)
| | Troll Face (trapaceiro) | Cara Tranquilo |
|---|---|---|
| Vida / velocidade / dash | 100 / 5,6 / 21 | 130 / 3,4 / 12 |
| Flash / forte / super | 10 / 16 / 32 | 9 / 18 / 30 |
| Efeitos ao acertar | atordoa (20% no flash, 700 ms; 25% no forte, 1 s) | congela (20% no forte, 1,8 s); **imune a atordoamento** |
| Tamanho em jogo (`drawWidth`) | 108 (~214 px de altura) | 118 (~207 px) |
Os dois mudam de padrão com 50% de vida (`hasPhases`), como os outros chefes. Os números são uma primeira proposta de equilíbrio, **não testados em partidas longas nem no celular**.

### Elenco (VERSUS)
- Troll Face: desbloqueia ao vencer o chefe `boss_troll`. Cara Tranquilo: ao vencer o `boss_chill` (o duelo amigável). Sem mexer no que os outros lutadores exigem. A tela de Versus passou a mostrar "2 de 13" desbloqueados no início.

### História
- **Troll Face, dono do cassino e da Ilha Misteriosa:** chefe `boss_troll` parado na trilha em frente à porta do cassino (tile 1128,178; a trilha de 3 tiles de largura é o único caminho até a porta). **Primeiro acesso:** ao entrar pela porta do cassino sem tê-lo vencido, o jogador é empurrado 3 tiles para trás, aparece o aviso (5 idiomas) e a janela de desafio do Troll Face (nível 20). Só depois de vencer o interior abre. O hint da missão "A Sorte do Dogge" avisa disso.
- **Troll Face perto dos barcos:** NPC trapaceiro em 4 cais (principal, oeste, ilha do gelo, vulcão), a 4–5 tiles do barqueiro para não tomar o botão FALAR dele. Cada conversa traz uma de 3 pegadinhas (a "passagem grátis por 50 moedas"; "olha atrás de você"; "o barqueiro cobra mais caro de quem fala comigo"). Depois de vencido na porta, ele reconhece a derrota.
- **Cara Tranquilo:** NPC em 7 lugares (praça, Ilha Misteriosa, vulcão, trevas, fragmentos, acampamento, ilha dos cães). Ao falar, um cumprimento e uma dica do jogo, que gira pelas 8 dicas (todas conferidas contra o jogo atual: pontos de STATUS, barqueiro, estoque noturno, mochila, margem de 5% do cassino, efeitos das armas raras, chefes mudam de padrão na metade da vida, chefe libera lutador no VERSUS). **Batalhas:** `boss_chill` (praça, nível 6, mais fraco que o normal) e `boss_chill_2` (Ilhas Fragmentadas, nível 30). O marcador deles no mapa não leva a caveira (`BossDef.friendly`).
- Todas as posições foram checadas no mapa decodificado (3x3 de tiles andáveis) e contra os outros NPCs.

### Textos
- Falas, dicas e o aviso da porta estão em `src/game/i18n/stringsUrgente2.ts`, nos **5 idiomas**, sem emoji. Os nomes dos lutadores no Versus e as ficha de chefe (`bossLore.ts`) seguem o padrão do jogo (português), como os demais.

### Verificado
- `npx tsc --noEmit`: 0 erros. `node tests/unit/combate/game-feel-e-raridade.test.mjs`: 65/65. `python3 -I tests/assets/sprites-legados.test.py`: 610/610.
- `node tests/unit/cassino/troll-face-e-cara-tranquilo.test.mjs`: **12/12** (stats e altura de referência, elenco e chefes, Troll na trilha em frente à porta, todos os marcadores/NPCs em chão andável e longe de barqueiros e de outros NPCs, textos idênticos nos 5 idiomas, sem emoji).
- Navegador (exportação web sem placeholders): `tests/e2e/combate/sprites-cenarios-e-retratos.e2e.mjs` **52/52** (13 lutadores abrem em `/battle`, altura de referência correta, sem 404 e sem erro de JS) e `tests/e2e/cassino/porta-e-npcs-no-mundo.e2e.mjs` **18/18** (porta do cassino barrada e desafio do Troll Face com nível e ACEITAR, interior não abre; FALAR e falas do Cara Tranquilo com dica e do Troll Face com pegadinha; lutas `boss_troll`, `boss_chill`, `boss_chill_2` abrem contra o oponente certo).

### Limitações / não verificado
- Não testei vencer a luta do Troll Face até o fim e entrar no cassino (o fluxo de vitória é o mesmo dos outros chefes, mas essa sequência específica ficou fora do teste automático). Também não testei no celular.
- Os dois partem de uma imagem só (ver Urgente 1): andam e atacam com poses geradas, não animação desenhada. O Cara Tranquilo mantém a mão no bolso em todas as poses.
- Troll Face e Cara Tranquilo não têm lutador em outros modos (Torre/rival) de propósito.
- Os trios "Tung Tung Sahur" e os 9 memes estáticos **não** entram nesta parte (ver relatório de entrega).

### Como rodar
`node tests/unit/cassino/troll-face-e-cara-tranquilo.test.mjs`; navegador: `npx expo export --platform web --output-dir dist`, depois `node tests/e2e/combate/sprites-cenarios-e-retratos.e2e.mjs dist` e `node tests/e2e/cassino/porta-e-npcs-no-mundo.e2e.mjs dist`.

## Parte Urgente 3 — Sahur God/Sahur/Sahur Evil, cassino gigante, memes ×3, cenários com variação, revanche

### Dano aleatório e crítico (commit `977ab1c`, ainda não entregue em ZIP)
- Cada golpe sorteia dano em faixa; crítico base de 5%; lâminas afiadas aumentam a chance. Cobertura em `tests/unit/combate/dano-e-critico.test.mjs` (15 testes).

### Personagens Sahur God (anjo), Sahur (laranja) e Sahur Evil (diabo)
- Sprites cortados da folha enviada pelo usuário (`tools/art_src/folha_3_personagens.png`) por `tools/folha_sprites.py` → `tools/make_legacy_sprites.py` (`from_sheet`). Poses: idle, walk1–4, dash, flash (soco curto), strong (soco longo), ult.
- A linha do Sahur na folha não tinha um quadro separado de soco longo: foi mapeado conforme `POSE_NOTES` em `folha_sprites.py`. Asas/auréola não animam separadas do corpo (são parte do quadro).
- `tools/rig_sprites.py` (rig anterior, sem a folha) foi removido.

### Cassino gigante (Ilha Misteriosa)
- Prédio `loja_misteriosa` 176×66 tiles (~77,6% da ilha). Zona de paz: criaturas hostis removidas num raio de 30 tiles (`enemySpawns.ts`).
- 3 andares (`casinoLayout.ts`): térreo, Mezanino VIP (2º) e Subsolo Secreto (−1). A escada do subsolo só existe com a flag `cassino_porao` (conversar com `velho_poker`).
- Missão secreta opcional `cas_subsolo` (`missionsCassino.ts`).
- Troll Face NÃO está mais dentro do cassino. Na porta (1128, 221) há luta obrigatória com `boss_troll`; só entra depois de vencer. Interpretação adotada para "ganhar de primeira": a luta é obrigatória e, se perder, pode tentar de novo pela revanche (com recompensa reduzida).

### Memes estáticos ×3
- 9 memes, cada um em exatamente 3 lugares (mundo e/ou cassino). Lista completa em `docs/MEMES.md` (gerada por `node tools/list_memes.cjs`). Teste: `test-urgente3.mjs`.

### Cenários de batalha
- 12 cenários (`stage_1..12`). Os 10 que têm céu/luz do dia ganham versões entardecer/amanhecer (`_dusk`) e noite (`_night`); Caverna e Cassino (interior) não variam. As variações são derivadas por correção de cor/iluminação dos cenários do usuário, não redesenhadas (`tools/make_stages.py`).
- A variante é escolhida pela luz do mundo no início da luta (`stageVariantForLight`: noite < 0,35; entardecer < 0,85; senão dia). Cenário correspondente ao bioma/lugar via `stageForTile`. O VERSUS lista os 12 (miniatura do dia).

### Revanche
- `src/game/state/revanche.ts`: sequência de derrotas por luta (chefe, rival, duelo de missão). Revanche = −50% de moedas e XP; revanche da revanche e as seguintes = −70%. Persistido em `ext.revanche`. Itens/bolsas/personagens liberados não são reduzidos. Torre e luta livre/VERSUS não entram.

### Verificado (executado)
- `npx tsc --noEmit` limpo; test-parte01 (65), test-dano (15), test-urgente2 (12), test-urgente3 (40), test-revanche (7); `test_legacy_sprites.py` 802 verificações.
- Export web descartável + Playwright: `e2e-urgente3.mjs` 23/23 (cassino 3 andares, subsolo com/sem passagem, 9 cenários novos, VERSUS com 12) e `e2e-urgente1.mjs` 64/64 (altura dos 16 lutadores).

### Limitações / não verificado
- Nada testado em aparelho real nem APK. Não há teste de navegador da luta de revanche até o desconto aparecer na tela (coberto só por teste Node + tsc).
- Variantes dusk/noite não foram vistas em batalha viva em todos os cenários (só os arquivos e o carregamento).
- Parte 2 (cutscenes, rivais, elites, animação de caminhada dos NPCs) segue bloqueada por falta das folhas PNG limpas.

## Parte 2 (Urgente 4) — sprites novos, Sahur, cume do vulcão

### Renomeados (nome exibido; os ids internos foram trocados na rodada 2 — ver abaixo)
- `sahur` → **Sahur**, `sahur_god` → **Sahur God**, `sahur_evil` → **Sahur Evil** (nome conforme escrito pelo dono; trocar é uma linha em `rosterState.ts`, `bossState.ts`, `Fighter.ts`, `npcs.ts` e `stringsUrgente3.ts`).

### Cume do vulcão (mesmo piolet da montanha)
- Platô de cinza selado na rocha a oeste do vilarejo do vulcão (x1850–1858, y300–328) com uma parede escarpada (`cliff`, x1842–1849, y312–316) que só o piolet vence (`cliff.ts`/`collision.ts`, o mesmo código da montanha de neve). Pé da parede (1840,314); bandeira no cume (1854,314), recompensa em (1854,304).
- Missão `volcano_summit` (exige `buy_piolet`), item `volcano_flag`. A parede no vulcão é desenhada em rocha escura; a dica sem piolet agora diz "Parede escarpada" (5 idiomas).

### Sprites novos (5 folhas) — ver `docs/SPRITES_V2.md`
- Importados: orc, soldier, gadigago, dogge, sahur (andar 5 passos, hurt, ko, charge, cast, ult). Motor: `sprites.ts` (`usesV2`, `resolvePose`, `walkFrames`), `Fighter.ts` (hurt/ko/charge com quadro próprio; ultimate usa `cast`), `BattleScreen.tsx` (KO sem girar 90° quando há quadro `ko`; aura de código só sem quadro `charge`; tint de status na silhueta).
- Dogge/Gadigago: skins, chapéu, capa e mão da arma medidos nos quadros novos (`wearV2.ts`). Preview conferido por imagem; **não** testado equipado em batalha real.
- Desligar por personagem em `assets/sprites-v2/ACTIVE.json`.

### Testes (executados)
- `tests/unit/historia/sahur-vulcao-e-sprites-novos.test.mjs` (20) e e2e `tests/e2e/historia/sahur-e-vulcao.e2e.mjs` (batalha dos 5 com hurt/ko visíveis, vulcão com e sem piolet) + `e2e-urgente1` (64, altura dos 16 lutadores).


## Parte 2, rodada 2 — renomeação total, vida persistente, armaduras, 8 folhas novas, NPCs andando, PNGs leves

### Renomeação (ids, pastas, arquivos, textos)
- `tocao` → `sahur` ("Sahur"), `serafim` → `sahur_god` ("Sahur God"), `capiroto` → `sahur_evil` ("Sahur Evil"; corrigido o "Evl"). Trocado em ids de personagem, chefes (`boss_sahur…`), NPCs (`sahur_npc…`), missões (`tronco_sahur…`), chaves de i18n, pastas (`assets/legacy-sprites/`, `assets/sprites-v2/sahur`, `tools/art_src/…`), ferramentas, testes e docs.
- **Saves antigos**: `src/game/state/legacyIds.ts` troca os ids velhos no texto do JSON antes do parse (save, roster e perfil), então personagens liberados, chefes vencidos, missões e chave de revanche (`boss:boss_*`) migram sozinhos. Teste em `tests/unit/historia/vida-persistente-armaduras-e-npcs.test.mjs`.

### Vida persistente (mundo ↔ luta de história) — `src/game/state/healthState.ts`
- Guardada como fração (0–1) da vida máxima, salva no jogo (ext `storyHp`; saves antigos começam cheios).
- Luta de **missão de duelo, chefe e rival** entra com a vida do mundo e, a cada quadro, devolve a vida em que está. Rounds seguintes **não** enchem a vida. Luta rápida, VERSUS e Torre não mexem.
- **Regras de design (mude as constantes se quiser):** perder a luta volta ao mundo com **25%** (`DEFEAT_FLOOR`); desmaiar no mundo acorda com **50%** (`FAINT_HP`; antes era 100%). "Tentar de novo" na tela de derrota recomeça com a vida guardada (25%).
- Cura: itens de cura (já usáveis no mundo e na luta), regeneração natural do mundo (após 4,5 s sem apanhar) e **armaduras**.
- O mundo passa a pausar (sem regenerar/apanhar) enquanto outra tela, como a luta, está por cima.

### Armaduras (regeneram vida no mundo e na luta) — `items/armorDefs.ts`, `items/armor.ts`
- Colete de Couro (0,5/s, loja da praça, 320), Armadura de Ferro (1/s, loja do gelo, 850), Manto Arcano (1,7/s, recompensa do chefe Sahur Evil), Armadura da Fênix (2,6/s, recompensa do andar 40 da Torre). Uma vestida por vez, trocada no INVENTÁRIO (barra ARMADURA). Soma com a regeneração das habilidades. Ícones **provisórios** (capas/elmo existentes) — troque `icon` em `armorDefs.ts`.

### Folhas novas (8) e idle parado
- ninja, troll_face, sahur_evil, sahur_god, dogking, tank, mystic, cara_tranquilo (identificados pelo desenho). Recorte por células com pontos de corte por folha (`SHEET_CFG` em `tools/import_sheets.py`), porque os quadros de ataque encostam uns nos outros. Folhas tipo A (6) trazem 2 quadros de conjurar na linha 2 e a "hurt" é o quadro com marcas de impacto da linha 3; tipo B (mystic, cara) têm hurt na linha 2.
- **Idle de todos os personagens novos = o retrato parado**; a guarda continua como pose `guard`. Cosméticos/âncoras de Dogge e Gadigago foram remedidos no idle novo.
- **PNGs otimizados** (`tools/png_opt.py`): redução uniforme por personagem (corpo ≤ 200 px) + paleta de 256 cores. sprites-v2 15 MB → 3,2 MB; skins-v2 5,5 MB → 1,1 MB; nenhum quadro > 64 KB. `MF_NO_OPT=1` gera sem perdas.
- Não usados pelo motor ainda: `orb`/`burst`/`exp1-4`/`portrait` (guardados para o VERSUS); quadros extras de conjurar das folhas tipo A não foram importados.

### NPCs andando — `tools/import_npc_sheets.py`
- 4 folhas JPG (RPG Maker: 3 passos × 4 direções, 8 personagens por folha) → `assets/npc-walk/` (fundo branco removido). A folha 4 corresponde aos NPCs `c08–c15` (conferido por comparação do quadro de frente) e eles andam com direção e passos; as folhas 1–3 são 24 personagens **novos sem NPC atribuído** (mapa editável em `assets/npc-walk/MAP.json`). NPC sem folha segue com a imagem parada de antes.
- Limite: a folha 3 veio em 236 px (menor que as outras, 384 px) e fica mais borrada.

### Erro de console corrigido
- `MissionsScreen`: capítulo repetido (a missão do vulcão ficava em outro ponto da lista) gerava `key` duplicada; agora agrupa por nome.

### Verificado (executado)
- `tsc` limpo; todos os `tools/test-*.mjs` e `test_legacy_sprites.py`; `test-parte3.mjs` novo. Navegador (`e2e-parte3.mjs`, 30/30): 13 lutas com o idle novo, /missions sem erro, mundo com 40% vindo do save (51% após 9 s; 82% com a Armadura da Fênix). `e2e-parte3-vida.mjs`: 40% no mundo → luta de chefe começa com ~40% → derrota → mundo com 25%.

### Limitações / não verificado
- Nada testado em aparelho real nem APK. Animação de andar dos NPCs só verificada por teste Node + export; não vi um NPC andando em captura de tela. Loja do gelo e recompensas de armadura (chefe/torre) só testadas por Node.
- Dogge/Gadigago equipados em batalha viva; troca de status (silhueta) na batalha; ciclo de rounds da luta de história com HP carregado em partida completa — só o primeiro caminho foi exercitado.

---

## Parte 2 — rodada 3: PERFIL, conquistas, Diamond Meme, derrota com checkpoint

### Conta global (fora dos saves) — `src/game/account/`
- **`accountCore.ts`** (puro, testado em Node) + **`accountState.ts`** (guarda em AsyncStorage, chave própria `meme_fighter_account_v1`, avisa as telas). Apagar/trocar um save **nunca** mexe na conta: apelido, favorito, ícone/fundo/moldura, Diamond Meme, conquistas, estatísticas e **cosméticos já conseguidos (chapéus, capas e skins)** moram aqui.
- Cosméticos: `cosmeticsState.ts` agora lê/grava a posse na conta; só o que está *vestido* continua por save. Saves antigos que traziam `owned` dentro do slot são **migrados para a conta** ao carregar (nada se perde).
- Tudo que é número de balanceamento está em **`accountConfig.ts`** (ganhos de diamante, taxa de derrota, custo de reviver, pacotes de câmbio, preços do perfil).

### Menu e perfil
- Menu inicial: JOGAR · **PERFIL** · OPÇÕES · SAIR. **Apelido** pedido no primeiro acesso (`NicknameDialog`), editável no perfil.
- `ProfileScreen` (rota `/profile`): aba PERFIL (apelido, favorito só entre os **liberados**, estatísticas), CONQUISTAS (filtro, barra de progresso, raridade, recompensa), VISUAL (ícone, fundo, moldura + compra com diamantes).
- **Ícones de perfil** = só o **busto** (cara + pescoço + um pouco abaixo), recortado da arte que já existe (`tools/make_avatars.py` → `assets/avatars/*.png`, 160×160, ~416 KB no total; gera `avatarArt.ts` e `avatarList.ts`). 57 ícones: 16 jogáveis (Dogge e Gadigago grátis; os outros precisam do lutador **liberado** + diamantes) e 41 amigos/memes **não jogáveis** (NPCs, 9 memes do cassino, 5 parentes, retratos antigos) que **compram direto**, sem ter encontrado no mapa. O enquadramento de cada um é uma fração na tabela `SPECS` (basta editar e rodar de novo).
- **Fundos**: 10 cores lisas grátis; 7 com efeito/animação (degradê, estrelas, chuva verde, aurora, pulso, arco-íris) comprados com diamantes. **Molduras**: padrão grátis; 7 compradas (prata, ouro, dupla, pixel, neon, fogo, arco-íris).

### Conquistas — `achievementDefs.ts`
- 74 conquistas declarativas (id e ícone únicos, título/descrição pt+en, 5 raridades, recompensa em 💎 pela raridade). **Para criar uma nova: acrescentar uma linha** em `ACHIEVEMENTS`; não há código de verificação por conquista (a condição lê contadores/conjuntos da conta e é reavaliada a cada evento).
- Exemplos pedidos: **NEVOU!!** ("Vá até a Ilha de Gelo") e "ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DOG KING" (uma por personagem + "todos"). As de personagem ainda sem história jogável aparecem com o aviso "ainda não é jogável na história".
- Ícones: **cada conquista tem a sua própria imagem pixel-art 16×16** (74 PNGs em `assets/achievements/`, desenhados por mim em `tools/ach/*.py` e gerados por `tools/make_achievement_icons.py`, que também gera `achievementArt.ts`), dentro de um emblema colorido pela raridade (`AchievementIcon`, `imageRendering: pixelated`). Para trocar uma: editar o desenho e rodar o script de novo.
- Aviso na tela (`AchievementToast`) em qualquer tela, uma de cada vez.

### Diamond Meme
- Ganha: missão (1), missão final (10), 1ª vitória em chefe (3), andar **novo** da Torre (1; ×5 = 3; ×10 = 5), VERSUS **só contra a CPU** (1–5 por dificuldade, teto 30/dia), conquistas (1/2/5/10/25 por raridade). Luta contra pessoa/treino não rende.
- Gasta: reviver, comprar ícones/fundos/molduras, **câmbio por Meme Coins** (1💎→100, 5→550, 20→2400) no menu de pausa do mundo (as moedas entram no mundo aberto).

### Derrota (história e Torre) — `DefeatOverlay`, `deathRules.ts`, `checkpointState.ts`
- Luta (quest/chefe/rival/Torre): o nocaute que **perderia a luta** congela a luta (fase `downed`) com animação de queda e escolha: **REVIVER** (3💎; animação de renascimento, volta com **100% de vida no mesmo estado** — rounds, energia, posição e vida do inimigo mantidos) ou aceitar a derrota.
- Aceitar a derrota (história): cobra a **taxa em Meme Coins** (`25 + 5×nível`, ×0,5…×2 pela dificuldade) — **pode deixar o saldo negativo** (com dívida as lojas não vendem; ganhos pagam a dívida primeiro) — e leva ao **checkpoint**. Torre e lutas livres não cobram taxa.
- Mundo: vida zerada abre a mesma tela; reviver no lugar ou voltar ao checkpoint com 50% da vida. **Checkpoint = último cais em que desembarcou** (sem nenhum ainda = a vila), salvo no slot.

### Verificado (executado)
- `tsc` limpo; `test-conta.mjs` (36) + todos os testes antigos; navegador `e2e-conta.mjs`: primeiro acesso/apelido, toast, perfil, compras, meme não jogável comprado direto, skins sobrevivem a apagar o save 1, derrota → reviver (100%, −3💎) → derrota → taxa e saldo negativo → checkpoint (posição salva = checkpoint) → câmbio no pause.
### Limitações / não verificado
- Nada em aparelho real/APK. As ligações de conquistas por evento (chefe, Torre, ilha, missão) estão testadas por código/Node; só missão, derrota, reviver, checkpoint, câmbio, compras e a conquista de apelido foram exercitadas no navegador. A vitória no VERSUS contra a CPU (diamantes + teto diário) está testada na lógica pura e por leitura do código, mas **não foi jogada até o fim no navegador**. Os 41 ícones não jogáveis são recortes de pixel-art pequena (os das folhas de NPC ficam serrilhados ao ampliar).
- Valores escolhidos por mim (taxa de derrota, ganhos, preços, lista inicial de conquistas) estão todos em `accountConfig.ts` / `achievementDefs.ts` / `make_avatars.py`.

---

## Rodada 3b — avatares, derrota sem "tentar de novo", conquistas com imagem, últimas folhas (orc 2 + 3 dragões)

### Pedidos atendidos
- **Avatares corrigidos** (`tools/make_avatars.py`, função `solidify`): todos os Sahurs, cara_tranquilo (nariz) e ninja (rosto) deixaram de ficar transparentes; troll_face, gadigago e moai não cortam mais o rosto. 57 ícones regenerados.
- **Sem "tentar novamente"**: a revanche foi **removida** (`revanche.ts` e seu teste apagados, textos tirados). Perdeu a luta → só **VOLTAR AO CHECKPOINT** (ou reviver pagando); para lutar de novo o jogador tem de renascer no checkpoint e ir até o local da luta. Como a revanche não existe mais, **não há desconto de recompensa** na 2ª tentativa (testado em `test-conta.mjs`).
- **74 conquistas com imagem própria** (ver seção de conquistas acima).
- **Orc 2ª folha + 3 dragões** integrados (`tools/import_sheets.py`; folhas em `tools/art_src/sheets/`): ver `docs/SPRITES_V2.md` (seção "Rodada 3: últimas folhas").

### Verificado (executado)
- `tsc` limpo; `test-dano` 15, `test-parte01` 65, `test-parte2` 22, `test-parte3` 26, `test-urgente2` 12, `test-urgente3` 40, `test-conta` 41, `test_legacy_sprites.py` ok.

### Limitações / não verificado
- Os dragões voam/andam/ult com os **quadros antigos** (pedido do dono); estilo ligeiramente diferente dos quadros novos (cores chapadas; o dragão de sombra anda no chão). O `cast` do dragão de gelo tem uma mancha preta preenchida (vem da folha). O `hurt` do orc é arte da 1ª folha reescalada.
- Os dragões ficam um pouco mais baixos na tela (mesma largura de antes).
- Não testado em aparelho real/APK. Cutscenes em vídeo: **ainda não criadas** (parte reservada em `docs/CUTSCENES.md`).

---

## Rodada 4 — 16 cutscenes em vídeo
- 13 cenas de história + 3 finais (um por final do jogo), todas `.mp4` em `assets/cutscenes/` (ver `docs/CUTSCENES.md`). Os finais têm 88–90 s; as outras 27–40 s.
- Integração: `expo-video ~57.0.2` (instalado com `npm install`, pois `expo install` deu 403 no proxy), `story/cutscenes.ts` (registro/gatilhos), `cutsceneAssets.ts`, `cutsceneState.ts`,
  `CutscenePlayer.tsx`, rota `/cutscene`, gatilho no `WorldScreen`, vídeo do final no início da `EndingScreen`, "REVER CUTSCENES" nas Opções.
- Depois de zerar o jogo, **dá para continuar jogando** (o final aparece uma vez por save; o botão da tela de final volta ao mundo).
- Testes: `test-cutscenes.mjs` 16 ok; `e2e-cutscenes.mjs`; os demais testes seguem verdes (conta 41, dano 15, parte01 65, parte2 22, parte3 26, urgente2 12, urgente3 40, sprites legados 802).
- Limitações: ver CUTSCENES.md ("Não verificado").


## Limpeza do legacy-sprites e código morto
- `assets/legacy-sprites` removida; `sprites.ts` usa só `assets/sprites-v2` (proporções de layout explícitas em `LAYOUT_ASPECTS`, mesma altura em tela de antes). `ACTIVE.json`/`usesV2`, `skinSources.ts`, âncoras antigas e as ferramentas dos desenhos antigos saíram. Retratos de NPC em `assets/npc-portraits/`. VersusScreen usa o idle dos sprites novos.
- Registros acima neste arquivo que citam `legacy-sprites`, `ACTIVE.json` ou `test_legacy_sprites.py` são histórico. Detalhes: `docs/PODE_APAGAR.md`.
- Verificação: `tsc --noEmit` limpo (e `--noUnusedLocals` sem pendências além de `import React`), todos os `tools/test-*.mjs` passam.

## Parte 4: VERSUS estilo Mortal Kombat (só a organização, sem copiar arte)
- **Registro escalável de lutadores** (`src/game/versus/fighterRegistry.ts`): `getFighterRegistry()` monta a lista a partir do que já existe (`ROSTER`, `CHAR_LABEL`, `AVATAR_ART`, pose `portrait` de `sprites-v2` e `createFighter`), com id, nome, sprite/retrato, barras (vida/velocidade/força) e o necessário para começar a luta. Nada duplicado: lutador novo no `ROSTER` aparece sozinho na seleção, sem mexer na interface.
- **Seleção** (`FighterSelect.tsx`, lógica em `versusLogic.ts`): logo oficial do Meme Fighter (`game-logo-gold.png`) no **centro** da grade; retratos reais nos espaços; **dois toques**: o 1º só seleciona e mostra a prévia ampliada à **esquerda** (nome, retrato grande, barras; bloqueado mostra o aviso e como liberar); tocar em outro troca a prévia; o 2º toque no mesmo lutador confirma. Nunca confirma no 1º toque. Bloqueados mostram a prévia, mas não confirmam. Teclado (setas/WASD, Enter/Espaço, Backspace) funciona como no toque.
- **Responsivo** (`gridLayout(total, largura, altura)`): escolhe colunas/tamanho para qualquer quantidade de lutadores e de tela (célula de 48 a 84 px, nunca sobrepõe; se nem 48 px cabe na altura, a grade rola); sem dependência de hover; prévia visível em telas pequenas; em telas grandes mantém a identidade (logo + prévia + grade).
- **Tela VS** (`VersusSplash.tsx`): lutadores deslizam, "VS" estoura com clarão (sons `encounter` e `hit_heavy`), nomes e arena entram, escurece e abre a luta (2,6 s; um toque pula). Voltar da luta não repete a tela VS. **Abertura** (`BattleScreen`): "ROUND n" e, nos últimos 520 ms, "LUTE!". Integra com o Versus de sempre (as configurações e habilidades de cada lutador não mudaram; sem multiplayer online).
- Textos em 5 idiomas (`stringsVersus.ts`: `vs_tap_preview`, `vs_tap_again`, `vs_stat_*`...). Só assets que já existiam.
- Testes: `node tests/unit/versus/selecao-e-tela-vs.test.mjs` (lógica: dois toques, troca de prévia, confirmação, `gridLayout` para várias quantidades e telas) e `node tests/e2e/versus/selecao-e-tela-vs.e2e.mjs dist` (navegador: logo no meio, 48 px de toque, sem sobreposição, 1º toque não confirma, prévia à esquerda, bloqueado, fluxo até a luta).

## Parte 5: auditoria final
Sistemas revisados: saves (3 slots e versões antigas), traduções (5 idiomas), pausa em todo o jogo, timers/animações (vazamentos), opções gráficas, barra de platina, documentação e checklist do APK.

### Problemas encontrados e corrigidos
- **Traduções**: 3 chaves duplicadas (`tip_points`, `equip_empty`, `progress_casino`, definidas em `translations.ts` e sobrescritas em `strings36.ts`; o texto que valia foi mantido e a cópia morta apagada); texto fixo em português nas lutas (`battle_hint_controls`, agora nos 5 idiomas).
- **Pausa e timers**: os ambientes do mundo continuavam tocando por baixo de uma luta (agora silenciam e a mistura volta ao fechar a luta); o balanço dos barcos, a aura da luta e o passo dos NPCs não paravam na pausa (agora param e retomam); as animações infinitas do menu (`ArtBackdrop`) não eram canceladas ao sair (agora são).
- **Opções gráficas novas** (celulares fracos): PARTÍCULAS DO CLIMA, ONDAS ANIMADAS e ESCURECER À NOITE (além do MODO LEVE já existente). Valem para mundo e luta; ondas desligadas param o relógio de ondas de vez. Saves de opções antigos carregam com tudo ligado (como sempre foi) e preservam volumes.
- **Saves**: novos campos (rival `encounters`, `elites`, opções gráficas) têm padrão seguro; os 3 slots antigos carregam sem erro.

### Como usar a auditoria de traduções
`node tools/check-i18n.mjs` (ou `npm run check:i18n`): lista chaves faltando em algum idioma, chaves duplicadas (no mesmo bloco ou em arquivos diferentes), textos iguais ao português, marcadores `{x}` diferentes, chaves fora do padrão e chaves usadas no código que não existem; sai com código 1 se achar qualquer problema. `--json` para ferramentas e `--unused` para listar chaves sem uso direto. Hoje: 0 problemas. Para texto novo: ponha a chave nos 5 idiomas num `strings*.ts` registrado em `extraStrings.ts` e rode o script.

### Testes executados (todos passam)
`npx tsc --noEmit` limpo; `node tools/test-*.mjs` (i18n 8 incl. o próprio script, saves 12, platina 7 + platina100 14, ambient 18, rival-elite 21, pause-timers 14, versus, conta, cutscenes (`CUTSCENES_STRICT=1`), dano, parte01, parte2, parte3, urgente2, urgente3); export web + Playwright (`e2e-*`, ver lista no README).

### Limites conhecidos
- A conta (cosméticos e conquistas) é global, não pertence ao save; por isso o teste de 100% roda o caso "sem cosméticos" primeiro.
- Dificuldade sentida das lutas do rival e dos elites (os multiplicadores são testados; o "feeling" não).
- Pausa: o clima e o relógio são parados por consulta a `isGamePaused()`/`isWorldFrozen()` (não por um agendador único); toda animação nova precisa seguir o mesmo padrão (o teste `test-pause-timers.mjs` pega timer sem limpeza e `withRepeat` sem `cancelAnimation`).

### Só se confirma num aparelho Android real (não foi feito)
Instalar o APK; som real dos ambientes novos (timbre e volume relativo nos alto-falantes) e as transições ouvidas; vídeo das cutscenes (autoplay/toque); vibração (Expo Haptics); desempenho em celular fraco com e sem as opções gráficas; toque duplo para dash; tamanho final do APK. Nada disso foi testado fora do navegador/Node.

## Parte 3: sons por região e barra de platina

### 3.1 Sons ambiente por região
- Loops novos, **sintetizados** por `python3 tools/make_ambient.py` (ruído filtrado, chilreios, pulsos, gotas, murmúrio; nenhuma amostra externa), no mesmo padrão de `rain/wind/waves` (mp3 mono, 32 kHz, 48 kb/s, 16 s, emenda de loop suave): `birds`, `crickets`, `cave`, `volcano`, `casino`, `shop`, `home` em `assets/audio/ambient/`. Gelo reaproveita `wind.mp3`. O script é determinístico: rodar de novo recria os mesmos arquivos.
- Mistura pura em `src/game/audio/ambientMix.ts` (`ambientMix(ctx)`): **uma cama regional** (floresta: pássaros de dia / grilos de noite; vulcão: ronco; cassino; loja/guilda/salões; casa; caverna e subsolo: pingos) **+ no máximo uma camada de clima/água** (chuva, vento ou ondas, vence a mais forte). Nunca mais de 2 loops. Chuva cala os bichos; camada forte (>= 0,6) abafa a cama ao ar livre; dentro de casa a chuva chega abafada; caverna e cassino não ouvem clima; vento e ondas não entram em interiores. Gelo e Trevas usam vento como ambientação.
- `WorldScreen` chama a mistura a cada 500 ms (relógio do mundo; parada com o jogo pausado) e entrega os níveis ao `audioManager.setAmbient`, que faz o cross-fade suave (~2 s), multiplica pelo volume **AMBIENTE** das Opções e não toca na música nem nos efeitos (players separados). Pausa: `setAudioPaused` pausa os ambientes; ao despausar, só volta o que estava tocando.
- Testes: `node tests/unit/sistema/sons-ambiente.test.mjs` (18; inclui varredura de 4.000+ combinações de ilha/interior/clima/hora/navegação provando a regra de no máximo 2 loops).
- Só se confirma no celular: o som real (timbre/volume relativo dos loops novos nos alto-falantes) e as transições ouvidas na prática.

### 3.2 Barra de platina rebalanceada (soma 100)
Categorias novas: chefes, Torre, árvore de habilidades e missões secretas (separadas das principais). Casino (5 jogos), cosméticos, escolhas e final já existiam.

| id | peso | meta | por quê |
|---|---|---|---|
| missions | 20 | todas as missões principais e de caminho (sem as secretas) | o eixo da história, mas já sem o peso de 26 porque as secretas saíram dele |
| secret | 4 | todas as missões secretas | caça a segredos, bem menos horas que a história |
| bosses | 8 | todos os chefes do jogo (os de história contam pela missão) | desafio principal de combate |
| tower | 5 | chegar ao andar 25 da Torre | o andar 25 já é o marco "tower_25" |
| skills | 4 | os 25 itens dos 5 ramos da árvore (45 pontos) | construção de personagem sem exigir a árvore cheia |
| map | 6 | 90% das células de terra exploradas | exploração |
| npcs | 7 | falar com todos os NPCs | exploração social |
| chests | 6 | todos os baús e coletáveis | exploração |
| islands | 4 | visitar todas as ilhas | exploração |
| buildings | 3 | entrar em todos os prédios | exploração |
| level | 10 | nível 99 | progressão (era 12) |
| points | 5 | 4 atributos no máximo (100 pontos) | build |
| shop | 3 | comprar todos os itens da loja | economia |
| casino | 3 | vencer nos 5 jogos | minijogos |
| cosmetics | 3 | todos os cosméticos | colecionável |
| monsters | 5 | 300 monstros | farm (era 7) |
| choices | 2 | todas as 10 escolhas da história | narrativa |
| ending | 2 | chegar a um final | narrativa |

Soma = 100. Justificativa: antes, missões (26) + mapa/NPCs/baús (27) somavam mais da metade; o peso foi redistribuído para os eixos que faltavam (chefes, Torre, árvore, segredos) sem tirar o foco da história (missões + secretas continuam 24). Os 8 itens pedidos na Parte 3 estão presentes (chefes, Torre, árvore, cassino, cosméticos, secretas, finais, escolhas).

### 3.3 Regras de alcançabilidade
- Nível máximo 99; quatro atributos; **147 pontos** de status no total (níveis 2 a 50 = 1, 51 a 99 = 2); maximizar os 4 atributos = **100 pontos**; árvore cheia = **68 pontos por personagem** e **não é exigida** (sobram só 47). A platina exige os 5 ramos (25 habilidades = 45 pontos): 100 + 45 = 145 <= 147, sobram 2. A linha final (23 pontos) é opcional.
- Escolhas da história dão pontos/XP extras: só ajudam. Respec (500 moedas) permite refazer a árvore sem perder pontos.

### 3.4 Teste de 100% (`node tests/unit/conta/platina-100-por-cento.test.mjs`, 14 testes)
- Monta um mundo pelas funções REAIS do jogo (relatórios de NPC/prédio/ilha/compra/cassino/monstros, XP até 99, `buyUpgrade` e `learnSkill` reais, missões, chefes, Torre, escolhas, final) para os dois personagens de história e prova: todas as 18 categorias chegam a 100%, soma 100, platina libera, **qualquer escolha** leva à platina, e **faltando qualquer uma** categoria (cada uma testada sozinha) a platina NÃO libera. Grava o mundo num slot, recarrega com `startSession` e confere que o 100% sobrevive.
- Segurança dos saves: roda no Node com AsyncStorage **em memória** (nenhum save real é lido ou alterado) e o teste confere que um "save real" sentinela no slot 3 permanece idêntico.
- Limite: a conta (cosméticos, conquistas) é global e não tem "zerar"; por isso o teste de cosméticos roda primeiro.

## Parte 2 (restante): rival em 5 aparições e inimigos de elite
### 2.2 Rival (`state/rivalState.ts` + `battle/battleModes.ts`)
- 5 aparições especiais do Gadigago (`RIVAL_ENCOUNTERS`), **opcionais** (nenhuma missão exige vencê-las): abrem quando a missão-gatilho termina (`kills_12`, `camp_showdown`, `island_boss`, `lore_complete`, `vulcao_boss`, todas antes da missão final) e só depois de vencer a anterior. Aviso em toast; o botão do rival na praça vira "DESAFIO DO RIVAL n/5" (depois das 5 volta a ser a REVANCHE livre de sempre, que continua usando `rivalScale()`).
- Força = base do degrau (vida 1,1 a 2,0; dano 1,0 a 1,5) x nível do jogador (`1 + 0,025 x nível` de vida, `1 + 0,01 x nível` de dano) x vitórias anteriores (`1 + 0,04 x vitórias`, `1 + 0,02 x vitórias`), com teto (vida 5, dano 2,4) para nunca ficar impossível. No nível esperado de cada gatilho não passa de ~1,5x a revanche livre (conferido em teste).
- Status: congelar (1ª) -> + veneno (2ª) -> + atordoar (3ª) -> + queimar (4ª) -> queimar no golpe especial (5ª). Sem tipo de status novo no `Fighter` (queimar é novo só para o rival).
- Prêmio: moedas e XP crescentes (+ itens existentes), pagos uma vez por aparição. Cada vitória soma uma vitória do rival.
- Save: ext `rival` ganhou `encounters` (aparições vencidas); save antigo só com `{wins}` carrega com padrão vazio.
### 2.3 Elites (`enemies/eliteDefs.ts`, `state/eliteState.ts`, `enemySim.ts`, `EnemyLayer.tsx`)
- 6 elites, cada um é um inimigo comum de um ponto de spawn que já existe, promovido depois de uma missão (`kills_5`, `kills_12`, `camp_showdown`, `island_boss`, `lore_complete`, `vulcao_boss`). Reusam o `EnemyManager`: mesma perseguição, golpes do jogador, respawn (3x mais lento) e itens; **sem sprite novo**: o mesmo sprite maior (1,3x a 1,4x), aura dourada, coroa (ícone existente) e barra de vida dourada.
- Vida 3,5x a 6x e dano 1,5x a 2x do comum, mais rápidos e com aggro maior; moedas 5x a 8x e XP 6x a 10x (a recompensa sempre cresce mais que a vida) e um item existente na 1ª derrota (`firstDrop`). Um aviso ("ELITE DERROTADO!") aparece no toast do prêmio.
- Save: ext `elites` (derrotados); save antigo sem a chave carrega vazio.
- Testes: `node tests/unit/combate/rival-e-inimigos-de-elite.test.mjs` (21).
- Só se confirma no aparelho/navegador jogando: dificuldade sentida das lutas do rival e dos elites (os multiplicadores foram conferidos em teste, não o "feeling").
