import type { CodeCutscene } from '../codeCutscenes';
import { L, act, lengthen, card, fig, me, npc, poses, say, walk } from './cutsceneKit';

/**
 * Cutscenes da campanha do ORC (código, sem vídeo). O protagonista usa `me('orc', ...)` (skin, chapéu e capa do jogador) e
 * fala como {player}. Todo texto é [pt, en, es, fr, ja]. Sem travessão.
 */
const P = '{player}';
const FERRO = L('Capitão Ferro', 'Captain Ferro', 'Capitán Ferro', 'Capitaine Ferro', 'フェロ隊長');
const TICO = L('Irmão Tico', 'Brother Tico', 'Hermano Tico', 'Frère Tico', 'ティコ修道士');
const GROSH = L('Grosh', 'Grosh', 'Grosh', 'Grosh', 'グロッシュ');
const FOOTMAN = L('Footman', 'Footman', 'Footman', 'Footman', 'フットマン');
const BARQUEIRO = L('Barqueiro', 'Ferryman', 'Barquero', 'Passeur', '船頭');

const TICO_NPC = (x: number) => npc('c05', x, { dir: 'left' });

/** Ato 1: a ordem do dia e a bênção. */
const C1: CodeCutscene = {
  id: 'orc_c1_sentido',
  characterId: 'orc',
  music: 'mountain_pass',
  beats: [
    card('stage10', [me('orc', 0.34, { pose: 'idle' }), fig('soldier', 0.7, { flip: true })], L('SENTIDO!', 'ATTENTION!', '¡FIRMES!', 'GARDE-À-VOUS !', '気をつけ！'), L('Mais uma manhã na Legião Cinzenta', 'Another morning in the Grey Legion', 'Otra mañana en la Legión Gris', 'Un autre matin dans la Légion Grise', '灰色の軍団のいつもの朝')),
    say('stage10', [me('orc', 0.34), fig('soldier', 0.7, { flip: true })], FERRO, L('Missão do dia, soldado: confiscar suprimentos em nome da Legião. O mandado está assinado.', 'Mission of the day, soldier: confiscate supplies in the name of the Legion. The warrant is signed.', 'Misión del día, soldado: confiscar suministros en nombre de la Legión. La orden está firmada.', 'Mission du jour, soldat : confisquer des provisions au nom de la Légion. Le mandat est signé.', '今日の任務だ、兵士。軍団の名において物資を徴収せよ。令状には署名済みだ。'), { shot: true, textFor: 6000 }),
    say('stage10', [me('orc', 0.34), fig('soldier', 0.7, { flip: true })], P, L('Sim, senhor. Sem perguntas, senhor.', 'Yes, sir. No questions, sir.', 'Sí, señor. Sin preguntas, señor.', 'Oui, chef. Sans poser de questions, chef.', 'はい、隊長。質問はありません。')),
    say('stage10', [me('orc', 0.34), TICO_NPC(0.62)], TICO, L('Que a ronda seja leve, meu filho. E lembre: quem carrega peso demais esquece por que carrega.', 'May the patrol be light, my son. And remember: whoever carries too much weight forgets why they carry it.', 'Que la ronda sea ligera, hijo mío. Y recuerda: quien carga demasiado peso olvida por qué lo carga.', 'Que la ronde soit légère, mon fils. Et souviens-toi : qui porte trop de poids oublie pourquoi il le porte.', '見回りが軽いものでありますように、我が子よ。そして覚えておきなさい。重荷を負いすぎる者は、なぜ負っているのかを忘れる。'), { shot: true, textFor: 6800 }),
    say('stage10', [me('orc', 0.34), TICO_NPC(0.62)], P, L('Eu nunca entendi essa frase, irmão. Mas gosto de ouvir.', 'I never understood that sentence, brother. But I like hearing it.', 'Nunca entendí esa frase, hermano. Pero me gusta oírla.', 'Je n’ai jamais compris cette phrase, frère. Mais j’aime l’entendre.', 'その言葉の意味はわからないよ、修道士。でも聞くのは好きだ。')),
    card('stage10', [me('orc', 0.5, { pose: 'walk', path: walk(0.2, 0.6, 4500) })], L('FARDA CINZENTA', 'GREY UNIFORM', 'UNIFORME GRIS', 'UNIFORME GRIS', '灰色の軍服'), L('Sopa quente e nenhuma pergunta', 'Hot soup and no questions', 'Sopa caliente y ninguna pregunta', 'De la soupe chaude et aucune question', '温かいスープと、質問のない日々'), { ms: 4800 }),
  ],
};

/** Ato 3: a farda no chão. */
const C2: CodeCutscene = {
  id: 'orc_c2_farda',
  characterId: 'orc',
  music: 'open_ocean',
  ambient: 'waves',
  beats: [
    card('stage11', [me('orc', 0.4, { pose: 'idle' }), fig('dogking', 0.72, { flip: true })], L('A FARDA NO CHÃO', 'THE UNIFORM ON THE GROUND', 'EL UNIFORME EN EL SUELO', 'L’UNIFORME PAR TERRE', '地面の軍服'), L('Terceira ordem: ossos dos cães', 'Third order: the dogs’ bones', 'Tercera orden: los huesos de los perros', 'Troisième ordre : les os des chiens', '三つ目の命令：犬たちの骨')),
    say('stage11', [me('orc', 0.38), fig('dogking', 0.7, { flip: true })], FOOTMAN, L('Requisitar ossos? Pense bem, grandalhão. Ordem sem pergunta é só peso nas costas.', 'Requisition bones? Think hard, big guy. An order with no question is just weight on your back.', '¿Requisar huesos? Piénsalo bien, grandote. Una orden sin pregunta es solo peso en la espalda.', 'Réquisitionner des os ? Réfléchis bien, mon grand. Un ordre sans question n’est qu’un poids sur le dos.', '骨を徴収する？ よく考えろよ、大男。疑わない命令は背中の重荷にすぎない。'), { shot: true, textFor: 6200 }),
    act('stage11', [me('orc', 0.38, { pose: 'idle' }), fig('dogking', 0.7, { flip: true })], 4200, { shot: true, icons: [{ name: 'hat_iron', x: 0.3, y: 0.78, size: 64 }], sfx: [{ key: 'landing', at: 1400, vol: 0.6 }] }),
    say('stage11', [me('orc', 0.38), fig('dogking', 0.7, { flip: true })], P, L('Minha mãe dizia: "Não precisa ser forte, precisa ser decente." Eu escolhi a farda errada.', 'My mother used to say: "You do not have to be strong, you have to be decent." I picked the wrong uniform.', 'Mi madre decía: "No hace falta ser fuerte, hace falta ser decente." Elegí el uniforme equivocado.', 'Ma mère disait : « Pas besoin d’être fort, il faut être décent. » J’ai choisi le mauvais uniforme.', '母さんは言っていた。「強くなくていい、立派でありなさい。」俺は間違った軍服を選んだ。'), { icons: [{ name: 'hat_iron', x: 0.3, y: 0.78, size: 64 }], textFor: 6800 }),
    say('stage11', [me('orc', 0.38), npc('c13', 0.7, { dir: 'left' })], BARQUEIRO, L('Sem a farda? Deixa eu adivinhar: a ordem pesou. Entra no barco. Hoje a passagem é por minha conta.', 'No uniform? Let me guess: the order got heavy. Get in the boat. The fare is on me today.', '¿Sin uniforme? Déjame adivinar: la orden pesó. Sube al barco. Hoy el pasaje corre por mi cuenta.', 'Sans uniforme ? Laisse-moi deviner : l’ordre a pesé. Monte dans le bateau. Aujourd’hui, le passage est pour moi.', '軍服がない？ 当ててやろう、命令が重くなったんだな。乗りな。今日の運賃はおれ持ちだ。'), { shot: true, textFor: 6800 }),
    card('stage11', [me('orc', 0.5, { pose: 'walk', path: walk(0.3, 0.7, 4200) })], L('DESERTOR', 'DESERTER', 'DESERTOR', 'DÉSERTEUR', '脱走兵'), L('Agora é preciso consertar o quebrado', 'Now the broken things need fixing', 'Ahora hay que arreglar lo roto', 'Maintenant il faut réparer ce qui est cassé', '今度は、壊れたものを直す番だ'), { ms: 4600 }),
  ],
};

/** Ato 5: a volta ao acampamento. */
const C3: CodeCutscene = {
  id: 'orc_c3_volta',
  characterId: 'orc',
  music: 'mountain_pass',
  beats: [
    card('stage10_dusk', [me('orc', 0.5, { pose: 'walk', path: walk(0.1, 0.45, 4400) })], L('DE VOLTA SEM FARDA', 'BACK WITHOUT A UNIFORM', 'DE VUELTA SIN UNIFORME', 'DE RETOUR SANS UNIFORME', '軍服なしで帰還'), L('O acampamento parece menor', 'The camp seems smaller', 'El campamento parece más pequeño', 'Le camp semble plus petit', '野営地が小さく見える'), { ms: 4800 }),
    say('stage10_dusk', [me('orc', 0.32), TICO_NPC(0.6)], TICO, L('Você voltou. E sem a farda. Eu sabia. Agora ajude os outros a lembrarem por que carregam o que carregam.', 'You came back. And without the uniform. I knew it. Now help the others remember why they carry what they carry.', 'Volviste. Y sin uniforme. Lo sabía. Ahora ayuda a los demás a recordar por qué cargan lo que cargan.', 'Tu es revenu. Et sans uniforme. Je le savais. Maintenant aide les autres à se rappeler pourquoi ils portent ce qu’ils portent.', '戻ったか。軍服なしで。わかっていたよ。今度は他の者たちが、なぜ重荷を背負うのか思い出す手伝いをしなさい。'), { shot: true, tint: 'rgba(255,150,60,0.18)', textFor: 6800 }),
    say('stage10_dusk', [me('orc', 0.32), fig('orc', 0.66, { flip: true })], GROSH, L('Eu vi o que a Legião fez e fiquei calado. Obedecer não é estar certo, não é? Droga. Eu devia ter dito antes.', 'I saw what the Legion did and kept quiet. Obeying is not being right, is it? Damn it. I should have said so earlier.', 'Vi lo que hizo la Legión y me quedé callado. Obedecer no es tener razón, ¿verdad? Maldición. Debí decirlo antes.', 'J’ai vu ce que la Légion a fait et je me suis tu. Obéir, ce n’est pas avoir raison, n’est-ce pas ? Zut. J’aurais dû le dire plus tôt.', '軍団がしたことを見て、黙っていた。従うことは正しいことじゃないんだな。くそ、もっと早く言うべきだった。'), { tint: 'rgba(255,150,60,0.18)', textFor: 6800 }),
    act('stage10_dusk', [me('orc', 0.32), fig('orc', 0.66, { flip: true }), fig('soldier', 0.9, { flip: true, opacity: 0.8, fades: [{ t: 0, a: 0 }, { t: 1600, a: 0.8 }, { t: 4200, a: 0.8 }] })], 4400, { tint: 'rgba(255,150,60,0.18)', sfx: [{ key: 'encounter', at: 1200, vol: 0.4 }] }),
    say('stage10_dusk', [me('orc', 0.32), fig('soldier', 0.7, { flip: true })], FERRO, L('O regulamento é claro. Só um duelo comigo dispensa um soldado com honra. Em posição.', 'The regulations are clear. Only a duel with me discharges a soldier with honor. Take position.', 'El reglamento es claro. Solo un duelo conmigo da de baja a un soldado con honor. En posición.', 'Le règlement est clair. Seul un duel avec moi congédie un soldat avec honneur. En position.', '規則は明確だ。私との決闘だけが、兵士を名誉ある除隊にできる。構えろ。'), { shot: true, tint: 'rgba(255,150,60,0.18)', textFor: 6200 }),
  ],
};

/** Final A: dispensa honrosa. */
const END_A: CodeCutscene = {
  id: 'orc_end_a',
  characterId: 'orc',
  music: 'comic_hero',
  beats: [
    act('stage10', [me('orc', 0.34, { pose: 'idle' }), fig('soldier', 0.7, { flip: true, pose: 'hurt', poses: poses([0, 'hurt'], [1400, 'idle']) })], 3600, { shot: true, fx: ['flash'], sfx: [{ key: 'levelup', at: 1400, vol: 0.5 }] }),
    say('stage10', [me('orc', 0.34), fig('soldier', 0.7, { flip: true })], FERRO, L('Soldado, está dispensado. Com honra.', 'Soldier, you are discharged. With honor.', 'Soldado, queda dado de baja. Con honor.', 'Soldat, vous êtes congédié. Avec honneur.', '兵士よ、除隊を許す。名誉と共に。'), { textFor: 4600 }),
    say('stage10', [me('orc', 0.34), fig('orc', 0.66, { flip: true })], GROSH, L('Toma. A concha da sopa. É a única coisa que eu tenho.', 'Here. The soup ladle. It is the only thing I own.', 'Toma. El cucharón de la sopa. Es lo único que tengo.', 'Tiens. La louche de la soupe. C’est la seule chose que j’ai.', 'ほら。スープのお玉だ。俺の持ち物はこれだけだ。'), { shot: true, icons: [{ name: 'gift', x: 0.5, y: 0.45, size: 60 }] }),
    say('stage10', [me('orc', 0.34), npc('c09', 0.66, { dir: 'left' })], L('Dona Iracema', 'Mrs. Iracema', 'Doña Iracema', 'Madame Iracema', 'イラセマさん'), L('Uma capa nova, sem emblema nenhum. Porque agora é a sua.', 'A new cape, with no emblem. Because now it is your own.', 'Una capa nueva, sin emblema alguno. Porque ahora es tuya.', 'Une cape neuve, sans aucun emblème. Parce que maintenant elle est à toi.', '紋章のない新しいマント。だって、これからはあなた自身のものだから。'), { shot: true, icons: [{ name: 'cape_brown', x: 0.5, y: 0.4, size: 64 }], textFor: 5600 }),
    say('stage11_dusk', [me('orc', 0.4, { pose: 'idle' })], P, L('Mãe, eu consegui.', 'Mom, I did it.', 'Mamá, lo logré.', 'Maman, j’ai réussi.', '母さん、やったよ。'), { shot: true, tint: 'rgba(255,150,60,0.2)', ms: 5200 }),
    card('stage11_dusk', [me('orc', 0.4)], L('DISPENSA HONROSA', 'HONORABLE DISCHARGE', 'BAJA HONROSA', 'CONGÉ HONORABLE', '名誉ある除隊'), L('Antes de cumprir, perguntar para quem', 'Before obeying, ask who for', 'Antes de cumplir, preguntar para quién', 'Avant d’obéir, demander pour qui', '従う前に、誰のためかを尋ねよ'), { tint: 'rgba(255,150,60,0.2)' }),
  ],
};

/** Final B: a tropa inteira. */
const END_B: CodeCutscene = {
  id: 'orc_end_b',
  characterId: 'orc',
  music: 'comic_hero',
  beats: [
    card('stage10', [me('orc', 0.5, { pose: 'idle' }), fig('orc', 0.25, { h: 0.4 }), npc('c05', 0.78, { dir: 'left' })], L('A TROPA INTEIRA', 'THE WHOLE TROOP', 'LA TROPA ENTERA', 'LA TROUPE ENTIÈRE', '部隊まるごと'), L('Todos largam as ordens', 'Everyone lays down the orders', 'Todos dejan las órdenes', 'Tous déposent les ordres', '全員が命令を手放す'), { icons: [{ name: 'hat_iron', x: 0.15, y: 0.82, size: 50 }, { name: 'hat_iron', x: 0.3, y: 0.86, size: 50 }, { name: 'hat_iron', x: 0.7, y: 0.84, size: 50 }, { name: 'hat_iron', x: 0.86, y: 0.8, size: 50 }] }),
    say('stage10', [me('orc', 0.4), fig('orc', 0.66, { flip: true })], GROSH, L('Eu largo a farda também. Vamos ver o que a gente faz com tanta panela.', 'I drop the uniform too. Let us see what we do with so many pots.', 'Yo también dejo el uniforme. Veamos qué hacemos con tantas ollas.', 'Je dépose l’uniforme aussi. On verra ce qu’on fait de toutes ces marmites.', '俺も軍服を脱ぐ。こんなに鍋があるんだ、何かしよう。'), { shot: true, icons: [{ name: 'hat_iron', x: 0.15, y: 0.82, size: 50 }, { name: 'hat_iron', x: 0.86, y: 0.8, size: 50 }] }),
    act('stage10_dusk', [fig('soldier', 0.5, { pose: 'idle' })], 4600, { shot: true, tint: 'rgba(255,150,60,0.2)', icons: [{ name: 'fire', x: 0.62, y: 0.7, size: 70 }] }),
    say('stage10_dusk', [fig('soldier', 0.4, { pose: 'idle' }), me('orc', 0.7, { flip: true, path: walk(1.08, 0.7, 2200) })], FERRO, L('Sopa. Quem diria que era tão difícil. Você voltou?', 'Soup. Who knew it was so hard. You came back?', 'Sopa. Quién diría que era tan difícil. ¿Volviste?', 'La soupe. Qui aurait cru que c’était si difficile. Tu es revenu ?', 'スープか。こんなに難しいとは。……戻ってきたのか？'), { shot: true, tint: 'rgba(255,150,60,0.2)', textFor: 5600 }),
    card('stage10_dusk', [fig('soldier', 0.4), me('orc', 0.7, { flip: true })], L('A TROPA INTEIRA', 'THE WHOLE TROOP', 'LA TROPA ENTERA', 'LA TROUPE ENTIÈRE', '部隊まるごと'), L('O Orc volta em silêncio e ajuda a mexer', 'The Orc returns in silence and helps stir', 'El Orco vuelve en silencio y ayuda a remover', 'L’Orc revient en silence et aide à remuer', 'オークは黙って戻り、かき混ぜを手伝う'), { tint: 'rgba(255,150,60,0.2)', ms: 5200 }),
  ],
};

/** Final C: o desertor. */
const END_C: CodeCutscene = {
  id: 'orc_end_c',
  characterId: 'orc',
  music: 'open_ocean',
  ambient: 'wind',
  beats: [
    card('stage9', [me('orc', 0.5, { pose: 'walk', path: walk(0.1, 0.7, 5200) })], L('O DESERTOR', 'THE DESERTER', 'EL DESERTOR', 'LE DÉSERTEUR', '脱走兵'), L('Sem nome, sem bandeira', 'No name, no flag', 'Sin nombre, sin bandera', 'Sans nom, sans drapeau', '名もなく、旗もなく'), { ms: 5400 }),
    say('stage9', [me('orc', 0.4, { pose: 'idle' })], P, L('Não preciso de farda para ser decente. Só de dois braços e de um caminho.', 'I do not need a uniform to be decent. Only two arms and a road.', 'No necesito uniforme para ser decente. Solo dos brazos y un camino.', 'Je n’ai pas besoin d’uniforme pour être décent. Juste de deux bras et d’une route.', '立派でいるのに軍服はいらない。必要なのは、二本の腕と、道だけだ。'), { shot: true, textFor: 6200 }),
    act('stage2_dusk', [], 4600, { shot: true, tint: 'rgba(255,150,60,0.18)', icons: [{ name: 'gift', x: 0.5, y: 0.7, size: 80 }, { name: 'heart', x: 0.5, y: 0.45, size: 40 }] }),
    card('stage2_night', [], L('O DESERTOR', 'THE DESERTER', 'EL DESERTOR', 'LE DÉSERTEUR', '脱走兵'), L('Uma cesta de pães, sem remetente', 'A basket of bread, with no sender', 'Una cesta de panes, sin remitente', 'Un panier de pains, sans expéditeur', '差出人のないパンの籠'), { tint: 'rgba(10,10,40,0.5)', ms: 5200, icons: [{ name: 'gift', x: 0.5, y: 0.78, size: 70 }] }),
  ],
};

export const ORC_CUTSCENES: CodeCutscene[] = [C1, C2, C3, lengthen(END_A), lengthen(END_B), lengthen(END_C)];
