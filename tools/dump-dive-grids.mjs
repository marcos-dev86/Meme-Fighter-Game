// Despeja as grades dos locais de mergulho em JSON (entrada de tools/render_dive_maps.py).
// Uso: node tools/dump-dive-grids.mjs > /tmp/dive_grids.json
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const S = require('../src/game/dive/diveSites.ts');
const out = {};
for (const s of Object.values(S.ALL_SITES)) out[s.id] = { mood: s.mood, w: s.w, h: s.h, grid: S.buildGrid(s).map((r) => r.join('')) };
process.stdout.write(JSON.stringify(out));
