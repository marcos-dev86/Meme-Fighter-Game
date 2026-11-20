import type { MissionDef } from './missionTypes';

const CH = 'Mar e Mergulho';
const CH_SEC = 'Segredos do Mar';

/**
 * EXPANSÃO MARÍTIMA: 30 missões (a maioria opcional) + 5 secretas. Todas são movidas por eventos REAIS do mergulho
 * (bandeiras levantadas por dive/diveState.ts e pela cena), por conversas com NPCs aquáticos e por itens. Nada de
 * missão só de título. Integração: a 1ª depende de `talk_zeca` (o barco) e cada local depende do `visit_*` da ilha dele. Ritmo:
 *  - cedo: aula, primeiro mergulho, baú raso, primeira travessia entre ilhas (ensinam fôlego e bolsões de ar);
 *  - meio: naufrágio, caverna, ruínas, lagoa, coleções, travessias entre ilhas que exigem planejamento de fôlego;
 *  - fim: Atlântida, o abismo (aberto por uma missão), criaturas raras e o Sea Beast;
 *  - segredos: cada parede secreta revela uma missão secreta (flag `found:<id>`); nenhuma é obrigatória.
 * O item de fôlego infinito (Brânquias de Atlântida) NÃO é requisito de nenhuma missão.
 * Regra de raridade: item que só vem de segredo ou de esconderijo é Secret (ver tools/test-mar.mjs).
 */
const M = (m: MissionDef): MissionDef => ({ optional: true, ...m });

export const MAR_MISSIONS: MissionDef[] = [
  // ---------------------------------------------------------------- Começo: aprender a mergulhar
  M({ id: 'mar_aula', title: 'Aula de Mergulho', hint: 'Mergulhe de qualquer ponto da costa da ilha principal e nade até a entrada marcada do Recife do Pato (no mar, perto do cais). O Instrutor Pato está lá dentro.', type: 'talk', chapter: CH, requires: ['talk_zeca'],
    reward: { coins: 60, xp: 70, items: { bubble_potion: 2 } }, objective: { kind: 'talk', npcId: 'instrutor_pato' } }),
  M({ id: 'mar_primeiro', title: 'Primeiro Mergulho', hint: 'Chegue ao lado do mar e toque em MERGULHAR. Depois explore o fundo.', type: 'discover', chapter: CH, requires: ['mar_aula'],
    reward: { coins: 40, xp: 60, items: { kelp_snack: 3 } }, objective: { kind: 'flag', flag: 'dive_first' } }),
  M({ id: 'mar_bau_raso', title: 'Tesouro Raso', hint: 'Há um baú no fundo do Recife do Pato, no canto de baixo à direita.', type: 'collect', chapter: CH, requires: ['mar_primeiro'],
    reward: { coins: 80, xp: 90, items: { bubble_potion: 2 } }, objective: { kind: 'flag', flag: 'dive_first_chest' } }),
  M({ id: 'mar_amigo_palhaco', title: 'Um Amigo Palhaço', hint: 'Chegue perto do peixe palhaço do recife e alimente-o.', type: 'quest', chapter: CH, requires: ['mar_primeiro'],
    reward: { coins: 30, xp: 50, items: { kelp_snack: 2 } }, objective: { kind: 'flag', flag: 'dive_help_clownfish' } }),
  M({ id: 'mar_tartaruga', title: 'Conselho da Tartaruga', hint: 'A Tartaruga Zen nada devagar no recife. Converse com ela.', type: 'quest', chapter: CH, requires: ['mar_primeiro'],
    reward: { coins: 60, xp: 70, items: { bubble_potion: 2 } }, objective: { kind: 'flag', flag: 'dive_help_turtle' } }),
  M({ id: 'mar_primeira_travessia', title: 'A Primeira Travessia', hint: 'Mergulhe na costa da ilha principal e emerja na costa da ilha oeste, por baixo d’água, sem voltar ao ponto de partida.', type: 'discover', chapter: CH, requires: ['mar_bau_raso'],
    reward: { coins: 100, xp: 140, items: { air_flask: 1 } }, objective: { kind: 'flag', flag: 'dive_crossing_done' } }),

  // ---------------------------------------------------------------- Meio: naufrágio, caverna, ruínas, lagoa
  M({ id: 'mar_naufragio', title: 'O Naufrágio do Capitão', hint: 'Explore o Naufrágio, ache o diário e fale com o fantasma.', type: 'quest', chapter: CH, requires: ['mar_primeiro'],
    reward: { coins: 200, xp: 220, items: { tide_compass: 1 } },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'dive_site_naufragio', hint: 'Nade até a entrada do Naufrágio do Capitão Meme (no mar, perto do cais da ilha oeste).' },
      { kind: 'flag', flag: 'wreck_logbook_found', hint: 'Abra o baú do convés do Naufrágio: o diário do capitão está lá.' },
      { kind: 'talk', npcId: 'fantasma_capitao', hint: 'Mostre o diário ao fantasma do capitão.', lines: ['Meu diário! Eu avisei para não confiar no polvo. Fique com a bússola: ela aponta para a água com pressa.'] },
    ] } }),
  M({ id: 'mar_moreia', title: 'Moreia Tocaieira', hint: 'Uma moreia se esconde nos corredores do Naufrágio. Derrote-a.', type: 'battle', chapter: CH, requires: ['mar_naufragio'],
    reward: { coins: 120, xp: 160, items: { air_flask: 1 } }, objective: { kind: 'flag', flag: 'dive_beat_moray' } }),
  M({ id: 'mar_limpeza', title: 'Limpeza de Veneno', hint: 'A Dona Branquinha limpa veneno. Encontre-a no Naufrágio e peça ajuda.', type: 'quest', chapter: CH, requires: ['mar_naufragio'],
    reward: { coins: 50, xp: 80, items: { bubble_potion: 3 } }, objective: { kind: 'flag', flag: 'dive_help_cleaner' } }),
  M({ id: 'mar_caverna', title: 'Luzes na Caverna', hint: 'Entre na Caverna das Águas-vivas e derrote uma água-viva rosa.', type: 'quest', chapter: CH, requires: ['mar_primeiro', 'visit_misteriosa'],
    reward: { coins: 180, xp: 200, items: { air_flask: 1 } },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'dive_site_caverna', hint: 'Nade até a entrada da Caverna das Águas-vivas (no mar, perto do cais da Ilha Misteriosa).' },
      { kind: 'flag', flag: 'dive_beat_jelly_pink', hint: 'Derrote uma Água-viva Rosa Venenosa. Cuidado com o veneno.' },
    ] } }),
  M({ id: 'mar_polvo', title: 'Polvo Esperto', hint: 'Um polvo na caverna aprende como você luta. Varie os golpes e derrote-o.', type: 'battle', chapter: CH, requires: ['mar_caverna'],
    reward: { coins: 200, xp: 240, items: { diver_elixir: 1 } }, objective: { kind: 'flag', flag: 'dive_beat_octopus' } }),
  M({ id: 'mar_colecao_coral', title: 'Coleção de Coral', hint: 'Junte 3 Fragmentos de Coral (caranguejos, baús e tamboris).', type: 'collect', chapter: CH, requires: ['mar_caverna'],
    reward: { coins: 150, xp: 160, items: { pearl: 1 } }, objective: { kind: 'hasItem', itemId: 'coral_shard', qty: 3 } }),
  M({ id: 'mar_perolas', title: 'Joias do Mar', hint: 'Junte 2 Pérolas Brilhantes (polvos e águas-vivas raras).', type: 'collect', chapter: CH, requires: ['mar_colecao_coral'],
    reward: { coins: 220, xp: 220, items: { air_flask: 2 } }, objective: { kind: 'hasItem', itemId: 'pearl', qty: 2 } }),
  M({ id: 'mar_ruinas', title: 'O Menu Antigo', hint: 'Nas Ruínas dos Fragmentos, ache a tábua e leve à Dra. Lia.', type: 'quest', chapter: CH, requires: ['mar_caverna', 'visit_fragments'],
    reward: { coins: 250, xp: 280, items: { sea_shell: 1 } },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'dive_site_ruinas', hint: 'Nade até a entrada das Ruínas dos Fragmentos (no mar, perto do cais da ilha dos fragmentos).' },
      { kind: 'flag', flag: 'ruins_tablet_found', hint: 'Abra o baú da sala leste das Ruínas.' },
      { kind: 'talk', npcId: 'pesquisadora_lia', hint: 'Mostre a tábua à Dra. Lia.', lines: ['Isso fala do Leviatã. Ele observa quem o enfrenta e aprende. Eu pensei que fosse uma lista de compras, juro.'] },
    ] } }),
  M({ id: 'mar_lagoa', title: 'Distintivo da Lagoa', hint: 'Mergulhe na Lagoa do Acampamento, ache o baú e fale com o Pescador Sereno.', type: 'quest', chapter: CH, requires: ['mar_primeiro', 'visit_camp'],
    reward: { coins: 120, xp: 150, items: { bubble_potion: 2 } },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'dive_site_lagoa', hint: 'Mergulhe na Lagoa do Acampamento.' },
      { kind: 'flag', flag: 'lagoon_badge', hint: 'Abra o baú no canto direito da lagoa.' },
      { kind: 'talk', npcId: 'pescador_sereno', hint: 'Mostre o distintivo ao Pescador Sereno.', lines: ['Um Distintivo de Mergulhador! Eu mesmo nunca consegui. A tartaruga nunca me deixou.'] },
    ] } }),
  M({ id: 'mar_mercador', title: 'Preço de Cardume', hint: 'Compre ou converse com o Mercador do Cardume na lagoa.', type: 'talk', chapter: CH, requires: ['mar_lagoa'],
    reward: { coins: 40, xp: 60, items: { kelp_snack: 3 } }, objective: { kind: 'talk', npcId: 'mercador_cardume' } }),

  // ---------------------------------------------------------------- Atlântida e as travessias difíceis
  M({ id: 'mar_atlantis', title: 'Bem-vindo a Atlântida', hint: 'Nade até a entrada da Cidade Submersa (no mar, perto do cais da Ilha dos Dogs).', type: 'discover', chapter: CH, requires: ['mar_ruinas', 'visit_dogisland'],
    reward: { coins: 300, xp: 320 }, objective: { kind: 'flag', flag: 'dive_site_atlantis' } }),
  M({ id: 'mar_chave', title: 'A Chave de Atlântida', hint: 'Ache a Chave de Atlântida e mostre ao Guardião Tritão.', type: 'quest', chapter: CH, requires: ['mar_atlantis'],
    reward: { coins: 300, xp: 300 },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'atlantis_key_found', hint: 'Abra o baú no canto sudeste de Atlântida.' },
      { kind: 'talk', npcId: 'guardiao_tritao', hint: 'Mostre a chave ao Guardião Tritão.', lines: ['A chave! Eu deveria te parar. Mas estou de plantão desde o ano 300 e a chave é mesmo sua.'] },
    ] } }),
  M({ id: 'mar_fumarolas', title: 'Fuja do Laranja', hint: 'Nade até a entrada das Fumarolas do Vulcão (no mar, perto do cais do vulcão). As fumarolas queimam.', type: 'discover', chapter: CH, requires: ['mar_atlantis', 'visit_vulcao'],
    reward: { coins: 250, xp: 280 }, objective: { kind: 'flag', flag: 'dive_site_fumarolas' } }),
  M({ id: 'mar_gruta', title: 'Gruta Gelada', hint: 'Nade até a entrada da Gruta Gelada (no mar, perto do cais da ilha do gelo). A água gelada machuca.', type: 'discover', chapter: CH, requires: ['mar_fumarolas', 'visit_gelo'],
    reward: { coins: 250, xp: 280 }, objective: { kind: 'flag', flag: 'dive_site_gruta' } }),
  M({ id: 'mar_travessia_dura', title: 'Fôlego de Aço', hint: 'Mergulhe na costa do Acampamento e emerja na costa do Vulcão, num só mergulho. É longe: planeje bolsões de ar, poções e equipamento.', type: 'discover', chapter: CH, requires: ['mar_fumarolas', 'mar_lagoa'],
    reward: { coins: 350, xp: 360, items: { diver_elixir: 1 } }, objective: { kind: 'flag', flag: 'dive_cross_cross_lagoa_fumarolas' } }),
  M({ id: 'mar_canto', title: 'Canto Distante', hint: 'Pergunte ao Cientista Nemo sobre os sons graves que vêm de Atlântida.', type: 'talk', chapter: CH, requires: ['mar_atlantis'],
    reward: { coins: 60, xp: 100, flag: 'quest_whale_called' }, objective: { kind: 'talk', npcId: 'cientista_nemo' } }),
  M({ id: 'mar_marlene', title: 'Pergunta Existencial', hint: 'Dona Marlene, a baleia, agora nada perto de Atlântida. Converse com ela.', type: 'quest', chapter: CH, requires: ['mar_canto'],
    reward: { coins: 500, xp: 420 }, objective: { kind: 'flag', flag: 'dive_help_whale' } }),

  // ---------------------------------------------------------------- Rumo ao Abismo e ao Sea Beast
  M({ id: 'mar_rumores', title: 'Rumores do Leviatã', hint: 'Fale com a Dra. Lia sobre a tábua e depois com o Sereio Gigachad.', type: 'quest', chapter: CH, requires: ['mar_chave', 'mar_ruinas'],
    reward: { coins: 200, xp: 260, flag: 'dive_abyss_open' },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'pesquisadora_lia', hint: 'Pergunte à Dra. Lia o que a tábua diz do abismo.', lines: ['O abismo só abre para quem tem a Chave de Atlântida e coragem. Fale com o Sereio Gigachad, ele conhece o caminho.'] },
      { kind: 'talk', npcId: 'sereio_meme', hint: 'Fale com o Sereio Gigachad em Atlântida.', lines: ['Você tem a chave? Então o abismo está aberto. Eu iria junto, mas hoje é dia de perna.'] },
    ] } }),
  M({ id: 'mar_abismo', title: 'Pressão Máxima', hint: 'Nade até a entrada do Abismo Sombrio (no mar, perto do cais da ilha das trevas). A pressão machuca sem proteção.', type: 'discover', chapter: CH, requires: ['mar_rumores', 'visit_trevas'],
    reward: { coins: 400, xp: 450 }, objective: { kind: 'flag', flag: 'dive_site_abismo' } }),
  M({ id: 'mar_dona_tentaculos', title: 'Dona Tentáculos', hint: 'A mãe dos polvos mora nas Fumarolas. Cuidado com o círculo vermelho: saia dele antes do golpe.', type: 'battle', chapter: CH, requires: ['mar_fumarolas', 'mar_polvo'],
    reward: { coins: 400, xp: 480, items: { diver_elixir: 1 } }, objective: { kind: 'flag', flag: 'dive_beat_kraken' } }),
  M({ id: 'mar_rei_lanterna', title: 'O Rei da Lanterna', hint: 'O Tamboril Rei guarda o fundo do abismo. A luz dele puxa você: nade contra a isca.', type: 'battle', chapter: CH, requires: ['mar_abismo', 'mar_luz_enganadora'],
    reward: { coins: 600, xp: 700, items: { air_flask: 2 } }, objective: { kind: 'flag', flag: 'dive_beat_angler_king' } }),
  M({ id: 'mar_luz_enganadora', title: 'Luz Enganadora', hint: 'O Tamboril Lanterninha atrai curiosos no fundo. Derrote-o (golpe forte funciona melhor).', type: 'battle', chapter: CH, requires: ['mar_abismo'],
    reward: { coins: 300, xp: 380, items: { air_flask: 2 } }, objective: { kind: 'flag', flag: 'dive_beat_angler' } }),
  M({ id: 'mar_brilho_violeta', title: 'Brilho do Abismo', hint: 'Uma água-viva violeta rara só aparece nas profundezas. Derrote-a.', type: 'battle', chapter: CH, requires: ['mar_abismo'],
    reward: { coins: 350, xp: 400, items: { pearl: 2 } }, objective: { kind: 'flag', flag: 'dive_beat_jelly_violet' } }),
  M({ id: 'mar_travessia_abismo', title: 'A Descida Final', hint: 'Mergulhe na costa da ilha do gelo e emerja na costa da ilha das trevas: o caminho passa pela zona de pressão.', type: 'discover', chapter: CH, requires: ['mar_gruta', 'mar_rumores'],
    reward: { coins: 450, xp: 480, items: { diver_elixir: 2 } }, objective: { kind: 'flag', flag: 'dive_cross_cross_gruta_abismo' } }),
  M({ id: 'mar_mapa', title: 'Mapa Completo', hint: 'Visite todos os 9 locais de mergulho e conte ao Cientista Nemo.', type: 'quest', chapter: CH, requires: ['mar_abismo'],
    reward: { coins: 600, xp: 500, items: { diver_elixir: 2 } },
    objective: { kind: 'chain', steps: [
      { kind: 'flag', flag: 'dive_all_sites', hint: 'Visite os 9 locais de mergulho (cada ilha tem a entrada de um, no mar perto do cais).' },
      { kind: 'talk', npcId: 'cientista_nemo', hint: 'Mostre o mapa completo ao Cientista Nemo.', lines: ['Todos os locais! Meu mapa está completo. Eu só queria que alguém visse. Obrigado.'] },
    ] } }),
  M({ id: 'mar_sea_beast', title: 'O Predador do Abismo', hint: 'Enfrente o Sea Beast, o Leviatã, no fundo do Abismo Sombrio.', type: 'battle', chapter: CH, requires: ['mar_abismo', 'mar_luz_enganadora'],
    reward: { coins: 1000, xp: 1200, items: { beast_tooth: 1 }, flag: 'sea_arc_done' }, objective: { kind: 'flag', flag: 'beat_sea_beast' } }),

  // ---------------------------------------------------------------- SECRETAS (cada parede secreta revela uma)
  M({ id: 'sec_mar_cabine', title: 'A Cabine que Não Era Parede', hint: 'Uma parede do Naufrágio parece rocha, mas não é.', type: 'discover', chapter: CH_SEC, secret: true,
    reward: { coins: 300, xp: 500 }, objective: { kind: 'flag', flag: 'secret_cabin_found' } }),
  M({ id: 'sec_mar_ruinas', title: 'O Segredo sob as Ruínas', hint: 'Há uma sala escondida abaixo do corredor das Ruínas.', type: 'discover', chapter: CH_SEC, secret: true,
    reward: { coins: 400, xp: 600 }, objective: { kind: 'flag', flag: 'secret_ruins_found' } }),
  M({ id: 'sec_mar_coracao', title: 'O Coração de Atlântida', hint: 'A cidade guarda algo que bate, atrás de uma parede.', type: 'discover', chapter: CH_SEC, secret: true,
    reward: { coins: 600, xp: 900 }, objective: { kind: 'flag', flag: 'secret_heart_found' } }),
  M({ id: 'sec_mar_abismo', title: 'O Último Esconderijo', hint: 'No fundo do abismo, uma rocha não é rocha.', type: 'discover', chapter: CH_SEC, secret: true,
    reward: { coins: 800, xp: 1100 }, objective: { kind: 'flag', flag: 'secret_abyss_found' } }),
  M({ id: 'sec_mar_tudo', title: 'Quem Sabe Tudo do Mar', hint: 'Dizem que quem achou todos os esconderijos ouve o mar sussurrar.', type: 'quest', chapter: CH_SEC, secret: true,
    requires: ['sec_mar_cabine', 'sec_mar_ruinas', 'sec_mar_coracao', 'sec_mar_abismo'],
    reward: { coins: 2000, xp: 1500, flag: 'sea_secret_all' },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'cientista_nemo', hint: 'Conte ao Cientista Nemo que você achou os quatro esconderijos.', lines: ['Quatro esconderijos?! Eu catalogo o mar há anos e nunca achei um. Você é o verdadeiro explorador.'] },
    ] } }),
];
