// 記録と設定の保存。localStorage が使えない環境（プライベートモード等）でも落ちないようにする。
import type { RankId } from './config/balance';
import { CHAR_ORDER, type CharId } from './config/characters';
import type { CourseId } from './config/rules';

const KEY = 'trickcal-or-treat:v1';

/** ほっぺを引っぱる相手（スピキとスピッキーはまとめて spiki） */
export type CheekWho = CharId | 'spiki';

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
  /** キャラごとの遊んだ回数（どのコースでも） */
  charPlays: Partial<Record<CharId, number>>;
  /** まよなかモードのベストとランク */
  night: { best: Partial<Record<CharId, number>>; rank: Partial<Record<CharId, RankId>> };
  /** 今夜のおかし: その日の日付と、その日のベスト（日付が変わると消える） */
  daily: { day: string; best: Partial<Record<CharId, number>> };
  /** 今夜のおかしを遊んだ日数 */
  dailyDays: number;
  /** クリアしたミッション（id） */
  missions: string[];
  /** ミッションの、1 回でのさいこう記録（あと少し、を見せる） */
  missionBest: Record<string, number>;
  /** れんしゅう（チュートリアル）を終えた */
  tutorialDone: boolean;
  /** ほっぺ: のばした回数・めいっぱいのばした回数・しつこく引っぱってひとこと言われた回数・相手ごとの回数 */
  cheek: { pulls: number; big: number; sulks: number; by: Partial<Record<CheekWho, number>> };
  /** 見つけたセリフ（キャラ.種類） */
  lines: string[];
  lastChar: CharId;
  lastCourse: CourseId;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  /** 画面の揺れを減らす */
  calm: boolean;
}

function defaults(): SaveData {
  return {
    best: {},
    rank: {},
    plays: 0,
    sweets: 0,
    comforts: 0,
    charPlays: {},
    night: { best: {}, rank: {} },
    daily: { day: '', best: {} },
    dailyDays: 0,
    missions: [],
    missionBest: {},
    tutorialDone: false,
    cheek: { pulls: 0, big: 0, sulks: 0, by: {} },
    lines: [],
    lastChar: 'kommy',
    lastCourse: 'normal',
    sfxVolume: 0.8,
    bgmVolume: 0.5,
    muted: false,
    calm: false,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw) as Partial<SaveData>;
    const d: SaveData = {
      ...defaults(),
      ...data,
      best: { ...(data.best ?? {}) },
      rank: { ...(data.rank ?? {}) },
      charPlays: { ...(data.charPlays ?? {}) },
      night: { best: { ...(data.night?.best ?? {}) }, rank: { ...(data.night?.rank ?? {}) } },
      daily: { day: data.daily?.day ?? '', best: { ...(data.daily?.best ?? {}) } },
      missions: [...(data.missions ?? [])],
      missionBest: { ...(data.missionBest ?? {}) },
      cheek: { ...defaults().cheek, ...data.cheek, by: { ...(data.cheek?.by ?? {}) } },
      lines: [...(data.lines ?? [])],
    };
    if (!CHAR_ORDER.includes(d.lastChar)) d.lastChar = 'kommy';
    if (!['normal', 'daily', 'night'].includes(d.lastCourse)) d.lastCourse = 'normal';
    // 前の版の記録: もう遊んだことがあれば、れんしゅうは出さない（あそびかたから できる）
    if (data.tutorialDone === undefined) d.tutorialDone = d.plays > 0;
    // 前の版の記録: ベストがあるキャラは 1 回は遊んでいる
    if (!data.charPlays) for (const id of CHAR_ORDER) if (d.best[id] !== undefined) d.charPlays[id] = 1;
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
