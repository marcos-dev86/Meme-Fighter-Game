import type { CodeCutscene } from '../codeCutscenes';
import { L, act, lengthen, card, fig, me, npc, poses, say, walk } from './cutsceneKit';

/**
 * Cutscenes da campanha do GADIGAGO (código, sem vídeo). O protagonista usa `me('gadigago', ...)` (skin, chapéu e capa do
 * jogador) e fala como {player}. Todo texto é [pt, en, es, fr, ja]. Sem travessão.
 */
const P = '{player}';
const MAIOR_FA = L('Maior Fã', 'Biggest Fan', 'Mayor Fan', 'Plus Grand Fan', '最大のファン');
const DOGGE = L('Dogge', 'Dogge', 'Dogge', 'Dogge', 'ドッゲ');
const PIPOCA = L('Pipoca', 'Pipoca', 'Pipoca', 'Pipoca', 'ポポカ');
const BENTO = L('Vovô Bento', 'Grandpa Bento', 'Abuelo Bento', 'Papi Bento', 'ベント爺さん');
const IRACEMA = L('Dona Iracema', 'Mrs. Iracema', 'Doña Iracema', 'Madame Iracema', 'イラセマさん');

/** Ato 1: o envelope sob a estátua. */
const C1: CodeCutscene = {
  id: 'gad_c1_convite',
  characterId: 'gadigago',
  music: 'comic_hero',
  beats: [
    card('stage2_dusk', [me('gadigago', 0.4, { pose: 'idle' })], L('O CONVITE', 'THE INVITATION', 'LA INVITACIÓN', 'L’INVITATION', '招待状'), L('Sem remetente, sem endereço', 'No sender, no address', 'Sin remitente, sin dirección', 'Sans expéditeur, sans adresse', '差出人も宛先もない')),
    say('stage2_dusk', [me('gadigago', 0.38)], P, L('"Quatro mestres. Cinco provas. Um troféu." Quem mandaria isso para mim?', '"Four masters. Five trials. One trophy." Who would send this to me?', '"Cuatro maestros. Cinco pruebas. Un trofeo." ¿Quién me mandaría esto?', '« Quatre maîtres. Cinq épreuves. Un trophée. » Qui m’enverrait ça ?', '「4人の師匠、5つの試練、1つのトロフィー。」誰がこんなものを僕に？'), { shot: true }),
    say('stage2_dusk', [me('gadigago', 0.38), npc('c15', 0.74, { path: walk(1.0, 0.74, 1400), dir: 'left' })], PIPOCA, L('Você vai mesmo, né? Eu vi o envelope!', 'You are really going, right? I saw the envelope!', '¡Vas a ir de verdad, no? ¡Vi el sobre!', 'Tu y vas vraiment, hein ? J’ai vu l’enveloppe !', '本当に行くんでしょ？ 封筒、見たよ！')),
    say('stage2_dusk', [me('gadigago', 0.38), npc('c15', 0.74, { dir: 'left' })], P, L('Não conte para ninguém, Pipoca. Eu volto com o troféu.', 'Do not tell anyone, Pipoca. I will be back with the trophy.', 'No se lo cuentes a nadie, Pipoca. Volveré con el trofeo.', 'Ne le dis à personne, Pipoca. Je reviens avec le trophée.', '誰にも言わないでね、ポポカ。トロフィーを持って帰ってくる。')),
    say('stage2_dusk', [me('gadigago', 0.38), npc('c15', 0.74, { dir: 'left' })], PIPOCA, L('Eu não conto. Eu só... torço. Volta a tempo do meu aniversário, tá?', 'I will not tell. I will just... cheer. Be back for my birthday, okay?', 'No cuento. Solo... hincho por ti. Vuelve para mi cumpleaños, ¿vale?', 'Je ne dis rien. Je... t’encourage, c’est tout. Reviens pour mon anniversaire, d’accord ?', '言わないよ。応援するだけ。ぼくの誕生日までには帰ってきてね？'), { textFor: 5200 }),
    card('stage2_night', [me('gadigago', 0.5, { pose: 'walk', path: walk(0.3, 0.7, 4200) })], L('O ETERNO SEGUNDO', 'THE ETERNAL RUNNER-UP', 'EL ETERNO SEGUNDO', 'L’ÉTERNEL DEUXIÈME', '永遠の2位'), L('Hora de provar quem é o melhor', 'Time to prove who is the best', 'Hora de demostrar quién es el mejor', 'Il est temps de prouver qui est le meilleur', '誰が一番か証明するときだ'), { ms: 4600 }),
  ],
};

/** Ato 3: o espelho. */
const C2: CodeCutscene = {
  id: 'gad_c2_espelho',
  characterId: 'gadigago',
  music: 'medieval_library',
  beats: [
    card('stage4', [me('gadigago', 0.34, { pose: 'idle' }), fig('gadigago', 0.68, { flip: true, opacity: 0.55 })], L('O ESPELHO', 'THE MIRROR', 'EL ESPEJO', 'LE MIROIR', '鏡'), L('O único rival que nunca perde', 'The only rival who never loses', 'El único rival que nunca pierde', 'Le seul rival qui ne perd jamais', '決して負けない唯一のライバル'), { tint: 'rgba(90,40,120,0.35)' }),
    say('stage4', [me('gadigago', 0.34), fig('gadigago', 0.68, { flip: true, opacity: 0.55 })], L('Reflexo', 'Reflection', 'Reflejo', 'Reflet', '鏡の中の影'), L('Você não quer o título. Você quer que alguém olhe para você.', 'You do not want the title. You want someone to look at you.', 'No quieres el título. Quieres que alguien te mire.', 'Tu ne veux pas le titre. Tu veux que quelqu’un te regarde.', '君はタイトルが欲しいんじゃない。誰かに見てほしいだけだ。'), { tint: 'rgba(90,40,120,0.35)', shot: true }),
    say('stage4', [me('gadigago', 0.34), fig('gadigago', 0.68, { flip: true, opacity: 0.55 })], P, L('Eu perdi tantas vezes que passei a contar as derrotas num caderno.', 'I lost so many times that I started counting the defeats in a notebook.', 'Perdí tantas veces que empecé a contar las derrotas en un cuaderno.', 'J’ai perdu tant de fois que j’ai commencé à compter les défaites dans un cahier.', '何度も負けたから、負けた数をノートに書くようになった。'), { tint: 'rgba(90,40,120,0.35)' }),
    act('stage4', [me('gadigago', 0.34, { pose: 'strong', poses: poses([0, 'idle'], [900, 'strong'], [1700, 'idle']) }), fig('gadigago', 0.68, { flip: true, opacity: 0.55, pose: 'hurt', poses: poses([900, 'hurt'], [1500, 'ko']), fades: [{ t: 0, a: 0.55 }, { t: 1500, a: 0.55 }, { t: 3600, a: 0 }] })], 3800, { fx: ['flash'], tint: 'rgba(90,40,120,0.35)', sfx: [{ key: 'hit_heavy', at: 900, vol: 0.9 }] }),
    say('stage4', [me('gadigago', 0.34)], P, L('Chega de contar. Hora de voltar para casa.', 'No more counting. Time to go home.', 'Se acabó contar. Hora de volver a casa.', 'Assez compté. Il est temps de rentrer.', 'もう数えるのはやめだ。家に帰る時間だ。')),
    say('stage2_dusk', [me('gadigago', 0.34), fig('dogge', 0.7, { flip: true, path: walk(1.05, 0.7, 1600) })], DOGGE, L('Sem plateia. Só nós dois. Aquele duelo que a gente nunca terminou.', 'No audience. Just the two of us. The duel we never finished.', 'Sin público. Solo nosotros dos. Ese duelo que nunca terminamos.', 'Sans public. Juste nous deux. Ce duel qu’on n’a jamais terminé.', '観客はなし。僕たち二人だけ。終わらなかったあの決闘だ。'), { shot: true, textFor: 5200 }),
  ],
};

/** Ato 4: quem ficou esperando. */
const C3: CodeCutscene = {
  id: 'gad_c3_praca_vazia',
  characterId: 'gadigago',
  music: 'medieval_library',
  beats: [
    card('stage2_dusk', [me('gadigago', 0.5, { pose: 'walk', path: walk(0.15, 0.5, 4500) })], L('A PRAÇA VAZIA', 'THE EMPTY PLAZA', 'LA PLAZA VACÍA', 'LA PLACE VIDE', '誰もいない広場'), L('Quem ficou esperando?', 'Who stayed waiting?', '¿Quién se quedó esperando?', 'Qui est resté à attendre ?', '待っていたのは誰？'), { ms: 4800 }),
    say('stage2_dusk', [me('gadigago', 0.3), npc('c09', 0.62, { dir: 'left' })], IRACEMA, L('O cachecol ficou pronto no inverno. Agora já é verão. Mas serve, olhe.', 'The scarf was ready in winter. Now it is summer. But it fits, look.', 'La bufanda estuvo lista en invierno. Ahora es verano. Pero te queda bien, mira.', 'L’écharpe était prête en hiver. Maintenant c’est l’été. Mais elle te va, regarde.', 'マフラーは冬にできたの。もう夏だけど、ほら、ちゃんと似合うわ。'), { shot: true }),
    say('stage2_dusk', [me('gadigago', 0.3), npc('c08', 0.62, { dir: 'left' })], BENTO, L('O chá esfriou duas vezes. Esquentei de novo. Esse troféu que te prometeram nunca existiu, meu jovem.', 'The tea went cold twice. I warmed it up again. That trophy they promised you never existed, my boy.', 'El té se enfrió dos veces. Lo calenté otra vez. Ese trofeo que te prometieron nunca existió, muchacho.', 'Le thé a refroidi deux fois. Je l’ai réchauffé. Ce trophée qu’on t’a promis n’a jamais existé, mon garçon.', 'お茶は二度冷めて、また温め直したよ。約束されたそのトロフィーは、最初から存在しなかったのさ。'), { textFor: 6200 }),
    say('stage2_dusk', [me('gadigago', 0.3), npc('c15', 0.62, { dir: 'left' })], PIPOCA, L('Perdeu meu aniversário. Tudo bem. A pipa quebrou também.', 'You missed my birthday. It is okay. The kite broke too.', 'Te perdiste mi cumpleaños. No pasa nada. La cometa también se rompió.', 'Tu as raté mon anniversaire. C’est pas grave. Le cerf-volant s’est cassé aussi.', '誕生日、来なかったね。いいよ。凧も壊れちゃった。')),
    say('stage2_dusk', [me('gadigago', 0.3, { pose: 'hurt' })], P, L('Eu... eu perdi tudo isso correndo atrás de um papel.', 'I... I lost all of this running after a piece of paper.', 'Yo... perdí todo esto corriendo tras un papel.', 'J’ai... j’ai tout perdu en courant après un bout de papier.', '僕は……一枚の紙を追いかけて、全部なくしてた。')),
    act('stage2_night', [me('gadigago', 0.3), fig('ninja', 0.86, { flip: true, opacity: 0.55, fades: [{ t: 0, a: 0 }, { t: 1500, a: 0.55 }, { t: 3600, a: 0.55 }] })], 4200, { shot: true, tint: 'rgba(20,10,50,0.45)', sfx: [{ key: 'encounter', at: 1200, vol: 0.4 }] }),
    say('stage2_night', [me('gadigago', 0.3), fig('ninja', 0.86, { flip: true, opacity: 0.55 })], P, L('Quem aplaudia as minhas lutas lá do fundo, de dentro de um capuz...', 'Whoever clapped at my fights from the back, inside a hood...', 'Quien aplaudía mis peleas desde el fondo, dentro de una capucha...', 'Celui qui applaudissait mes combats au fond, sous une capuche...', '後ろの方で、フードの中から僕の戦いに拍手していたのは……'), { tint: 'rgba(20,10,50,0.45)' }),
  ],
};

/** Ato 5: o clímax contra o Maior Fã. */
const C4: CodeCutscene = {
  id: 'gad_c4_fa',
  characterId: 'gadigago',
  music: 'goblin_king',
  beats: [
    act('stage2_night', [me('gadigago', 0.34, { pose: 'strong', poses: poses([0, 'idle'], [700, 'strong'], [1500, 'idle']) }), fig('ninja', 0.68, { flip: true, pose: 'hurt', poses: poses([700, 'hurt'], [2600, 'ko']) })], 4600, { shot: true, fx: ['shake'], tint: 'rgba(20,10,50,0.35)', effects: [{ name: 'hit_strong', t: 700, x: 0.52, y: 0.6, size: 0.45 }], sfx: [{ key: 'hit_heavy', at: 700, vol: 0.9 }, { key: 'landing', at: 2600, vol: 0.7 }] }),
    say('stage2_night', [me('gadigago', 0.34), fig('ninja', 0.68, { flip: true, pose: 'hurt' })], MAIOR_FA, L('Sem rivalidade não há ingresso. Sem ingresso, não há aplauso. E sem aplauso, quem é você?', 'No rivalry, no tickets. No tickets, no applause. And without applause, who are you?', 'Sin rivalidad no hay entradas. Sin entradas, no hay aplausos. Y sin aplausos, ¿quién eres?', 'Sans rivalité, pas de billets. Sans billets, pas d’applaudissements. Et sans applaudissements, qui es-tu ?', 'ライバル関係がなければチケットはない。チケットがなければ拍手もない。拍手がなければ、君は誰だ？'), { tint: 'rgba(20,10,50,0.35)', textFor: 6200 }),
    say('stage2_night', [me('gadigago', 0.34), fig('ninja', 0.68, { flip: true, pose: 'hurt' })], P, L('Alguém que perdeu o aniversário do Pipoca. É isso que eu sou.', 'Someone who missed Pipoca’s birthday. That is who I am.', 'Alguien que se perdió el cumpleaños de Pipoca. Eso soy.', 'Quelqu’un qui a raté l’anniversaire de Pipoca. Voilà ce que je suis.', 'ポポカの誕生日に行けなかった男。それが僕だ。'), { tint: 'rgba(20,10,50,0.35)' }),
    say('stage2_night', [me('gadigago', 0.34), fig('ninja', 0.68, { flip: true })], MAIOR_FA, L('Assine aqui: cadeira cativa no espetáculo, para sempre. Você vira o astro. Eu continuo seu maior fã.', 'Sign here: a reserved seat in the show, forever. You become the star. I stay your biggest fan.', 'Firma aquí: asiento reservado en el espectáculo, para siempre. Tú eres el astro. Yo sigo siendo tu mayor fan.', 'Signe ici : place réservée dans le spectacle, pour toujours. Tu deviens la star. Je reste ton plus grand fan.', 'ここにサインを。ショーの永久指定席だ。君はスターになり、私は君の最大のファンのままだ。'), { tint: 'rgba(20,10,50,0.35)', textFor: 6500 }),
    card('stage2_night', [me('gadigago', 0.34), fig('ninja', 0.68, { flip: true, opacity: 0.6, fades: [{ t: 0, a: 0.6 }, { t: 4200, a: 0 }] })], L('O CONTRATO', 'THE CONTRACT', 'EL CONTRATO', 'LE CONTRAT', '契約書'), L('Como termina uma rivalidade?', 'How does a rivalry end?', '¿Cómo termina una rivalidad?', 'Comment se termine une rivalité ?', 'ライバル関係はどう終わる？'), { ms: 5000 }),
  ],
};

/** Final A: o troféu que ninguém entrega. */
const END_A: CodeCutscene = {
  id: 'gad_end_a',
  characterId: 'gadigago',
  music: 'comic_hero',
  beats: [
    act('stage2', [me('gadigago', 0.34), fig('ninja', 0.7, { flip: true, fades: [{ t: 0, a: 1 }, { t: 3600, a: 0 }] })], 4200, { shot: true, tint: 'rgba(255,230,160,0.1)', fx: ['flash'], sfx: [{ key: 'teleport', at: 800, vol: 0.5 }] }),
    say('stage2', [me('gadigago', 0.34)], P, L('Só uma moldura vazia, pendurada por mim mesmo. Que boba, essa minha pressa.', 'Just an empty frame, hung up by myself. How silly, all this hurry of mine.', 'Solo un marco vacío, colgado por mí mismo. Qué tonta, esta prisa mía.', 'Juste un cadre vide, accroché par moi-même. Quelle bêtise, toute cette hâte.', '空っぽの額縁、自分で掛けたやつだけ。僕の焦りって、ほんとバカみたいだ。')),
    say('stage2', [me('gadigago', 0.34), fig('dogge', 0.72, { flip: true, path: walk(1.05, 0.72, 1800) })], DOGGE, L('Cheguei atrasado. Trouxe a Pipoca e a pipa consertada.', 'I am late. I brought Pipoca and the fixed kite.', 'Llegué tarde. Traje a Pipoca y la cometa arreglada.', 'Je suis en retard. J’ai amené Pipoca et le cerf-volant réparé.', '遅れてごめん。ポポカと、直した凧を連れてきた。'), { shot: true }),
    act('stage2', [me('gadigago', 0.4, { poses: poses([0, 'idle'], [1000, 'flash'], [1800, 'idle']) }), fig('dogge', 0.6, { flip: true, poses: poses([0, 'idle'], [1000, 'flash'], [1800, 'idle']) }), npc('c15', 0.5, { y: 0.6, h: 1.5 })], 3600, { effects: [{ name: 'hit_flash', t: 1000, x: 0.5, y: 0.6, size: 0.4 }], sfx: [{ key: 'hit_flesh', at: 1000, vol: 0.7 }] }),
    say('stage2', [me('gadigago', 0.34), fig('dogge', 0.66, { flip: true }), npc('c08', 0.5, { y: 0.7 })], BENTO, L('Verdadeiro Meme Fighter: quem aparece quando alguém precisa. Está escrito no caderno da praça.', 'True Meme Fighter: whoever shows up when someone needs them. It is written in the plaza notebook.', 'Verdadero Meme Fighter: quien aparece cuando alguien lo necesita. Está escrito en el cuaderno de la plaza.', 'Vrai Meme Fighter : celui qui est là quand on a besoin de lui. C’est écrit dans le cahier de la place.', '真のミームファイターとは、誰かが必要なときに現れる者。広場のノートに書いてあるよ。'), { textFor: 6500 }),
    card('stage2', [me('gadigago', 0.34), fig('dogge', 0.66, { flip: true })], L('O TROFÉU QUE NINGUÉM ENTREGA', 'THE TROPHY NOBODY HANDS OUT', 'EL TROFEO QUE NADIE ENTREGA', 'LE TROPHÉE QUE PERSONNE NE REMET', '誰も渡さないトロフィー'), L('A rivalidade continua, com hora marcada e lanche', 'The rivalry goes on, with a set time and a snack', 'La rivalidad continúa, con hora fija y merienda', 'La rivalité continue, avec horaire et goûter', 'ライバル関係は続く。時間と、おやつ付きで')),
  ],
};

/** Final B: a revanche sem plateia. */
const END_B: CodeCutscene = {
  id: 'gad_end_b',
  characterId: 'gadigago',
  music: 'medieval_library',
  beats: [
    card('stage2_night', [me('gadigago', 0.4, { pose: 'idle' })], L('A REVANCHE SEM PLATEIA', 'THE REMATCH WITHOUT AN AUDIENCE', 'LA REVANCHA SIN PÚBLICO', 'LA REVANCHE SANS PUBLIC', '観客のいない再戦'), L('Venceu. E agora?', 'He won. And now?', 'Ganó. ¿Y ahora?', 'Il a gagné. Et maintenant ?', '勝った。それで、どうする？'), { tint: 'rgba(10,10,40,0.5)' }),
    act('stage2_night', [me('gadigago', 0.4), npc('c15', 0.62, { dir: 'left', y: 0.76, h: 1.4 })], 4600, { tint: 'rgba(10,10,40,0.5)', shot: true }),
    say('stage2_night', [me('gadigago', 0.4), npc('c15', 0.62, { dir: 'left', y: 0.76, h: 1.4 })], P, L('Todos foram para casa. Só sobrou o menino, dormindo na escada.', 'Everyone went home. Only the boy is left, sleeping on the stairs.', 'Todos se fueron a casa. Solo queda el niño, durmiendo en la escalera.', 'Tout le monde est rentré. Il ne reste que le garçon, endormi sur l’escalier.', 'みんな家に帰った。残ったのは、階段で眠る男の子だけ。'), { tint: 'rgba(10,10,40,0.5)' }),
    say('stage2_night', [me('gadigago', 0.5, { path: walk(0.4, 0.5, 1800), pose: 'walk' }), npc('c15', 0.62, { dir: 'left', y: 0.76, h: 1.4 })], P, L('Vencer sozinho tem gosto de vazio. Amanhã eu ligo para o Dogge.', 'Winning alone tastes like emptiness. Tomorrow I will call Dogge.', 'Ganar solo sabe a vacío. Mañana llamaré a Dogge.', 'Gagner seul a un goût de vide. Demain, j’appelle Dogge.', 'ひとりで勝つのは空っぽの味だ。明日、ドッゲに電話しよう。'), { tint: 'rgba(10,10,40,0.5)', textFor: 6200 }),
    card('stage2_night', [me('gadigago', 0.5), npc('c15', 0.62, { dir: 'left', y: 0.76, h: 1.4 })], L('A REVANCHE SEM PLATEIA', 'THE REMATCH WITHOUT AN AUDIENCE', 'LA REVANCHA SIN PÚBLICO', 'LA REVANCHE SANS PUBLIC', '観客のいない再戦'), L('Um final agridoce', 'A bittersweet ending', 'Un final agridulce', 'Une fin douce-amère', 'ほろ苦い結末'), { tint: 'rgba(10,10,40,0.6)', ms: 4800 }),
  ],
};

/** Final C: o espetáculo continua. */
const END_C: CodeCutscene = {
  id: 'gad_end_c',
  characterId: 'gadigago',
  music: 'goblin_king',
  beats: [
    card('stage2', [me('gadigago', 0.5, { pose: 'strong' }), fig('soldier', 0.15, { h: 0.34 }), fig('orc', 0.28, { h: 0.34 }), fig('ninja', 0.82, { flip: true, h: 0.34 }), fig('dogking', 0.92, { flip: true, h: 0.34 })], L('O ESPETÁCULO CONTINUA', 'THE SHOW GOES ON', 'EL ESPECTÁCULO CONTINÚA', 'LE SPECTACLE CONTINUE', 'ショーは続く'), L('A praça nunca esteve tão cheia', 'The plaza has never been so full', 'La plaza nunca estuvo tan llena', 'La place n’a jamais été aussi pleine', '広場はこれほど賑わったことがない'), { tint: 'rgba(255,170,40,0.14)' }),
    say('stage2', [me('gadigago', 0.5, { pose: 'strong' }), fig('soldier', 0.15, { h: 0.34 }), fig('orc', 0.28, { h: 0.34 }), fig('ninja', 0.82, { flip: true, h: 0.34 }), fig('dogking', 0.92, { flip: true, h: 0.34 })], P, L('Ingressos, torcida, bonés. Todo mundo me olha. É isso que eu queria, não é?', 'Tickets, cheering, caps. Everyone looks at me. This is what I wanted, right?', 'Entradas, hinchada, gorras. Todos me miran. Esto era lo que quería, ¿no?', 'Billets, supporters, casquettes. Tout le monde me regarde. C’est ce que je voulais, non ?', 'チケット、応援、帽子。みんなが僕を見ている。これが欲しかったんだよね？'), { shot: true, tint: 'rgba(255,170,40,0.14)', textFor: 6200 }),
    act('stage2', [me('gadigago', 0.5, { pose: 'strong' }), fig('dogge', 0.8, { flip: true, path: walk(1.08, 0.8, 2200) })], 5200, { tint: 'rgba(255,170,40,0.14)', shot: true }),
    say('stage2', [me('gadigago', 0.5), fig('dogge', 0.8, { flip: true })], DOGGE, L('...', '...', '...', '...', '……'), { tint: 'rgba(255,170,40,0.14)', ms: 4200 }),
    card('stage2_night', [me('gadigago', 0.5)], L('O ESPETÁCULO CONTINUA', 'THE SHOW GOES ON', 'EL ESPECTÁCULO CONTINÚA', 'LE SPECTACLE CONTINUE', 'ショーは続く'), L('O título é dele. O resto, não.', 'The title is his. The rest is not.', 'El título es suyo. Lo demás, no.', 'Le titre est à lui. Le reste, non.', '称号は彼のもの。それ以外は、違う。'), { tint: 'rgba(30,0,40,0.6)', ms: 5200 }),
  ],
};

export const GADIGAGO_CUTSCENES: CodeCutscene[] = [C1, C2, C3, C4, lengthen(END_A), lengthen(END_B), lengthen(END_C)];
