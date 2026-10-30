// 操作できる 5 人（GiGO コラボ「トリッカル or トリート!!」の仮装）の性能。
// 倍率は BALANCE.player の値に掛ける。見た目は view/draw/characters.ts。

import type { ItemKind } from './balance';

export type CharId = 'kommy' | 'elfin' | 'butter' | 'yomi' | 'joanne';

export interface CharDef {
  id: CharId;
  /** 最高速度の倍率 */
  speed: number;
  /** 加速度の倍率（小さいほどすべる） */
  accel: number;
  /** キャッチの幅の倍率 */
  reach: number;
  /** ホバギに当たった時: guard = ひるまず減点半分・れんぞくそのまま / drain = 吸ってゲージ +1（減点なし） */
  hobagi: 'hit' | 'guard' | 'drain';
  /** フィーバーに必要なモカロンの数（省略で BALANCE.fever.need） */
  feverNeed?: number;
  /** お菓子の点数に足す（エルフィンはスターが好き） */
  bonus?: Partial<Record<ItemKind, number>>;
  /** フィーバーの秒数に足す */
  feverBonus?: number;
  /** 性能の目安（キャラえらびの★。1〜5） */
  stars: { speed: number; reach: number; easy: number };
}

export const CHARACTERS: Record<CharId, CharDef> = {
  kommy: {
    id: 'kommy',
    speed: 0.78,
    accel: 0.9,
    reach: 1.5,
    hobagi: 'hit',
    stars: { speed: 2, reach: 5, easy: 4 },
  },
  elfin: {
    id: 'elfin',
    speed: 1.5,
    accel: 0.7,
    reach: 1.1,
    hobagi: 'hit',
    bonus: { star: 10 },
    stars: { speed: 5, reach: 3, easy: 1 },
  },
  butter: {
    id: 'butter',
    speed: 0.96,
    accel: 1.0,
    reach: 1.0,
    hobagi: 'guard',
    stars: { speed: 3, reach: 3, easy: 5 },
  },
  yomi: {
    id: 'yomi',
    speed: 0.96,
    accel: 0.8,
    reach: 1.0,
    hobagi: 'hit',
    feverNeed: 4,
    stars: { speed: 3, reach: 3, easy: 3 },
  },
  joanne: {
    id: 'joanne',
    speed: 1.08,
    accel: 1.1,
    reach: 0.72,
    hobagi: 'drain',
    stars: { speed: 4, reach: 2, easy: 2 },
  },
};

export const CHAR_ORDER: CharId[] = ['kommy', 'elfin', 'butter', 'yomi', 'joanne'];

/** ジョアンがホバギを吸っている間、動けない秒数 */
export const DRAIN_FREEZE = 0.5;
