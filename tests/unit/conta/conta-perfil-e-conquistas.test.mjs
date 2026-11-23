/**
 * Testes da rodada 3: CONTA global (perfil, Diamond Meme, conquistas, skins para todos os saves) + morte/reviver/checkpoint.
 * Lógica pura no Node: `node tests/unit/conta/conta-perfil-e-conquistas.test.mjs`. O que depende de React/AsyncStorage é checado no código-fonte aqui e no navegador
 * (tests/e2e/conta/perfil-e-conquistas.e2e.mjs).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('../../_support/ts-register.cjs');
const C = require('../../../src/game/account/accountCore.ts');
const D = require('../../../src/game/account/achievementDefs.ts');
const CFG = require('../../../src/game/account/accountConfig.ts');
const P = require('../../../src/game/account/profileDefs.ts');
const AV = require('../../../src/game/account/avatarList.ts');
const { createFighter } = require('../../../src/game/battle/Fighter.ts');
const { COSMETICS } = require('../../../src/game/cosmetics/cosmeticDefs.ts');
const { ROSTER } = (() => {
  // rosterState importa react: lê a lista do código-fonte
  const src = fs.readFileSync(new URL('../../../src/game/state/rosterState.ts', import.meta.url), 'utf8');
  const keys = [...src.matchAll(/\{ key: '([a-z_]+)', unlock/g)].map((m) => m[1]);
  return { ROSTER: keys };
})();
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

describe('conta nova', () => {
  it('começa com Dogge/Gadigago de graça, cor lisa, moldura padrão e 0 diamantes', () => {
    const a = C.emptyAccount(1);
    assert.equal(a.nick, null);
    assert.equal(a.avatar, 'dogge');
    assert.deepEqual(a.avatarsOwned, ['dogge', 'gadigago']);
    assert.equal(a.frame, 'frame_default');
    assert.equal(P.BG_BY_ID[a.bg].kind, 'solid');
    assert.equal(a.diamonds, 0);
  });
  it('lê JSON ruim com tolerância e descarta itens desconhecidos', () => {
    const a = C.sanitizeAccount({ nick: '  Ma   rcos  ', avatar: 'orc', bg: 'fx_stars', frame: 'frame_gold', diamonds: 'x', achievements: { welcome: 5, nope: 1 }, cosmetics: ['skin_gelo', 'zzz'] });
    assert.equal(a.nick, 'Ma rcos');
    assert.equal(a.avatar, 'dogge', 'avatar não comprado volta ao padrão');
    assert.equal(a.bg, 'solid_gold', 'fundo com efeito não comprado volta ao padrão');
    assert.equal(a.frame, 'frame_default');
    assert.equal(a.diamonds, 0);
    assert.deepEqual(Object.keys(a.achievements), ['welcome']);
    assert.deepEqual(a.cosmetics, ['skin_gelo']);
    assert.equal(C.sanitizeAccount(null).nick, null);
    assert.equal(C.sanitizeAccount('lixo').avatar, 'dogge');
  });
  it('apelido é limpo e limitado', () => {
    assert.equal(C.cleanNick('   '), '');
    assert.equal(C.cleanNick('a'.repeat(40)).length, CFG.NICK_MAX);
  });
});

describe('conquistas', () => {
  it('cada conquista tem id ÚNICO, título/descrição em pt e en, raridade válida', () => {
    const ids = new Set();
    for (const a of D.ACHIEVEMENTS) {
      assert.ok(!ids.has(a.id), `id repetido ${a.id}`);
      ids.add(a.id);
      assert.ok(a.title.pt && a.title.en && a.desc.pt && a.desc.en, a.id);
      assert.ok(['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(a.rarity), a.id);
    }
    assert.ok(D.ACHIEVEMENTS.length >= 60);
    // todas as 5 raridades são usadas (a classificação existe de verdade)
    assert.equal(new Set(D.ACHIEVEMENTS.map((a) => a.rarity)).size, 5);
  });
  it('os dois exemplos do pedido existem com o texto pedido', () => {
    const nevou = D.ACH_BY_ID.isl_gelo;
    assert.equal(nevou.title.pt, 'NEVOU!!');
    assert.match(nevou.desc.pt, /Ilha de Gelo/);
    const dk = D.ACH_BY_ID.story_dogking;
    assert.equal(dk.desc.pt, 'ZERE O MODO HISTÓRIA USANDO O PERSONAGEM DOG KING');
  });
  it('vai ao gelo -> NEVOU!! sai e rende diamantes pela raridade; não repete', () => {
    let a = C.addToSet(C.emptyAccount(1), 'islands', 'gelo');
    const r = C.evaluateAchievements(a, 10);
    assert.ok(r.unlocked.includes('isl_gelo'));
    assert.equal(r.account.diamonds, CFG.DIAMOND_RATES.achievement.uncommon);
    const again = C.evaluateAchievements(r.account, 20);
    assert.deepEqual(again.unlocked, []);
    assert.equal(again.account.diamonds, r.account.diamonds);
  });
  it('zerar a história com um personagem libera a conquista dele (e só a dele)', () => {
    const a = C.addToSet(C.emptyAccount(1), 'clears', 'dogking');
    const r = C.evaluateAchievements(a, 1);
    assert.ok(r.unlocked.includes('story_dogking'));
    assert.ok(!r.unlocked.includes('story_dogge'));
    assert.ok(!r.unlocked.includes('story_all'));
  });
  it('conquistas de contador e de conjunto completo funcionam', () => {
    let a = C.emptyAccount(1);
    a = { ...a, stats: { ...a.stats, tower_best: 25 } };
    const r = C.evaluateAchievements(a, 1);
    for (const id of ['tower_5', 'tower_10', 'tower_25']) assert.ok(r.unlocked.includes(id), id);
    assert.ok(!r.unlocked.includes('tower_40'));
    const skins = COSMETICS.filter((c) => c.slot === 'skin').map((c) => c.id);
    let b = C.emptyAccount(1);
    for (const s of skins) b = C.addToSet(b, 'cosmetics', s);
    assert.ok(C.evaluateAchievements(b, 1).unlocked.includes('cos_skins'));
    assert.deepEqual(C.condProgress(C.emptyAccount(1), { all: ['a', 'b'], in: 'bosses' }), { cur: 0, max: 2 });
  });
  it('o prêmio em diamantes pode completar outra conquista na mesma avaliação', () => {
    const a = { ...C.emptyAccount(1), stats: { diamonds_earned: 99 } };
    const b = C.addToSet(a, 'islands', 'gelo'); // uncommon: +2 => 101 >= 100
    const r = C.evaluateAchievements(b, 1);
    assert.ok(r.unlocked.includes('diamonds_100'));
  });
});

describe('Diamond Meme', () => {
  it('versus: rende por dificuldade e respeita o teto diário', () => {
    let a = C.emptyAccount(1);
    const t0 = Date.UTC(2026, 10, 7, 12);
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const r = C.grantVersusWin(a, 'hardcore', t0);
      a = r.account;
      total += r.gained;
    }
    assert.equal(total, CFG.DIAMOND_RATES.versusDailyCap);
    assert.equal(a.diamonds, CFG.DIAMOND_RATES.versusDailyCap);
    // no dia seguinte o teto zera
    const next = C.grantVersusWin(a, 'medium', t0 + 24 * 3600 * 1000);
    assert.equal(next.gained, CFG.DIAMOND_RATES.versusWin.medium);
  });
  it('torre: só andar novo rende; múltiplos de 5 e de 10 rendem mais', () => {
    assert.equal(C.towerFloorDiamonds(3, 3), 0);
    assert.equal(C.towerFloorDiamonds(3, 2), 0);
    assert.equal(C.towerFloorDiamonds(3, 4), CFG.DIAMOND_RATES.towerFloor);
    assert.equal(C.towerFloorDiamonds(4, 5), CFG.DIAMOND_RATES.towerFloor5);
    assert.equal(C.towerFloorDiamonds(9, 10), CFG.DIAMOND_RATES.towerFloorBoss);
  });
  it('gastar sem saldo falha e não muda nada', () => {
    const a = C.emptyAccount(1);
    assert.equal(C.spendDiamonds(a, 1), null);
    assert.equal(C.spendDiamonds(C.grantDiamonds(a, 5), 3).diamonds, 2);
  });
  it('câmbio: pacotes trocam diamantes por Meme Coins (só nesse sentido)', () => {
    let a = C.grantDiamonds(C.emptyAccount(1), 6);
    const r = C.buyCoinPack(a, 'pack_5');
    assert.equal(r.coins, 550);
    assert.equal(r.account.diamonds, 1);
    assert.equal(C.buyCoinPack(r.account, 'pack_5'), null, 'sem saldo');
    assert.equal(C.buyCoinPack(a, 'nao_existe'), null);
    assert.ok(CFG.COIN_PACKS.every((p) => p.coins / p.diamonds >= 100), 'pacotes maiores nunca valem menos por diamante');
  });
});

describe('perfil: ícone, fundo, moldura', () => {
  it('ícone de outro personagem exige o lutador liberado E diamantes', () => {
    let a = C.emptyAccount(1);
    assert.equal(C.buyAvatar(a, 'orc', ['dogge', 'gadigago']).reason, 'locked');
    assert.equal(C.buyAvatar(a, 'orc', ['dogge', 'gadigago', 'orc']).reason, 'poor');
    a = C.grantDiamonds(a, 100);
    const r = C.buyAvatar(a, 'orc', ['dogge', 'gadigago', 'orc']);
    assert.ok(r.ok);
    assert.equal(r.account.diamonds, 100 - P.avatarPrice('orc'));
    assert.equal(C.buyAvatar(r.account, 'orc', ['orc']).reason, 'owned');
    assert.equal(C.setAvatar(r.account, 'orc').avatar, 'orc');
    assert.equal(C.setAvatar(a, 'orc').avatar, 'dogge', 'não equipa sem ter');
    assert.equal(P.avatarPrice('dogge'), 0);
    assert.equal(P.avatarPrice('gadigago'), 0);
  });
  it('cores lisas são de graça; fundos com efeito e molduras custam diamantes', () => {
    const solids = P.BACKGROUNDS.filter((b) => b.kind === 'solid');
    assert.ok(solids.length >= 8 && solids.every((b) => b.price === 0));
    assert.ok(P.BACKGROUNDS.some((b) => b.kind !== 'solid' && b.price > 0));
    let a = C.emptyAccount(1);
    assert.equal(C.setBackground(a, 'solid_red').bg, 'solid_red');
    assert.equal(C.setBackground(a, 'fx_aurora').bg, 'solid_gold', 'efeito não comprado não equipa');
    assert.equal(C.buyBackground(a, 'fx_aurora').reason, 'poor');
    assert.equal(C.buyBackground(a, 'solid_red').reason, 'owned');
    a = C.grantDiamonds(a, 500);
    const bg = C.buyBackground(a, 'fx_aurora');
    assert.ok(bg.ok);
    assert.equal(C.setBackground(bg.account, 'fx_aurora').bg, 'fx_aurora');
    // moldura: a padrão é grátis e já é sua
    assert.equal(P.FRAME_BY_ID.frame_default.price, 0);
    assert.ok(a.framesOwned.includes('frame_default'));
    assert.equal(C.buyFrame(a, 'frame_default').reason, 'owned');
    const fr = C.buyFrame(a, 'frame_gold');
    assert.ok(fr.ok);
    assert.equal(C.setFrame(fr.account, 'frame_gold').frame, 'frame_gold');
    assert.equal(C.setFrame(a, 'frame_gold').frame, 'frame_default');
  });
  it('favorito só entre os liberados', () => {
    const a = C.emptyAccount(1);
    assert.equal(C.setFavorite(a, 'tank', ['dogge', 'gadigago']).favorite, null);
    assert.equal(C.setFavorite(a, 'gadigago', ['dogge', 'gadigago']).favorite, 'gadigago');
    assert.equal(C.setFavorite(C.setFavorite(a, 'gadigago', ['gadigago']), null, []).favorite, null);
  });
  it('todo lutador do elenco tem ícone (busto 160x160) e preço definido', () => {
    assert.equal(ROSTER.length, 17);
    for (const k of ROSTER) {
      const info = AV.AVATAR_BY_ID[k];
      assert.ok(info && info.kind === 'fighter', `ícone do lutador ${k}`);
      assert.ok(P.avatarPrice(k) >= 0);
    }
    assert.deepEqual(AV.AVATARS.filter((a) => a.kind === 'fighter' && a.price === 0).map((a) => a.id).sort(), ['dogge', 'gadigago']);
  });
  it('catálogo cobre os memes do jogo: NPCs amigos, memes do cassino, parentes e retratos antigos', () => {
    assert.ok(AV.AVATARS.length >= 50, `só ${AV.AVATARS.length}`);
    for (const id of ['npc_azulao', 'npc_vermelhao', 'npc_rei_dourado', 'npc_corvao', 'npc_gato_arco_iris', 'npc_gato_bocao', 'npc_shiba_manso', 'npc_bebe_risonho', 'npc_seis_sete', 'npc_espinho', 'npc_violeta', 'npc_gemada', 'npc_polen', 'npc_penumbra', 'npc_moai', 'npc_silvana', 'npc_tico', 'npc_bento', 'npc_marina', 'npc_zeca'])
      assert.ok(AV.AVATAR_BY_ID[id], id);
    for (const a of AV.AVATARS) assert.ok(a.name && a.price >= 0, a.id);
    assert.equal(new Set(AV.AVATARS.map((a) => a.id)).size, AV.AVATARS.length);
  });
  it('cada ícone tem PNG quadrado 160x160 leve em assets/avatars e entrada no mapa de arte', () => {
    const art = read('src/game/account/avatarArt.ts');
    for (const a of AV.AVATARS) {
      const f = new URL(`../../../assets/avatars/${a.id}.png`, import.meta.url);
      const b = fs.readFileSync(f);
      assert.equal(b.readUInt32BE(16), 160, a.id);
      assert.equal(b.readUInt32BE(20), 160, a.id);
      assert.ok(b.length < 40000, `${a.id} pesa ${b.length}`);
      assert.ok(art.includes(`${a.id}: require('../../../assets/avatars/${a.id}.png')`), a.id);
    }
  });
  it('amigos e memes NÃO jogáveis compram direto (sem liberar nada); jogáveis exigem liberação', () => {
    let a = C.grantDiamonds(C.emptyAccount(1), 200);
    const r = C.buyAvatar(a, 'npc_azulao', ['dogge', 'gadigago']); // nenhum lutador novo liberado
    assert.ok(r.ok, 'meme do cassino compra direto');
    assert.equal(r.account.diamonds, 200 - P.avatarPrice('npc_azulao'));
    assert.ok(C.buyAvatar(a, 'npc_bento', []).ok, 'NPC amigo compra direto');
    assert.equal(C.buyAvatar(a, 'tank', ['dogge']).reason, 'locked', 'jogável precisa estar liberado');
    assert.equal(C.buyAvatar(a, 'id_que_nao_existe', []).reason, 'unknown');
    assert.equal(P.avatarNeedsUnlock('npc_azulao'), false);
    assert.equal(P.avatarNeedsUnlock('tank'), true);
    // conta com ícone desconhecido no JSON volta ao padrão
    assert.equal(C.sanitizeAccount({ avatarsOwned: ['npc_azulao', 'lixo'], avatar: 'npc_azulao' }).avatar, 'npc_azulao');
    assert.deepEqual(C.sanitizeAccount({ avatarsOwned: ['lixo'] }).avatarsOwned, ['dogge', 'gadigago']);
  });
  it('ícone é só busto: recortes da tabela mantêm o corpo de fora (y1 <= 0.8 para humanoides)', () => {
    const py = read('tools/make_avatars.py');
    assert.match(py, /busto/i);
    for (const m of py.matchAll(/F\('(dogge|gadigago|orc|soldier|dogking|tank|mystic|troll_face|cara_tranquilo|sahur|sahur_god|sahur_evil)', '[^']+', \(([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)/g))
      assert.ok(parseFloat(m[5]) <= 0.5, `${m[1]} corta em ${m[5]} da altura`);
  });
});

describe('morte, taxa e reviver', () => {
  it('taxa cresce com o nível e com a dificuldade; nunca é 0', () => {
    assert.ok(CFG.deathFee(1, 'beginner') >= 1);
    assert.ok(CFG.deathFee(20, 'medium') > CFG.deathFee(1, 'medium'));
    assert.ok(CFG.deathFee(10, 'hardcore') > CFG.deathFee(10, 'easy'));
  });
  it('a taxa pode deixar o saldo negativo (conta direta)', () => {
    const coins = 10;
    assert.ok(coins - CFG.deathFee(5, 'medium') < 0);
  });
  it('Fighter.revive: vida 100%, mesmo lugar, rounds e energia mantidos, sem KO', () => {
    const f = createFighter('dogge', 1);
    f.resetForRound(300, 120, 1);
    f.roundsWon = 1;
    f.energy = 40;
    f.takeHit(99999);
    assert.equal(f.isKO, true);
    const x = f.x;
    f.revive();
    assert.equal(f.isKO, false);
    assert.equal(f.health, f.maxHealth);
    assert.equal(f.x, x);
    assert.equal(f.roundsWon, 1);
    assert.equal(f.energy, 40);
    assert.ok(f.invulnTimer > 0);
    assert.equal(f.canAct(), true);
  });
  it('custo de reviver é configurável e positivo', () => {
    assert.ok(CFG.DEATH.reviveDiamonds >= 1);
  });
});

describe('ligações no código (o que não roda em Node)', () => {
  const battle = read('src/screens/BattleScreen.tsx');
  const world = read('src/screens/WorldScreen.tsx');
  it('luta: fase "downed" só quando o nocaute perderia a luta, com reviver e taxa de derrota', () => {
    assert.match(battle, /'downed'/);
    assert.match(battle, /p2\.roundsWon \+ 1 >= ROUNDS_TO_WIN/);
    assert.match(battle, /payDeathFee\(\)/);
    assert.match(battle, /p1\.revive\(\)/);
    assert.match(battle, /requestRespawn\(\)/);
    assert.match(battle, /noteVersusCpuWin/);
  });
  it('mundo: derrota abre a tela, reviver no lugar, checkpoint no cais, respawn após luta perdida', () => {
    assert.match(world, /beginDowned/);
    assert.match(world, /downedRef\.current/);
    assert.match(world, /setCheckpoint\(/);
    assert.match(world, /consumeRespawn\(\)/);
    assert.match(world, /payDeathFee\(\)/);
  });
  it('torre e free não cobram taxa; só quest/boss/rival', () => {
    const h = read('src/game/state/healthState.ts');
    assert.match(h, /kind === 'quest' \|\| kind === 'boss' \|\| kind === 'rival'/);
    assert.match(battle, /const chargesFee = carryStoryHp/);
  });
  it('conta é global: chave própria, fora dos slots; apagar slot não toca nela', () => {
    const acc = read('src/game/account/accountState.ts');
    assert.match(acc, /meme_fighter_account_v1/);
    const save = read('src/game/state/saveState.ts');
    assert.ok(!/ACCOUNT_KEY|meme_fighter_account/.test(save));
    const del = save.slice(save.indexOf('export async function deleteSlot'));
    assert.match(del, /removeItem\(SLOT_KEY\(slot\)\)/);
    assert.ok(!/account/i.test(del));
  });
  it('cosméticos (skins) são da conta: comprar/ganhar grava na conta; apagar save não perde; migra saves antigos', () => {
    const c = read('src/game/state/cosmeticsState.ts');
    assert.match(c, /ownCosmetic\(id\)/);
    assert.match(c, /ownCosmetics\(legacy\)/);
    assert.ok(!/owned = new Set/.test(c), 'não pode mais guardar a posse dentro do save');
    const reset = c.slice(c.indexOf('reset: () => {'));
    assert.ok(!/owned/.test(reset.slice(0, 200)), 'reset de mundo novo não apaga cosméticos');
  });
  it('eventos ligados: chefe, torre, missão, ilha, nível, elenco, mundo criado', () => {
    assert.match(read('src/game/battle/battleModes.ts'), /noteBossDefeated\(/);
    assert.match(read('src/game/battle/battleModes.ts'), /noteTowerFloor\(/);
    assert.match(read('src/game/state/questState.ts'), /noteMissionDone\(/);
    assert.match(read('src/game/state/questState.ts'), /noteIslandVisit\(/);
    assert.match(read('src/game/state/playerState.ts'), /noteLevel\(/);
    assert.match(read('src/game/state/rosterState.ts'), /noteFighterUnlocked\(/);
    assert.match(read('src/game/state/saveState.ts'), /noteWorldCreated\(\)/);
  });
  it('menu: PERFIL entre JOGAR e OPÇÕES e apelido no primeiro acesso', () => {
    const home = read('src/screens/HomeScreen.tsx');
    assert.ok(home.indexOf('home_play') < home.indexOf('home_profile') && home.indexOf('home_profile') < home.indexOf('home_options'));
    assert.match(home, /NicknameDialog first/);
    assert.ok(fs.existsSync(new URL('../../../src/app/profile.tsx', import.meta.url)));
    assert.match(read('src/app/_layout.tsx'), /name="profile"/);
    assert.match(read('src/app/_layout.tsx'), /<AchievementToast \/>/);
  });
  it('câmbio no menu de pausa do mundo', () => {
    assert.match(read('src/game/menu/PauseMenu.tsx'), /exchangeForCoins/);
  });
  it('moedas podem ficar negativas (chargeCoins) mas lojas continuam exigindo saldo (spendCoins)', () => {
    const p = read('src/game/state/playerState.ts');
    assert.match(p, /export function chargeCoins/);
    assert.match(p, /if \(state\.coins < amount\) return false/);
  });
});

describe('textos nos 5 idiomas', () => {
  const src = read('src/game/i18n/stringsConta.ts');
  const langs = ['pt', 'en', 'es', 'fr', 'ja'];
  const blocks = Object.fromEntries(langs.map((l, i) => {
    const start = src.indexOf(`\n  ${l}: {`);
    const end = i + 1 < langs.length ? src.indexOf(`\n  ${langs[i + 1]}: {`) : src.length;
    return [l, new Set([...src.slice(start, end).matchAll(/^\s+([a-z_0-9]+): '/gm)].map((m) => m[1]))];
  }));
  it('todas as chaves existem em todos os idiomas', () => {
    for (const l of langs) assert.deepEqual([...blocks[l]].sort(), [...blocks.pt].sort(), l);
  });
  it('toda chave usada nas telas novas existe', () => {
    const files = ['src/screens/ProfileScreen.tsx', 'src/game/account/DefeatOverlay.tsx', 'src/game/account/NicknameDialog.tsx', 'src/game/account/AchievementToast.tsx', 'src/game/menu/PauseMenu.tsx', 'src/screens/HomeScreen.tsx', 'src/screens/BattleScreen.tsx', 'src/screens/WorldScreen.tsx'];
    const all = new Set(read('src/game/i18n/translations.ts').match(/^\s+([a-z_0-9]+): ['"`]/gm)?.map((s) => s.trim().split(':')[0]));
    const prefixes = ['death_', 'exchange_', 'nick_', 'profile_', 'stat_', 'ach_', 'look_', 'home_profile'];
    for (const f of files) {
      for (const m of read(f).matchAll(/\bt\('([a-z_0-9]+)'\)/g)) {
        if (prefixes.some((p) => m[1].startsWith(p))) assert.ok(blocks.pt.has(m[1]) || all.has(m[1]), `${f}: ${m[1]}`);
      }
    }
    for (const k of ['profile_tab_info', 'profile_tab_ach', 'profile_tab_look', 'ach_filter_all', 'ach_filter_done', 'ach_filter_todo']) assert.ok(blocks.pt.has(k), k);
  });
});

describe('imagens das conquistas (pixel-art 16x16 própria de cada uma)', () => {
  const dir = 'assets/achievements';
  const art = read('src/game/account/achievementArt.ts');
  const png = (id) => fs.readFileSync(`${dir}/${id}.png`);
  it('toda conquista tem a sua imagem PNG 16x16 (ou 32x32), ligada em achievementArt.ts', () => {
    for (const a of D.ACHIEVEMENTS) {
      assert.ok(fs.existsSync(`${dir}/${a.id}.png`), `sem imagem: ${a.id}`);
      const b = png(a.id);
      assert.equal(b.subarray(1, 4).toString(), 'PNG', a.id);
      const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
      assert.ok((w === 16 && h === 16) || (w === 32 && h === 32), `${a.id}: ${w}x${h}`);
      assert.match(art, new RegExp(`\\b${a.id}: require\\('../../../assets/achievements/${a.id}\\.png'\\)`), a.id);
    }
  });
  it('nenhuma imagem é repetida entre conquistas e não sobra arquivo solto', () => {
    const seen = new Map();
    for (const a of D.ACHIEVEMENTS) {
      const h = createHash('sha1').update(png(a.id)).digest('hex');
      assert.ok(!seen.has(h), `${a.id} tem a mesma imagem de ${seen.get(h)}`);
      seen.set(h, a.id);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();
    assert.deepEqual(files, D.ACHIEVEMENTS.map((a) => a.id).sort());
  });
  it('Perfil e aviso desenham a imagem (não mais o emoji)', () => {
    assert.match(read('src/screens/ProfileScreen.tsx'), /<AchievementIcon id=\{a\.id\}/);
    assert.match(read('src/game/account/AchievementToast.tsx'), /<AchievementIcon id=\{def\.id\}/);
    assert.match(read('src/game/account/AchievementIcon.tsx'), /imageRendering: 'pixelated'/);
  });
});

describe('derrota em luta de história: sem "tentar de novo" e sem desconto', () => {
  const b = read('src/screens/BattleScreen.tsx');
  const m = read('src/game/battle/battleModes.ts');
  it('a tela de derrota só oferece voltar ao checkpoint (renascer e caminhar até a luta)', () => {
    assert.doesNotMatch(b, /quest_retry/);
    const defeatBlocks = b.split("t('quest_defeat')").slice(1);
    assert.ok(defeatBlocks.length >= 2);
    for (const blk of defeatBlocks) {
      const cut = blk.slice(0, blk.indexOf('</>'));
      assert.doesNotMatch(cut, /startRematch/);
      assert.match(cut, /goCheckpoint/);
    }
  });
  it('a recompensa da 2ª tentativa é a mesma da 1ª: nada de revanche com desconto', () => {
    assert.ok(!fs.existsSync('src/game/state/revanche.ts'));
    assert.doesNotMatch(b, /revanche(Key|Mult|Label)|state\/revanche|recordLoss|recordWin/);
    assert.doesNotMatch(m, /revanche|flawless = false, mult/i);
    assert.match(m, /export function grantVictory\(s: BattleSetup, hpPct: number, flawless = false\): Granted/);
  });
});
