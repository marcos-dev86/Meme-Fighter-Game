import React, { useEffect } from 'react';
import { CODE_CUTSCENES } from './campaigns';
import { CodeCutscenePlayer } from './CodeCutscenePlayer';

interface Props {
  id: string;
  /** Chamado UMA vez: ao terminar ou ao pular. */
  onDone: () => void;
}

/** Toca a cutscene `id`. Todas são feitas por código (campaigns/*.ts): não há mais vídeos. */
export function CutscenePlayer({ id, onDone }: Props) {
  const script = CODE_CUTSCENES[id];
  useEffect(() => {
    if (!script) onDone(); // id sem cena: nunca deixa o jogo preso numa tela preta
  }, [script, onDone]);
  if (!script) return null;
  return <CodeCutscenePlayer script={script} onDone={onDone} />;
}
