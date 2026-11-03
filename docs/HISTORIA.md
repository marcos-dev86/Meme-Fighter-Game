# História de Meme-Fighter (referência narrativa)

Documento de referência da narrativa, separado do `AUDIT.md` (que é técnico). É o "porquê" das coisas; o AUDIT é o "como".
Atualizado na Parte 38.

## Premissa
Dogge é um lutador de uma vila numa ilha que um dia foi partida. A inscrição achada nas ilhas diz:
*"Quando a ilha foi partida, o poder que a mantinha inteira se espalhou. Só quem reunir as três partes vai entender
o que realmente foi perdido."* A jornada é reunir as partes, ficar mais forte e decidir **o que fazer com o poder**.

## Mundo e chefes (cada chefe tem um papel; texto em `story/bossLore.ts`)
| Ilha | Chefe | Papel |
|---|---|---|
| Principal (praça) | Sombra Ladra-Memes | ladrão de moedas da vila, a mando de alguém maior |
| Misteriosa | Encapuzado | guardião da sorte do cassino; guarda a primeira pista |
| Fragmentos | Dragão da Floresta | guardião da 1ª parte do poder |
| Gelo | Dragão do Gelo | guardião da 2ª parte do poder |
| Trevas | Dragão Sombrio | último guardião |
| Acampamento | Capitão Ferro | Legião Cinzenta, quer tomar as ilhas |
| Dos Cães | Rei dos Cães | vê o Dogge como afronta à família |
| Vulcão | Guardião do Vulcão | protege a forja de Brasa |

Também: o rival **Gadigago**, as 5 primas do Doggo (Espinho, Violeta, Gemada, Pólen, Penumbra), a estátua do **Sigma Boy**,
a costureira **Dona Iracema** (loja de cosméticos) e dois NPCs secretos na praça (Mercador da Madrugada, só à noite; Dona Garoa, só na chuva).

## As 10 escolhas importantes (`story/storyChoices.ts`)
Cada escolha é um diálogo único por save e soma pontos em **U**nião, **G**lória ou **P**oder.
1. Vovô Bento: por que lutar? (G campeão / U proteger a vila / P tesouro). 
2. Gadigago depois do 1º duelo (U mão / G provocar / P zombar).
3. Pipoca e a bolsa do Toinho (U devolver / P ficar). 
4. Crupiê e a ficha da sorte (P aceitar / U recusar).
5. Capitão Ferro (U poupar / G tomar o acampamento / P humilhar). 
6. Rei dos Cães (U perdoar / G coroa de campeão / P tributo).
7. Inscrição da pedra, com o Bento (U restaurar / G guardar / P absorver). 
8. Brasa forja (U Escudo da Vila / P Lâmina de Brasa).
9. Breno (U ajudar / G deixar / P isca). 
10. Estátua do Sigma Boy, só na 1ª vez (P Poder / U Sabedoria / G rejeitar).
As escolhas mudam falas dos NPCs (`story/storyDialogue.ts`), dão itens/moedas diferentes e criam missões de caminho.

## Os 3 finais (`story/storyEnding.ts`, tela `screens/EndingScreen.tsx`)
Soma de pontos (escolhas + missões secretas/de caminho concluídas); vence o maior, empate = categoria da última escolha, depois Glória.
- **A Ilha Inteira (União):** a pedra restaurada junta as ilhas; festa na praça com todos que você ajudou.
- **O Verdadeiro Meme Fighter (Glória):** o duelo final lendário, a estátua do Dogge ao lado do Sigma Boy; as ilhas seguem partidas e novos desafiantes chegam.
- **O Rei das Sombras (Poder):** Dogge absorve o poder e vira rei na Ilha das Trevas; Gadigago vai embora e os NPCs temem.
O final aparece uma vez por save, depois da missão final, e fica salvo.

## Missões
Principal: 46 missões em capítulos (revisadas na Parte 38: 9 de enchimento foram juntadas às vizinhas). Mais 6 missões de CAMINHO
(só existem para quem fez certa escolha) e 10 SECRETAS ("???" até descobrir). As secretas e de caminho são opcionais (não seguram a missão final)
mas contam no progresso: 100% = todas as missões POSSÍVEIS no save.
Secretas: Cliente da Madrugada (mercador, à noite), Cantiga da Chuva (cantora, na chuva), Tesouro da Igreja (baú ao lado da igreja da praça),
Sem um Arranhão (vencer um chefe sem tomar golpe; dá o chapéu exclusivo Coroa), Mais Alto na Torre (andar 25), Reunião de Família (as 5 primas),
Sete da Sorte (777 no caça-níquel), A Luz do Breno, O Respeito do Sigma, O Duelo Amistoso (as três dependem de escolhas).
