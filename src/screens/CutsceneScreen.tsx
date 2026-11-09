import React, { useCallback, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CutscenePlayer } from '@/game/story/CutscenePlayer';
import { getCutscene } from '@/game/story/cutscenes';
import { markCutsceneSeen } from '@/game/story/cutsceneState';

/** Rota /cutscene?id=<id>[&replay=1]: toca o vídeo e volta para onde estava. `replay` (Opções) não marca como vista. */
export function CutsceneScreen() {
  const params = useLocalSearchParams<{ id?: string; replay?: string }>();
  const def = getCutscene(Array.isArray(params.id) ? params.id[0] : params.id);
  const replay = params.replay === '1';
  useEffect(() => {
    if (def && !replay) markCutsceneSeen(def.id); // marca ao começar: se fechar o app no meio, não repete em loop
  }, [def, replay]);
  const done = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }, []);
  useEffect(() => {
    if (!def) done();
  }, [def, done]);
  if (!def) return null;
  return <CutscenePlayer id={def.id} onDone={done} />;
}
