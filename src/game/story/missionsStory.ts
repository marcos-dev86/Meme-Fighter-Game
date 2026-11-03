import type { MissionDef } from './missionTypes';

/**
 * Missões da Parte 38: 6 MISSÕES DE CAMINHO (só existem para quem fez certa escolha importante, ver
 * storyChoices.ts) e 10 SECRETAS (aparecem como "???" até serem descobertas). Todas são opcionais:
 * não seguram a missão final, mas contam no progresso (100% = todas as possíveis) e somam pontos para os finais.
 */
const CH_ALT = 'Caminhos da História';
const CH_SEC = 'Segredos';

export const STORY_MISSIONS: MissionDef[] = [
  // ------------------------------------------------------------ CAMINHOS
  {
    id: 'alt_rival_spar', title: 'Treino com o Aliado', hint: 'Treine ao lado do Gadigago, seu novo aliado.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'rival_peace', option: 'union' }, reward: { coins: 90, xp: 250, items: { potion_hp_l: 1 } }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'kills', count: 10, hint: 'Derrote 10 monstros para treinar com o aliado.' },
      { kind: 'talk', npcId: 'rival', hint: 'Volte ao Gadigago e conte do treino.', lines: ['Dez de uma vez?! Você me inspira. Quando eu for campeão, vou dizer que treinei com você. Ha!'] },
    ] },
  },
  {
    id: 'alt_rival_vow', title: 'A Revanche Prometida', hint: 'Fique mais forte antes da revanche com o Gadigago.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'rival_peace', option: 'glory' }, reward: { coins: 110, xp: 300 }, storyPts: { g: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'level', level: 12, hint: 'Chegue ao nível 12 para estar pronto.' },
      { kind: 'talk', npcId: 'rival', hint: 'Mostre a ele quem tem talento.', lines: ['Nível 12? Hm. Está bem: da próxima vez que eu te vir de pé, vai ser um duelo de verdade.'] },
    ] },
  },
  {
    id: 'alt_ferro_letter', title: 'A Carta do Capitão', hint: 'O Capitão Ferro deixou um recado no acampamento.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'camp_ferro', option: 'union' }, reward: { coins: 80, items: { w_bomb: 1 } }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'orc_guard', hint: 'Fale com o guarda do acampamento.', lines: ['O Capitão me pediu para te entregar um recado: "Obrigado pela segunda chance. Vou recomeçar do zero."'] },
      { kind: 'talk', npcId: 'soldier_captain', hint: 'Fale com o Capitão Ferro.', lines: ['Um homem que poupa o inimigo vale mais que mil batalhas. Cuide-se, lutador.'] },
    ] },
  },
  {
    id: 'alt_king_peace', title: 'Paz entre as Ilhas', hint: 'O Rei dos Cães quer selar a paz que você ofereceu.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'dogking_end', option: 'union' }, reward: { coins: 120, items: { potion_hp_l: 1 } }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'dogking', hint: 'Fale com o Rei dos Cães.', lines: ['Mandei o recado a todos os cães: ninguém mais ataca viajantes. Leve a notícia ao Vovô Bento.'] },
      { kind: 'talk', npcId: 'bento', hint: 'Leve a notícia ao Vovô Bento.', lines: ['A paz entre as ilhas... há décadas eu não ouvia isso. Obrigado, meu jovem.'] },
    ] },
  },
  {
    id: 'alt_forge_shield', title: 'Um Escudo para a Vila', hint: 'Mostre o escudo forjado a quem mais precisa.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'forge_choice', option: 'union' }, reward: { coins: 90, xp: 200 }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'toinho', hint: 'Mostre o escudo ao Toinho, na praça.', lines: ['Que escudo bonito! Agora eu me sinto mais seguro só de olhar. Valeu por pensar na vila!'] },
    ] },
  },
  {
    id: 'alt_forge_blade', title: 'A Lâmina Faminta', hint: 'A Lâmina de Brasa quer ser alimentada.', type: 'quest', chapter: CH_ALT, optional: true,
    branch: { choice: 'forge_choice', option: 'power' }, reward: { coins: 60, items: { power_brew: 1 } }, storyPts: { p: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'kills', count: 15, hint: 'Derrote 15 monstros: a lâmina pede sangue.' },
      { kind: 'talk', npcId: 'brasa', hint: 'Mostre a lâmina saciada ao Brasa.', lines: ['Ela brilha mais forte... Cuidado: quanto mais ela come, mais ela pede.'] },
    ] },
  },

  // ------------------------------------------------------------ SECRETAS
  {
    id: 'sec_madrugada', title: 'O Cliente da Madrugada', hint: 'Dizem que um mercador estranho só aparece de noite, na praça.', type: 'quest', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 150, xp: 300, items: { night_brew: 1 } }, storyPts: { p: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'mercador_noturno', hint: 'Procure o mercador na praça, de noite.', lines: ['Psiu... Eu só trabalho quando a lua está alta. Traga-me um Cogumelo Lunar e eu faço valer a sua noite.'] },
      { kind: 'talk', npcId: 'mercador_noturno', hint: 'Entregue o Cogumelo Lunar (da loja da Marina, à noite).', take: { moonshroom: 1 }, lines: ['Ora, ora: um cliente de verdade! Tome sua parte. E esqueça que me viu.'] },
    ] },
  },
  {
    id: 'sec_chuva', title: 'Cantiga da Chuva', hint: 'Uma voz canta na praça, mas só quando chove.', type: 'quest', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 100, xp: 250, items: { moon_elixir: 2 } }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'cantora_chuva', hint: 'Ache a cantora na praça, num dia de chuva.', lines: ['A chuva é a minha plateia. Ela sempre vem, e eu sempre canto. Você fica um pouco para ouvir?'] },
      { kind: 'talk', npcId: 'cantora_chuva', hint: 'Volte a ouvi-la, ainda na chuva.', lines: ['Você ficou! Pouca gente fica. Leve isto: um agradecimento de quem canta para as nuvens.'] },
    ] },
  },
  {
    id: 'sec_bau', title: 'O Tesouro da Igreja', hint: 'A nova igreja da praça esconde algo do lado de fora.', type: 'collect', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 120, xp: 200 }, storyPts: { g: 1 }, objective: { kind: 'pickups', ids: ['bau_igreja'] },
  },
  {
    id: 'sec_sem_arranhao', title: 'Sem um Arranhão', hint: 'Vença um chefe sem levar nenhum golpe.', type: 'battle', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 250, xp: 500, cosmetic: 'hat_crown' }, storyPts: { g: 2 }, objective: { kind: 'flag', flag: 'flawless_boss' },
  },
  {
    id: 'sec_torre25', title: 'Mais Alto na Torre', hint: 'A Torre dos Desafios guarda um andar de rival lá no alto.', type: 'battle', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 200, xp: 400 }, storyPts: { g: 1 }, objective: { kind: 'flag', flag: 'tower_25' },
  },
  {
    id: 'sec_primas', title: 'Reunião de Família', hint: 'As primas do Doggo estão espalhadas pelos cantos do mundo.', type: 'talk', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 200, xp: 400, items: { potion_hp_l: 2 } }, storyPts: { u: 2 }, objective: { kind: 'flag', flag: 'cousins_reunion' },
  },
  {
    id: 'sec_777', title: 'Sete da Sorte', hint: 'Dizem que o caça-níquel paga fortuna a quem alinha a sorte.', type: 'collect', chapter: CH_SEC, optional: true, secret: true,
    reward: { coins: 150, xp: 300 }, storyPts: { p: 1 }, objective: { kind: 'flag', flag: 'secret_777' },
  },
  {
    id: 'sec_breno_luz', title: 'A Luz do Breno', hint: 'Breno prometeu algo a quem o ajudou a sair do labirinto.', type: 'quest', chapter: CH_SEC, optional: true, secret: true,
    branch: { choice: 'breno_help', option: 'union' }, reward: { coins: 130, xp: 300, items: { energizante: 2 } }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'talk', npcId: 'garoto_sombrio', hint: 'Fale com o Breno de novo.', lines: ['Achei uma lanterna velha no caminho. Fique com ela: sem você eu nunca teria visto a saída.'] },
    ] },
  },
  {
    id: 'sec_sigma_respeito', title: 'O Respeito do Sigma', hint: 'A estátua do Sigma Boy parece esperar algo de quem a rejeitou.', type: 'quest', chapter: CH_SEC, optional: true, secret: true,
    branch: { choice: 'sigma_statue', option: 'glory' }, reward: { coins: 300, xp: 600, items: { old_coin: 1 } }, storyPts: { g: 2 },
    objective: { kind: 'chain', steps: [
      { kind: 'level', level: 20, hint: 'Prove que merece: chegue ao nível 20.' },
      { kind: 'talk', npcId: 'moai', hint: 'Volte à estátua do Sigma Boy.', lines: ['(A estátua parece sorrir.) "Quem rejeita o presente e ainda assim vence... esse é o verdadeiro Sigma."'] },
    ] },
  },
  {
    id: 'sec_duelo_amistoso', title: 'O Duelo Amistoso', hint: 'Seu aliado Gadigago quer apostar uma noitada de sorte no cassino.', type: 'quest', chapter: CH_SEC, optional: true, secret: true,
    branch: { choice: 'rival_peace', option: 'union' }, reward: { coins: 150, xp: 350 }, storyPts: { u: 1 },
    objective: { kind: 'chain', steps: [
      { kind: 'casino', wins: 3, hint: 'Ganhe 3 rodadas no cassino, para mostrar a ele.' },
      { kind: 'talk', npcId: 'rival', hint: 'Conte ao Gadigago como foi.', lines: ['Três vitórias?! Aposto que você trapaceou... brincadeira! Aliados de verdade não precisam de trapaça.'] },
    ] },
  },
];
