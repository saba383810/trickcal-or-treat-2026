// ゲームの数値はここに集める（ボット `npm run sim` で調整する）。
// フィールドは横 0〜1（左端〜右端）、縦 0〜1（上端〜地面）の正規化座標。
// 落ちる速さは「上端からキャッチの高さまで何秒で届くか」で決めるので、画面の縦横比が変わっても難しさは同じ。

export type ItemKind = 'candy' | 'star' | 'mokaron' | 'shucaron' | 'hobagi';

export const BALANCE = {
  /** 1 回の制限時間（秒） */
  duration: 60,
  /** この残り秒数からラストスパート */
  lastSpurt: 15,

  points: { candy: 10, star: 20, mokaron: 10, shucaron: 50, hobagi: -20 } satisfies Record<ItemKind, number>,

  /** 上端からキャッチの高さまでの秒数 [はじめ, おわり]（進み具合で補間） */
  fall: {
    candy: [2.5, 1.7],
    star: [2.2, 1.5],
    mokaron: [2.8, 2.1],
    shucaron: [1.75, 1.75],
    hobagi: [2.4, 1.65],
  } satisfies Record<ItemKind, [number, number]>,

  /** 当たり判定の半径（フィールド幅に対する割合） */
  radius: { candy: 0.026, star: 0.03, mokaron: 0.03, shucaron: 0.03, hobagi: 0.042 } satisfies Record<ItemKind, number>,

  /** ホバギの落ち始めの速さ（等速で落ちた場合に対する割合）。残りは重さで加速する */
  hobagiStart: 0.25,

  /** キャッチの高さから上・下に何まで取れるか（縦の正規化座標） */
  band: { above: 0.07, below: 0.08 },

  /** 動ける範囲（キャラの中心）。左右の端に寄りすぎない */
  edge: 0.045,

  player: {
    /** 最高速度（フィールド幅 / 秒） */
    speed: 1.0,
    /** 加速度（フィールド幅 / 秒²）。小さいほどすべる */
    accel: 7.5,
    /** キャッチの半幅（フィールド幅に対する割合。頭の半径より少し広い） */
    reach: 0.06,
    /** 指・カーソルを追う強さ（離れているほど速く。1/秒） */
    follow: 14,
  },

  /** れんぞくキャッチ: window 秒以内に次を取るとつながる。step 個ごとに倍率 +per（max まで） */
  chain: { window: 1.5, step: 10, per: 0.1, max: 2.0 },

  /** ホバギに当たってひるむ秒数（キャッチできない・動きが鈍る） */
  stun: 0.9,
  /** ひるんでいる間の速さの倍率 */
  stunSpeed: 0.35,

  fever: {
    /** フィーバーに必要なモカロンの数 */
    need: 5,
    /** 秒数 */
    duration: 6,
    /** シューカロンが降る間隔（秒） */
    interval: 0.24,
    /** キャッチの幅の倍率 */
    reach: 1.3,
    /** 終わってから、ふつうのお菓子が降り始めるまで（秒） */
    breath: 0.6,
  },

  spiki: {
    /** 泣いている秒数（もう 1 個落ちると延びる） */
    cry: 3.5,
    /** 泣きレベルの上限 */
    maxLevel: 3,
    /** なぐさめた時のおかえしの数 [レベル 0, 1, 2, 3] */
    gift: [0, 3, 6, 10],
    /** おかえしの中のモカロンの数 */
    giftMokaron: [0, 1, 1, 2],
    /** おかえしが飛んでいる秒数 [最短, 最長] */
    flight: [1.15, 1.7],
    /** おかえしを投げる間隔（秒） */
    throwGap: 0.09,
    /** にっこりしている秒数（そのあとスピッキーに戻る） */
    happy: 1.4,
    /** スピッキーのいる場所（フィールド座標）。おかえしはここから投げる */
    x: 0.86,
    y: 0.56,
  },

  /** お菓子を降らせる間隔（パターンとパターンの間の秒数） [はじめ, おわり] */
  gap: [0.6, 0.28],
  /** ラストスパート中の間隔の倍率 */
  spurtGap: 0.7,
  /** モカロンが来る間隔（秒） [最短, 最長] */
  mokaronEvery: [3.8, 5.0],
  /** 最初のモカロン（秒） */
  firstMokaron: 2.5,
} as const;

/** 0〜1 の進み具合で [はじめ, おわり] を補間 */
export function lerp2(pair: readonly [number, number], u: number): number {
  return pair[0] + (pair[1] - pair[0]) * Math.min(1, Math.max(0, u));
}

/** れんぞく数 → 倍率 */
export function chainMultiplier(chain: number): number {
  const c = BALANCE.chain;
  return Math.min(c.max, 1 + c.per * Math.floor(chain / c.step));
}

/** ランク（下限の点数）。ボットで調整する */
export const RANKS = [
  { id: 'SS', min: 10500 },
  { id: 'S', min: 8000 },
  { id: 'A', min: 5500 },
  { id: 'B', min: 3000 },
  { id: 'C', min: 0 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

export function rankOf(score: number): RankId {
  for (const r of RANKS) if (score >= r.min) return r.id;
  return 'C';
}

/** 累計のおかしの称号 */
export const TITLES = [
  { id: 'platinum', min: 10000 },
  { id: 'gold', min: 6000 },
  { id: 'silver', min: 3000 },
  { id: 'bronze', min: 500 },
] as const;

export type TitleId = (typeof TITLES)[number]['id'];

export function titleOf(total: number): TitleId | null {
  for (const t of TITLES) if (total >= t.min) return t.id;
  return null;
}
