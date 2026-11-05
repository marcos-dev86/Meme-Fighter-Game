import type { MissionDef } from './missionTypes';

const CH = 'Cassino · Ilha Misteriosa';

/**
 * Missões do CASSINO GIGANTE (Urgente 3). Todas opcionais (não travam o final), todas liberadas depois de
 * "A Sorte do Dogge". Só se conversa com moradores do cassino (ninguém hostil) e se joga nas mesas.
 */
export const CASSINO_MISSIONS: MissionDef[] = [
  {
    id: 'cas_tour', title: 'Passeio pelo Cassino', hint: 'Conheça o cassino: fale com o barman, a crupiê da roleta, a atendente das máquinas e o segurança.', type: 'quest', chapter: CH,
    requires: ['casino_lucky'], optional: true, reward: { coins: 40, xp: 60 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'barman_cassino', hint: 'Fale com o Barman Zé, no bar (canto esquerdo, lá em cima).', lines: ['Primeira vez aqui? Então começa pelo suco da casa!', 'Passe pela roleta da Lúcia, depois pelas máquinas da Fichinha e termine com o Brutus, na porta.'] },
        { kind: 'talk', npcId: 'dealer_roleta', hint: 'Fale com a Crupiê Lúcia, na Mesa da Roleta.', lines: ['O Zé te mandou? Ele sempre manda os novos.', 'Roleta é simples: escolha uma cor e torça. Agora vá ver as máquinas, lá atrás.'] },
        { kind: 'talk', npcId: 'fichinha_cassino', hint: 'Fale com a Fichinha, atendente dos caça-níqueis (fileira do meio).', lines: ['As máquinas são as mais divertidas! Três iguais e a casa paga forte.', 'Falta só o Brutus, na porta. Ele fecha o passeio.'] },
        { kind: 'talk', npcId: 'seguranca_cassino', hint: 'Fale com o Segurança Brutus, perto da porta de saída.', lines: ['Passeio completo! Você já conhece cada canto do cassino.', 'Aqui dentro é zona de paz. Se quiser lutar, a rua está logo ali.'] },
      ],
    },
  },
  {
    id: 'cas_regulars', title: 'Velhos Conhecidos', hint: 'Alguns rostos conhecidos de outras ilhas apareceram no cassino.', type: 'quest', chapter: CH,
    requires: ['cas_tour'], optional: true, reward: { coins: 60, xp: 80 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'cara_tranquilo', hint: 'Fale com o Cara Tranquilo (perto do bar, no alto do salão).', lines: ['Opa. Tranquilo?', 'Dizem que o Toinho e o Vovô Bento também deram uma passada por aqui.'] },
        { kind: 'talk', npcId: 'toinho', hint: 'Fale com o Toinho, o vendedor ambulante (parte de baixo do salão).', lines: ['Psiu! Vendo fichas usadas, quase novas.', 'O Vovô Bento está lá pela direita, olhando as mesas.'] },
        { kind: 'talk', npcId: 'bento', hint: 'Fale com o Vovô Bento (lado direito do salão).', lines: ['Vim só olhar, mas já perdi duas moedas na cabeça!', 'Procure o Toinho, no canto de baixo. Ele quer te contar uma coisa.'] },
        { kind: 'talk', npcId: 'toinho', hint: 'Fale com o Toinho (parte de baixo, perto da porta).', lines: ['Você me achou! Estou aqui desde cedo e só perdi moedas.', 'Passa o troco do Cara Tranquilo pra ele, ele deve estar com sono.'] },
      ],
    },
  },
  {
    id: 'cas_memes', title: 'Os Convidados Peculiares', hint: 'Seis convidados estranhos circulam pelo cassino. Fale com todos.', type: 'quest', chapter: CH,
    requires: ['cas_tour'], optional: true, reward: { coins: 120, xp: 150 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'shiba_manso', hint: 'Fale com o Shiba Manso (perto do bar, à esquerda).', lines: ['Sentado, observando, sem bolsos.', 'Vá falar com o Gato Bocão, lá em cima no meio do salão.'] },
        { kind: 'talk', npcId: 'gato_bocao', hint: 'Fale com o Gato Bocão (alto do salão, perto do centro).', lines: ['AAAAAAH! (isso é um oi)', 'O Azulão está para a direita, perto da mesa de cartas.'] },
        { kind: 'talk', npcId: 'azulao', hint: 'Fale com o Azulão (alto do salão, lado direito).', lines: ['Piu piu! Música da sorte ligada!', 'O Rei Dourado está no canto VIP, lá no fundo, à direita.'] },
        { kind: 'talk', npcId: 'rei_dourado', hint: 'Fale com o Rei Dourado (canto VIP, alto à direita).', lines: ['Tudo que eu toco vira ouro. Menos o dado.', 'O Vermelhão e o Gato Arco-Íris estão na parte de baixo do salão.'] },
        { kind: 'talk', npcId: 'vermelhao', hint: 'Fale com o Vermelhão (parte de baixo, à direita).', lines: ['Rrrr. Estou de bom humor. Hoje só rosnei pro dado.', 'Falta só o Gato Arco-Íris.'] },
        { kind: 'talk', npcId: 'gato_arco_iris', hint: 'Fale com o Gato Arco-Íris (parte de baixo, no meio-direita).', lines: ['Miau. (deixa um arco-íris e some um pouco)', 'Pronto, você falou com todos os convidados peculiares!'] },
      ],
    },
  },
  {
    id: 'cas_vip', title: 'Mesa VIP', hint: 'Prove que você sabe jogar: chegue a 3 vitórias no total e volte à Madame Ás.', type: 'quest', chapter: CH,
    requires: ['cas_tour'], optional: true, reward: { coins: 90, xp: 120 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'dealer_cartas_vip', hint: 'Fale com a Madame Ás, na mesa VIP das cartas (centro, abaixo das mesas).', lines: ['A mesa VIP não aceita qualquer um.', 'Chegue a 3 vitórias no total, em qualquer jogo, e volte aqui.'] },
        { kind: 'casino', wins: 3, hint: 'Chegue a 3 vitórias no total em qualquer jogo do cassino.' },
        { kind: 'talk', npcId: 'dealer_cartas_vip', hint: 'Volte à Madame Ás.', lines: ['Três vitórias... você tem o jeito.', 'Seja bem-vindo à elite. Tome o seu prêmio.'] },
      ],
    },
  },
  {
    id: 'cas_jackpot', title: 'Sorte Grande', hint: 'O dono do cassino quer ver quem aguenta uma noite de sorte.', type: 'quest', chapter: CH,
    requires: ['cas_vip'], optional: true, reward: { coins: 150, xp: 200 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'croupier', hint: 'Fale com o Crupiê Misterioso (canto alto à direita).', lines: ['Você virou assunto no cassino.', 'Última prova: chegue a 8 vitórias no total. Quem aguenta, merece o prêmio da casa.'] },
        { kind: 'casino', wins: 8, hint: 'Chegue a 8 vitórias no total no cassino.' },
        { kind: 'talk', npcId: 'croupier', hint: 'Volte ao Crupiê Misterioso.', lines: ['Oito vitórias! Eu mesmo quase não acredito.', 'A casa perde pouco, mas hoje perdeu pra você. Aproveite.'] },
      ],
    },
  },
  {
    id: 'cas_subsolo', title: 'O Segredo do Subsolo', hint: 'Dizem que o cassino esconde um andar que não existe. Ache quem sabe o caminho.', type: 'quest', chapter: CH,
    requires: ['cas_tour'], optional: true, secret: true, reward: { coins: 300, xp: 400 },
    objective: {
      kind: 'chain',
      steps: [
        { kind: 'talk', npcId: 'velho_poker', hint: 'Fale com o Velho Poker, no térreo (fundo do salão, lado direito).', lines: ['Psiu... você tem cara de quem guarda segredo.', 'No canto de baixo, à esquerda, atrás do vaso, existe uma escada que ninguém usa. Desça e procure o Ruy.'] },
        { kind: 'talk', npcId: 'contrabandista_ruy', hint: 'Desça pela escada escondida (térreo, canto de baixo à esquerda) e fale com o Ruy.', lines: ['Você desceu! Poucos têm coragem.', 'O Arquivista Sombra guarda a chave do cofre. Ele fica no fundo, à direita.'] },
        { kind: 'talk', npcId: 'arquivista_sombra', hint: 'Fale com o Arquivista Sombra, no fundo do subsolo (lado direito).', lines: ['Anotei seu nome faz tempo. Hoje risquei a linha.', 'O cofre no centro, lá em cima, é seu. Abra e depois fale com o Guardião.'] },
        { kind: 'pickups', ids: ['chest_cassino_cofre'], hint: 'Abra o cofre do subsolo (centro, no alto da sala).' },
        { kind: 'talk', npcId: 'guardiao_cofre', hint: 'Volte ao Guardião do Cofre.', lines: ['O cofre abriu para você. Isso nunca acontece.', 'O subsolo continua não existindo. Combinado?'] },
      ],
    },
  },
];

/**
 * "Os Três Troncos" (Urgente 3): a história de Tocão, Serafim e Capiroto. Cada um é um chefe do mundo (amigável o Tocão);
 * depois de vencido vira morador da ilha dele, e as missões levam o jogador de um ao outro. Todas opcionais.
 */
export const TRONCOS_MISSIONS: MissionDef[] = [
  {
    id: 'tronco_tocao', title: 'O Tronco Laranja', hint: 'Ao norte da praça, um tronco laranja quer um treino amigável. Vença-o e converse com ele.', type: 'quest', chapter: 'Os Três Troncos',
    requires: ['kills_12'], optional: true, reward: { coins: 60, xp: 100 },
    objective: { kind: 'chain', steps: [{ kind: 'talk', npcId: 'tocao_npc', hint: 'Derrote o Tocão (treino amigável, perto da praça) e fale com ele.', lines: ['Boa luta! Meus irmãos também gostam de uma boa briga.', 'O Serafim vive na ilha de gelo, ao sudoeste. Ele é bonzinho, mas a luz dele queima.'] }] },
  },
  {
    id: 'tronco_serafim', title: 'O Tronco Anjo', hint: 'O Serafim vive na ilha de gelo, ao sudoeste. Vença-o e converse.', type: 'quest', chapter: 'Os Três Troncos',
    requires: ['tronco_tocao', 'talk_zeca'], optional: true, reward: { coins: 100, xp: 180 },
    objective: { kind: 'chain', steps: [{ kind: 'talk', npcId: 'serafim_npc', hint: 'Vá à ilha de gelo, derrote o Serafim e fale com ele.', lines: ['A luz aprovou você. Raro.', 'Meu irmão Capiroto está no vulcão, a leste. Cuidado: ele não perde uma provocação.'] }] },
  },
  {
    id: 'tronco_capiroto', title: 'O Tronco Diabo', hint: 'O Capiroto está no vulcão, a leste. Vença-o e converse.', type: 'quest', chapter: 'Os Três Troncos',
    requires: ['tronco_serafim'], optional: true, reward: { coins: 180, xp: 320 },
    objective: { kind: 'chain', steps: [{ kind: 'talk', npcId: 'capiroto_npc', hint: 'Vá ao vulcão, derrote o Capiroto e fale com ele.', lines: ['Hehe, você aguentou o fogo.', 'Os três troncos já foram vencidos por você. Isso rende história pra contar por muito tempo.'] }] },
  },
];
