// おねがい（小さな目標）。リストの順に 3 つずつ出て、たっせいすると次のおねがいが出る。
// たっせいすると、ごほうびのおかしが「今までのおかし」（称号）に足される。
import { RANKS, type RankId } from './balance';
import type { CharId } from './characters';
import type { CourseId } from './rules';
import type { Stats } from '../sim/world';
import type { SaveData } from '../storage';

/** 1 回のプレイ（遊んでいる途中でも作れる） */
export interface Play {
  char: CharId;
  course: CourseId;
  score: number;
  stats: Stats;
}

export interface Mission {
  id: string;
  text: string;
  goal: number;
  /** ごほうびのおかし */
  reward: number;
  /** 1 回のプレイで数える */
  play?: (p: Play) => number;
  /** 記録（何人で遊んだか など）で数える */
  total?: (s: SaveData) => number;
  /** 遊んでいる途中で数が減らない。たっせいした時にゲームの画面に出す */
  live?: boolean;
  /** このキャラで遊んだ時だけ */
  char?: CharId;
  /** このコースで遊んだ時だけ */
  course?: CourseId;
}

/** 一度にならぶおねがいの数 */
export const MISSION_SLOTS = 3;

const sweets = (s: Stats) => s.caught.candy + s.caught.star + s.caught.mokaron + s.caught.shucaron;
const rankMin = (id: RankId) => RANKS.find((r) => r.id === id)!.min;
const atLeast = (r: RankId | undefined, id: RankId) => r !== undefined && rankMin(r) >= rankMin(id);
const count = <T>(rec: Partial<Record<CharId, T>>, ok: (v: T) => boolean) => Object.values(rec).filter((v) => v !== undefined && ok(v as T)).length;

/** 遊んでいる途中で数えられるもの */
const live = (id: string, text: string, goal: number, reward: number, play: (p: Play) => number, more: Partial<Mission> = {}): Mission => ({
  id,
  text,
  goal,
  reward,
  play,
  live: true,
  ...more,
});

/** ランク（おしまいで決まる） */
const rank = (id: string, r: RankId, reward: number, more: Partial<Mission> = {}): Mission => ({
  id,
  text: `ランク ${r} を とる（${rankMin(r).toLocaleString('ja-JP')}点）`,
  goal: rankMin(r),
  reward,
  play: (p) => p.score,
  ...more,
});

export const MISSIONS: Mission[] = [
  { id: 'first', text: 'さいごまで あそぶ', goal: 1, reward: 20, play: () => 1 },
  live('candy15', 'キャンディを 15こ キャッチ', 15, 20, (p) => p.stats.caught.candy),
  live('comfort1', '泣いたスピキを なぐさめる', 1, 20, (p) => p.stats.comforts),
  live('fever1', 'フィーバーに なる', 1, 30, (p) => p.stats.fevers),
  live('chain20', 'れんぞく 20', 20, 30, (p) => p.stats.maxChain),
  rank('rankB', 'B', 30),
  live('star8', 'スターキャンディを 8こ キャッチ', 8, 30, (p) => p.stats.caught.star),
  live('dodge8', 'ホバギを 8こ よける', 8, 30, (p) => p.stats.cries),
  { id: 'chars2', text: '2人で あそぶ', goal: 2, reward: 30, total: (s) => count(s.charPlays, (n) => n > 0) },
  live('shuca15', 'シューカロンを 15こ キャッチ', 15, 30, (p) => p.stats.caught.shucaron),
  live('gift6', 'スピキの おかえしを 6こ キャッチ', 6, 40, (p) => p.stats.gifts),
  { id: 'daily1', text: '「今夜のおかし」で あそぶ', goal: 1, reward: 40, play: () => 1, course: 'daily' },
  live('chain40', 'れんぞく 40', 40, 40, (p) => p.stats.maxChain),
  live('comfortLv2', 'スピキが 2かい 泣いてから なぐさめる', 2, 40, (p) => p.stats.maxComfort),
  live('fever2', '1かいで フィーバー 2かい', 2, 40, (p) => p.stats.fevers),
  live('sweets100', '1かいで おかしを 100こ キャッチ', 100, 40, (p) => sweets(p.stats)),
  rank('rankA', 'A', 50),
  live('elfinStar', 'エルフィンで スターキャンディを 15こ', 15, 50, (p) => p.stats.caught.star, { char: 'elfin' }),
  live('butterGuard', 'バターで ホバギを 3かい うけとめる', 3, 50, (p) => p.stats.hits, { char: 'butter' }),
  { id: 'chars5', text: '5人 ぜんいんで あそぶ', goal: 5, reward: 50, total: (s) => count(s.charPlays, (n) => n > 0) },
  live('kommyChain', 'コミーで れんぞく 50', 50, 50, (p) => p.stats.maxChain, { char: 'kommy' }),
  live('comfort5', '1かいで スピキを 5かい なぐさめる', 5, 50, (p) => p.stats.comforts),
  live('yomiFever', 'ヨミで フィーバー 3かい', 3, 50, (p) => p.stats.fevers, { char: 'yomi' }),
  { id: 'noHit', text: 'ホバギに 1かいも 当たらずに 3,000点', goal: 1, reward: 60, play: (p) => (p.stats.hits === 0 && p.score >= 3000 ? 1 : 0) },
  live('joanneDrain', 'ジョアンで ホバギを 3こ 吸う', 3, 60, (p) => p.stats.caught.hobagi, { char: 'joanne' }),
  live('comfortLv3', 'スピキが 3かい 泣いてから なぐさめる', 3, 60, (p) => p.stats.maxComfort),
  live('chain80', 'れんぞく 80', 80, 60, (p) => p.stats.maxChain),
  live('feverScore', 'フィーバー中に 3,000点', 3000, 60, (p) => p.stats.feverScore),
  { id: 'daily3', text: '「今夜のおかし」を 3日 あそぶ', goal: 3, reward: 100, total: (s) => s.dailyDays },
  rank('rankS', 'S', 80),
  { id: 'allA', text: '5人 ぜんいんで ランク A（ふつう）', goal: 5, reward: 100, total: (s) => count(s.rank, (r) => atLeast(r, 'A')) },
  live('sweets180', '1かいで おかしを 180こ キャッチ', 180, 80, (p) => sweets(p.stats)),
  { id: 'night1', text: '「まよなか」で あそぶ', goal: 1, reward: 80, play: () => 1, course: 'night' },
  live('chain150', 'れんぞく 150', 150, 100, (p) => p.stats.maxChain),
  rank('nightA', 'A', 100, { text: '「まよなか」で ランク A を とる', course: 'night' }),
  rank('rankSS', 'SS', 150),
  { id: 'allS', text: '5人 ぜんいんで ランク S（ふつう）', goal: 5, reward: 200, total: (s) => count(s.rank, (r) => atLeast(r, 'S')) },
  rank('nightS', 'S', 200, { text: '「まよなか」で ランク S を とる', course: 'night' }),
];

/** いまのおねがい（まだのものから、リストの順に） */
export function activeMissions(save: SaveData): Mission[] {
  const done = new Set(save.missions);
  return MISSIONS.filter((m) => !done.has(m.id)).slice(0, MISSION_SLOTS);
}

/** このキャラ・コースのプレイで数えるおねがい（記録で数えるものは入らない） */
export function fits(m: Mission, char: CharId, course: CourseId): boolean {
  return m.play !== undefined && (!m.char || m.char === char) && (!m.course || m.course === course);
}

/** このプレイでの値（キャラ・コースがちがえば 0） */
export function playValue(m: Mission, p: Play): number {
  return fits(m, p.char, p.course) ? m.play!(p) : 0;
}

/** いまの進み具合（1 回でのさいこう、または記録） */
export function progressOf(m: Mission, save: SaveData): number {
  return m.total ? m.total(save) : (save.missionBest[m.id] ?? 0);
}

/**
 * 遊び終わった時に、いまのおねがいを判定する（記録はこのプレイの分を足してから呼ぶ）。
 * たっせいしたものを返し、save に書きこむ（ごほうびのおかしも足す）
 */
export function judgeMissions(save: SaveData, p: Play): Mission[] {
  const cleared: Mission[] = [];
  for (const m of activeMissions(save)) {
    let v: number;
    if (m.total) v = m.total(save);
    else {
      v = playValue(m, p);
      save.missionBest[m.id] = Math.max(save.missionBest[m.id] ?? 0, v);
    }
    if (v >= m.goal) cleared.push(m);
  }
  for (const m of cleared) {
    save.missions.push(m.id);
    save.sweets += m.reward;
    delete save.missionBest[m.id];
  }
  return cleared;
}
