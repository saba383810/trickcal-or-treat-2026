// あそぶコース（ふつう・今夜のおかし・まよなか）と、コースごとのルールの変化。
// 今夜のおかしは日替わり。同じ日はみんな同じルールで、お菓子の降り始めも同じになる。
import type { RankId } from './balance';
import type { CharId } from './characters';
import { T, type Strings } from '../i18n';

export type CourseId = 'normal' | 'daily' | 'night';

/** ルールの変化（省略したものは、ふつうと同じ）。名前と一行の説明は T.rules（id ごと） */
export interface Rule {
  id: string;
  /** 落ちる秒数の倍率（小さいほど速い） */
  fall?: number;
  /** パターンとパターンの間の秒数の倍率 */
  gap?: number;
  /** ホバギが出るパターンの重みの倍率 */
  hobagi?: number;
  /** スターキャンディになる確率に足す */
  star?: number;
  /** フィーバーに必要なモカロンの数に足す */
  feverNeed?: number;
  /** フィーバーの秒数の倍率 */
  feverLen?: number;
  /** れんぞくの倍率が上がる間隔（個） */
  chainStep?: number;
  /** スピキのおかえしの数の倍率 */
  gift?: number;
  /** 点の倍率（ホバギの減点にもかかる） */
  points?: number;
}

export const NORMAL: Rule = { id: 'normal' };

/** まよなかモード。ふつうでランク A を取ると解放 */
export const NIGHT: Rule = { id: 'night', fall: 0.72, gap: 0.8, hobagi: 2.2, points: 1.2 };

/** 今夜のおかしのルール。日付で順番に回る */
export const DAILY_RULES: Rule[] = [
  { id: 'star', star: 0.35 },
  { id: 'moon', feverLen: 1.5 },
  { id: 'mokaron', feverNeed: -1 },
  { id: 'pumpkin', hobagi: 1.6, gift: 2 },
  { id: 'wind', fall: 0.85, points: 1.3 },
  { id: 'chain', chainStep: 6 },
  { id: 'calm', hobagi: 0.4 },
];

/** その日の名前（端末の日付。0 時に切り替わる）。例: 2026-10-31 */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 10/31 のような短い日付 */
export function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}/${d}`;
}

/** その日の今夜のおかしのルール */
export function dailyRule(key: string): Rule {
  const [y, m, d] = key.split('-').map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return DAILY_RULES[day % DAILY_RULES.length];
}

/** その日の今夜のおかしの乱数のたね（FNV-1a） */
export function dailySeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** まよなかモードであそべる（ふつうで、だれかがランク A 以上） */
export function nightOpen(rank: Partial<Record<CharId, RankId>>): boolean {
  return Object.values(rank).some((r) => r === 'A' || r === 'S' || r === 'SS');
}

/** ルールの名前と一行の説明（いまの言語） */
export function ruleText(r: Rule): { name: string; note: string } {
  return T.rules[r.id as keyof Strings['rules']] ?? { name: r.id, note: '' };
}

export function ruleOf(course: CourseId, key = dayKey()): Rule {
  return course === 'night' ? NIGHT : course === 'daily' ? dailyRule(key) : NORMAL;
}
