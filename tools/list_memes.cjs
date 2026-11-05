// Gera docs/MEMES.md: onde cada meme / personagem-meme aparece no jogo (mundo aberto por ilha, cassino por andar, chefes).
// Tudo sai dos dados do jogo (npcs.ts, casinoLayout.ts, bossState.ts); nada é digitado à mão.   Uso: node tools/list_memes.cjs
require('./ts-register.cjs');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const n = require(root + '/src/game/world/npcs.ts');
const L = require(root + '/src/game/world/casinoLayout.ts');
// bossState.ts importa React (não carrega no Node): lê os chefes direto do texto, como tools/test-urgente3.mjs
const bossSrc = fs.readFileSync(path.join(root, 'src/game/state/bossState.ts'), 'utf8');
const BOSSES = [...bossSrc.matchAll(/\{ id: '(\w+)', island: '(\w+)', name: '([^']+)'[^\n]*?spot: (null|\{ x: (\d+), y: (\d+) \})([^\n]*)/g)].map((m) => ({ id: m[1], name: m[3], spot: m[4] === 'null' ? null : { x: +m[5], y: +m[6] }, friendly: /friendly: true/.test(m[7]) }));
const w = require(root + '/src/game/world/worldGen.ts');

const ISLAND = { main: 'Ilha Principal', misteriosa: 'Ilha Misteriosa', fragments: 'Ilha dos Fragmentos', vulcao: 'Ilha do Vulcão', trevas: 'Ilha das Trevas', camp: 'Ilha do Acampamento', dogisland: 'Ilha dos Cães', gelo: 'Ilha do Gelo' };
const FLOOR = { ground: 'Cassino – térreo', upper: 'Cassino – Mezanino VIP (2º andar)', basement: 'Cassino – Subsolo Secreto (-1)' };
// ilha = massa de terra (tudo que nao e agua) ligada ao cais de cada ilha
const WW = w.WORLD_TILES_W, HH = w.WORLD_TILES_H;
const label = new Int16Array(WW * HH);
const ids = Object.keys(w.FERRY_DOCKS);
ids.forEach((id, k) => {
  const a = w.FERRY_DOCKS[id].anchor;
  const st = [a.x + a.y * WW];
  if (label[st[0]]) return;
  label[st[0]] = k + 1;
  while (st.length) {
    const c = st.pop(), x = c % WW, y = (c - x) / WW;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= WW || ny >= HH) continue;
      const i = nx + ny * WW;
      if (label[i] || w.getWorldTile(nx, ny) === 'water') continue;
      label[i] = k + 1; st.push(i);
    }
  }
});
const islandOf = (x, y) => {
  const l = label[x + y * WW];
  if (!l) return 'perto da costa';
  const id = ids[l - 1];
  return ISLAND[id === 'main_west' ? 'main' : id] || id;
};

const where = {};
const add = (id, s) => ((where[id] = where[id] || []).push(s));
for (const p of n.OUTDOOR_NPCS) add(p.npcId, { kind: 'mundo', text: `${islandOf(p.x, p.y)} – tile (${p.x}, ${p.y})${p.after ? ` – só depois de vencer ${p.after}` : ''}` });
for (const f of L.FLOOR_IDS) for (const p of L.CASINO_FLOORS[f].npcs) add(p.npcId, { kind: 'cassino', text: `${FLOOR[f]} – tile (${p.x}, ${p.y})` });
const bossOf = {};
for (const b of BOSSES) {
  const id = { boss_chill: 'cara_tranquilo', boss_chill_2: 'cara_tranquilo', boss_troll: 'troll_trapaceiro', boss_tocao: 'tocao_npc', boss_serafim: 'serafim_npc', boss_capiroto: 'capiroto_npc' }[b.id];
  if (id && b.spot) add(id, { kind: 'chefe', text: `${islandOf(b.spot.x, b.spot.y)} – chefe "${b.name}" em (${b.spot.x}, ${b.spot.y})${b.friendly ? ' (duelo amigável)' : ' (luta obrigatória)'}` });
}

const isMeme = (d) => d.kind === 'meme' || d.portraitSprite !== undefined || d.fighterSprite;
const NEW9 = ['azulao', 'vermelhao', 'rei_dourado', 'corvao', 'gato_arco_iris', 'gato_bocao', 'shiba_manso', 'bebe_risonho', 'seis_sete'];
const row = (id) => {
  const d = n.NPCS[id];
  const list = where[id] || [];
  return `### ${d.name} (\`${id}\`)\n- Papel: ${d.role || '—'}\n- Aparições: **${list.length}**\n${list.map((s) => `  - ${s.text}`).join('\n') || '  - (não aparece em lugar nenhum)'}\n`;
};
let md = '# Memes do jogo – onde cada um aparece\n\n> Gerado por `node tools/list_memes.cjs` a partir dos dados do jogo. Tile = coordenada do mundo (32 px por tile).\n> Regra: o mesmo meme pode repetir em várias partes do mapa, **no máximo 3 vezes** (contando o cassino).\n\n';
md += '## Os 9 memes estáticos (imagem parada, sem animação)\n\n';
md += '| Meme | Aparições | Onde |\n|---|---|---|\n';
for (const id of NEW9) md += `| ${n.NPCS[id].name} | ${(where[id] || []).length} | ${(where[id] || []).map((s) => s.text).join('<br>')} |\n`;
md += '\n## Detalhe dos 9 memes estáticos\n\n' + NEW9.map(row).join('\n');
const others = Object.keys(n.NPCS).filter((id) => !NEW9.includes(id) && isMeme(n.NPCS[id]) && (where[id] || []).length);
md += '\n## Outros memes e personagens-meme que já estavam no jogo\n\n' + others.map(row).join('\n');
const none = Object.keys(n.NPCS).filter((id) => isMeme(n.NPCS[id]) && !(where[id] || []).length);
if (none.length) md += `\n> Definidos mas sem posição fixa no mapa (aparecem por missão/cena): ${none.map((i) => n.NPCS[i].name).join(', ')}.\n`;
fs.writeFileSync(path.join(root, 'docs', 'MEMES.md'), md);
console.log('docs/MEMES.md gerado:', NEW9.length, 'memes estáticos +', others.length, 'outros');
