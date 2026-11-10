import type { Lang } from './translations';

/** Opções gráficas para celulares fracos (Parte 5.4). Mesclado em extraStrings.ts. */
export const STRINGS_GRAFICOS: Record<Lang, Record<string, string>> = {
  pt: {
    opt_weather_particles: 'PARTÍCULAS DO CLIMA',
    opt_weather_particles_note: 'Chuva, neve, cinzas e relâmpagos na tela. Desligue para poupar o celular; o som do clima continua.',
    opt_wave_anim: 'ONDAS ANIMADAS',
    opt_wave_anim_note: 'O vai e vem da espuma nas praias. Desligado, a espuma fica parada.',
    opt_night_dark: 'ESCURECER À NOITE',
    opt_night_dark_note: 'A noite escurece o mundo. Desligado, a tela não escurece (o relógio e as luzes continuam).',
  },
  en: {
    opt_weather_particles: 'WEATHER PARTICLES',
    opt_weather_particles_note: 'Rain, snow, ash and lightning on screen. Turn off to save battery; the weather sound stays.',
    opt_wave_anim: 'ANIMATED WAVES',
    opt_wave_anim_note: 'The foam washing in and out on the beaches. When off, the foam stays still.',
    opt_night_dark: 'DARKEN AT NIGHT',
    opt_night_dark_note: 'Night darkens the world. When off, the screen does not darken (the clock and lights stay).',
  },
  es: {
    opt_weather_particles: 'PARTÍCULAS DEL CLIMA',
    opt_weather_particles_note: 'Lluvia, nieve, ceniza y relámpagos en pantalla. Desactívalo para ahorrar batería; el sonido del clima sigue.',
    opt_wave_anim: 'OLAS ANIMADAS',
    opt_wave_anim_note: 'El va y ven de la espuma en las playas. Desactivado, la espuma queda quieta.',
    opt_night_dark: 'OSCURECER DE NOCHE',
    opt_night_dark_note: 'La noche oscurece el mundo. Desactivado, la pantalla no se oscurece (el reloj y las luces siguen).',
  },
  fr: {
    opt_weather_particles: 'PARTICULES MÉTÉO',
    opt_weather_particles_note: 'Pluie, neige, cendres et éclairs à l’écran. Désactivez pour économiser la batterie ; le son météo continue.',
    opt_wave_anim: 'VAGUES ANIMÉES',
    opt_wave_anim_note: 'Le va-et-vient de l’écume sur les plages. Désactivé, l’écume reste immobile.',
    opt_night_dark: 'ASSOMBRIR LA NUIT',
    opt_night_dark_note: 'La nuit assombrit le monde. Désactivé, l’écran ne s’assombrit pas (l’horloge et les lumières restent).',
  },
  ja: {
    opt_weather_particles: '天気のパーティクル',
    opt_weather_particles_note: '雨・雪・灰・稲妻の表示。オフで電池を節約（天気の音はそのまま）。',
    opt_wave_anim: '波のアニメーション',
    opt_wave_anim_note: '浜辺の泡の寄せては返す動き。オフだと泡は止まったままになります。',
    opt_night_dark: '夜に暗くする',
    opt_night_dark_note: '夜にワールドが暗くなります。オフだと画面は暗くなりません（時計と明かりはそのまま）。',
  },
};
