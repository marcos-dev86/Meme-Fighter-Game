/**
 * CENAS CURTAS do mergulho: a transição de descer (mundo para o fundo do mar), de subir e de entrar numa travessia.
 * Cada local tem uma linha de introdução na primeira visita. Não tiram o controle além de ~2 s.
 */
export interface DiveIntro {
  title: string;
  line: string;
}

export const DIVE_INTROS: Record<string, DiveIntro> = {
  recife: { title: 'Recife do Pato', line: 'A água é morna, o peixe é palhaço e o pato é o instrutor. Que lugar sério.' },
  naufragio: { title: 'Naufrágio do Capitão Meme', line: 'O casco range e alguma coisa nos corredores respira. Talvez seja só você.' },
  caverna: { title: 'Caverna das Águas-vivas', line: 'Luzes azuis flutuam. Bonitas. Venenosas. Normalmente as duas coisas.' },
  ruinas: { title: 'Ruínas dos Fragmentos', line: 'Pedras gravadas numa língua morta. Uma delas parece um menu.' },
  atlantis: { title: 'Atlântida', line: 'Uma cidade inteira debaixo d’água. Ninguém reclama do trânsito, porque todo mundo flutua.' },
  lagoa: { title: 'Lagoa do Acampamento', line: 'Calma, azul e quase sem perigo. Aproveite enquanto dura.' },
  fumarolas: { title: 'Fumarolas do Vulcão', line: 'A água ferve nos buracos do fundo. Fuja do laranja.' },
  gruta: { title: 'Gruta Gelada', line: 'O frio entra pelos ossos. Até o fôlego congela.' },
  abismo: { title: 'Abismo Sombrio', line: 'Aqui embaixo a pressão dobra e a luz acaba. Algo enorme observa.' },
  travessia: { title: 'Travessia Submarina', line: 'Um túnel longo entre duas ilhas. Respire fundo e siga em frente.' },
  mar: { title: 'Mar Aberto', line: 'Você afunda na água fria. Lá embaixo o mar é um mundo inteiro, igualzinho ao de cima, só que sem chão para pisar.' },
  saida: { title: 'Rumo à superfície', line: 'As bolhas sobem e levam você junto.' },
};

export function introFor(introKey: string | undefined, siteName: string, crossing: boolean): DiveIntro {
  if (crossing) return DIVE_INTROS.travessia;
  return (introKey && DIVE_INTROS[introKey]) || { title: siteName, line: '' };
}

/** Cenas de REVELAÇÃO: aparecem quando o jogador descobre uma parede secreta (curtas, 1,7 s, sem tirar o controle depois). */
export const REVEAL_SCENES: Record<string, DiveIntro> = {
  h_cabine: { title: 'A Cabine do Capitão', line: 'A parede cede com um suspiro de madeira velha. Atrás dela, um pequeno tesouro que ninguém procurou.' },
  h_ruinas: { title: 'Sala sob as Ruínas', line: 'Os antigos escondiam o melhor sob o corredor. Claro que escondiam.' },
  h_atlantis: { title: 'O Coração de Atlântida', line: 'Uma pulsação lenta, uma vez por maré. A cidade ainda está viva.' },
  h_abismo: { title: 'O Último Esconderijo', line: 'No fundo do abismo, uma rocha respira. Você chegou onde o Leviatã nunca deixou ninguém chegar.' },
};
