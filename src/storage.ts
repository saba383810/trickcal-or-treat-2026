// 記録と設定の保存。localStorage が使えない環境（プライベートモード等）でも落ちないようにする。
import type { RankId } from './config/balance';
import { CHAR_ORDER, type CharId } from './config/characters';

const KEY = 'trickcal-or-treat:v1';

export interface SaveData {
  /** キャラごとの最高スコア */
  best: Partial<Record<CharId, number>>;
  /** キャラごとの最高ランク */
  rank: Partial<Record<CharId, RankId>>;
  /** 遊んだ回数 */
  plays: number;
  /** 今までに取ったお菓子の数（称号） */
  sweets: number;
  /** スピキをなぐさめた回数（ヒントを出すのは最初の数回だけ） */
  comforts: number;
  lastChar: CharId;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  /** 画面の揺れを減らす */
  calm: boolean;
}

function defaults(): SaveData {
  return { best: {}, rank: {}, plays: 0, sweets: 0, comforts: 0, lastChar: 'kommy', sfxVolume: 0.8, bgmVolume: 0.5, muted: false, calm: false };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw) as Partial<SaveData>;
    const d = { ...defaults(), ...data, best: { ...(data.best ?? {}) }, rank: { ...(data.rank ?? {}) } };
    if (!CHAR_ORDER.includes(d.lastChar)) d.lastChar = 'kommy';
    return d;
  } catch {
    return defaults();
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても遊べる
  }
}
