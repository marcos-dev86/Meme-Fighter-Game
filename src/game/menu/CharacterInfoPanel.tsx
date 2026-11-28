import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/game/i18n/i18n';
import { GameIcon } from '@/game/ui/GameIcon';
import { STORY_CHARACTERS } from '@/game/story/characters';
import { abilityEffect, abilityIcon, abilityName, abilityUsage, mainAbilities, type AbilityDef } from '@/game/story/abilities';
import { campaignMissionTotal, campaignSecretTotal, characterSummary, characterTagline, pick5, treeInfo } from '@/game/story/characterInfo';
import { skillName } from '@/game/items/skillText';

export interface CharacterInfoProps {
  characterId: string;
  /** Personagem ainda bloqueado: mostra o aviso de desbloqueio. */
  locked?: boolean;
  /** Progresso da campanha na partida atual (Status). Sem isso, mostra só o total de missões. */
  progress?: { done: number; total: number };
  /** Missões secretas já concluídas e o total (Status). Sem isso, mostra só o total de secretas da campanha. */
  secrets?: { done: number; total: number };
  /** O final desta campanha já foi visto neste save. */
  endingSeen?: boolean;
  maxHeight?: number;
}

/**
 * Painel de PERSONAGEM: resumo da história, as DUAS habilidades principais em categorias visuais diferentes (VERSUS = só em
 * luta, EXPLORAÇÃO = só no mundo), a árvore individual com a suprema e o progresso da campanha. Usado na seleção de personagem
 * (nova partida) e na tela Status.
 */
export function CharacterInfoPanel({ characterId, locked, progress, secrets, endingSeen, maxHeight }: CharacterInfoProps) {
  const { t } = useI18n();
  const ch = STORY_CHARACTERS[characterId];
  const summary = characterSummary(characterId);
  const tagline = characterTagline(characterId);
  const abilities = mainAbilities(characterId);
  const tree = treeInfo(characterId);
  const total = progress?.total ?? campaignMissionTotal(characterId);
  const secretTotal = secrets?.total ?? campaignSecretTotal(characterId);

  const card = (kind: 'versus' | 'exploration', a: AbilityDef | null) => {
    const versus = kind === 'versus';
    return (
      <View style={[styles.abCard, versus ? styles.abVersus : styles.abExplore]} testID={`ability-${kind}`}>
        <View style={styles.abHead}>
          <View style={[styles.chip, versus ? styles.chipVersus : styles.chipExplore]}>
            <Text style={styles.chipText}>{t(versus ? 'ability_cat_versus' : 'ability_cat_exploration')}</Text>
          </View>
          <Text style={styles.abHint}>{t(versus ? 'ability_cat_versus_hint' : 'ability_cat_exploration_hint')}</Text>
        </View>
        {a ? (
          <>
            <View style={styles.abTitle}>
              <GameIcon name={abilityIcon(a)} size={30} />
              <Text style={styles.abName}>{abilityName(a)}</Text>
            </View>
            <Text style={styles.abLine}>
              <Text style={styles.abLabel}>{t('ability_effect_label')}: </Text>
              {abilityEffect(a)}
            </Text>
            <Text style={styles.abLine}>
              <Text style={styles.abLabel}>{t('ability_usage_label')}: </Text>
              {abilityUsage(a)}
            </Text>
          </>
        ) : (
          <Text style={styles.soon}>{t('ability_soon')}</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.wrap, maxHeight ? { maxHeight } : null]} contentContainerStyle={styles.content} showsVerticalScrollIndicator testID="character-panel">
      <View style={styles.head}>
        <Text style={styles.name}>{ch?.name ?? characterId}</Text>
        {locked && <Text style={styles.lockChip}>{t('char_locked')}</Text>}
        {!locked && endingSeen && <Text style={styles.okChip}>{t('char_ending_seen')}</Text>}
      </View>
      {tagline && <Text style={styles.tagline}>{pick5(tagline)}</Text>}
      {locked && <Text style={styles.lockHint}>{t('char_unlock_hint')}</Text>}

      {summary && (
        <>
          <Text style={styles.section}>{t('char_panel_story')}</Text>
          <Text style={styles.body}>{pick5(summary)}</Text>
        </>
      )}

      {card('versus', abilities.versus)}
      {card('exploration', abilities.exploration)}

      <Text style={styles.section}>{t('char_tree')}</Text>
      {tree ? (
        <View style={styles.treeRow}>
          <Text style={styles.body}>{t('char_tree_info').replace('{n}', String(tree.skills)).replace('{p}', String(tree.points))}</Text>
          {tree.supreme && (
            <View style={styles.supremeRow}>
              <GameIcon name={tree.supreme.icon} size={30} />
              <Text style={styles.supremeText}>
                {t('char_supreme')}: {skillName(tree.supreme)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.soon}>{t('char_tree_soon')}</Text>
      )}

      <Text style={styles.section}>{t('char_campaign')}</Text>
      <Text style={styles.body}>
        {progress ? t('char_missions_progress').replace('{done}', String(progress.done)).replace('{total}', String(total)) : t('char_missions_total').replace('{total}', String(total))}
      </Text>
      {secretTotal > 0 && (
        <Text style={styles.body} testID="character-secrets">
          {secrets ? t('char_secrets_progress').replace('{done}', String(secrets.done)).replace('{total}', String(secrets.total)) : t('char_secrets_total').replace('{total}', String(secretTotal))}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  content: { gap: 6, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  tagline: { color: '#ff9f43', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  lockChip: { color: '#fff', backgroundColor: '#8a2b2b', fontSize: 10, fontWeight: '900', letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  okChip: { color: '#0d2a12', backgroundColor: '#4cd964', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  lockHint: { color: '#ff9f9f', fontSize: 12 },
  section: { color: '#9ec1ff', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  body: { color: '#e3e8ff', fontSize: 12, lineHeight: 17 },
  abCard: { borderRadius: 10, borderWidth: 2, padding: 8, gap: 4, backgroundColor: 'rgba(0,0,0,0.35)' },
  abVersus: { borderColor: '#e8554e' },
  abExplore: { borderColor: '#4cc38a' },
  abHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  chipVersus: { backgroundColor: '#e8554e' },
  chipExplore: { backgroundColor: '#2e9e6b' },
  chipText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  abHint: { color: '#b7bfdc', fontSize: 10, fontStyle: 'italic' },
  abTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  abName: { color: '#fff', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  abLine: { color: '#d8def5', fontSize: 11, lineHeight: 15 },
  abLabel: { color: '#FFD700', fontWeight: '800' },
  soon: { color: '#9aa3c7', fontSize: 11, fontStyle: 'italic' },
  treeRow: { gap: 6 },
  supremeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 8, borderWidth: 2, borderColor: '#ffb62e', backgroundColor: 'rgba(255,182,46,0.12)' },
  supremeText: { color: '#ffb62e', fontSize: 12, fontWeight: '900', flexShrink: 1 },
});
