// ミッション（小さな目標）。リストの順に 3 つずつ出て、クリアすると次のミッションが出る。
// クリアすると、ごほうびのおかしが「今までのおかし」（称号）に足される。
import { RANKS, type RankId } from './balance';
import { CHAR_ORDER, type CharId } from './characters';
import type { CourseId } from './rules';
import { num, T } from '../i18n';
import type { Stats } from '../sim/world';
import type { SaveData } from '../storage';

/** 1 回のプレイ（遊んでいる途中でも作れる） */
export interface Play {
  char: CharId;
  course: CourseId;
  score: number;
  stats: Stats;
}

/** 文は T.missions.text（id ごと）。ランクのミッションは T.missions.rank で点数を入れる */
export interface Mission {
  id: string;
  goal: number;
  /** ごほうびのおかし */
  reward: number;
  /** 1 回のプレイで数える */
  play?: (p: Play) => number;
  /** 記録（何人で遊んだか など）で数える */
  total?: (s: SaveData) => number;
  /** 遊んでいる途中で数が減らない。クリアした時にゲームの画面に出す */
  live?: boolean;
  /** このキャラで遊んだ時だけ */
  char?: CharId;
  /** このコースで遊んだ時だけ */
  course?: CourseId;
  /** ランクのミッション（このランクの点数をとる） */
  rank?: RankId;
}

/** 一度にならぶミッションの数 */
export const MISSION_SLOTS = 3;

const sweets = (s: Stats) => s.caught.candy + s.caught.star + s.caught.mokaron + s.caught.shucaron;
const rankMin = (id: RankId) => RANKS.find((r) => r.id === id)!.min;
const atLeast = (r: RankId | undefined, id: RankId) => r !== undefined && rankMin(r) >= rankMin(id);
const count = <V>(rec: Partial<Record<CharId, V>>, ok: (v: V) => boolean) => Object.values(rec).filter((v) => v !== undefined && ok(v as V)).length;

/** 遊んでいる途中で数えられるもの */
const live = (id: string, goal: number, reward: number, play: (p: Play) => number, more: Partial<Mission> = {}): Mission => ({
  id,
  goal,
  reward,
  play,
  live: true,
  ...more,
});

/** ランク（おしまいで決まる） */
const rank = (id: string, r: RankId, reward: number, more: Partial<Mission> = {}): Mission => ({
  id,
  rank: r,
  goal: rankMin(r),
  reward,
  play: (p) => p.score,
  ...more,
});

export const MISSIONS: Mission[] = [
  { id: 'first', goal: 1, reward: 20, play: () => 1 },
  live('candy15', 15, 20, (p) => p.stats.caught.candy),
  live('comfort1', 1, 20, (p) => p.stats.comforts),
  live('fever1', 1, 30, (p) => p.stats.fevers),
  live('chain20', 20, 30, (p) => p.stats.maxChain),
  rank('rankB', 'B', 30),
  live('star8', 8, 30, (p) => p.stats.caught.star),
  live('dodge8', 8, 30, (p) => p.stats.cries),
  { id: 'chars2', goal: 2, reward: 30, total: (s) => count(s.charPlays, (n) => n > 0) },
  { id: 'cheek10', goal: 10, reward: 20, total: (s) => s.cheek.pulls },
  live('shuca15', 15, 30, (p) => p.stats.caught.shucaron),
  live('gift6', 6, 40, (p) => p.stats.gifts),
  { id: 'daily1', goal: 1, reward: 40, play: () => 1, course: 'daily' },
  live('chain40', 40, 40, (p) => p.stats.maxChain),
  live('comfortLv2', 2, 40, (p) => p.stats.maxComfort),
  live('fever2', 2, 40, (p) => p.stats.fevers),
  live('sweets100', 100, 40, (p) => sweets(p.stats)),
  rank('rankA', 'A', 50),
  live('elfinStar', 15, 50, (p) => p.stats.caught.star, { char: 'elfin' }),
  live('butterGuard', 3, 50, (p) => p.stats.hits, { char: 'butter' }),
  { id: 'chars5', goal: 5, reward: 50, total: (s) => count(s.charPlays, (n) => n > 0) },
  { id: 'cheekAll', goal: 5, reward: 40, total: (s) => CHAR_ORDER.filter((c) => (s.cheek.by[c] ?? 0) > 0).length },
  { id: 'lines10', goal: 10, reward: 50, total: (s) => s.lines.length },
  live('kommyChain', 50, 50, (p) => p.stats.maxChain, { char: 'kommy' }),
  live('comfort5', 5, 50, (p) => p.stats.comforts),
  live('yomiFever', 3, 50, (p) => p.stats.fevers, { char: 'yomi' }),
  { id: 'noHit', goal: 1, reward: 60, play: (p) => (p.stats.hits === 0 && p.score >= 3000 ? 1 : 0) },
  live('joanneDrain', 3, 60, (p) => p.stats.caught.hobagi, { char: 'joanne' }),
  live('comfortLv3', 3, 60, (p) => p.stats.maxComfort),
  { id: 'cheekSulk', goal: 1, reward: 30, total: (s) => s.cheek.sulks },
  live('chain80', 80, 60, (p) => p.stats.maxChain),
  live('feverScore', 3000, 60, (p) => p.stats.feverScore),
  { id: 'daily3', goal: 3, reward: 100, total: (s) => s.dailyDays },
  { id: 'cheek100', goal: 100, reward: 60, total: (s) => s.cheek.pulls },
  { id: 'lines30', goal: 30, reward: 100, total: (s) => s.lines.length },
  rank('rankS', 'S', 80),
  { id: 'allA', goal: 5, reward: 100, total: (s) => count(s.rank, (r) => atLeast(r, 'A')) },
  live('sweets180', 180, 80, (p) => sweets(p.stats)),
  { id: 'night1', goal: 1, reward: 80, play: () => 1, course: 'night' },
  live('chain150', 150, 100, (p) => p.stats.maxChain),
  rank('nightA', 'A', 100, { course: 'night' }),
  rank('rankSS', 'SS', 150),
  { id: 'allS', goal: 5, reward: 200, total: (s) => count(s.rank, (r) => atLeast(r, 'S')) },
  rank('nightS', 'S', 200, { course: 'night' }),
];

/** ミッションの文（いまの言語） */
export function missionText(m: Mission): string {
  const text: Record<string, string | undefined> = T.missions.text;
  return text[m.id] ?? (m.rank ? T.missions.rank(m.rank, num(rankMin(m.rank))) : m.id);
}

/** いまのミッション（まだのものから、リストの順に） */
export function activeMissions(save: SaveData): Mission[] {
  const done = new Set(save.missions);
  return MISSIONS.filter((m) => !done.has(m.id)).slice(0, MISSION_SLOTS);
}

/** このキャラ・コースのプレイで数えるミッション（記録で数えるものは入らない） */
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
 * 遊び終わった時に、いまのミッションを判定する（記録はこのプレイの分を足してから呼ぶ）。
 * クリアしたものを返し、save に書きこむ（ごほうびのおかしも足す）
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
