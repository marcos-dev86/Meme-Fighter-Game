import type { MissionDef } from './missionTypes';

const FINAL_TITLE = 'Meme Fighter'; // same constant as characters.ts FINAL_MISSION_TITLE (kept here to avoid an import cycle)

/**
 * Dogge's story: 55 missions in 6 chapters (+ final). `requires` makes the order;
 * the HUD/arrow always point at the first unlocked, unfinished mission.
 * Rewards: coins/items here, battle prizes in the objective itself.
 */
import { STORY_MISSIONS } from './missionsStory';

const CH1 = 'Capítulo 1 · A Praça';
const CH2 = 'Capítulo 2 · Caverna e Floresta';
const CH3 = 'Capítulo 3 · O Mar';
const CH4 = 'Capítulo 4 · Os Fragmentos';
const CH5 = 'Capítulo 5 · Fogo e Trevas';
const CH6 = 'Capítulo 6 · O Pico Gelado';
const CH7 = 'Capítulo Final';

const DOGGE_BASE: MissionDef[] = [
  // ---- Capítulo 1 · A Praça
  { id: 'talk_bento', title: 'Bem-vindo a Meme-Fighter', hint: 'Fale com o Vovô Bento, na praça.', type: 'talk', chapter: CH1, objective: { kind: 'talk', npcId: 'bento' }, reward: { coins: 10 } },
  { id: 'first_buy', title: 'Primeiras Compras', hint: 'Compre qualquer coisa na loja da praça (Marina ou Maximilian).', type: 'discover', chapter: CH1, objective: { kind: 'buy' }, requires: ['talk_bento'], reward: { items: { banana: 2 } } },
  { id: 'rival_battle', title: 'O Desafio do Rival', hint: 'Gadigago anda por perto da praça principal.', type: 'battle', chapter: CH1, objective: { kind: 'battle', giver: 'rival', opponent: 'gadigago', stageKey: 'stage_1', reward: 40, offerTitleKey: 'quest_rival_offer' }, requires: ['first_buy'] },
  { id: 'kills_5', title: 'Limpeza do Mato', hint: 'Derrote 5 monstros fora da vila.', type: 'collect', chapter: CH1, objective: { kind: 'kills', count: 5 }, requires: ['rival_battle'], reward: { coins: 30 } },
  { id: 'talk_iracema', title: 'Chá da Dona Iracema', hint: 'Dona Iracema mora numa casa ao lado da praça.', type: 'talk', chapter: CH1, objective: { kind: 'talk', npcId: 'iracema' }, requires: ['kills_5'], reward: { items: { bread: 2 } } },
  {
    id: 'plaza_gossip', title: 'Fofocas da Praça', hint: 'Converse com o pessoal da praça.', type: 'quest', chapter: CH1, requires: ['talk_iracema'], reward: { coins: 20, items: { strawberry: 3 } },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'toinho', hint: 'Ouça o Toinho, o vendedor ambulante, na praça.', lines: ['Psiu, você aí! Ouvi dizer que a Pipoca viu algo estranho perto da fonte.', 'Vai lá falar com ela. Mas finge que não fui eu que contei.'] },
        { kind: 'talk', npcId: 'pipoca', hint: 'Fale com a Pipoca, a criança da vila.', lines: ['Eu vi, eu vi! Alguém deixou uma bolsa perto da praça e saiu correndo!', 'Pergunta pro moço de azul, ele estava lá o tempo todo.'] },
        { kind: 'talk', npcId: 'npc_padrao', hint: 'Pergunte ao morador de azul, ao lado da praça.', lines: ['Ah, a bolsa? Era minha! Só tinha pão dentro.', 'Obrigado por perguntar. Essa vila é pequena, mas ninguém perde nada de vista.'] },
      ],
    },
  },
  { id: 'upgrade_one', title: 'Pontos de Poder', hint: 'Suba de nível (XP) e gaste 1 ponto de status em PONTOS DE PODER (menu de pausa > STATUS).', type: 'discover', chapter: CH1, objective: { kind: 'upgrade' }, requires: ['talk_iracema'], reward: { items: { potion_hp_s: 2 } } },
  { id: 'enter_hall', title: 'O Salão Geral', hint: 'Há um salão enorme a leste da praça.', type: 'discover', chapter: CH1, objective: { kind: 'enter', buildingId: 'salao_geral' }, requires: ['upgrade_one'], reward: { coins: 15 } },

  // ---- Capítulo 2 · Caverna e Floresta
  { id: 'cave_guardian', title: 'O Guardião de Pedra', hint: 'Alguém, ou algo, vigia a entrada da caverna.', type: 'talk', chapter: CH2, objective: { kind: 'talk', npcId: 'guardiao_pedra' }, requires: ['enter_hall'], reward: { coins: 20 } },
  { id: 'cave_echoes', title: 'Ecos na Caverna', hint: 'A caverna perto da praça esconde mais de um achado.', type: 'collect', chapter: CH2, objective: { kind: 'pickups', ids: ['cave_echo_1', 'cave_echo_2'] }, requires: ['cave_guardian'], reward: { coins: 25 } },
  {
    id: 'cave_hermit', title: 'O Segredo do Eremita', hint: 'A caverna perto da praça tem um morador.', type: 'quest', chapter: CH2, requires: ['cave_echoes'], reward: { coins: 60, items: { chili: 2 }, xp: 110 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'enter', buildingId: 'caverna', hint: 'Entre na caverna perto da praça.' },
        { kind: 'talk', npcId: 'eremita', hint: 'Fale com o Eremita Tobias, lá dentro.', lines: ['Visita! Faz tempo que ninguém desce até aqui.', 'Escuta: lá embaixo, na galeria profunda, existe um baú que eu nunca tive coragem de abrir.', 'Pega pra mim? Pode ficar com o que tiver dentro. Eu só quero saber se a lenda é verdade.'] },
        { kind: 'pickups', ids: ['chest_caverna_deep'], hint: 'Desça a escada da caverna e abra o baú da galeria profunda.' },
        { kind: 'talk', npcId: 'eremita', hint: 'Volte ao Eremita Tobias e conte o que achou.', lines: ['Então a lenda era verdade! Uma poção, só isso?', 'Ha! Pelo menos agora eu sei. Obrigado, rapaz. A caverna fica menos solitária com você por perto.'] },
      ],
    },
  },
  {
    id: 'guild_package', title: 'Entrega da Guilda', hint: 'Fale com o Mestre Gaspar, na Guilda (ao lado do Salão Geral).', type: 'deliver', chapter: CH2, requires: ['enter_hall'], reward: { coins: 90, items: { potion_hp_l: 1 }, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'mestre_guilda', hint: 'Pegue o pacote com o Mestre Gaspar, dentro da Guilda (ao lado do Salão Geral).', give: { guild_parcel: 1 }, lines: ['Aí está você! Preciso de alguém de confiança para uma entrega.', 'Este pacote lacrado é para a Iara, a guarda-florestal. Ela fica na mata, bem longe daqui, a noroeste.', 'Não abra, não perca e não demore. Quando ela receber, a Guilda paga a sua gratidão em moedas.'] },
        { kind: 'talk', npcId: 'iara', hint: 'Leve o pacote até a Iara, a guarda-florestal, na mata a noroeste (bem longe da Guilda).', take: { guild_parcel: 1 }, lines: ['Um pacote da Guilda? Finalmente!', 'O Gaspar nunca confia em mais ninguém para isso. Chegou inteiro, ótimo.', 'Diga a ele que recebi. E obrigada pela viagem: a mata não é lugar para andar à toa.'] },
      ],
    },
  },
  { id: 'kills_12', title: 'Caçador de Monstros', hint: 'Derrote 12 monstros no total.', type: 'collect', chapter: CH2, objective: { kind: 'kills', count: 12 }, requires: ['cave_echoes'], reward: { coins: 50 } },
  { id: 'treasure_hunt', title: 'Caça ao Tesouro', hint: 'Há 4 sacolas de moedas escondidas pela ilha principal: praça, salão, estátua e cais.', type: 'collect', chapter: CH2, objective: { kind: 'pickups', ids: ['plaza_pickup_1', 'salao_pickup_1', 'statue_pickup_1', 'dock_pickup_1'] }, requires: ['kills_12'], reward: { coins: 40, xp: 60 } },

  // ---- Capítulo 3 · O Mar
  { id: 'talk_zeca', title: 'O Pescador do Cais', hint: 'Zeca, o pescador, conhece as rotas do mar.', type: 'talk', chapter: CH3, objective: { kind: 'talk', npcId: 'zeca' }, requires: ['kills_12'], reward: { coins: 20 } },
  { id: 'visit_misteriosa', title: 'Ilha Misteriosa', hint: 'Pegue o barco no cais principal rumo ao norte.', type: 'discover', chapter: CH3, objective: { kind: 'visit', island: 'misteriosa' }, requires: ['talk_zeca'], reward: { coins: 30 } },
  {
    id: 'casino_lucky', title: 'A Sorte do Dogge', hint: 'Fale com o Crupiê, no cassino.', type: 'quest', chapter: CH3, requires: ['visit_misteriosa'], reward: { coins: 50, xp: 100 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'croupier', hint: 'Fale com o Crupiê Misterioso, dentro do cassino.', lines: ['Você parece confiante. Gosto disso.', 'Desafio: ganhe 2 rodadas hoje, em qualquer jogo. Perder não conta, ganhar sim!', 'Se conseguir, a casa deve um favor a você.'] },
        { kind: 'casino', wins: 2, hint: 'Ganhe 2 rodadas em qualquer jogo do cassino.' },
        { kind: 'talk', npcId: 'croupier', hint: 'Volte ao Crupiê e cobre o favor.', lines: ['Duas vitórias? Então a sorte gosta de você.', 'A casa paga o que prometeu. Mas cuidado: a sorte também enjoa.'] },
      ],
    },
  },
  { id: 'visit_camp', title: 'A Legião Cinzenta', hint: 'Um acampamento murado guarda território a sudoeste.', type: 'discover', chapter: CH3, objective: { kind: 'visit', island: 'camp' }, requires: ['talk_zeca'], reward: { coins: 30 } },
  { id: 'talk_tico', title: 'O Monge Viajante', hint: 'Irmão Tico anda pelo acampamento.', type: 'talk', chapter: CH3, objective: { kind: 'talk', npcId: 'tico' }, requires: ['visit_camp'], reward: { items: { honey: 2 } } },
  {
    id: 'camp_infiltration', title: 'Infiltração na Legião', hint: 'Fale com o guarda orc, no acampamento.', type: 'quest', chapter: CH3, requires: ['talk_tico'], reward: { coins: 70, items: { w_bomb: 2 }, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'orc_guard', hint: 'Fale com o guarda orc, no portão do acampamento.', lines: ['Hmpf. Visitante. Passa.', 'Mas fica longe do salão dos fundos. O Capitão guarda coisa valiosa lá.'] },
        { kind: 'enter', buildingId: 'salao_camp', hint: 'Entre no salão dos fundos do acampamento.' },
        { kind: 'pickups', ids: ['chest_salao_camp'], hint: 'Abra o baú escondido no salão do acampamento.' },
      ],
    },
  },
  { id: 'camp_showdown', title: 'Confronto no Acampamento', hint: 'O Capitão Ferro lidera a Legião Cinzenta.', type: 'battle', chapter: CH3, objective: { kind: 'battle', giver: 'soldier_captain', opponent: 'soldier', stageKey: 'stage_2', reward: 55, offerTitleKey: 'quest_camp_offer' }, requires: ['talk_tico'] },
  { id: 'visit_dogisland', title: 'A Ilha dos Cães', hint: 'Uma ilha ao sul tem guardas que não gostam de visita.', type: 'discover', chapter: CH3, objective: { kind: 'visit', island: 'dogisland' }, requires: ['talk_zeca'], reward: { coins: 30 } },
  {
    id: 'dog_trial', title: 'Provas da Ilha dos Cães', hint: 'Fale com os guardas da ilha dos cães.', type: 'quest', chapter: CH3, requires: ['visit_dogisland'], reward: { coins: 60, items: { drumstick: 2 }, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'footman_dog', hint: 'Fale com o primeiro guarda da ilha.', lines: ['Au! Visitante? Aqui só passa quem prova que merece.', 'Fala com o grandão ali do lado. Ele decide.'] },
        { kind: 'talk', npcId: 'tank_dog', hint: 'Fale com o guarda grandão da ilha.', lines: ['Grrr. Quer respeito? Então mostre força.', 'Derrote 5 monstros. Depois a gente conversa.'] },
        { kind: 'kills', count: 5, hint: 'Derrote 5 monstros para provar sua força.' },
        { kind: 'talk', npcId: 'tank_dog', hint: 'Volte ao guarda grandão.', lines: ['Cinco? Nada mal, visitante.', 'Passou na prova. O Rei vai gostar de saber.'] },
      ],
    },
  },
  { id: 'island_boss', title: 'O Rei da Ilha', hint: 'Alguém na ilha dos cães quer provar algo.', type: 'battle', chapter: CH3, objective: { kind: 'battle', giver: 'dogking', opponent: 'dogking', stageKey: 'stage_3', reward: 80, offerTitleKey: 'quest_island_offer' }, requires: ['visit_dogisland'] },

  // ---- Capítulo 4 · Os Fragmentos
  { id: 'visit_fragments', title: 'As Ilhas Quebradas', hint: 'Pegue o barco para as ilhas fragmentadas, a sudeste.', type: 'discover', chapter: CH4, objective: { kind: 'visit', island: 'fragments' }, requires: ['talk_zeca'], reward: { coins: 30 } },
  { id: 'frag_c_lore', title: 'A Cicatriz da Batalha', hint: 'Uma das ilhas fragmentadas guarda uma pedra quebrada, com uma inscrição.', type: 'discover', chapter: CH4, objective: { kind: 'pickups', ids: ['frag_c_monument'] }, requires: ['visit_fragments'], reward: { coins: 20 } },
  { id: 'frag_a_lore', title: 'Ecos do Passado', hint: 'Uma loja abandonada em outra ilha fragmentada esconde mais do que parece.', type: 'discover', chapter: CH4, objective: { kind: 'pickups', ids: ['frag_a_ruins'] }, requires: ['visit_fragments'], reward: { coins: 20 } },
  {
    id: 'frag_ruins', title: 'Segredos da Loja Abandonada', hint: 'A loja abandonada, nas ilhas quebradas, guarda mais coisa.', type: 'quest', chapter: CH4, requires: ['frag_a_lore'], reward: { coins: 60, xp: 110 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'enter', buildingId: 'loja_abandonada', hint: 'Entre na loja abandonada das ilhas quebradas.' },
        { kind: 'pickups', ids: ['chest_loja_abandonada'], hint: 'Abra o baú dentro da loja abandonada.' },
        { kind: 'talk', npcId: 'gemada', hint: 'Mostre o achado para a Gemada, moradora de uma das ilhas.', lines: ['Você entrou lá? Que coragem!', 'Ninguém mexe naquela loja há anos. O que tinha no baú vale mais pelo risco do que pelo ouro.'] },
      ],
    },
  },
  { id: 'coin_collector', title: 'Colecionador de Moedas', hint: 'Reúna 2 Moedas Antigas (baús e conversas rendem uma).', type: 'collect', chapter: CH4, objective: { kind: 'hasItem', itemId: 'old_coin', qty: 2 }, requires: ['frag_b_lore'], reward: { coins: 40, xp: 60 } },
  { id: 'frag_b_lore', title: 'O Tesouro Sem Sentido', hint: 'Alguma coisa sem uso aparente foi deixada pra trás numa das ilhas fragmentadas.', type: 'discover', chapter: CH4, objective: { kind: 'pickups', ids: ['frag_b_treasure'] }, requires: ['visit_fragments'], reward: { coins: 20 } },
  { id: 'lore_complete', title: 'Os Três Fragmentos', hint: 'Reúna as três partes da inscrição.', type: 'discover', chapter: CH4, objective: { kind: 'lore' }, requires: ['frag_c_lore', 'frag_a_lore', 'frag_b_lore'], reward: { items: { power_brew: 1 } } },

  // ---- Capítulo 5 · Fogo e Trevas
  { id: 'visit_vulcao', title: 'A Ilha do Vulcão', hint: 'A rota para o vulcão abre depois que a Legião cair.', type: 'discover', chapter: CH5, objective: { kind: 'visit', island: 'vulcao' }, requires: ['camp_showdown'], reward: { coins: 40 } },
  { id: 'enter_forge', title: 'A Forja do Brasa', hint: 'Um ferreiro trabalha perto da lava.', type: 'discover', chapter: CH5, objective: { kind: 'enter', buildingId: 'loja_vulcao' }, requires: ['visit_vulcao'], reward: { coins: 20 } },
  {
    id: 'forge_fire', title: 'Fogo na Forja', hint: 'Fale com o Brasa, o ferreiro.', type: 'quest', chapter: CH5, requires: ['enter_forge'], reward: { coins: 70, items: { w_axe: 1 }, xp: 130 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'brasa', hint: 'Fale com o Brasa, dentro da forja.', lines: ['Olha só quem veio ao fogo!', 'Deixei um estoque no depósito de baixo e perdi a chave da cabeça. Desce lá e abre o baú, vai?'] },
        { kind: 'pickups', ids: ['chest_loja_vulcao_basement'], hint: 'Desça ao depósito da forja e abra o baú.' },
        { kind: 'talk', npcId: 'espinho', hint: 'Fale com o Espinho, perto do vulcão, a leste.', lines: ['Ouvi dizer que o Brasa mandou você descer ao depósito.', 'Ele é bom ferreiro, mas esquece tudo. Pelo menos agora o estoque está seguro.'] },
      ],
    },
  },
  { id: 'vulcao_boss', title: 'O Guardião do Vulcão', hint: 'Alguém forte guarda a passagem pra frente do vulcão.', type: 'battle', chapter: CH5, objective: { kind: 'battle', giver: 'tank_vulcao', opponent: 'tank', stageKey: 'stage_2', reward: 70, offerTitleKey: 'quest_vulcao_offer' }, requires: ['enter_forge'] },
  { id: 'level_10', title: 'Veterano', hint: 'Alcance o nível 10.', type: 'collect', chapter: CH5, objective: { kind: 'level', level: 10 }, requires: ['vulcao_boss'], reward: { coins: 80, items: { power_brew: 1 }, xp: 100 } },
  { id: 'visit_trevas', title: 'A Ilha das Trevas', hint: 'Com o guardião vencido, a rota das trevas se abre.', type: 'discover', chapter: CH5, objective: { kind: 'visit', island: 'trevas' }, requires: ['vulcao_boss'], reward: { coins: 50 } },
  {
    id: 'maze_shadows', title: 'Labirinto das Sombras', hint: 'As sombras rondam o labirinto escuro, ao norte.', type: 'quest', chapter: CH5, requires: ['visit_trevas'], reward: { coins: 80, items: { potion_hp_l: 1 }, xp: 140 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'kills', count: 4, enemy: 'shadow', hint: 'Derrote 4 Sombras nas trevas.' },
        { kind: 'talk', npcId: 'violeta', hint: 'Conte para a Violeta, no noroeste, o que viu.', lines: ['Você enfrentou as sombras? Sozinho?', 'Elas voltam sempre. Mas o labirinto fica mais calmo depois de uma limpa.'] },
        { kind: 'talk', npcId: 'garoto_sombrio', hint: 'Encontre o Breno, no labirinto escuro.', lines: ['Você veio de lá... das sombras. Elas te deixaram em paz?', 'Interessante. Quem volta inteiro daquele labirinto merece ouvir a minha história.'] },
      ],
    },
  },
  { id: 'talk_breno', title: 'Breno das Trevas', hint: 'Alguém caminha sozinho pelo labirinto escuro.', type: 'talk', chapter: CH5, objective: { kind: 'talk', npcId: 'garoto_sombrio' }, requires: ['visit_trevas'], reward: { coins: 40 } },

  // ---- Capítulo 6 · O Pico Gelado

  { id: 'visit_gelo', title: 'A Ilha Gelada', hint: 'Agora os marujos aceitam levar você à Ilha Gelada. Só se chega lá de barco!', type: 'discover', chapter: CH6, objective: { kind: 'visit', island: 'gelo' }, requires: ['lore_complete'], reward: { coins: 60 } },
  {
    id: 'ice_cabin', title: 'Segredo da Cabana', hint: 'A cabana da montanha, na ilha gelada, parece trancada há anos.', type: 'quest', chapter: CH6, requires: ['visit_gelo'], reward: { coins: 60, xp: 110 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'enter', buildingId: 'casa_montanha', hint: 'Entre na cabana da montanha, perto da loja do gelo.' },
        { kind: 'pickups', ids: ['chest_casa_montanha'], hint: 'Abra o baú dentro da cabana.' },
        { kind: 'talk', npcId: 'alpinista', hint: 'Mostre o achado para a Helga, a alpinista, ao pé da parede de gelo.', lines: ['Essa cabana era do meu avô, sabia?', 'Ele deixava uma pimenta no baú pra esquentar na subida. Sempre funcionou.'] },
      ],
    },
  },
  { id: 'buy_piolet', title: 'Equipamento de Escalada', hint: 'Compre o piolet na Loja do Gelo, ao lado da cabana.', type: 'discover', chapter: CH6, objective: { kind: 'buy', itemId: 'piolet' }, requires: ['visit_gelo'], reward: { coins: 30 } },
  { id: 'mountain_trail', title: 'A Parede de Gelo', hint: 'Com o piolet, escale a parede azul no pé da montanha e siga a trilha.', type: 'discover', chapter: CH6, objective: { kind: 'pickups', ids: ['mountain_trail_point'] }, requires: ['buy_piolet'], reward: { coins: 40 } },
  { id: 'mountain_summit', title: 'O Topo do Mundo', hint: 'Chegue ao topo da montanha de neve e pegue a bandeira.', type: 'discover', chapter: CH6, objective: { kind: 'pickups', ids: ['mountain_summit'] }, requires: ['mountain_trail'], reward: { coins: 80 } },
  {
    id: 'moai_stone', title: 'A Pedra Moai', hint: 'Lá em cima ficam o Moai, o Rocha e o refúgio do pico.', type: 'quest', chapter: CH6, requires: ['mountain_summit'], reward: { coins: 100, items: { power_brew: 1 }, xp: 160 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'moai', hint: 'Fale com o Moai, no alto da montanha.', lines: ['...', 'Você chegou ao topo. Poucos chegam.', 'Fale com o Rocha, ele guarda o resto da história.'] },
        { kind: 'talk', npcId: 'rocha', hint: 'Fale com o Rocha, o alpinista, na montanha.', lines: ['O Moai falou com você? Ele quase nunca fala.', 'Vá ao refúgio no topo. Deixei algo lá para quem chegasse até aqui.'] },
        { kind: 'enter', buildingId: 'casa_pico', hint: 'Entre no refúgio do pico.' },
        { kind: 'pickups', ids: ['chest_casa_pico'], hint: 'Abra o baú do refúgio do pico.' },
      ],
    },
  },

  // ---- Capítulo Final
  {
    id: 'final_meme_fighter',
    title: FINAL_TITLE,
    hint: 'Todos os caminhos levam ao Gadigago, na praça. Hora do duelo final.',
    type: 'battle',
    chapter: CH7,
    final: true,
    objective: { kind: 'battle', giver: 'rival', opponent: 'gadigago', stageKey: 'stage_3', reward: 150, offerTitleKey: 'quest_final_offer' },
    // `final` missions unlock only once EVERY other mission of the story is done.
    dialogue: {
      unstarted: ['Chegou a hora, Dogge.', 'Você cruzou o mar, venceu a Legião, o Rei e o vulcão... e ainda quer mais?', 'Então prove: só um de nós é o verdadeiro Meme Fighter.'],
      active: ['Sem mais conversa. Vamos!'],
      completed: ['Você é o Meme Fighter. Aceito.', 'Mas fica de olho: sempre tem alguém querendo o seu título.'],
    },
  },
];

/** Missões principais + de caminho + secretas (ver missionsStory.ts). */
export const DOGGE_MISSIONS: MissionDef[] = [...DOGGE_BASE, ...STORY_MISSIONS];
