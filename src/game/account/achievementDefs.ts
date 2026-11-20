/**
 * CONQUISTAS do jogo. Arquivo PURO e declarativo: para criar uma nova, basta acrescentar UMA linha em ACHIEVEMENTS
 * (id único, raridade, título e descrição em pt/en, condição). Não há código de verificação por conquista:
 * a condição lê os contadores/conjuntos que a conta guarda (accountCore.ts) e é reavaliada a cada evento do jogo.
 *
 * Ícones: cada conquista tem a sua própria pixel-art 16x16 em assets/achievements/<id>.png (feitas por
 * tools/make_achievement_icons.py, que confere que existe UMA imagem para cada id). O emblema colorido pela raridade fica na tela.
 */
import type { Rarity } from '@/game/items/rarity';
import { COSMETICS } from '@/game/cosmetics/cosmeticDefs';

export type SetName = 'bosses' | 'islands' | 'clears' | 'fighters' | 'cosmetics' | 'avatars' | 'backgrounds' | 'frames';

export type Cond =
  | { stat: string; gte: number }
  | { has: string; in: SetName }
  | { count: SetName; gte: number }
  | { all: string[]; in: SetName };

export interface AchievementDef {
  id: string;
  rarity: Rarity;
  title: { pt: string; en: string };
  desc: { pt: string; en: string };
  cond: Cond;
  /** personagem da história exigido (a conquista só pode ser obtida quando ele for jogável na história) */
  needsStory?: string;
}

const A = (id: string, rarity: Rarity, tp: string, dp: string, te: string, de: string, cond: Cond, needsStory?: string): AchievementDef => ({
  id, rarity, title: { pt: tp, en: te }, desc: { pt: dp, en: de }, cond, needsStory,
});

/** lutadores do elenco que terão história própria (ids de lutador == ids de personagem da história) */
export const STORY_CLEAR_ROSTER = [
  'dogge', 'gadigago', 'orc', 'soldier', 'dogking', 'tank', 'ninja', 'mystic', 'green_dragon', 'ice_dragon', 'shadow_dragon', 'troll_face', 'cara_tranquilo', 'sahur', 'sahur_god', 'sahur_evil',
];

const BOSS_IDS = ['boss_main', 'boss_misteriosa', 'boss_fragments', 'boss_gelo', 'boss_trevas', 'boss_troll', 'boss_chill', 'boss_sahur', 'boss_sahur_god', 'boss_sahur_evil', 'boss_camp', 'boss_dogisland', 'boss_vulcao'];
const ISLAND_IDS = ['main', 'misteriosa', 'fragments', 'camp', 'dogisland', 'gelo', 'vulcao', 'trevas'];
const SKIN_IDS = COSMETICS.filter((c) => c.slot === 'skin').map((c) => c.id);

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── primeiros passos ──
  A('welcome', 'common', 'BEM-VINDO AO REINO', 'Escolha o seu apelido de jogador.', 'WELCOME TO THE KINGDOM', 'Pick your player nickname.', { stat: 'nick_set', gte: 1 }),
  A('first_world', 'common', 'NOVO MUNDO', 'Crie o seu primeiro mundo no modo história.', 'NEW WORLD', 'Create your first world in story mode.', { stat: 'worlds_created', gte: 1 }),
  A('first_win', 'common', 'PRIMEIRO SANGUE', 'Vença a sua primeira luta.', 'FIRST BLOOD', 'Win your first fight.', { stat: 'fights_won', gte: 1 }),
  A('wins_25', 'uncommon', 'VALENTÃO DO BAIRRO', 'Vença 25 lutas.', 'NEIGHBORHOOD BRAWLER', 'Win 25 fights.', { stat: 'fights_won', gte: 25 }),
  A('wins_100', 'rare', 'VETERANO DE GUERRA', 'Vença 100 lutas.', 'WAR VETERAN', 'Win 100 fights.', { stat: 'fights_won', gte: 100 }),
  A('flawless', 'epic', 'SEM UM ARRANHÃO', 'Derrote um chefe sem tomar nenhum golpe.', 'NOT A SCRATCH', 'Defeat a boss without taking a single hit.', { stat: 'flawless_bosses', gte: 1 }),
  // ── níveis ──
  A('lvl_10', 'common', 'ESTRELINHA', 'Chegue ao nível 10.', 'LITTLE STAR', 'Reach level 10.', { stat: 'level_max', gte: 10 }),
  A('lvl_25', 'uncommon', 'ESTRELA CADENTE', 'Chegue ao nível 25.', 'SHOOTING STAR', 'Reach level 25.', { stat: 'level_max', gte: 25 }),
  A('lvl_50', 'rare', 'SUPERNOVA', 'Chegue ao nível 50.', 'SUPERNOVA', 'Reach level 50.', { stat: 'level_max', gte: 50 }),
  // ── ilhas ──
  A('isl_misteriosa', 'common', 'NEBLINA SUSPEITA', 'Vá até a Ilha Misteriosa.', 'SUSPICIOUS FOG', 'Go to Mystery Island.', { has: 'misteriosa', in: 'islands' }),
  A('isl_fragments', 'common', 'TRILHA DOS FRAGMENTOS', 'Vá até a Ilha dos Fragmentos.', 'TRAIL OF FRAGMENTS', 'Go to Fragments Island.', { has: 'fragments', in: 'islands' }),
  A('isl_camp', 'common', 'ACAMPAMENTO ARMADO', 'Vá até a Ilha do Acampamento.', 'ARMED CAMP', 'Go to Camp Island.', { has: 'camp', in: 'islands' }),
  A('isl_dogisland', 'common', 'AU AU AU', 'Vá até a Ilha dos Cães.', 'BARK BARK BARK', 'Go to Dog Island.', { has: 'dogisland', in: 'islands' }),
  A('isl_gelo', 'uncommon', 'NEVOU!!', 'Vá até a Ilha de Gelo.', 'IT SNOWED!!', 'Go to Ice Island.', { has: 'gelo', in: 'islands' }),
  A('isl_vulcao', 'uncommon', 'CHEIRO DE ENXOFRE', 'Vá até a Ilha do Vulcão.', 'SMELLS LIKE SULFUR', 'Go to Volcano Island.', { has: 'vulcao', in: 'islands' }),
  A('isl_trevas', 'rare', 'LUZ NO FIM DO TÚNEL', 'Vá até a Ilha das Trevas.', 'LIGHT AT THE END OF THE TUNNEL', 'Go to Dark Island.', { has: 'trevas', in: 'islands' }),
  A('isl_all', 'epic', 'NAVEGADOR DO MEME', 'Visite todas as ilhas do reino.', 'MEME NAVIGATOR', 'Visit every island in the kingdom.', { all: ISLAND_IDS, in: 'islands' }),
  // ── chefes ──
  A('boss_main', 'common', 'LADRÃO DE MEMES', 'Derrote a Sombra Ladra-Memes.', 'MEME THIEF', 'Defeat the Meme-Stealing Shadow.', { has: 'boss_main', in: 'bosses' }),
  A('boss_chill', 'common', 'TRANQUILO, TRANQUILO', 'Vença o Cara Tranquilo no duelo.', 'CHILL OUT', 'Beat Cara Tranquilo in a duel.', { has: 'boss_chill', in: 'bosses' }),
  A('boss_sahur', 'common', 'ACORDA PRA CUIDAR', 'Vença o Sahur no duelo.', 'WAKE-UP CALL', 'Beat Sahur in a duel.', { has: 'boss_sahur', in: 'bosses' }),
  A('boss_misteriosa', 'uncommon', 'REVELADO!', 'Derrote o Encapuzado Misterioso.', 'UNMASKED!', 'Defeat the Mysterious Hooded One.', { has: 'boss_misteriosa', in: 'bosses' }),
  A('boss_troll', 'uncommon', 'PROBLEM?', 'Derrote o Troll Face.', 'PROBLEM?', 'Defeat Troll Face.', { has: 'boss_troll', in: 'bosses' }),
  A('boss_camp', 'uncommon', 'CAPITULAÇÃO', 'Derrote o Capitão Ferro.', 'SURRENDER', 'Defeat Captain Iron.', { has: 'boss_camp', in: 'bosses' }),
  A('boss_dogisland', 'rare', 'REI MORTO, REI POSTO', 'Derrote o Rei dos Cães.', 'THE KING IS DEAD', 'Defeat the Dog King.', { has: 'boss_dogisland', in: 'bosses' }),
  A('boss_fragments', 'rare', 'FOLHA SECA', 'Derrote o Dragão da Floresta.', 'DRY LEAF', 'Defeat the Forest Dragon.', { has: 'boss_fragments', in: 'bosses' }),
  A('boss_sahur_god', 'rare', 'BLASFÊMIA', 'Derrote o Sahur God.', 'BLASPHEMY', 'Defeat Sahur God.', { has: 'boss_sahur_god', in: 'bosses' }),
  A('boss_gelo', 'rare', 'DEGELO', 'Derrote o Dragão do Gelo.', 'THAW', 'Defeat the Ice Dragon.', { has: 'boss_gelo', in: 'bosses' }),
  A('boss_vulcao', 'epic', 'APAGOU O VULCÃO', 'Derrote o Guardião do Vulcão.', 'VOLCANO SNUFFED', 'Defeat the Volcano Guardian.', { has: 'boss_vulcao', in: 'bosses' }),
  A('boss_sahur_evil', 'epic', 'O LADO ESCURO DO SAHUR', 'Derrote o Sahur Evil.', 'SAHUR\'S DARK SIDE', 'Defeat Sahur Evil.', { has: 'boss_sahur_evil', in: 'bosses' }),
  A('boss_trevas', 'epic', 'APAGAR AS TREVAS', 'Derrote o Dragão Sombrio.', 'SNUFF THE DARK', 'Defeat the Shadow Dragon.', { has: 'boss_trevas', in: 'bosses' }),
  A('boss_all', 'legendary', 'MATADOR DE LENDAS', 'Derrote todos os chefes do mundo.', 'LEGEND SLAYER', 'Defeat every world boss.', { all: BOSS_IDS, in: 'bosses' }),
  // ── Torre ──
  A('tower_5', 'common', 'PRIMEIROS ANDARES', 'Chegue ao andar 5 da Torre.', 'FIRST FLOORS', 'Reach floor 5 of the Tower.', { stat: 'tower_best', gte: 5 }),
  A('tower_10', 'uncommon', 'DEZENA NA TORRE', 'Chegue ao andar 10 da Torre.', 'TEN ON THE TOWER', 'Reach floor 10 of the Tower.', { stat: 'tower_best', gte: 10 }),
  A('tower_25', 'rare', 'QUASE LÁ EM CIMA', 'Chegue ao andar 25 da Torre.', 'ALMOST UP THERE', 'Reach floor 25 of the Tower.', { stat: 'tower_best', gte: 25 }),
  A('tower_40', 'epic', 'FÊNIX DA TORRE', 'Chegue ao andar 40 da Torre.', 'TOWER PHOENIX', 'Reach floor 40 of the Tower.', { stat: 'tower_best', gte: 40 }),
  A('tower_50', 'legendary', 'TOCANDO O CÉU', 'Chegue ao andar 50 da Torre.', 'TOUCHING THE SKY', 'Reach floor 50 of the Tower.', { stat: 'tower_best', gte: 50 }),
  // ── Versus (contra a CPU) ──
  A('vs_1', 'common', 'NA PONTA DOS DEDOS', 'Vença a CPU no VERSUS.', 'AT YOUR FINGERTIPS', 'Beat the CPU in VERSUS.', { stat: 'versus_wins', gte: 1 }),
  A('vs_10', 'uncommon', 'VICIADO EM ARCADE', 'Vença a CPU 10 vezes no VERSUS.', 'ARCADE ADDICT', 'Beat the CPU 10 times in VERSUS.', { stat: 'versus_wins', gte: 10 }),
  A('vs_50', 'rare', 'CAMPEÃO DO FLIPERAMA', 'Vença a CPU 50 vezes no VERSUS.', 'ARCADE CHAMPION', 'Beat the CPU 50 times in VERSUS.', { stat: 'versus_wins', gte: 50 }),
  A('vs_hard', 'rare', 'CPU SOFREU', 'Vença a CPU no DIFÍCIL ou acima.', 'CPU SUFFERED', 'Beat the CPU on HARD or above.', { stat: 'versus_hard_wins', gte: 1 }),
  A('vs_hardcore', 'epic', 'HARDCORE É POUCO', 'Vença a CPU no HARDCORE.', 'HARDCORE IS NOT ENOUGH', 'Beat the CPU on HARDCORE.', { stat: 'versus_hardcore_wins', gte: 1 }),
  // ── morte ──
  A('death_1', 'common', 'ISSO FOI DE PROPÓSITO', 'Seja derrotado pela primeira vez.', 'ON PURPOSE', 'Get defeated for the first time.', { stat: 'deaths', gte: 1 }),
  A('death_10', 'uncommon', 'MORRER FAZ PARTE', 'Seja derrotado 10 vezes.', 'DYING IS PART OF IT', 'Get defeated 10 times.', { stat: 'deaths', gte: 10 }),
  A('debt', 'uncommon', 'NO VERMELHO', 'Fique com Meme Coins negativos depois de uma derrota.', 'IN THE RED', 'Go into negative Meme Coins after a defeat.', { stat: 'debt_events', gte: 1 }),
  A('revive_1', 'uncommon', 'RENASCIDO', 'Reviva usando Diamond Meme.', 'REBORN', 'Revive using Diamond Meme.', { stat: 'revives', gte: 1 }),
  A('revive_10', 'rare', 'FÊNIX DE MEME', 'Reviva 10 vezes usando Diamond Meme.', 'MEME PHOENIX', 'Revive 10 times using Diamond Meme.', { stat: 'revives', gte: 10 }),
  // ── coleção e perfil ──
  A('cos_1', 'common', 'ESTILOSO', 'Tenha o seu primeiro cosmético.', 'STYLISH', 'Own your first cosmetic.', { count: 'cosmetics', gte: 1 }),
  A('cos_skins', 'epic', 'TROCA DE PELE', 'Tenha todas as skins.', 'NEW SKIN', 'Own every skin.', { all: SKIN_IDS, in: 'cosmetics' }),
  A('cos_all', 'legendary', 'GUARDA-ROUPA INFINITO', 'Tenha todos os cosméticos.', 'INFINITE WARDROBE', 'Own every cosmetic.', { count: 'cosmetics', gte: COSMETICS.length }),
  A('roster_5', 'uncommon', 'ELENCO CRESCENDO', 'Libere 5 lutadores.', 'GROWING ROSTER', 'Unlock 5 fighters.', { count: 'fighters', gte: 5 }),
  A('roster_all', 'epic', 'ELENCO COMPLETO', 'Libere todos os lutadores.', 'FULL ROSTER', 'Unlock every fighter.', { count: 'fighters', gte: STORY_CLEAR_ROSTER.length }),
  A('buy_avatar', 'common', 'NOVA CARA', 'Compre um ícone de perfil.', 'NEW FACE', 'Buy a profile icon.', { stat: 'bought_avatars', gte: 1 }),
  A('buy_bg', 'common', 'FUNDO DE LUXO', 'Compre um fundo com efeito.', 'LUXURY BACKDROP', 'Buy an effect background.', { stat: 'bought_backgrounds', gte: 1 }),
  A('buy_frame', 'common', 'EMOLDURADO', 'Compre uma moldura de perfil.', 'FRAMED', 'Buy a profile frame.', { stat: 'bought_frames', gte: 1 }),
  A('diamonds_100', 'uncommon', 'BRILHANTE', 'Ganhe 100 Diamond Meme no total.', 'BRILLIANT', 'Earn 100 Diamond Meme in total.', { stat: 'diamonds_earned', gte: 100 }),
  A('diamonds_500', 'rare', 'MINA DE DIAMANTES', 'Ganhe 500 Diamond Meme no total.', 'DIAMOND MINE', 'Earn 500 Diamond Meme in total.', { stat: 'diamonds_earned', gte: 500 }),
  A('exchange', 'common', 'CÂMBIO DO MEME', 'Troque Diamond Meme por Meme Coins.', 'MEME EXCHANGE', 'Trade Diamond Meme for Meme Coins.', { stat: 'exchanges', gte: 1 }),
  // ── zerar a história com cada personagem ──
  A('story_dogge', 'epic', 'REI DOS MEMES', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DOGGE', 'KING OF MEMES', 'BEAT STORY MODE USING DOGGE', { has: 'dogge', in: 'clears' }, 'dogge'),
  A('story_gadigago', 'epic', 'RIVAL ETERNO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM GADIGAGO', 'ETERNAL RIVAL', 'BEAT STORY MODE USING GADIGAGO', { has: 'gadigago', in: 'clears' }, 'gadigago'),
  A('story_orc', 'epic', 'VERDE DE RAIVA', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM ORC', 'GREEN WITH RAGE', 'BEAT STORY MODE USING ORC', { has: 'orc', in: 'clears' }, 'orc'),
  A('story_soldier', 'epic', 'CUMPRINDO ORDENS', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM SOLDADO', 'FOLLOWING ORDERS', 'BEAT STORY MODE USING SOLDIER', { has: 'soldier', in: 'clears' }, 'soldier'),
  A('story_dogking', 'epic', 'DE QUATRO PATAS AO TRONO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DOG KING', 'FROM PAWS TO THRONE', 'BEAT STORY MODE USING DOG KING', { has: 'dogking', in: 'clears' }, 'dogking'),
  A('story_tank', 'epic', 'PASSANDO POR CIMA', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM TANQUE', 'RUNNING THEM OVER', 'BEAT STORY MODE USING TANK', { has: 'tank', in: 'clears' }, 'tank'),
  A('story_ninja', 'epic', 'SEM FAZER BARULHO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM NINJA', 'WITHOUT A SOUND', 'BEAT STORY MODE USING NINJA', { has: 'ninja', in: 'clears' }, 'ninja'),
  A('story_mystic', 'epic', 'MAGO DE VERDADE', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM MÍSTICO', 'A REAL WIZARD', 'BEAT STORY MODE USING MYSTIC', { has: 'mystic', in: 'clears' }, 'mystic'),
  A('story_green_dragon', 'epic', 'FÔLEGO DE FLORESTA', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DRAGÃO DA FLORESTA', 'FOREST BREATH', 'BEAT STORY MODE USING FOREST DRAGON', { has: 'green_dragon', in: 'clears' }, 'green_dragon'),
  A('story_ice_dragon', 'epic', 'SANGUE FRIO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DRAGÃO DO GELO', 'COLD BLOODED', 'BEAT STORY MODE USING ICE DRAGON', { has: 'ice_dragon', in: 'clears' }, 'ice_dragon'),
  A('story_shadow_dragon', 'epic', 'ASAS DA NOITE', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DRAGÃO SOMBRIO', 'WINGS OF NIGHT', 'BEAT STORY MODE USING SHADOW DRAGON', { has: 'shadow_dragon', in: 'clears' }, 'shadow_dragon'),
  A('story_troll_face', 'epic', 'PROBLEMA SEU', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM TROLL FACE', 'YOUR PROBLEM', 'BEAT STORY MODE USING TROLL FACE', { has: 'troll_face', in: 'clears' }, 'troll_face'),
  A('story_cara_tranquilo', 'epic', 'SEM PRESSA', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM CARA TRANQUILO', 'NO RUSH', 'BEAT STORY MODE USING CARA TRANQUILO', { has: 'cara_tranquilo', in: 'clears' }, 'cara_tranquilo'),
  A('story_sahur', 'epic', 'MADRUGADA FIRME', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM SAHUR', 'EARLY RISER', 'BEAT STORY MODE USING SAHUR', { has: 'sahur', in: 'clears' }, 'sahur'),
  A('story_sahur_god', 'epic', 'ASCENSÃO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM SAHUR GOD', 'ASCENSION', 'BEAT STORY MODE USING SAHUR GOD', { has: 'sahur_god', in: 'clears' }, 'sahur_god'),
  A('story_sahur_evil', 'epic', 'QUEIMANDO TUDO', 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM SAHUR EVIL', 'BURN IT ALL', 'BEAT STORY MODE USING SAHUR EVIL', { has: 'sahur_evil', in: 'clears' }, 'sahur_evil'),
  A('story_all', 'legendary', 'LENDA DOS MEMES', 'ZERE O MODO HISTÓRIA COM TODOS OS PERSONAGENS', 'LEGEND OF MEMES', 'BEAT STORY MODE WITH EVERY CHARACTER', { all: STORY_CLEAR_ROSTER, in: 'clears' }),
  // ── expansão marítima (mergulho): os contadores vêm de dive/diveState.ts ──
  A('sea_first_dive', 'common', 'PRIMEIRO MERGULHO', 'Mergulhe pela primeira vez.', 'FIRST DIVE', 'Dive for the first time.', { stat: 'dive_dives', gte: 1 }),
  A('sea_dives_25', 'uncommon', 'RATO DE RECIFE', 'Faça 25 mergulhos.', 'REEF RAT', 'Make 25 dives.', { stat: 'dive_dives', gte: 25 }),
  A('sea_chests_5', 'uncommon', 'CAÇADOR DE TESOUROS', 'Abra 5 baús submarinos.', 'TREASURE HUNTER', 'Open 5 undersea chests.', { stat: 'dive_chests', gte: 5 }),
  A('sea_chests_all', 'rare', 'TESOURO NA MÃO', 'Abra todos os 15 baús do fundo do mar.', 'TREASURE IN HAND', 'Open all 15 chests of the deep.', { stat: 'dive_chests', gte: 15 }),
  A('sea_cross_first', 'common', 'POR BAIXO DAS ONDAS', 'Conclua uma travessia submarina entre ilhas.', 'UNDER THE WAVES', 'Finish an underwater crossing between islands.', { stat: 'dive_crossings', gte: 1 }),
  A('sea_cross_all', 'epic', 'ATRAVESSA-MARES', 'Conclua as 8 travessias diferentes.', 'SEA CROSSER', 'Finish all 8 different crossings.', { stat: 'dive_cross_unique', gte: 8 }),
  A('sea_all_sites', 'rare', 'CARTÓGRAFO DO MAR', 'Visite os 9 locais de mergulho.', 'SEA CARTOGRAPHER', 'Visit all 9 dive sites.', { stat: 'dive_sites', gte: 9 }),
  A('sea_hunter', 'uncommon', 'PREDADOR DE RECIFE', 'Derrote 25 criaturas marinhas.', 'REEF PREDATOR', 'Defeat 25 sea creatures.', { stat: 'dive_kills', gte: 25 }),
  A('sea_friend', 'uncommon', 'AMIGO DOS BICHOS', 'Ajude 5 criaturas amigáveis.', 'FRIEND OF THE CRITTERS', 'Help 5 friendly creatures.', { stat: 'dive_helps', gte: 5 }),
  A('sea_bestiary', 'epic', 'ENCICLOPÉDIA DO MAR', 'Encontre as 16 criaturas marinhas.', 'SEA ENCYCLOPEDIA', 'Meet all 16 sea creatures.', { stat: 'dive_known', gte: 16 }),
  A('sea_events', 'uncommon', 'SORTE DE MERGULHADOR', 'Conclua 5 eventos aleatórios do mar.', 'DIVER\'S LUCK', 'Finish 5 random sea events.', { stat: 'dive_events', gte: 5 }),
  A('sea_secret_wall', 'rare', 'A PAREDE QUE NÃO ERA', 'Descubra uma parede secreta no fundo do mar.', 'THE WALL THAT WASN\'T', 'Discover a secret wall underwater.', { stat: 'dive_secrets', gte: 1 }),
  A('sea_secret_walls_4', 'legendary', 'QUEM SABE TUDO DO MAR', 'Descubra as 4 paredes secretas.', 'WHO KNOWS THE SEA', 'Discover all 4 secret walls.', { stat: 'dive_secrets', gte: 4 }),
  A('sea_beast_slayer', 'epic', 'DOMADOR DO LEVIATÃ', 'Derrote o Sea Beast no fundo do abismo.', 'LEVIATHAN TAMER', 'Defeat the Sea Beast in the abyss.', { has: 'boss_sea_beast', in: 'bosses' }),
  A('sea_near_drown', 'uncommon', 'RESPIRA, MEU FILHO', 'Fique sem fôlego e consiga respirar de novo.', 'BREATHE, KID', 'Run out of breath and breathe again.', { stat: 'dive_survived_empty', gte: 1 }),
  A('sea_glub', 'common', 'GLUB GLUB', 'Morra afogado.', 'GLUB GLUB', 'Die by drowning.', { stat: 'deaths_drowning', gte: 1 }),
  A('sea_gills', 'legendary', 'NUNCA PRECISEI SUBIR', 'Nade 60 segundos com fôlego infinito.', 'NEVER NEEDED TO SURFACE', 'Swim 60 seconds with infinite breath.', { stat: 'dive_infinite_sec', gte: 60 }),
  A('sea_deep', 'rare', 'PRESSÃO NÃO É COM EU', 'Passe 120 segundos na zona profunda.', 'PRESSURE? NOT ME', 'Spend 120 seconds in the deep zone.', { stat: 'dive_deep_sec', gte: 120 }),
  A('sea_whale', 'epic', 'PERGUNTA EXISTENCIAL', 'Converse com a Baleia Filósofa.', 'EXISTENTIAL QUESTION', 'Talk to the Philosopher Whale.', { stat: 'dive_help_whale', gte: 1 }),
  A('sea_secret_items', 'epic', 'COLECIONADOR SECRETO', 'Ache 3 itens Secret no fundo do mar.', 'SECRET COLLECTOR', 'Find 3 Secret items underwater.', { stat: 'dive_secret_items', gte: 3 }),
];

export const ACH_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achTitle(a: AchievementDef, lang: string): string {
  return lang === 'pt' ? a.title.pt : a.title.en;
}
export function achDesc(a: AchievementDef, lang: string): string {
  return lang === 'pt' ? a.desc.pt : a.desc.en;
}
