/**
 * NPCs AQUÁTICOS do mergulho. Falam conforme o que o jogador já fez (bandeiras da história e itens), têm humor próprio e
 * alguns vendem. Também contam como "conversar" para as missões (reportTalk com o id do NPC).
 * Arte: marcador genérico colorido do jogo (não encontrei sprites gratuitos de sereianos compatíveis, ver CREDITS).
 */
export interface DiveNpcDef {
  id: string;
  name: string;
  skin: string;
  outfit: string;
  hair: string;
  /** Frase atual, conforme o progresso. `has` diz se a bandeira/item existe. */
  say: (has: (flag: string) => boolean) => string;
  /** Loja do NPC (ids de itens e armaduras). */
  shop?: { title: string; stock: string[]; armors?: string[] };
}

export const DIVE_NPCS: Record<string, DiveNpcDef> = {
  instrutor_pato: {
    id: 'instrutor_pato', name: 'Instrutor Pato', skin: '#f4d35e', outfit: '#ee964b', hair: '#f95738',
    say: (has) =>
      has('dive_crossing_done') ? 'Você atravessou o mar por baixo! Eu ainda uso boia.'
      : has('dive_first_chest') ? 'Achou o baú? Ótimo. Agora siga o túnel da direita: a Travessia. Respire no bolsão de ar do meio, se houver.'
      : 'Regra número um: a água é para nadar, não para engolir. Seu fôlego é a barra azul. Zerou, você se afoga. Os bolsões de ar são seus amigos.',
  },
  fantasma_capitao: {
    id: 'fantasma_capitao', name: 'Capitão Meme (fantasma)', skin: '#cfd8dc', outfit: '#37474f', hair: '#eceff1',
    say: (has) =>
      has('secret_cabin_found') ? 'Você achou a minha cabine secreta! Pode ficar com a pérola. Eu não tenho mais bolso.'
      : has('wreck_logbook_found') ? 'Meu diário! Eu escrevi para NÃO CONFIAR NO POLVO. Mesmo assim, eu confiei. Olha onde eu estou.'
      : 'Este navio afundou por causa de um meme. Não pergunte qual. Dizem que a minha cabine tem uma parede que não é parede.',
  },
  pesquisadora_lia: {
    id: 'pesquisadora_lia', name: 'Dra. Lia, pesquisadora', skin: '#e0ac69', outfit: '#00897b', hair: '#4e342e',
    say: (has) =>
      has('ruins_tablet_found') ? 'Esta tábua fala do Leviatã, o Sea Beast. Ele aprende como você luta. Não repita sempre o mesmo golpe especial.'
      : 'Estas ruínas são anteriores a Atlântida. Procuro uma tábua com a lista de compras dos antigos. Sim, eu tenho certeza.',
  },
  guardiao_tritao: {
    id: 'guardiao_tritao', name: 'Guardião Tritão', skin: '#4fc3f7', outfit: '#0277bd', hair: '#e1f5fe',
    say: (has) =>
      has('atlantis_key_found') ? 'Você tem a Chave de Atlântida. Eu deveria te parar. Mas estou de plantão desde o ano 300.'
      : 'Halt! Ninguém passa pelo portão interno sem a Chave de Atlântida. Nem meu primo.',
  },
  mercadora_sirena: {
    id: 'mercadora_sirena', name: 'Sirena Mercadora', skin: '#80cbc4', outfit: '#ad1457', hair: '#6a1b9a',
    say: () => 'Ar em lata, alga crocante e trajes que não vazam. Tudo molhado, tudo garantido.',
    shop: { title: 'Sirena Mercadora', stock: ['kelp_snack', 'bubble_potion', 'air_flask'], armors: ['armor_snorkel', 'armor_wetsuit'] },
  },
  cientista_nemo: {
    id: 'cientista_nemo', name: 'Cientista Nemo Júnior', skin: '#ffcc80', outfit: '#6d4c41', hair: '#212121',
    say: (has) =>
      has('dive_all_sites') ? 'Você visitou todos os locais! Meu mapa está completo. Eu só queria que alguém visse.'
      : 'Estou catalogando cada recife, naufrágio e caverna. Visite todos os locais e me conte. Eu pago em orgulho.',
  },
  sereio_meme: {
    id: 'sereio_meme', name: 'Sereio Gigachad', skin: '#b0bec5', outfit: '#1565c0', hair: '#ffd54f',
    say: (has) =>
      has('beat_sea_beast') ? 'Você derrotou o Leviatã. Eu só estava aqui flexionando. Respeito.'
      : 'Eu nado sem camisa porque o mar é frio só para os fracos. O Leviatã mora no abismo. Eu estou na academia.',
  },
  pescador_sereno: {
    id: 'pescador_sereno', name: 'Pescador Sereno', skin: '#d7a86e', outfit: '#558b2f', hair: '#9e9e9e',
    say: (has) =>
      has('dive_help_turtle') ? 'A Tartaruga Zen gostou de você. Ela não gosta de ninguém. Aceite o elogio.'
      : 'Pesco aqui há 40 anos e nunca peguei nada. Ontem a tartaruga me deu uma poção. Alimente os bichos amigos: eles retribuem.',
  },
  mercador_cardume: {
    id: 'mercador_cardume', name: 'Mercador do Cardume', skin: '#90caf9', outfit: '#f9a825', hair: '#ffffff',
    say: () => 'Somos um cardume, então todos os preços são em grupo. Pode levar.',
    shop: { title: 'Mercador do Cardume', stock: ['kelp_snack', 'bubble_potion'], armors: ['armor_snorkel'] },
  },
};
