# Testes

## Organização
```
tests/
  rodar-todos.mjs        corredor com resumo por categoria (npm test)
  _support/              ts-register.cjs (transpila TypeScript no Node) e asset-stub.cjs
  unit/<categoria>/      lógica no Node, arquivos *.test.mjs (node:test)
  e2e/<categoria>/       navegador (Playwright), arquivos *.e2e.mjs
  assets/                sprites-legados.test.py
```
Categorias de `unit`: combate, habilidades, historia, mundo, cassino, mar, versus, conta, itens, sistema.

## Rodando
```bash
npm test                                   # todos
node tests/rodar-todos.mjs mundo habilidades
node tests/unit/historia/cutscenes.test.mjs   # um arquivo
```
Os e2e precisam de `npx expo export --platform web --output-dir dist` e Playwright (cabeçalho de cada arquivo).

## Escrevendo testes novos
- Carregue o TypeScript com `require('../../_support/ts-register.cjs')` e depois `require('../../../src/...ts')`.
- Módulos que importam `react-native` (direta ou indiretamente, como `collision.ts`) precisam do stub de `Module._load` usado em
  `tests/unit/mar/travessia-completa.test.mjs` e `tests/unit/mundo/movimento-pulo-e-estruturas.test.mjs`.
- Para ler código-fonte (conferir ligações): `fs.readFileSync(new URL('../../../src/...', import.meta.url))`.
- Regras que os testes de dados já impõem: texto de cutscene com tradução (en, es, fr, ja) e os mesmos `{marcadores}`, nenhum
  travessão, sons e ícones que existem, personagens com sprite.

## Falhas conhecidas (anteriores à revisão de novembro de 2026)
`unit/combate/revanche` (2), `unit/conta/conta-perfil-e-conquistas` (1), `unit/historia/sahur-vulcao-e-sprites-novos` (1),
`unit/historia/vida-persistente-armaduras-e-npcs` (1) e `assets/sprites-legados.test.py` (procura `LEGACY_ASPECTS`, que não
existe mais). São testes desatualizados em relação ao jogo; corrija-os ou apague-os com decisão consciente.

## O que os testes NÃO cobrem
Nada aqui roda em aparelho: sensação do pulo e da movimentação, desempenho das partículas, layout em celulares reais e áudio
precisam de teste manual (veja `docs/APK_CHECKLIST.md`).
