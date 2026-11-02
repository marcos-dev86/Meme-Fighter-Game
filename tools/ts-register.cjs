/**
 * Loader mínimo para rodar os módulos TypeScript do jogo direto no Node, sem
 * Metro/Expo e sem adicionar dependências: usa o `typescript` que o projeto já
 * tem para transpilar cada .ts/.tsx na hora, entende o alias `@/` (= src/) e
 * troca imagens/áudios por um número qualquer (como o Metro faz).
 *
 * Serve para testar a lógica PURA do jogo (combate, itens, raridade, efeitos).
 * Módulos que dependem de react-native/expo (telas, AsyncStorage) NÃO carregam
 * aqui de propósito: o que depende da plataforma é testado no navegador.
 *
 * Uso: require('./ts-register.cjs') antes de dar require nos arquivos de src/.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const SRC = path.resolve(__dirname, '..', 'src');

const ASSET_RE = /\.(png|webp|jpe?g|gif|mp3|wav|ogg|m4a|ttf)$/i;
const ASSET_STUB = path.join(__dirname, 'asset-stub.cjs');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) request = path.join(SRC, request.slice(2));
  try {
    return originalResolve.call(this, request, parent, ...rest);
  } catch (err) {
    // Asset que não existe no disco (ex.: o repositório publicado está sem assets/legacy-*): vira um número, como no Metro.
    if (typeof request === 'string' && ASSET_RE.test(request)) return ASSET_STUB;
    throw err;
  }
};

function compile(module, filename) {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  module._compile(out.outputText, filename);
}
require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
for (const ext of ['.png', '.webp', '.jpg', '.jpeg', '.gif', '.mp3', '.wav', '.ogg', '.m4a', '.ttf']) {
  require.extensions[ext] = (module) => {
    module.exports = 1;
  };
}

module.exports = { SRC };
