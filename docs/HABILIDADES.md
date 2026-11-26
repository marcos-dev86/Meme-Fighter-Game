# Habilidades exclusivas dos personagens

Cada um dos 16 lutadores jogáveis tem UMA habilidade, nenhuma repetida, com nome, efeito e condição de uso nos 5 idiomas.
Código: `src/game/story/abilities.ts` (folha sem estado do jogo). Teste: `tests/unit/habilidades` (22 testes).

## Onde valem
Em TODOS os modos. Na luta, cada lutador usa a sua (no Versus os dois lados; nas lutas de história só o jogador). As de mundo,
loja, baú, cura e cassino valem para o personagem do mundo atual. O efeito nunca é salvo: é recalculado a partir do personagem.

| Personagem | Habilidade | Efeito | Onde age |
| --- | --- | --- | --- |
| dogge | Segundo Fôlego | cura 25% da vida máxima UMA vez por luta quando a vida cai a 20% ou menos | `Fighter.survivalCheck` |
| gadigago | Soco Certeiro | +18 pontos de chance de crítico | `Fighter.critChance` |
| orc | Casca Grossa | recebe 15% menos dano | `Fighter.damageTakenMult` |
| soldier | Disciplina de Ferro | começa a luta com 35 de energia; escudo custa 40% menos | `startEnergy`, `shieldCost` |
| dogking | Uivo Real | 15% de chance de atordoar 0,9 s ao acertar | `onHitStatus` |
| tank | Pele de Rocha | imune a queimadura e veneno | `Fighter.immune` |
| ninja | Mão Leve | +35% de moedas em tesouros e baús; 25% de item raro extra em baús (só se couber na mochila) | `WorldScreen` (coleta) |
| mystic | Mente Aberta | 1 vida extra por luta: volta com 1 de vida e 1 s de imunidade | `Fighter.survivalCheck` |
| green_dragon | Seiva Viva | regenera 0,4% da vida máxima por segundo no mundo, fora de combate | `WorldScreen` (loop) |
| ice_dragon | Toque de Gelo | congela por 2 s: 8% (rápido), 14% (forte), 30% (ultimate) | `onHitStatus` |
| shadow_dragon | Sede de Sombra | rouba 7% do dano como vida | `Fighter.lifesteal` |
| troll_face | Sorte Absurda | no cassino, 4% das rodadas perdidas são sorteadas de novo (vale o novo resultado) | `CasinoOverlay` (5 jogos) |
| cara_tranquilo | Preço Camarada | 20% de desconto nas lojas (mínimo 1 moeda) | `ShopOverlay` |
| sahur | Batida Contagiante | barra de energia (ultimate) 40% mais rápida | `energyGainMult`, `chargeRate` |
| sahur_god | Luz Restauradora | toda cura (poções, comida, regeneração) 40% mais forte | `rarity.scaledHeal`, `regenPerSec` |
| sahur_evil | Brasa no Calor | 25% de queimar ao acertar (60% no ultimate); queimadura +50% de dano; imune a queimadura | `onHitStatus`, `burnDotMult` |

## Regras de segurança
- `applyAbility(fighter, id)` é idempotente: grava `fighter.abilityId` e não aplica de novo (recarregar tela ou save nunca duplica).
- Efeitos de sobrevivência (Segundo Fôlego, Mente Aberta) ficam em `Fighter.survivalCheck`, chamado após o golpe e após o dano
  de status; a queimadura forte usa `burnTakenMult`, definido por quem queimou (`BattleScreen`).
- Textos de habilidade seguem a regra do projeto: nos 5 idiomas e sem travessão (o teste confere).

## Calibração do cassino (Sorte Absurda)
A proposta original (10% de repetição e 5% de bônus nos prêmios) deixava o retorno do jogador acima de 100% (até 108,8% na
roleta), o que dá moedas infinitas. Simulado com a mesma matemática do jogo (`tools/casino-sim.mjs`, `casino/casinoMath.ts`):

| Jogo | sem habilidade | com 4% e sem bônus |
| --- | --- | --- |
| Caça-níquel | 95,4% | 96,7% |
| Cara ou coroa | 95,3% | 97,0% |
| Dados | 95,2% | 97,3% |
| Roleta | 95,7% | 98,2% |
| Cartas | 94,8% | 96,0% |

O teste exige que o retorno com a habilidade continue abaixo de 100%. Constantes: `LUCK_REROLL_CHANCE`, `LUCK_PAYOUT_BONUS` (0).

## Pendente
- Mostrar nome, efeito e condição da habilidade na seleção de personagem e no Status.
- Feedback visual ou de texto quando uma habilidade agir (Segundo Fôlego, Mente Aberta, congelar...).
- Árvore de habilidades PRÓPRIA por personagem: hoje `items/skills.ts` usa a árvore do Dogge para todos. Cada personagem deve
  ter a sua (nós coerentes com o estilo dele; pode repetir habilidades quando fizer sentido).
