import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { BRANCH_COUNT, treeFor, type SkillDef } from '@/game/items/skills';
import { branchName, skillDesc, skillName } from '@/game/items/skillText';
import { canLearn, learnSkill, respec, RESPEC_COST, skillPointsSpent, useSkills } from '@/game/state/skillState';
import { usePlayerState } from '@/game/state/playerState';
import { getStoryCharacterId } from '@/game/state/questState';
import { getStoryCharacter } from '@/game/story/characters';
import { useI18n } from '@/game/i18n/i18n';
import { GameIcon } from '@/game/ui/GameIcon';

/**
 * Árvore de habilidades do personagem da partida: 5 ramos de 5 habilidades e uma
 * linha final de 4. Rola na vertical e o painel de detalhe fica ao lado (tela
 * larga) ou embaixo (tela estreita), então cabe em celular pequeno.
 */
export function SkillTreeView({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const learned = useSkills();
  const { statPoints, coins } = usePlayerState();
  const charId = getStoryCharacterId();
  const tree = treeFor(charId);
  const [selId, setSelId] = useState<string>(tree.skills[0].id);
  const [msg, setMsg] = useState<string | null>(null);
  const sel = tree.skills.find((s) => s.id === selId) ?? tree.skills[0];
  const state = canLearn(sel);
  const wide = width >= 640;
  // a barra VOLTAR da tela fica no canto de baixo: deixa folga embaixo
  const wrapW = Math.min(width - 24, 780);
  const wrapH = Math.max(230, height - 120);
  const spent = skillPointsSpent();

  const learn = () => {
    if (learnSkill(sel.id)) {
      playSfx('levelup');
      haptic('success');
      setMsg(`${t('skills_learned')} ${skillName(sel)}!`);
    } else {
      playSfx('ui_denied');
      setMsg(state === 'locked' ? t('skills_locked') : t('skills_need_points'));
    }
  };
  const reset = () => {
    if (respec()) {
      playSfx('unequip');
      setMsg(t('skills_respec_done'));
    } else {
      playSfx('ui_denied');
      setMsg(spent <= 0 ? t('skills_nothing') : t('skills_respec_coins'));
    }
  };

  const node = (sk: SkillDef) => {
    const st = canLearn(sk);
    const owned = st === 'owned';
    const open = st === 'ok';
    return (
      <Pressable
        key={sk.id}
        onPress={() => setSelId(sk.id)}
        style={[styles.node, owned && styles.nodeOwned, open && styles.nodeOpen, st === 'locked' && styles.nodeLocked, selId === sk.id && styles.nodeSel]}
      >
        <GameIcon name={sk.icon} size={26} />
        <View style={styles.costTag}>{owned ? <GameIcon name="check" size={10} /> : <Text style={styles.costText}>{sk.cost}</Text>}</View>
      </Pressable>
    );
  };

  const column = (b: number) => {
    const list = tree.skills.filter((s) => s.branch === b);
    return (
      <View key={b} style={styles.col}>
        <Text style={styles.branchName} numberOfLines={1}>
          {branchName(charId, b)}
        </Text>
        {list.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <View style={[styles.link, learned.includes(s.id) && styles.linkOn]} />}
            {node(s)}
          </React.Fragment>
        ))}
      </View>
    );
  };
  const finals = tree.skills.filter((s) => s.branch === BRANCH_COUNT);

  const treeContent = (
    <View style={styles.treeScroll}>
      <View style={styles.cols}>{Array.from({ length: BRANCH_COUNT }, (_, b) => column(b))}</View>
      <Text style={[styles.branchName, { marginTop: 10 }]}>{branchName(charId, BRANCH_COUNT)}</Text>
      <View style={styles.finalRow}>{finals.map((s) => node(s))}</View>
    </View>
  );

  const detailBlock = (
    <View style={[styles.detail, wide && { width: DETAIL_W }]}>
      <View style={styles.detailHead}>
        <GameIcon name={sel.icon} size={22} />
        <Text style={styles.detailName} numberOfLines={2}>
          {skillName(sel)}
        </Text>
      </View>
      <Text style={styles.detailCost}>
        {sel.cost} {t('upgrade_points_abbr')}
      </Text>
      <Text style={styles.detailDesc}>{skillDesc(sel)}</Text>
      {sel.requires.length > 0 && state === 'locked' && (
        <Text style={styles.detailReq}>
          {t('skills_requires')}: {sel.requires.map((r) => { const d = tree.skills.find((s) => s.id === r); return d ? skillName(d) : r; }).join(' + ')}
        </Text>
      )}
      <Pressable style={[styles.learnBtn, state !== 'ok' && styles.learnOff]} onPress={learn} disabled={state === 'owned'}>
        <Text style={styles.learnText}>{state === 'owned' ? t('skills_owned') : t('skills_learn')}</Text>
      </Pressable>
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <Pressable style={styles.ghost} onPress={reset}>
        <Text style={styles.ghostText}>
          {t('skills_respec')} ({RESPEC_COST} · {coins})
        </Text>
      </Pressable>
      {onClose && (
        <Pressable style={styles.ghost} onPress={onClose}>
          <Text style={styles.ghostText}>{t('shop_exit')}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.wrap, { width: wrapW, height: wrapH, marginBottom: 56 }]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {t('skills_title')} · {getStoryCharacter(charId).name}
        </Text>
        <Text style={styles.points}>
          {statPoints} {t('upgrade_points_abbr')}
        </Text>
      </View>
      {wide ? (
        <View style={styles.bodyWide}>
          <ScrollView style={{ width: wrapW - DETAIL_W - 12 }} showsVerticalScrollIndicator>
            {treeContent}
          </ScrollView>
          <ScrollView style={{ width: DETAIL_W }} showsVerticalScrollIndicator>
            {detailBlock}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
          {treeContent}
          {detailBlock}
        </ScrollView>
      )}
    </View>
  );
}

const DETAIL_W = 220;

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 15, letterSpacing: 1, flexShrink: 1 },
  points: { color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,215,0,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  bodyWide: { flex: 1, flexDirection: 'row', gap: 12, minHeight: 0 },
  treeScroll: { alignItems: 'center', paddingBottom: 12 },
  cols: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'center' },
  col: { alignItems: 'center', gap: 0 },
  branchName: { color: '#ff9f43', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  link: { width: 3, height: 8, backgroundColor: 'rgba(255,255,255,0.22)' },
  linkOn: { backgroundColor: '#4cd964' },
  finalRow: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  node: { width: 46, height: 46, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  nodeOpen: { borderColor: '#FFD700' },
  nodeOwned: { borderColor: '#4cd964', backgroundColor: 'rgba(76,217,100,0.18)' },
  nodeLocked: { opacity: 0.45 },
  nodeSel: { borderWidth: 3, borderColor: '#fff' },
  costTag: { position: 'absolute', right: 1, bottom: 0, minWidth: 14, alignItems: 'center' },
  costText: { color: '#FFD700', fontSize: 11, fontWeight: '900' },
  detail: { gap: 5, padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailName: { color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 },
  detailCost: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
  detailDesc: { color: '#d8def5', fontSize: 12, lineHeight: 16 },
  detailReq: { color: '#ff9f9f', fontSize: 11 },
  learnBtn: { marginTop: 4, backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  learnOff: { opacity: 0.55 },
  learnText: { color: '#1a1200', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  msg: { color: '#9be89b', fontSize: 11, fontWeight: '700' },
  ghost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  ghostText: { color: '#cfd6f5', fontSize: 11, fontWeight: '700' },
});
