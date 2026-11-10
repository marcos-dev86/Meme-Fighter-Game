#!/usr/bin/env node
/**
 * Auditoria de traduções (Parte 5.2): compara pt, en, es, fr e ja e aponta
 *   1. CHAVES FALTANDO em algum idioma;
 *   2. CHAVES DUPLICADAS: a mesma chave escrita duas vezes no mesmo bloco (o JS fica com a última, a primeira some em silêncio)
 *      ou o mesmo idioma definindo a mesma chave em arquivos diferentes (o bloco mais novo sobrescreve o antigo);
 *   3. TEXTOS NÃO TRADUZIDOS: en/es/fr/ja idêntico ao português (exceto a lista de nomes próprios/termos universais abaixo);
 *   4. PROBLEMAS DE ESTRUTURA: valor que não é texto, vazio, espaços sobrando nas pontas, {marcadores} diferentes do português,
 *      nome de chave fora do padrão, chave usada em t('...') / nameKey que não existe.
 * Uso:   node tools/check-i18n.mjs            (relatório completo; código de saída 1 se achar qualquer problema)
 *        node tools/check-i18n.mjs --json      (saída em JSON, para outras ferramentas)
 *        node tools/check-i18n.mjs --unused    (também lista chaves que nenhuma tela usa; só informativo)
 * Variável I18N_DIR=<pasta> aponta para outra pasta de textos (usada só nos testes do script).
 * Para acrescentar um texto novo: ponha a chave nos 5 idiomas num bloco de src/game/i18n/strings*.ts (e registre o arquivo em
 * extraStrings.ts se for novo) e rode este script até sair "0 problemas".
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const ts = require('typescript');
const root = new URL('..', import.meta.url).pathname;
// I18N_DIR só existe para os testes do próprio script (pasta com cópias alteradas de propósito).
const i18nDir = process.env.I18N_DIR ? path.resolve(process.env.I18N_DIR) : path.join(root, 'src/game/i18n');
const { STRINGS } = require(path.join(i18nDir, 'translations.ts'));
require(path.join(i18nDir, 'extraStrings.ts'));
const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const args = new Set(process.argv.slice(2));

/** Iguais ao português de propósito: nomes próprios, siglas e termos universais. */
const SAME_AS_PT_OK = new Set(['credits_title', 'tower_ranking', 'bag_use', 'options_edit_controls', 'controls_edit_title', 'shop_insufficient', 'progress_map', 'cas_station_cards_secret']);
/** Idêntico ao português porque é a MESMA palavra no idioma (chave -> idiomas). */
const SAME_WORD_OK = { cas_station_dice_secret: ['es'], look_poor: ['es'], exchange_poor: ['es'] };

const problems = { missing: [], duplicate: [], untranslated: [], structure: [] };
const add = (kind, msg) => problems[kind].push(msg);

// ---- 1. chaves faltando
const union = new Set(LANGS.flatMap((l) => Object.keys(STRINGS[l])));
for (const l of LANGS) for (const k of union) if (!(k in STRINGS[l])) add('missing', `${l}: falta "${k}"`);

// ---- 2. chaves duplicadas (lendo o código-fonte, porque depois de montado o objeto já engoliu o duplicado)
const files = fs.readdirSync(i18nDir).filter((f) => /^(translations|strings.*)\.ts$/.test(f));
// Ordem de mesclagem real (extraStrings.ts): translations.ts primeiro e cada bloco extra depois, o último vence.
const extraSrc = fs.readFileSync(path.join(i18nDir, 'extraStrings.ts'), 'utf8');
const importFile = Object.fromEntries([...extraSrc.matchAll(/import \{ (STRINGS_[A-Z0-9_]+) \} from '\.\/([A-Za-z0-9]+)'/g)].map((m) => [m[1], m[2] + '.ts']));
const mergeOrder = ['translations.ts', ...[...(extraSrc.match(/EXTRA_STRINGS[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/STRINGS_[A-Z0-9_]+/g)].map((m) => importFile[m[0]])];
const rank = (f) => mergeOrder.indexOf(f);
for (const f of files) if (rank(f) < 0) add('structure', `${f} não está registrado em extraStrings.ts (seus textos não carregam)`);
files.sort((a, b) => rank(a) - rank(b));
const seenIn = {}; // lang -> key -> arquivo
for (const f of files) {
  const src = fs.readFileSync(path.join(i18nDir, f), 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const names = new Map();
      for (const p of node.properties) {
        if (!p.name) continue;
        const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNoSubstitutionTemplateLiteral(p.name) ? p.name.text : null;
        if (key === null) continue;
        const line = sf.getLineAndCharacterOfPosition(p.getStart()).line + 1;
        if (names.has(key)) add('duplicate', `${f}:${line} "${key}" repetida no mesmo bloco (primeira em ${f}:${names.get(key)})`);
        else names.set(key, line);
      }
      // bloco de idioma = objeto cuja chave pai é pt/en/es/fr/ja
      const parent = node.parent;
      const lang = parent && ts.isPropertyAssignment(parent) && parent.name && LANGS.includes(parent.name.text) ? parent.name.text : null;
      if (lang) {
        seenIn[lang] ??= {};
        for (const k of names.keys()) {
          if (seenIn[lang][k] && seenIn[lang][k] !== f) add('duplicate', `${lang}: "${k}" definida em ${seenIn[lang][k]} e em ${f} (vale a de ${f}; apague a outra)`);
          else seenIn[lang][k] = f;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ---- 3. não traduzidos
for (const l of LANGS.slice(1)) {
  for (const k of Object.keys(STRINGS.pt)) {
    const pt = STRINGS.pt[k];
    const v = STRINGS[l][k];
    if (typeof v === 'string' && v === pt && /[a-zçãõéíóúâêà]{4,}/i.test(pt) && pt.length > 12 && !SAME_AS_PT_OK.has(k) && !SAME_WORD_OK[k]?.includes(l)) add('untranslated', `${l}: "${k}" igual ao português: ${JSON.stringify(pt.slice(0, 50))}`);
  }
}

// ---- 4. estrutura
const ph = (s) => (s.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join();
for (const l of LANGS) {
  for (const [k, v] of Object.entries(STRINGS[l])) {
    if (!/^[a-z][a-z0-9_]*$/.test(k)) add('structure', `${l}: chave fora do padrão snake_case: "${k}"`);
    if (typeof v !== 'string') { add('structure', `${l}: "${k}" não é texto`); continue; }
    if (v.trim() === '') add('structure', `${l}: "${k}" vazio`);
    else if (v !== v.trim() && !/^\s|\s$/.test(STRINGS.pt[k] ?? '')) add('structure', `${l}: "${k}" com espaço sobrando nas pontas`);
    if (l !== 'pt' && typeof STRINGS.pt[k] === 'string' && ph(v) !== ph(STRINGS.pt[k])) add('structure', `${l}: "${k}" com marcadores ${ph(v) || '(nenhum)'} diferentes do pt ${ph(STRINGS.pt[k]) || '(nenhum)'}`);
  }
}
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
const used = new Set();
for (const p of walk(path.join(root, 'src'))) {
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+)'\s*\)/g)) used.add(m[1]);
  for (const m of t.matchAll(/(?:nameKey|labelKey|titleKey|descKey|textKey|offerTitleKey)\s*:\s*'([a-zA-Z0-9_]+)'/g)) used.add(m[1]);
}
for (const k of used) if (!(k in STRINGS.pt)) add('structure', `chave usada no código e inexistente: "${k}"`);

const total = Object.values(problems).reduce((a, x) => a + x.length, 0);
if (args.has('--json')) {
  console.log(JSON.stringify({ keys: union.size, languages: LANGS, files, problems, total }, null, 2));
} else {
  console.log(`Idiomas: ${LANGS.join(', ')}  ·  ${union.size} chaves  ·  ${files.length} arquivos de texto`);
  const names = { missing: 'Chaves faltando', duplicate: 'Chaves duplicadas', untranslated: 'Textos não traduzidos', structure: 'Problemas de estrutura' };
  for (const [k, list] of Object.entries(problems)) {
    console.log(`\n${names[k]}: ${list.length}`);
    for (const m of list.slice(0, 60)) console.log('  - ' + m);
    if (list.length > 60) console.log(`  ... e mais ${list.length - 60}`);
  }
  if (args.has('--unused')) {
    const unused = [...union].filter((k) => !used.has(k) && !files.some((f) => false));
    console.log(`\nChaves que nenhuma tela usa direto (informativo; podem ser montadas dinamicamente): ${unused.length}`);
  }
  console.log(`\n${total === 0 ? 'OK' : 'FALHOU'}: ${total} problemas`);
}
process.exit(total ? 1 : 0);
