import { BALANCE } from '../src/config/balance';
import type { Item, World } from '../src/sim/world';

// バランス調整用のボット。見えたお菓子のうち間に合うものを先読みして追いかけ、ホバギは予測してよける。
// 腕前は「気づくまでの遅れ」「狙いのぶれ」「ホバギに気づく確率」「速さをどこまで使うか」で変える。

export interface Skill {
  name: string;
  /** 出てから気づくまでの秒 */
  reaction: number;
  /** 狙う x のぶれ（標準偏差） */
  noise: number;
  /** ホバギに気づく確率（1 個ごと） */
  aware: number;
  /** 泣いたスピキをなぐさめる確率と、何レベルまで待つか */
  comfort: number;
  comfortLevel: number;
  /** 2 個先まで考える */
  lookahead: boolean;
  /** 最高速度のうち使う割合 */
  speedUse: number;
  /** 考え直す間隔（秒） */
  think: number;
}

export const SKILLS: Skill[] = [
  { name: '初心者', reaction: 0.38, noise: 0.035, aware: 0.6, comfort: 0.5, comfortLevel: 1, lookahead: false, speedUse: 0.78, think: 0.12 },
  { name: 'ふつう', reaction: 0.24, noise: 0.022, aware: 0.85, comfort: 0.85, comfortLevel: 1, lookahead: true, speedUse: 0.9, think: 0.08 },
  { name: '上手い', reaction: 0.14, noise: 0.01, aware: 0.97, comfort: 1, comfortLevel: 2, lookahead: true, speedUse: 1, think: 0.05 },
];

const VALUE: Record<Item['kind'], number> = { candy: 10, star: 20, mokaron: 45, shucaron: 50, hobagi: 0 };

export class Bot {
  private nextThink = 0;
  private target = 0.5;
  private aware = new Map<number, boolean>();
  private comfortAt = -1;

  constructor(
    private w: World,
    private skill: Skill,
    private rand: () => number,
  ) {}

  private gauss(): number {
    return (this.rand() + this.rand() + this.rand() - 1.5) * 1.4;
  }

  /** キャッチの高さに届くまでの秒（届かない・過ぎたなら null） */
  private arrive(it: Item): number | null {
    const dy = this.w.catchY - it.y;
    if (it.passed) return null;
    if (dy <= 0) return 0;
    if (it.ay === 0) return it.vy > 0 ? dy / it.vy : null;
    const disc = it.vy * it.vy + 2 * it.ay * dy;
    if (disc < 0) return null;
    return (-it.vy + Math.sqrt(disc)) / it.ay;
  }

  private maxV(): number {
    return BALANCE.player.speed * this.w.char.speed * this.skill.speedUse;
  }

  step(): void {
    const w = this.w;
    if (w.time >= this.nextThink) {
      this.nextThink = w.time + this.skill.think;
      this.plan();
    }
    w.input.target = this.target;
    this.handleSpiki();
  }

  private plan(): void {
    const w = this.w;
    const p = w.player;
    const vmax = this.maxV();
    const reach = w.reach * 0.75;
    const seen = w.items.filter((it) => it.age >= this.skill.reaction && !it.passed);
    const goods: { x: number; t: number; v: number }[] = [];
    const bad: { x: number; t: number; r: number }[] = [];
    for (const it of seen) {
      const t = this.arrive(it);
      if (t === null) continue;
      const x = it.x + it.vx * t;
      if (it.kind === 'hobagi') {
        if (!this.aware.has(it.id)) this.aware.set(it.id, this.rand() < this.skill.aware);
        if (this.aware.get(it.id)) bad.push({ x, t, r: BALANCE.radius.hobagi });
        continue;
      }
      goods.push({ x, t, v: VALUE[it.kind] });
    }
    const can = (from: number, x: number, t: number) => Math.max(0, Math.abs(x - from) - reach) <= vmax * Math.max(0, t - 0.03);
    let best: { x: number; score: number } | null = null;
    if (this.skill.lookahead) {
      // 届く順に並べ、どれを順に取ると点が最大になるかを動的計画法で（上手い人の先読み）
      goods.sort((a, b) => a.t - b.t);
      const n = goods.length;
      const f = new Array<number>(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let more = 0;
        for (let j = i + 1; j < n; j++) if (can(goods[i].x, goods[j].x, goods[j].t - goods[i].t)) more = Math.max(more, f[j]);
        f[i] = goods[i].v + more;
      }
      for (let i = 0; i < n; i++) {
        if (!can(p.x, goods[i].x, goods[i].t)) continue;
        if (!best || f[i] > best.score) best = { x: goods[i].x, score: f[i] };
      }
    } else {
      for (const a of goods) {
        if (!can(p.x, a.x, a.t)) continue;
        const score = a.v / (1 + a.t * 0.8);
        if (!best || score > best.score) best = { x: a.x, score };
      }
    }
    let target = best ? best.x + this.gauss() * this.skill.noise : this.target;
    // ホバギが届く時刻の自分の位置を予測して、重なるならよける
    for (const h of bad) {
      if (h.t > 0.9) continue;
      const d = target - p.x;
      const at = p.x + Math.sign(d) * Math.min(Math.abs(d), vmax * h.t);
      const safe = w.body + h.r + 0.025;
      if (Math.abs(at - h.x) < safe) {
        const left = h.x - safe - 0.02;
        const right = h.x + safe + 0.02;
        const pick = Math.abs(left - p.x) < Math.abs(right - p.x) ? left : right;
        target = pick < 0.05 ? right : pick > 0.95 ? left : pick;
      }
    }
    this.target = Math.max(0, Math.min(1, target));
  }

  private handleSpiki(): void {
    const w = this.w;
    if (!w.crying) {
      this.comfortAt = -1;
      return;
    }
    if (this.comfortAt < 0) {
      if (this.rand() > this.skill.comfort) {
        this.comfortAt = Infinity;
        return;
      }
      this.comfortAt = w.time + 0.4 + this.rand() * 0.8;
    }
    const wantMore = w.spiki.level < this.skill.comfortLevel && w.spiki.cry > 1.2;
    if (w.time >= this.comfortAt && !wantMore) w.comfort();
  }
}
