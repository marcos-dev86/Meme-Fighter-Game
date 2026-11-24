import React from 'react';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { SCREEN_SCENE } from '@/game/menu/sceneArt';
import { SkillTreeView } from '@/game/menu/SkillTreeView';

/** "HABILIDADES": the skill tree as its own screen (from the pause menu). */
export function SkillsScreen() {
  return (
    <ArtBackdrop scene={SCREEN_SCENE.skills} dim onBack={() => router.back()}>
      <SkillTreeView />
    </ArtBackdrop>
  );
}
