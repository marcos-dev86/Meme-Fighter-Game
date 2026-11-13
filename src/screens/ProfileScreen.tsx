import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { RARITY_COLOR, RARITY_ORDER, rarityKey } from '@/game/items/rarity';
import { FIGHTER_NAME, ROSTER, useRoster } from '@/game/state/rosterState';
import { ACHIEVEMENTS, achDesc, achTitle } from '@/game/account/achievementDefs';
import { condProgress } from '@/game/account/accountCore';
import { DIAMOND_RATES } from '@/game/account/accountConfig';
import { BACKGROUNDS, FRAMES, avatarNeedsUnlock, avatarPrice, type BgDef, type FrameDef } from '@/game/account/profileDefs';
import { AVATARS, AVATAR_BY_ID } from '@/game/account/avatarList';
import { buyAvatar, buyBackground, buyFrame, chooseAvatar, chooseBackground, chooseFrame, setFavoriteFighter, syncFighters, useAccount } from '@/game/account/accountState';
import { ProfileBadge } from '@/game/account/ProfileBadge';
import { AchievementIcon } from '@/game/account/AchievementIcon';
import { NicknameDialog } from '@/game/account/NicknameDialog';
import { COSMETICS } from '@/game/cosmetics/cosmeticDefs';
import { STORY_CHARACTERS } from '@/game/story/characters';
import { BOSSES } from '@/game/state/bossState';

type Tab = 'info' | 'ach' | 'look';
type Pick = { kind: 'avatar' | 'bg' | 'frame'; id: string };

/** PERFIL do jogador: apelido, ícone/fundo/moldura, favorito, conquistas e a loja de diamantes (visual). Tudo vem da conta global. */
export function ProfileScreen() {
  const { t, lang } = useI18n();
  const acc = useAccount();
  const roster = useRoster();
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('info');
  const [editNick, setEditNick] = useState(false);

  // Elenco liberado em saves/contas antigas entra nas conquistas e nas compras de ícone.
  const rosterKey = roster.join(',');
  useEffect(() => {
    syncFighters(roster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  const panelH = Math.max(160, height - 24);
  const compact = width < 700;

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <View style={[styles.shell, { height: panelH, maxHeight: panelH, width: Math.min(width - 24, 940) }]}>
        <View style={[styles.side, compact && styles.sideCompact]}>
          <ProfileBadge avatar={acc.avatar} bg={acc.bg} frame={acc.frame} size={compact ? 64 : 104} />
          <Text style={styles.nick} numberOfLines={1} testID="profile-nick">
            {acc.nick ?? '—'}
          </Text>
          <Pressable onPress={() => setEditNick(true)} testID="profile-edit-nick">
            <Text style={styles.link}>✏️ {t('profile_nick_edit')}</Text>
          </Pressable>
          <Text style={styles.diamonds} testID="profile-diamonds">
            💎 {acc.diamonds}
          </Text>
          <Text style={styles.sub}>{t('profile_diamond_name')}</Text>
        </View>
        <View style={styles.main}>
          <View style={styles.tabs}>
            {(['info', 'ach', 'look'] as Tab[]).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]} testID={`profile-tab-${k}`}>
                <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>{t(`profile_tab_${k}`)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.body}>
            {tab === 'info' && <InfoTab />}
            {tab === 'ach' && <AchievementsTab lang={lang} />}
            {tab === 'look' && <LookTab />}
          </View>
        </View>
      </View>
      {editNick && <NicknameDialog initial={acc.nick} onDone={() => setEditNick(false)} onCancel={() => setEditNick(false)} />}
    </ArtBackdrop>
  );
}

/* ───────────────────────── aba PERFIL ───────────────────────── */

function InfoTab() {
  const { t } = useI18n();
  const acc = useAccount();
  const roster = useRoster();
  const stat = (k: string) => acc.stats[k] ?? 0;
  const done = Object.keys(acc.achievements).length;
  const rows: [string, string][] = [
    [t('stat_achievements'), `${done}/${ACHIEVEMENTS.length}`],
    [t('stat_level'), `${stat('level_max') || 1}`],
    [t('stat_fights_won'), `${stat('fights_won')}`],
    [t('stat_versus_wins'), `${stat('versus_wins')}`],
    [t('stat_tower'), `${stat('tower_best')}`],
    [t('stat_bosses'), `${(acc.sets.bosses ?? []).length}/${BOSSES.length}`],
    [t('stat_islands'), `${(acc.sets.islands ?? []).length}/8`],
    [t('stat_fighters'), `${roster.length}/${ROSTER.length}`],
    [t('stat_cosmetics'), `${acc.cosmetics.length}/${COSMETICS.length}`],
    [t('stat_worlds'), `${stat('worlds_created')}`],
    [t('stat_deaths'), `${stat('deaths')}`],
    [t('stat_revives'), `${stat('revives')}`],
    [t('stat_diamonds'), `${stat('diamonds_earned')}`],
  ];
  const since = new Date(acc.createdAt).toLocaleDateString();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 70 }} showsVerticalScrollIndicator>
      <Text style={styles.section}>{t('profile_favorite')}</Text>
      <Text style={styles.sub}>{t('profile_favorite_hint')}</Text>
      <View style={styles.wrap}>
        <Pressable onPress={() => setFavoriteFighter(null, roster)} style={[styles.favNone, acc.favorite === null && styles.selected]}>
          <Text style={styles.sub}>{t('profile_favorite_none')}</Text>
        </Pressable>
        {roster.map((k) => (
          <Pressable key={k} onPress={() => setFavoriteFighter(k, roster)} style={[styles.fav, acc.favorite === k && styles.selected]} testID={`fav-${k}`}>
            <ProfileBadge avatar={k} size={46} animate={false} />
            <Text style={styles.favName} numberOfLines={1}>
              {AVATAR_BY_ID[k]?.name ?? FIGHTER_NAME[k] ?? k}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.section, { marginTop: 14 }]}>{t('profile_stats')}</Text>
      <View style={styles.statGrid}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.statCell}>
            <Text style={styles.statVal}>{v}</Text>
            <Text style={styles.statKey}>{k}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.sub, { marginTop: 10 }]}>
        {t('profile_since')} {since}
      </Text>
    </ScrollView>
  );
}

/* ───────────────────────── aba CONQUISTAS ───────────────────────── */

type Filter = 'all' | 'done' | 'todo';

function AchievementsTab({ lang }: { lang: string }) {
  const { t } = useI18n();
  const acc = useAccount();
  const [filter, setFilter] = useState<Filter>('all');
  const done = Object.keys(acc.achievements).length;
  const list = useMemo(() => {
    const order = (r: string) => RARITY_ORDER.indexOf(r as never);
    return ACHIEVEMENTS.filter((a) => (filter === 'all' ? true : filter === 'done' ? acc.achievements[a.id] !== undefined : acc.achievements[a.id] === undefined)).sort((a, b) => {
      const da = acc.achievements[a.id] !== undefined ? 0 : 1;
      const db = acc.achievements[b.id] !== undefined ? 0 : 1;
      return da - db || order(a.rarity) - order(b.rarity);
    });
  }, [acc.achievements, filter]);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.achHead}>
        <Text style={styles.statVal} testID="ach-count">
          {done}/{ACHIEVEMENTS.length}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round((done / ACHIEVEMENTS.length) * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.chips}>
        {(['all', 'done', 'todo'] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]} testID={`ach-filter-${f}`}>
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{t(`ach_filter_${f}`)}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        initialNumToRender={80}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 70, gap: 6 }}
        renderItem={({ item: a }) => {
          const got = acc.achievements[a.id] !== undefined;
          const prog = got ? null : condProgress(acc, a.cond);
          const color = RARITY_COLOR[a.rarity];
          const soon = a.needsStory && !STORY_CHARACTERS[a.needsStory];
          return (
            <View style={[styles.achRow, got && { borderColor: color }]} testID={`ach-${a.id}`}>
              <View style={[styles.achIcon, { borderColor: color, backgroundColor: got ? color + '55' : '#2a2a2a' }]}>
                <AchievementIcon id={a.id} size={32} dim={!got} />
                {!got && <Text style={styles.lock}>🔒</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.achTitle, !got && { color: '#bbb' }]} numberOfLines={1}>
                  {achTitle(a, lang)}
                </Text>
                <Text style={styles.achDesc}>{achDesc(a, lang)}</Text>
                {soon && !got && <Text style={styles.soon}>{t('ach_story_soon')}</Text>}
                {prog && (
                  <View style={styles.progRow}>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.round((prog.cur / prog.max) * 100)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.progText}>
                      {prog.cur}/{prog.max}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rarity, { color }]}>{t(rarityKey(a.rarity))}</Text>
                <Text style={styles.reward}>+{DIAMOND_RATES.achievement[a.rarity]} 💎</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/* ───────────────────────── aba VISUAL (ícone, fundo, moldura) ───────────────────────── */

function LookTab() {
  const { t } = useI18n();
  const acc = useAccount();
  const roster = useRoster();
  const [pick, setPick] = useState<Pick | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const pv = {
    avatar: pick?.kind === 'avatar' ? pick.id : acc.avatar,
    bg: pick?.kind === 'bg' ? pick.id : acc.bg,
    frame: pick?.kind === 'frame' ? pick.id : acc.frame,
  };

  const owned = (p: Pick): boolean =>
    p.kind === 'avatar' ? acc.avatarsOwned.includes(p.id) : p.kind === 'bg' ? acc.bgOwned.includes(p.id) || BACKGROUNDS.find((b) => b.id === p.id)?.kind === 'solid' : acc.framesOwned.includes(p.id);
  const equipped = (p: Pick): boolean => (p.kind === 'avatar' ? acc.avatar === p.id : p.kind === 'bg' ? acc.bg === p.id : acc.frame === p.id);
  const price = (p: Pick): number => (p.kind === 'avatar' ? avatarPrice(p.id) : p.kind === 'bg' ? BACKGROUNDS.find((b) => b.id === p.id)?.price ?? 0 : FRAMES.find((f) => f.id === p.id)?.price ?? 0);

  const act = () => {
    if (!pick) return;
    if (owned(pick)) {
      if (pick.kind === 'avatar') chooseAvatar(pick.id);
      else if (pick.kind === 'bg') chooseBackground(pick.id);
      else chooseFrame(pick.id);
      setMsg(null);
      return;
    }
    const r = pick.kind === 'avatar' ? buyAvatar(pick.id, roster) : pick.kind === 'bg' ? buyBackground(pick.id) : buyFrame(pick.id);
    if (r.ok) {
      if (pick.kind === 'avatar') chooseAvatar(pick.id);
      else if (pick.kind === 'bg') chooseBackground(pick.id);
      else chooseFrame(pick.id);
      setMsg(t('look_bought'));
    } else setMsg(r.reason === 'poor' ? t('look_poor') : r.reason === 'locked' ? t('look_locked_fighter') : null);
  };

  const fighterLocked = pick?.kind === 'avatar' && !owned(pick) && avatarNeedsUnlock(pick.id) && !roster.includes(pick.id as never);
  const pickName = pick?.kind === 'avatar' ? AVATAR_BY_ID[pick.id]?.name : undefined;
  const label = !pick ? '' : equipped(pick) ? t('look_equipped') : owned(pick) ? t('look_equip') : `${t('look_buy')} · ${price(pick)} 💎`;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.lookBar}>
        <ProfileBadge avatar={pv.avatar} bg={pv.bg} frame={pv.frame} size={72} />
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text style={styles.statVal}>💎 {acc.diamonds}</Text>
          {pickName && <Text style={styles.pickName}>{pickName}</Text>}
          <Text style={styles.sub}>{msg ?? (pick ? (fighterLocked ? t('look_locked_fighter') : '') : t('look_pick_hint'))}</Text>
        </View>
        <MenuButton label={label || t('look_equip')} compact onPress={act} disabled={!pick || equipped(pick) || fighterLocked} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 70 }} showsVerticalScrollIndicator>
        {(['fighter', 'npc'] as const).map((kind) => (
          <View key={kind}>
            <Text style={styles.section}>{kind === 'fighter' ? t('look_icon') : t('look_icon_memes')}</Text>
            <Text style={styles.sub}>{kind === 'fighter' ? t('look_icon_fighters_hint') : t('look_icon_memes_hint')}</Text>
            <View style={[styles.wrap, { marginTop: 4 }]}>
              {AVATARS.filter((a) => a.kind === kind).map((a) => {
                const p: Pick = { kind: 'avatar', id: a.id };
                const have = owned(p);
                const unlocked = !avatarNeedsUnlock(a.id) || roster.includes(a.id as never);
                return (
                  <Tile key={a.id} on={equipped(p)} sel={pick?.kind === 'avatar' && pick.id === a.id} onPress={() => { setPick(p); setMsg(null); }} testID={`tile-avatar-${a.id}`}
                    caption={have ? (equipped(p) ? '✔' : '') : unlocked ? `${avatarPrice(a.id)} 💎` : '🔒'} dim={!have && !unlocked}>
                    <ProfileBadge avatar={a.id} bg={pv.bg} frame={pv.frame} size={52} animate={false} />
                  </Tile>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={styles.section}>{t('look_bg')}</Text>
        <View style={styles.wrap}>
          {BACKGROUNDS.map((b: BgDef) => {
            const p: Pick = { kind: 'bg', id: b.id };
            const have = owned(p);
            return (
              <Tile key={b.id} on={equipped(p)} sel={pick?.kind === 'bg' && pick.id === b.id} onPress={() => { setPick(p); setMsg(null); }} testID={`tile-bg-${b.id}`}
                caption={have ? (equipped(p) ? '✔' : b.kind === 'solid' ? t('look_free') : '') : `${b.price} 💎`}>
                <ProfileBadge avatar={pv.avatar} bg={b.id} frame={pv.frame} size={52} animate={b.kind !== 'solid'} />
              </Tile>
            );
          })}
        </View>
        <Text style={styles.section}>{t('look_frame')}</Text>
        <View style={styles.wrap}>
          {FRAMES.map((f: FrameDef) => {
            const p: Pick = { kind: 'frame', id: f.id };
            const have = owned(p);
            return (
              <Tile key={f.id} on={equipped(p)} sel={pick?.kind === 'frame' && pick.id === f.id} onPress={() => { setPick(p); setMsg(null); }} testID={`tile-frame-${f.id}`}
                caption={have ? (equipped(p) ? '✔' : t('look_free')) : `${f.price} 💎`}>
                <ProfileBadge avatar={pv.avatar} bg={pv.bg} frame={f.id} size={52} animate={f.kind === 'glow' || f.kind === 'rainbow'} />
              </Tile>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({ children, caption, on, sel, dim, onPress, testID }: { children: React.ReactNode; caption: string; on: boolean; sel: boolean; dim?: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} testID={testID} style={[styles.tile, sel && styles.tileSel, on && styles.tileOn, dim && { opacity: 0.55 }]}>
      {children}
      {caption ? <Text style={styles.tileCap}>{caption}</Text> : <View style={styles.tileCapSpace} />}
    </Pressable>
  );
}

const GOLD = '#FFCD3C';
const styles = StyleSheet.create({
  shell: { flexDirection: 'row', gap: 10, alignSelf: 'center', paddingTop: 8 },
  side: { width: 150, alignItems: 'center', backgroundColor: 'rgba(20,14,6,0.78)', borderRadius: 12, borderWidth: 2, borderColor: '#B9820A', padding: 12, gap: 4 },
  sideCompact: { width: 100, padding: 6 },
  nick: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6, maxWidth: '100%' },
  link: { color: GOLD, fontSize: 12, fontWeight: '700' },
  diamonds: { color: '#8BE9FF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  sub: { color: '#cdbf96', fontSize: 11, fontWeight: '600' },
  main: { flex: 1, backgroundColor: 'rgba(20,14,6,0.78)', borderRadius: 12, borderWidth: 2, borderColor: '#B9820A', overflow: 'hidden' },
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#B9820A' },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  tabOn: { backgroundColor: GOLD },
  tabText: { color: '#e8d9b0', fontWeight: '900', fontSize: 13 },
  tabTextOn: { color: '#4A2E00' },
  body: { flex: 1, padding: 10 },
  section: { color: GOLD, fontWeight: '900', fontSize: 14, marginTop: 6, marginBottom: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fav: { alignItems: 'center', width: 62, padding: 4, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  favNone: { justifyContent: 'center', alignItems: 'center', width: 62, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  favName: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 },
  selected: { borderColor: GOLD, backgroundColor: 'rgba(255,205,60,0.15)' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statCell: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, minWidth: 96, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 17, fontWeight: '900' },
  statKey: { color: '#cdbf96', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  achHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: GOLD },
  chips: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  chip: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#B9820A' },
  chipOn: { backgroundColor: GOLD },
  chipText: { color: '#e8d9b0', fontWeight: '800', fontSize: 11 },
  chipTextOn: { color: '#4A2E00' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 2, borderColor: 'transparent', padding: 8 },
  achIcon: { width: 46, height: 46, borderRadius: 10, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', right: -4, bottom: -4, fontSize: 12 },
  achTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  achDesc: { color: '#d8cba4', fontSize: 11, fontWeight: '600' },
  soon: { color: '#ff9f5a', fontSize: 10, fontWeight: '700', marginTop: 2 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  progText: { color: '#cdbf96', fontSize: 10, fontWeight: '700' },
  rarity: { fontSize: 10, fontWeight: '900' },
  reward: { color: '#8BE9FF', fontSize: 11, fontWeight: '800', marginTop: 2 },
  lookBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  tile: { alignItems: 'center', padding: 4, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', width: 66 },
  tileSel: { borderColor: '#fff' },
  tileOn: { backgroundColor: 'rgba(255,205,60,0.18)' },
  pickName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  tileCapSpace: { height: 15 },
  tileCap: { color: '#e8d9b0', fontSize: 10, fontWeight: '800', marginTop: 3, minHeight: 12 },
});
