# Checklist do APK / lançamento

Conferido contra `app.json`, `eas.json` e `package.json` deste repositório.

## O que já está certo
- [x] Nome "Meme Fighter", slug `Meme-Fighter`, versão `1.0.0`, orientação `landscape`.
- [x] `android.package` = `com.marcosros4.memefighterrpg`; ícone adaptativo (primeiro plano, fundo e monocromático) configurado.
- [x] `eas.json` com perfis `development`, `preview` e `production` (`appVersionSource: remote`, `autoIncrement` na produção).
- [x] Dependências nativas (SDK 57): `expo-video` ~57.0.2 (não é mais usado: as cutscenes são por código; pode ser removido com `npm uninstall expo-video`), `expo-audio` ~57.0.5 (música, sons e ambientes), `expo-haptics` ~57.0.3 (vibração), `react-native-reanimated` 4.5.1 + `react-native-worklets` 0.10.1, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `expo-image`, `expo-font`, `expo-splash-screen`. React Compiler ligado (`experiments.reactCompiler`). Nenhuma dependência tem plugin de configuração no `app.json` além de `expo-router` e `expo-splash-screen`.
- [x] `npx tsc --noEmit` limpo e `npm test` sem falhas novas (4 arquivos antigos de teste falham desde antes da revisão de novembro de 2026: lista em `docs/TESTES.md`).
- [x] Saves antigos migram sem erro (`tests/unit/conta/saves-antigos.test.mjs`).

## Conferências de build (por escrito; só o build real confirma)
- Versão `1.0.0` em `app.json` e `package.json`; nome exibido **Meme Fighter**; pacote `com.marcosros4.memefighterrpg`; `appVersionSource: remote` com `autoIncrement` na produção.
- **Expo Audio**: o jogo troca de música, ambientes e efeitos por `createAudioPlayer`; ao pausar, ambientes e sons pausam e a música continua. Conferir no aparelho: o som sai com o volume de mídia, o AMBIENTE respeita o controle, e os loops de 16 s não "estalam" na emenda.
- **Expo Haptics**: vibração nos golpes, baús e nível. Conferir no aparelho (o emulador não vibra) e que a opção RESPOSTA TÁTIL desliga.
- Rode `npx expo-doctor` e `npx expo install --check` antes do build (precisam de internet; não foram executados aqui).
- Opções gráficas (Opções > Geral): MODO LEVE, PARTÍCULAS DO CLIMA, ONDAS ANIMADAS e ESCURECER À NOITE; testar em aparelho fraco com e sem.

## Fazer ANTES de gerar o APK
1. **Perfil `preview` = APK (já ajustado em `eas.json`).** Segundo a documentação do Expo, o formato padrão do Android é AAB (pacote da Play Store); o APK vem de `android.buildType: "apk"`. O `preview` agora tem isso:
   ```json
   "preview": { "distribution": "internal", "android": { "buildType": "apk" } }
   ```
   Depois: `eas build -p android --profile preview`. O perfil `production` (sem opções) gera AAB, o formato da Play Store.
2. **Tamanho:** os assets somam ~46 MB (áudio ~31 MB, sprites ~5 MB, cenários ~1 MB); as cutscenes não têm mais vídeos (eram ~76 MB), então o APK ficou bem menor. Conferir o tamanho depois do primeiro build.
3. **Testar num aparelho Android de verdade** (nada disso foi testado fora do navegador): cutscenes por código (movimento suave, fala, pular, skin e chapéu aparecendo, apelido nas falas, cena de subir de nível em chãos diferentes), partículas dos fundos de menu e o pulo sobre pedras e inimigos,
   áudio (música, sons e os ambientes por região, dia/noite e transições), vibração, toque duplo para dash, seleção do Versus com dois toques, tela VS,
   desempenho da luta e do mundo em aparelho fraco (com as opções gráficas), pausa e retomada, salvar/carregar os 3 slots.
4. **Script `lint`:** `package.json` tem `"lint": "expo lint"`, mas não há ESLint nas dependências. Rode `npx expo lint` uma vez (ele oferece instalar)
   ou remova o script.
5. **Versão e ícones:** confira `version`, o ícone (`assets/images/icon.png`) e a tela de abertura (`splash-icon.png`) antes de publicar.
6. **Assinatura:** o EAS gera e guarda a chave (keystore) na primeira build de produção; guarde o backup (`eas credentials`). Arquivos `*.jks` ficam no `.gitignore`.
7. **Política de privacidade / classificação etária** (Play Console): o jogo não tem conta online, rede nem anúncios; tudo é salvo no aparelho.

## Comandos
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # APK para testar
eas build -p android --profile production   # AAB para a Play Store
```
