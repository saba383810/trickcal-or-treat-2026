// キャラのひとこと: 結果のセリフ（遊び方で変わる。見つけたものはセリフずかんに残る）・遊んでいる途中のひとこと・
// ほっぺを引っぱりすぎた時のひとこと（これもセリフずかんに残る）。ここは出す決まりだけで、文言（口調の決まりも）は src/i18n/ja.ts の lines。
import type { RankId } from './balance';
import { CHAR_ORDER, type CharId } from './characters';
import type { Play } from './missions';
import { T } from '../i18n';
import type { CheekWho } from '../storage';
import type { Expr } from '../view/draw/chibi';

// ===================================================================== 結果のセリフ

/** 結果のセリフの種類。上から順に、合うものを先に出す（good / ok / bad はランクで決まる、いつものセリフ） */
export const RESULT_LINE_IDS = ['ss', 'night', 'noHit', 'chain100', 'skill', 'fever3', 'comfort3', 'cry6', 'low', 'good', 'ok', 'bad'] as const;
export type ResultLineId = (typeof RESULT_LINE_IDS)[number];
type Special = Exclude<ResultLineId, 'good' | 'ok' | 'bad'>;

const sweets = (p: Play) => p.stats.caught.candy + p.stats.caught.star + p.stats.caught.mokaron + p.stats.caught.shucaron;

/** キャラの性能を使った時（キャラごとにちがう） */
const SKILL: Record<CharId, (p: Play) => boolean> = {
  kommy: (p) => sweets(p) >= 150,
  elfin: (p) => p.stats.caught.star >= 15,
  butter: (p) => p.stats.hits >= 6,
  yomi: (p) => p.stats.fevers >= 4,
  joanne: (p) => p.stats.caught.hobagi >= 6,
};

const COND: Record<Exclude<Special, 'skill'>, (p: Play, rank: RankId) => boolean> = {
  ss: (_p, r) => r === 'SS',
  night: (p, r) => p.course === 'night' && (r === 'A' || r === 'S' || r === 'SS'),
  noHit: (p) => p.stats.hits === 0 && p.score >= 3000,
  chain100: (p) => p.stats.maxChain >= 100,
  fever3: (p) => p.stats.fevers >= 3,
  comfort3: (p) => p.stats.maxComfort >= 3,
  cry6: (p) => p.stats.cries >= 6 && p.stats.comforts === 0,
  low: (p) => p.score < 1000,
};

export const lineKey = (char: CharId, id: ResultLineId) => `${char}.${id}`;

export function resultText(char: CharId, id: ResultLineId): string {
  return id === 'good' || id === 'ok' || id === 'bad' ? T.chars[char][id] : T.lines.result[char][id];
}

export function resultHint(char: CharId, id: ResultLineId): string {
  return id === 'skill' ? T.lines.skillHint[char] : T.lines.hint[id];
}

export interface PickedLine {
  key: string;
  text: string;
  /** はじめて見た */
  isNew: boolean;
}

/**
 * このプレイの結果のセリフ。合うもののうち まだ見ていないものを先に、
 * 全部見ていたら 合うものといつものセリフから選ぶ
 */
export function pickResultLine(found: readonly string[], p: Play, rank: RankId, rnd = Math.random): PickedLine {
  const base: ResultLineId = rank === 'SS' || rank === 'S' || rank === 'A' ? 'good' : rank === 'C' ? 'bad' : 'ok';
  const hit = RESULT_LINE_IDS.filter((id): id is Special => id !== 'good' && id !== 'ok' && id !== 'bad').filter((id) =>
    id === 'skill' ? SKILL[p.char](p) : COND[id](p, rank),
  );
  const all: ResultLineId[] = [...hit, base];
  const fresh = all.find((id) => !found.includes(lineKey(p.char, id)));
  // 見たものばかりなら、半分はいつものセリフ
  const id = fresh ?? (hit.length && rnd() < 0.5 ? hit[Math.floor(rnd() * hit.length)] : base);
  const key = lineKey(p.char, id);
  return { key, text: resultText(p.char, id), isNew: !found.includes(key) };
}

// ===================================================================== 遊んでいる途中のひとこと

/** fever = フィーバー / spurt = ラストスパート / chain = れんぞく 50・100 / hit = ホバギに当たった / skill = 性能を使った */
export type TalkId = 'fever' | 'spurt' | 'chain' | 'hit' | 'skill';

/** そのキャラのひとこと（いま出ているものとは ちがうもの）。ないなら null */
export function talkLine(char: CharId, kind: TalkId, now?: string, rnd = Math.random): string | null {
  const list = T.lines.talk[char][kind].filter((t) => t !== now);
  return list.length ? list[Math.floor(rnd() * list.length)] : null;
}

// ===================================================================== ほっぺ

/** ほっぺを短い間に何度も引っぱった時の顔（ひとことは T.lines.pinch の同じ順番）。バターは怒らない（原作でも怒った姿を見た人がいない） */
const PINCH: Record<CheekWho, Expr[]> = {
  kommy: ['sleep', 'sulk'],
  elfin: ['angry', 'sulk'],
  butter: ['happy', 'happy'],
  yomi: ['worried', 'smile'],
  joanne: ['surprised', 'dizzy'],
  spiki: ['worried', 'sulk', 'pinched'],
};

export const pinchKey = (who: CheekWho, i: number) => `${who}.pinch${i}`;

/** key = セリフずかんに残す時の名前 */
export function pinchReaction(who: CheekWho, rnd = Math.random): { text: string; expr: Expr; key: string } {
  const list = PINCH[who];
  const i = Math.floor(rnd() * list.length);
  return { text: T.lines.pinch[who][i], expr: list[i], key: pinchKey(who, i) };
}

// ===================================================================== セリフずかん

/** ずかんに並べる相手（遊べる 5 人と、スピキ） */
export const BOOK_ORDER: CheekWho[] = [...CHAR_ORDER, 'spiki'];

export interface BookLine {
  key: string;
  text: string;
  /** まだ見つけていない時に出す、見つけかた */
  hint: string;
}

/** その相手の ずかんのセリフ。結果のセリフのあとに、ほっぺを しつこく引っぱった時のひとこと（スピキは ひとことだけ） */
export function bookLines(who: CheekWho): BookLine[] {
  const result = who === 'spiki' ? [] : RESULT_LINE_IDS.map((id) => ({ key: lineKey(who, id), text: resultText(who, id), hint: resultHint(who, id) }));
  const pinch = T.lines.pinch[who].map((text, i) => ({ key: pinchKey(who, i), text, hint: T.linesBook.pinchHint }));
  return [...result, ...pinch];
}
