// お菓子の降らせ方。1 個ずつ・列・ジグザグ・欲ばり罠・ホバギの雨などのパターンを、進み具合で重みを変えて選ぶ。
import type { ItemKind } from '../config/balance';
import type { Rng } from './rng';
import type { World } from './world';

/** 予約するお菓子（at = 出す時刻。vx 以下はおかえしの放物線用） */
export interface Spawn {
  at: number;
  kind: ItemKind;
  x: number;
  y?: number;
  vx?: number;
  vy?: number;
  ay?: number;
  gift?: boolean;
}

type Push = (s: Spawn) => void;

const MIN_X = 0.07;
const MAX_X = 0.93;

function cx(x: number): number {
  return Math.max(MIN_X, Math.min(MAX_X, x));
}

function rx(r: Rng, lo = 0.1, hi = 0.9): number {
  return r.range(lo, hi);
}

/** ふつうのお菓子（キャンディかスター。後半ほどスターが増える） */
function sweet(w: World): ItemKind {
  const star = 0.2 + 0.12 * w.progress + (w.spurt ? 0.12 : 0);
  return w.rng.next() < star ? 'star' : 'candy';
}

interface Pattern {
  name: string;
  /** 重み（進み具合 u で変える） */
  weight: (u: number, w: World) => number;
  /** 予約して、パターンの長さ（秒）を返す */
  run: (w: World, t: number, push: Push) => number;
}

const PATTERNS: Pattern[] = [
  {
    name: 'single',
    weight: () => 2.2,
    run: (w, t, push) => {
      push({ at: t, kind: sweet(w), x: rx(w.rng) });
      return 0.2;
    },
  },
  {
    name: 'scatter',
    weight: () => 1.6,
    run: (w, t, push) => {
      // 2〜3 個を離して同時に（どれを取るか選ぶ）
      const n = w.rng.next() < 0.5 ? 2 : 3;
      const xs = spread(w.rng, n, 0.22);
      xs.forEach((x, i) => push({ at: t + i * 0.05, kind: sweet(w), x }));
      return 0.35;
    },
  },
  {
    name: 'stream',
    weight: () => 2.6,
    run: (w, t, push) => {
      // 左右へ流れる列。追いかけると気持ちいい。最後の 1 個はスター
      const n = 5 + Math.floor(w.progress * 3);
      const dir = w.rng.next() < 0.5 ? -1 : 1;
      const step = w.rng.range(0.075, 0.11);
      const x0 = dir > 0 ? w.rng.range(0.08, 0.92 - step * (n - 1)) : w.rng.range(0.08 + step * (n - 1), 0.92);
      const dt = 0.15;
      for (let i = 0; i < n; i++) push({ at: t + i * dt, kind: i === n - 1 ? 'star' : 'candy', x: cx(x0 + dir * step * i) });
      return n * dt;
    },
  },
  {
    name: 'zigzag',
    weight: (u) => (u > 0.15 ? 1.4 : 0),
    run: (w, t, push) => {
      const n = 7;
      const c = w.rng.range(0.3, 0.7);
      const a = w.rng.range(0.12, 0.2);
      const dt = 0.14;
      for (let i = 0; i < n; i++) {
        const tri = [0, 1, 0, -1][i % 4];
        push({ at: t + i * dt, kind: i === 3 ? 'star' : 'candy', x: cx(c + a * tri) });
      }
      return n * dt;
    },
  },
  {
    name: 'trap',
    weight: (u) => (u > 0.1 ? 0.6 + 1.2 * u : 0),
    run: (w, t, push) => {
      // スターをホバギがはさむ（欲ばると当たる）。片側だけのことも
      const x = rx(w.rng, 0.18, 0.82);
      push({ at: t, kind: 'star', x });
      const both = w.rng.next() < 0.4 + 0.3 * w.progress;
      const side = w.rng.next() < 0.5 ? -1 : 1;
      const gap = w.rng.range(0.1, 0.13);
      push({ at: t - 0.12, kind: 'hobagi', x: cx(x + side * gap) });
      if (both) push({ at: t + 0.05, kind: 'hobagi', x: cx(x - side * gap) });
      return 0.5;
    },
  },
  {
    name: 'hobagiRain',
    weight: (u) => (u > 0.22 ? 1.0 * u : 0),
    run: (w, t, push) => {
      // ホバギが 2〜3 個。すき間にキャンディ（くぐって取る）
      const n = w.progress > 0.55 ? 3 : 2;
      const xs = spread(w.rng, n, 0.24);
      xs.forEach((x, i) => push({ at: t + i * 0.28, kind: 'hobagi', x }));
      const sorted = [...xs].sort((a, b) => a - b);
      const k = w.rng.int(n - 1);
      push({ at: t + 0.2, kind: 'candy', x: (sorted[k] + sorted[k + 1]) / 2 });
      return 0.3 * n + 0.2;
    },
  },
  {
    name: 'lone',
    weight: (u) => 0.5 + 0.6 * u,
    run: (w, t, push) => {
      // ホバギ 1 個。半分はプレイヤーの近くへ（よけさせる）。少し離してキャンディ
      const near = w.rng.next() < 0.5;
      const x = near ? cx(w.player.x + w.rng.range(-0.06, 0.06)) : rx(w.rng);
      push({ at: t, kind: 'hobagi', x });
      const side = x < 0.5 ? 1 : -1;
      push({ at: t + 0.1, kind: 'candy', x: cx(x + side * w.rng.range(0.16, 0.26)) });
      return 0.35;
    },
  },
  {
    name: 'choice',
    weight: (u) => (u > 0.25 ? 1.0 : 0),
    run: (w, t, push) => {
      // 片側にキャンディのかたまり、反対側にスター 2 個（近いほうか、高いほうか）
      const left = w.rng.next() < 0.5;
      const a = left ? w.rng.range(0.1, 0.3) : w.rng.range(0.7, 0.9);
      const b = 1 - a;
      for (let i = 0; i < 3; i++) push({ at: t + i * 0.08, kind: 'candy', x: cx(a + (i - 1) * 0.045) });
      push({ at: t + 0.04, kind: 'star', x: cx(b - 0.03) });
      push({ at: t + 0.16, kind: 'star', x: cx(b + 0.03) });
      return 0.45;
    },
  },
];

/** n 個の x を、互いに min 以上離して選ぶ */
function spread(r: Rng, n: number, min: number): number[] {
  for (let tries = 0; tries < 30; tries++) {
    const xs = Array.from({ length: n }, () => r.range(0.1, 0.9));
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = i + 1; j < n; j++) if (Math.abs(xs[i] - xs[j]) < min) ok = false;
    if (ok) return xs;
  }
  return Array.from({ length: n }, (_, i) => 0.15 + (0.7 * i) / Math.max(1, n - 1));
}

/** 次のふつうのパターンを選んで予約し、長さ（秒）を返す */
export function normalPattern(w: World, t: number, push: Push): number {
  const u = w.progress;
  const weights = PATTERNS.map((p) => p.weight(u, w));
  // ラストスパートはホバギ少なめ・お菓子多め
  if (w.spurt) PATTERNS.forEach((p, i) => (weights[i] *= p.name === 'stream' || p.name === 'zigzag' || p.name === 'scatter' ? 1.5 : p.name === 'hobagiRain' ? 0.6 : 1));
  const p = PATTERNS[w.rng.weighted(weights)];
  return p.run(w, t, push);
}

/**
 * フィーバー中のシューカロンの x。2.3 秒ごとに形を変える: 波 / ジグザグ / 左右交互 / 大雨。
 * t = フィーバーが始まってからの秒
 */
export function feverX(t: number, r: Rng, _len: number): number {
  const seg = Math.floor(t / 2.3);
  const k = t - seg * 2.3;
  switch (seg % 4) {
    case 0:
      return cx(0.5 + 0.36 * Math.sin(k * 2.6));
    case 1: {
      const ph = (k * 0.75) % 2;
      return cx(0.14 + 0.72 * (ph < 1 ? ph : 2 - ph));
    }
    case 2:
      return cx(Math.floor(k / 0.16) % 2 ? 0.3 + 0.08 * Math.sin(k * 3) : 0.7 - 0.08 * Math.sin(k * 3));
    default:
      return cx(r.range(0.12, 0.88));
  }
}
