/**
 * MEMÓRIA DE COMBATE: o que o jogador FAZ de verdade durante UMA luta (golpes, especiais, itens, defesa, equipamento).
 * É a base da adaptação do Sea Beast (seaBeastBrain.ts). Pura e testável: só conta; quem decide o que fazer com os números
 * é o comportamento do chefe. Vale só durante a luta (não é salva) e continua a mesma entre as fases do mesmo confronto.
 */
export type AttackKind = 'flash' | 'strong' | 'ultimate';
export type ItemClass = 'heal' | 'buff' | 'offense' | 'other';

/** Quantos golpes recentes a janela de "dependência de um golpe só" considera. */
export const WINDOW = 12;

export interface GearInfo {
  critChance: number;
  /** multiplicador de dano de arma (1 = sem arma especial) */
  weaponMult: number;
  lifesteal: number;
  /** o jogador tem equipamento de mergulho que o protege da pressão ou do fôlego */
  divingGear: boolean;
}

export class CombatMemory {
  /** Quantas vezes cada golpe acertou em quem. */
  counts: Record<AttackKind, number> = { flash: 0, strong: 0, ultimate: 0 };
  /** Sequência seguida do mesmo golpe (zera quando muda). */
  streakKind: AttackKind | null = null;
  streak = 0;
  /** Janela dos últimos golpes (para detectar dependência de um golpe só). */
  recent: AttackKind[] = [];
  /** Itens consumidos por classe e por id. */
  itemUses: Record<ItemClass, number> = { heal: 0, buff: 0, offense: 0, other: 0 };
  itemById: Record<string, number> = {};
  /** Golpes do chefe que o jogador recebeu e quantos foram bloqueados. */
  beastHits = 0;
  beastBlocked = 0;
  gear: GearInfo | null = null;
  /** Tempo de luta observado (ms). */
  elapsed = 0;

  tick(dtMs: number) {
    this.elapsed += dtMs;
  }

  recordAttack(kind: AttackKind) {
    this.counts[kind] += 1;
    if (this.streakKind === kind) this.streak += 1;
    else {
      this.streakKind = kind;
      this.streak = 1;
    }
    this.recent.push(kind);
    if (this.recent.length > WINDOW) this.recent.shift();
  }

  recordItem(id: string, cls: ItemClass) {
    this.itemUses[cls] += 1;
    this.itemById[id] = (this.itemById[id] ?? 0) + 1;
  }

  /** O chefe acertou (ou o jogador bloqueou) um golpe dele. */
  recordBeastHit(blocked: boolean) {
    this.beastHits += 1;
    if (blocked) this.beastBlocked += 1;
  }

  observeGear(g: GearInfo) {
    this.gear = g;
  }

  /** Golpe BÁSICO que o jogador repete demais (mais de 70% da janela cheia), ou null. */
  spamKind(): AttackKind | null {
    if (this.recent.length < 8) return null;
    for (const k of ['flash', 'strong'] as AttackKind[]) {
      if (this.recent.filter((x) => x === k).length / this.recent.length > 0.7) return k;
    }
    return null;
  }

  /** Quantas vezes o jogador usou o especial (SUPER). */
  specialUses(): number {
    return this.counts.ultimate;
  }

  /** Taxa de bloqueio dos golpes do chefe (só vale com amostra mínima). */
  blockRate(): number {
    return this.beastHits >= 5 ? this.beastBlocked / this.beastHits : 0;
  }

  /** Equipamento que merece resposta: crítico alto ou arma forte. */
  gearReliant(): boolean {
    const g = this.gear;
    return !!g && (g.critChance >= 0.12 || g.weaponMult >= 1.15);
  }
}
