// キャラのひとこと: 結果のセリフ（遊び方で変わる。見つけたものはセリフずかんに残る）・遊んでいる途中のひとこと・
// ほっぺを引っぱりすぎた時のひとこと。
// 口調は原作に合わせる（docs/design.md「キャラのセリフ」）: コミーは一人称コミーで「にゃ」（語中の「な」も「にゃ」）、
// エルフィンは一人称 私でわがまま（「女王」と自分を呼ぶのは いばる時・言い訳の時だけ）、バターは一人称 あたしで教主様には丁寧語・友達にはタメ口、
// ヨミは丁寧語で月のたとえ（「〜のです」は 1 セリフに 1 回まで）、ジョアンは教主様に深い敬語・ほかには号令口調。
import type { RankId } from './balance';
import { CHAR_TEXT } from './text';
import type { CharId } from './characters';
import type { Play } from './missions';
import type { CheekWho } from '../storage';
import type { Expr } from '../view/draw/chibi';

// ===================================================================== 結果のセリフ

/** 結果のセリフの種類。上から順に、合うものを先に出す（good / ok / bad はランクで決まる、いつものセリフ） */
export const RESULT_LINE_IDS = ['ss', 'night', 'noHit', 'chain100', 'skill', 'fever3', 'comfort3', 'cry6', 'low', 'good', 'ok', 'bad'] as const;
export type ResultLineId = (typeof RESULT_LINE_IDS)[number];
type Special = Exclude<ResultLineId, 'good' | 'ok' | 'bad'>;

const sweets = (p: Play) => p.stats.caught.candy + p.stats.caught.star + p.stats.caught.mokaron + p.stats.caught.shucaron;

/** キャラの性能を使った時（キャラごとにちがう） */
const SKILL: Record<CharId, { hint: string; when: (p: Play) => boolean }> = {
  kommy: { hint: 'コミーで おかしを 150こ キャッチ', when: (p) => sweets(p) >= 150 },
  elfin: { hint: 'エルフィンで スターキャンディを 15こ', when: (p) => p.stats.caught.star >= 15 },
  butter: { hint: 'バターで ホバギを 6かい うけとめる', when: (p) => p.stats.hits >= 6 },
  yomi: { hint: 'ヨミで フィーバー 4かい', when: (p) => p.stats.fevers >= 4 },
  joanne: { hint: 'ジョアンで ホバギを 6こ 吸う', when: (p) => p.stats.caught.hobagi >= 6 },
};

const COND: Record<Exclude<Special, 'skill'>, { hint: string; when: (p: Play, rank: RankId) => boolean }> = {
  ss: { hint: 'ランク SS を とる', when: (_p, r) => r === 'SS' },
  night: { hint: '「まよなか」で ランク A いじょう', when: (p, r) => p.course === 'night' && (r === 'A' || r === 'S' || r === 'SS') },
  noHit: { hint: 'ホバギに 1かいも 当たらずに 3,000点', when: (p) => p.stats.hits === 0 && p.score >= 3000 },
  chain100: { hint: 'れんぞく 100', when: (p) => p.stats.maxChain >= 100 },
  fever3: { hint: 'フィーバー 3かい', when: (p) => p.stats.fevers >= 3 },
  comfort3: { hint: 'スピキが 3かい 泣いてから なぐさめる', when: (p) => p.stats.maxComfort >= 3 },
  cry6: { hint: 'スピキを 6かい 泣かせて、1かいも なぐさめない', when: (p) => p.stats.cries >= 6 && p.stats.comforts === 0 },
  low: { hint: '1,000点に とどかない', when: (p) => p.score < 1000 },
};

const BASE_HINT = { good: 'ランク A いじょう', ok: 'ランク B', bad: 'ランク C' };

const RESULT: Record<CharId, Record<Special, string>> = {
  kommy: {
    ss: '……教主、今の 見てたかにゃ？ 二度は やらにゃいにゃ。',
    night: 'まよにゃかは 寝る時間にゃ……にゃのに、まだ 起きてるにゃ。',
    noHit: 'かぼちゃは、ぶつかるより よけるほうが 楽にゃ。それだけにゃ。',
    chain100: '百こ 続いたにゃ。……数えるのも 面倒だったにゃ。',
    skill: '鎌で 刈り取れば、働かにゃくても おかしが 集まるにゃ。',
    fever3: 'お祭りが 三回……今日は もう 一歩も 動かにゃいにゃ。',
    comfort3: 'いっぱい 泣かせてから にゃぐさめるの、教主って 意外と ずるいにゃ。',
    cry6: 'スピキが ずっと 泣いてるにゃ。……コミーのせいじゃ にゃいにゃ。',
    low: '……バターには、内緒にしてほしいにゃ。',
  },
  elfin: {
    ss: '見た？ これが 女王の 実力よ！ ごほうびは チョコの所だけで いいわ。',
    night: '夜ふかしして 食べる おやつは、格別ね！',
    noHit: 'かぼちゃなんて 当たってあげないわよ。野菜は きらいなの！',
    chain100: '百こ 続けて 食べたのに、まだ おなか すいてるんだけど？',
    skill: 'スターキャンディ、ぜんぶ 私のよ！ ……チョコ味は ないの？',
    fever3: 'お祭り 三回！ 毎晩 これでも いいでしょ？',
    comfort3: 'よしよし。泣きやんだなら、おかえしは 私が もらうわよ？',
    cry6: 'スピキが 泣いてるけど……私の おやつは あげないわよ？',
    low: '……今の なし！ 女王の 本気は こんな ものじゃ ないんだから！',
  },
  butter: {
    ss: 'わあ……！ 獣人村の みんなにも 自慢しちゃいます！',
    night: '夜の お散歩みたいで、わくわくします！',
    noHit: 'かぼちゃさんとも ぶつからずに 遊べました！',
    chain100: '百こ 続きました！ 教主様、数えててくれましたか？',
    skill: 'ほうたいで ぜんぶ 受け止めました！ ぜんぜん 痛くないです！',
    fever3: 'お祭りが 三回も！ 今日は 友達が いっぱい できそうです！',
    comfort3: 'スピキさん、笑ってくれました！ これで お友達ですね！',
    cry6: 'スピキさん、泣かないで！ あとで いっしょに 遊びましょ？',
    low: 'あれれ？ でも、教主様と 遊べたから 満足です！',
  },
  yomi: {
    ss: '満月の下で 踊りたい気分です。……教主様も、ご一緒に？',
    night: 'まよなかは、私の 時間です。月様、見ていてくださいね。',
    noHit: '月明かりが、かぼちゃの 落ちる先を 教えてくれました。',
    chain100: '百の 星を つないだら、きっと 月まで 届きます。',
    skill: '月の おつげの とおりでした。教主様の 道を、照らせましたか？',
    fever3: '今夜は 三度も 月が満ちました。こんな夜も、あるのですね。',
    comfort3: '涙の 雲が 晴れましたね。月も ほっとしています。',
    cry6: 'スピキさんが ずっと 泣いています……。そばに 行ってあげてください。',
    low: '……新月の 夜も、ありますから。',
  },
  joanne: {
    ss: 'ああ、教主様……！ これぞ 奇跡！ 皆の者、ひざまずけ！',
    night: '夜の 礼拝も、また 尊いものです。教主様、お供いたします。',
    noHit: '邪念に 一度も 触れず……すべて 教主様の ご加護です。',
    chain100: '百の 祈りが つながりました。教主様の 御心のままに。',
    skill: '邪気は すべて、この私が 吸い取りました！',
    fever3: '三度の 祝祭！ 皆、教主様を たたえよ！',
    comfort3: '迷える者を 救う……これも 教主様の 教えです。',
    cry6: '泣き声が 聞こえる……試練に 負けては ならぬぞ、スピキ！',
    low: '……これは きっと、世界樹の しわざです。',
  },
};

export const lineKey = (char: CharId, id: ResultLineId) => `${char}.${id}`;

export function resultText(char: CharId, id: ResultLineId): string {
  return id === 'good' || id === 'ok' || id === 'bad' ? CHAR_TEXT[char][id] : RESULT[char][id];
}

export function resultHint(char: CharId, id: ResultLineId): string {
  if (id === 'good' || id === 'ok' || id === 'bad') return BASE_HINT[id];
  return id === 'skill' ? SKILL[char].hint : COND[id].hint;
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
    id === 'skill' ? SKILL[p.char].when(p) : COND[id].when(p, rank),
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

const TALK: Record<CharId, Record<TalkId, string[]>> = {
  kommy: {
    fever: ['……これは 起きる価値あるにゃ', '動かにゃくても 取れるにゃ'],
    spurt: ['あと少しで 寝られるにゃ', '目覚ましより うるさいにゃ'],
    chain: ['計算どおりだにゃ', '本気は 出してにゃいにゃ'],
    hit: ['……痛いにゃ。寝るにゃ', '今のは 見にゃかったにゃ'],
    skill: [],
  },
  elfin: {
    fever: ['ぜーんぶ 私の おやつよ！', 'おかしの 雨よ！ 早く 早く！'],
    spurt: ['まだ 食べ足りないわよ！', 'もっと ちょうだい！'],
    chain: ['ふふん、私が 一番でしょ？', 'さすが 私ね！'],
    hit: ['ちょっと！ 野菜は きらいなの！', 'いったーい！ 何なのよ！'],
    skill: ['この星、私が もらうわね！', 'チョコ味だったら いいのに'],
  },
  butter: {
    fever: ['教主様、おかしが いっぱいです！', 'わーい！ お祭りです！'],
    spurt: ['あたし、まだまだ 走れます！', '最後まで 遊びましょう！'],
    chain: ['教主様、見てましたか？', 'しっぽが 勝手に ふれちゃいます！'],
    hit: ['かぼちゃさん、こんにちは！', 'へっちゃらです！'],
    skill: ['ほうたいで ぽよんっ！', '受け止めました、教主様！'],
  },
  yomi: {
    fever: ['月が 満ちました……！', '今夜は 満月なのです'],
    spurt: ['月が 沈む前に……', '月が 満ちるまで、あと少し'],
    chain: ['月明かりの 導きです', '月様の 光の おかげです'],
    hit: ['……雲に 隠れてしまいました', '雲は いずれ 晴れますから'],
    skill: [],
  },
  joanne: {
    fever: ['奇跡です、教主様！', '皆、祈りを 捧げよ！'],
    spurt: ['祈りの時間は まだ 終わらぬ！', '教主様、最後まで お供します！'],
    chain: ['祈りが 教主様に 届いています！', '教主様の 教えの とおりです！'],
    hit: ['くっ……邪気よ、去れ！', '試練です……耐えます！'],
    skill: ['邪念は 吸い取りました！', 'この邪気、私が 清めます！'],
  },
};

/** そのキャラのひとこと（いま出ているものとは ちがうもの）。ないなら null */
export function talkLine(char: CharId, kind: TalkId, now?: string, rnd = Math.random): string | null {
  const list = TALK[char][kind].filter((t) => t !== now);
  return list.length ? list[Math.floor(rnd() * list.length)] : null;
}

// ===================================================================== ほっぺ

/** ほっぺを短い間に何度も引っぱった時の、ひとことと顔。バターは怒らない（原作でも怒った姿を見た人がいない） */
const PINCH: Record<CheekWho, [string, Expr][]> = {
  kommy: [
    ['ほっぺ、のびちゃうにゃ……コミーは もう寝るにゃ', 'sleep'],
    ['……教主、しつこいにゃ', 'sulk'],
  ],
  elfin: [
    ['ちょっと！ のびちゃうでしょ!?', 'angry'],
    ['もう！ チョコくれたら 許してあげる', 'sulk'],
  ],
  butter: [
    ['えへへ、くすぐったいです、教主様！', 'happy'],
    ['教主様、もっと 遊んでくれるんですか？', 'happy'],
  ],
  yomi: [
    ['そんなに 引っぱられたら、月が 欠けてしまいます', 'worried'],
    ['ふふ……月様の いたずらですね', 'smile'],
  ],
  joanne: [
    ['きょ、教主様!? これも 試練なのですね……！', 'surprised'],
    ['なんと 尊い……いえ、少し のびすぎです……！', 'dizzy'],
  ],
  spiki: [
    ['ｳｱｰ…', 'worried'],
    ['スピッキー、がまんしますよぉ……！', 'sulk'],
  ],
};

export function pinchReaction(who: CheekWho, rnd = Math.random): { text: string; expr: Expr } {
  const list = PINCH[who];
  const [text, expr] = list[Math.floor(rnd() * list.length)];
  return { text, expr };
}
