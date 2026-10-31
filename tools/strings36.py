# key: (pt, en, es, fr, ja)
S = {}
def add(key, pt, en, es, fr, ja): S[key] = (pt, en, es, fr, ja)


add('opt_light_mode','MODO LEVE','LIGHT MODE','MODO LIGERO','MODE LÉGER','軽量モード')
add('opt_light_mode_note','Reduz os efeitos (menos chuva, neve e faíscas) sem tirar nenhum. Ajuda em celulares mais lentos.','Reduces effects (less rain, snow and sparks) without removing any. Helps slower phones.','Reduce los efectos (menos lluvia, nieve y chispas) sin quitar ninguno. Ayuda en móviles lentos.','Réduit les effets (moins de pluie, de neige et d’étincelles) sans en retirer. Aide les téléphones lents.','効果を減らします（雨・雪・火花が少なめ）。なくなりはしません。低性能の端末向け。')
add('pause_status','STATUS','STATUS','ESTADO','STATUT','ステータス')
add('status_title','STATUS','STATUS','ESTADO','STATUT','ステータス')
add('status_skills','Árvore de Habilidades','Skill Tree','Árbol de Habilidades','Arbre de Compétences','スキルツリー')
add('status_power','Pontos de Poder','Power Points','Puntos de Poder','Points de Puissance','パワーポイント')
add('power_title','PONTOS DE PODER','POWER POINTS','PUNTOS DE PODER','POINTS DE PUISSANCE','パワーポイント')
add('power_subtitle','Gaste pontos de status (1 por nível do jogador). Cada atributo vai de 1 a 10 e cada nível novo custa mais pontos.','Spend status points (1 per player level). Each attribute goes from 1 to 10 and every new level costs more points.','Gasta puntos de estado (1 por nivel del jugador). Cada atributo va de 1 a 10 y cada nivel nuevo cuesta más puntos.','Dépense des points de statut (1 par niveau du joueur). Chaque attribut va de 1 à 10 et chaque niveau coûte plus de points.','ステータスポイント（プレイヤーレベルごとに1）を使います。各能力は1〜10で、上がるほど必要ポイントが増えます。')
add('stat_health','Vida','Health','Vida','Vie','体力')
add('stat_aura','Aura','Aura','Aura','Aura','オーラ')
add('stat_speed','Velocidade','Speed','Velocidad','Vitesse','スピード')
add('stat_force','Força','Force','Fuerza','Force','パワー')
add('power_per_health','+{n} de vida máxima por nível','+{n} max health per level','+{n} de vida máxima por nivel','+{n} de vie max par niveau','レベルごとに最大HP+{n}')
add('power_per_aura','+{n}% de velocidade ao carregar aura','+{n}% aura charge speed','+{n}% de velocidad al cargar aura','+{n} % de vitesse de charge d’aura','オーラ溜め速度+{n}%')
add('power_per_speed','+{n}% de velocidade de movimento','+{n}% movement speed','+{n}% de velocidad de movimiento','+{n} % de vitesse de déplacement','移動速度+{n}%')
add('power_per_force','+{n}% de dano em todos os golpes','+{n}% damage on all attacks','+{n}% de daño en todos los golpes','+{n} % de dégâts sur tous les coups','全攻撃のダメージ+{n}%')
add('open_battle_shop','ITENS DE BATALHA','BATTLE ITEMS','OBJETOS DE BATALLA','OBJETS DE COMBAT','バトルアイテム')
add('shop_title_battle','LOJA DO MAXIMILIAN','MAXIMILIAN\'S SHOP','TIENDA DE MAXIMILIAN','BOUTIQUE DE MAXIMILIAN','マクシミリアンの店')
add('tower_enter','ENTRAR','ENTER','ENTRAR','ENTRER','入る')
add('tip_points',
 'Você tem pontos de status! Abra o menu de pausa, vá em STATUS e gaste em Pontos de Poder (Vida, Aura, Velocidade, Força) ou na Árvore de Habilidades.',
 'You have status points! Open the pause menu, go to STATUS and spend them on Power Points (Health, Aura, Speed, Force) or the Skill Tree.',
 '¡Tienes puntos de estado! Abre el menú de pausa, ve a ESTADO y gástalos en Puntos de Poder (Vida, Aura, Velocidad, Fuerza) o en el Árbol de Habilidades.',
 'Vous avez des points de statut ! Ouvrez le menu pause, allez dans STATUT et dépensez-les en Points de Puissance (Vie, Aura, Vitesse, Force) ou dans l’Arbre de Compétences.',
 'ステータスポイントがあります！ポーズメニューの「ステータス」で、パワーポイント（体力・オーラ・スピード・パワー）かスキルツリーに使いましょう。')


add('shop_day_battle','Estoque do dia: equipamentos de luta.','Day stock: battle gear.','Stock diurno: equipo de combate.','Stock du jour : équipement de combat.','昼の在庫：戦闘用の装備。')
add('shop_night_battle','Estoque da noite: poção noturna!','Night stock: night brew!','Stock nocturno: ¡poción nocturna!','Stock de nuit : potion nocturne !','夜の在庫：ナイトブリュー！')

import json, sys, os
LANGS=['pt','en','es','fr','ja']
def emit(path):
    out=["import type { Lang } from './translations';","","/** Textos novos da Parte 36 (mesclados ao STRINGS em translations.ts). */","export const STRINGS_36: Record<Lang, Record<string, string>> = {"]
    for i,l in enumerate(LANGS):
        out.append(f"  {l}: {{")
        for k,v in S.items(): out.append(f"    {k}: {json.dumps(v[i],ensure_ascii=False)},")
        out.append("  },")
    out.append("};"); out.append("")
    open(path,'w',encoding='utf8').write("\n".join(out))
if __name__=='__main__':
    emit(sys.argv[1]); print(len(S),'chaves')
