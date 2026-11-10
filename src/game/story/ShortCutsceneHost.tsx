import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CutscenePlayer } from './CutscenePlayer';
import { endShortCutscene, useShortCutscene } from './shortCutsceneState';

/** Camada global (montada em app/_layout) que toca a cutscene curta atual por cima de qualquer tela. */
export function ShortCutsceneHost() {
  const id = useShortCutscene();
  if (!id) return null;
  return (
    <View style={styles.root} pointerEvents="auto" testID="short-cutscene-host">
      <CutscenePlayer key={id} id={id} onDone={endShortCutscene} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, backgroundColor: '#000' },
});
