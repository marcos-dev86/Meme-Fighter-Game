import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { Slider } from '@/game/menu/Slider';
import { useI18n, setLang } from '@/game/i18n/i18n';
import { LANGUAGE_NAMES, type Lang } from '@/game/i18n/translations';
import {
  AUTOSAVE_INTERVALS,
  setAutoSave,
  setAutoSaveSeconds,
  setAmbientVolume,
  setHaptics,
  setTips,
  setLightMode, setWeatherParticles, setWaveAnimation, setNightDarkening,
  setShortCutscenes,
  setMusicVolume,
  setSfxVolume,
  useSettings,
} from '@/game/state/settingsState';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { CUTSCENES } from '@/game/story/cutscenes';
import { useSeenCutscenes } from '@/game/story/cutsceneState';

const LANGS: Lang[] = ['pt', 'en', 'es', 'fr', 'ja'];

type Page = 'hub' | 'sound' | 'game' | 'controls' | 'language' | 'cutscenes';

/**
 * Options are split into small pages (SONS / JOGO / CONTROLES / IDIOMA) so no
 * single screen gets crowded. Back goes to the hub first, then out.
 */
export function OptionsScreen() {
  const { lang, t } = useI18n();
  const settings = useSettings();
  const [page, setPage] = useState<Page>('hub');
  const seenCutscenes = useSeenCutscenes();

  const onBack = () => {
    if (page === 'hub') router.back();
    else setPage('hub');
  };

  const title =
    page === 'sound' ? t('opt_cat_sound') : page === 'game' ? t('opt_cat_game') : page === 'controls' ? t('opt_cat_controls') : page === 'language' ? t('options_language') : page === 'cutscenes' ? t('opt_cat_cutscenes') : t('options_title');

  return (
    <ArtBackdrop onBack={onBack}>
      <Text style={styles.title}>{title}</Text>

      {page === 'hub' && (
        <View style={styles.hub}>
          <MenuButton label={t('opt_cat_sound')} onPress={() => setPage('sound')} />
          <MenuButton label={t('opt_cat_game')} onPress={() => setPage('game')} />
          <MenuButton label={t('opt_cat_controls')} onPress={() => setPage('controls')} />
          <MenuButton label={t('options_language')} onPress={() => setPage('language')} />
          <MenuButton label={t('opt_cat_cutscenes')} onPress={() => setPage('cutscenes')} />
        </View>
      )}

      {page === 'sound' && (
        <View style={styles.col}>
          <Slider label={t('opt_music')} value={settings.musicVolume} onChange={setMusicVolume} />
          <Slider label={t('opt_ambient')} value={settings.ambientVolume} onChange={setAmbientVolume} />
          <Slider label={t('opt_sfx')} value={settings.sfxVolume} onChange={setSfxVolume} onRelease={() => playSfx('hit_flesh', { minGapMs: 0 })} />
        </View>
      )}

      {page === 'game' && (
        <View style={styles.col}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('options_autosave')}</Text>
            <MenuButton
              compact
              label={settings.autoSave ? t('options_autosave_on') : t('options_autosave_off')}
              variant={settings.autoSave ? 'primary' : 'ghost'}
              onPress={() => setAutoSave(!settings.autoSave)}
            />
          </View>
          {settings.autoSave && (
            <View style={styles.row}>
              <Text style={styles.sublabel}>{t('options_autosave_every')}</Text>
              {AUTOSAVE_INTERVALS.map((sec) => (
                <Pressable key={sec} onPress={() => setAutoSaveSeconds(sec)} style={[styles.chip, settings.autoSaveSeconds === sec && styles.chipActive]}>
                  <Text style={[styles.chipText, settings.autoSaveSeconds === sec && styles.chipTextActive]}>{sec}s</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.note}>{t('options_autosave_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_tips')}</Text>
            <MenuButton compact label={settings.tips ? t('opt_on') : t('opt_off')} variant={settings.tips ? 'primary' : 'ghost'} onPress={() => setTips(!settings.tips)} />
          </View>
          <Text style={styles.note}>{t('opt_tips_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_light_mode')}</Text>
            <MenuButton
              compact
              label={settings.lightMode ? t('opt_on') : t('opt_off')}
              variant={settings.lightMode ? 'primary' : 'ghost'}
              onPress={() => setLightMode(!settings.lightMode)}
            />
          </View>
          <Text style={styles.note}>{t('opt_light_mode_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_weather_particles')}</Text>
            <MenuButton compact label={settings.weatherParticles ? t('opt_on') : t('opt_off')} variant={settings.weatherParticles ? 'primary' : 'ghost'} onPress={() => setWeatherParticles(!settings.weatherParticles)} />
          </View>
          <Text style={styles.note}>{t('opt_weather_particles_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_wave_anim')}</Text>
            <MenuButton compact label={settings.waveAnimation ? t('opt_on') : t('opt_off')} variant={settings.waveAnimation ? 'primary' : 'ghost'} onPress={() => setWaveAnimation(!settings.waveAnimation)} />
          </View>
          <Text style={styles.note}>{t('opt_wave_anim_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_night_dark')}</Text>
            <MenuButton compact label={settings.nightDarkening ? t('opt_on') : t('opt_off')} variant={settings.nightDarkening ? 'primary' : 'ghost'} onPress={() => setNightDarkening(!settings.nightDarkening)} />
          </View>
          <Text style={styles.note}>{t('opt_night_dark_note')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_short_cutscenes')}</Text>
            <MenuButton
              compact
              label={settings.shortCutscenes ? t('opt_on') : t('opt_off')}
              variant={settings.shortCutscenes ? 'primary' : 'ghost'}
              onPress={() => setShortCutscenes(!settings.shortCutscenes)}
            />
          </View>
          <Text style={styles.note}>{t('opt_short_cutscenes_note')}</Text>
        </View>
      )}

      {page === 'controls' && (
        <View style={styles.col}>
          <MenuButton label={t('options_edit_controls')} variant="ghost" onPress={() => router.push('/controls-edit' as never)} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('opt_haptics')}</Text>
            <MenuButton
              compact
              label={settings.haptics ? t('opt_on') : t('opt_off')}
              variant={settings.haptics ? 'primary' : 'ghost'}
              onPress={() => {
                const next = !settings.haptics;
                setHaptics(next);
                if (next) haptic('medium');
              }}
            />
          </View>
          <Text style={styles.note}>{t('opt_haptics_note')}</Text>
        </View>
      )}

      {page === 'cutscenes' && (
        <View style={styles.col}>
          <ScrollView style={styles.csList} contentContainerStyle={styles.csListContent}>
            {CUTSCENES.filter((c) => !c.short && seenCutscenes.includes(c.id)).map((c) => (
              <MenuButton key={c.id} label={c.title} variant="ghost" onPress={() => router.push(`/cutscene?id=${c.id}&replay=1` as never)} />
            ))}
          </ScrollView>
          <Text style={styles.note}>{seenCutscenes.length ? t('cutscenes_note') : t('cutscenes_none')}</Text>
        </View>
      )}

      {page === 'language' && (
        <View style={styles.col}>
          <View style={styles.langGrid}>
            {LANGS.map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} style={[styles.chip, lang === l && styles.chipActive]}>
                <Text style={[styles.chipText, lang === l && styles.chipTextActive]}>{LANGUAGE_NAMES[l]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1, marginBottom: 12 },
  hub: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 620 },
  col: { alignItems: 'center', gap: 12, maxWidth: 380 },
  csList: { maxHeight: 210 },
  csListContent: { alignItems: 'center', gap: 10 },
  sublabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  note: { color: '#fff', opacity: 0.75, fontSize: 11, maxWidth: 320, textAlign: 'center' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 340 },
  chip: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(10,10,18,0.5)',
  },
  chipActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.22)' },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFD700' },
});
