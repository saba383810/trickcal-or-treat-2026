// 画面に出す文言（キャラの名前・せりふ・説明）。せりふはこのゲームのために書いたオリジナル。
import type { ItemKind, RankId, TitleId } from './balance';
import type { CharId } from './characters';

export const GAME_TITLE = 'ホバギ・オア・トリート！';
export const DISCLAIMER = '本作は『トリッカル・もちもちほっぺ大作戦』の非公式ファンゲームです。公式とは関係ありません。原作に関する権利は各権利者に帰属します。';
export const SHARE_URL = 'https://sabanogames.com/entertainments/trickcal-or-treat-2026/';

export interface CharText {
  name: string;
  /** 仮装 */
  costume: string;
  /** キャラえらびの説明 */
  ability: string;
  /** えらんだ時 */
  hello: string;
  /** けっか: よかった（A 以上）・ふつう・ざんねん（C） */
  good: string;
  ok: string;
  bad: string;
}

export const CHAR_TEXT: Record<CharId, CharText> = {
  kommy: {
    name: 'コミー',
    costume: '死神',
    ability: '鎌のひと振りで、遠くのおかしも取れる。キャッチのはばが とても広いけど、足はおそい。',
    hello: 'コミーはねむいにゃ……でも、おかしは食べるにゃ。',
    good: 'ふふん、悪くにゃいにゃん。ごほうびに、もうひと眠りするにゃ……',
    ok: 'う～ん……おにゃか、ちょっとだけ いっぱいにゃ。',
    bad: 'うぅ……おかし、もっと ほしかったにゃ。',
  },
  elfin: {
    name: 'エルフィン',
    costume: '魔女',
    ability: 'ほうきで びゅーん！ いちばん速いけど、すべって止まりにくい。おかし大好きで、スターキャンディが +30 点。',
    hello: 'チョコケーキもある？ ぜーんぶ食べたい！',
    good: 'ふふん、やっぱり 私が一番ね！',
    ok: 'もうちょっとで、ぜんぶ食べられたのに〜！',
    bad: 'むー、もう一回！ もう一回やるの！',
  },
  butter: {
    name: 'バター',
    costume: 'ミイラ',
    ability: 'ほうたいでガード！ ホバギに当たっても ひるまず、れんぞくも切れない（減点は半分）。',
    hello: '教主様、見ててください！ あたし、いっぱい キャッチします！',
    good: 'バター、すっごく 楽しかったです！ 教主様、もう一回 遊びましょう！',
    ok: 'おかし いっぱい！ コミーにも 持って帰ってあげよう！',
    bad: 'えへへ、ちょっぴりでした。でも 楽しかったです！',
  },
  yomi: {
    name: 'ヨミ',
    costume: 'おばけ',
    ability: '月のおつげ。モカロン 4 つでフィーバーになる。',
    hello: '月の夜には、おかしが降るのです。',
    good: '月も 喜んでいるようです。教主様、ありがとうございます。',
    ok: '今夜は、まずまずの 月ですね。',
    bad: '……今夜は、雲が 多かったようですね。',
  },
  joanne: {
    name: 'ジョアン',
    costume: '吸血鬼',
    ability: 'ホバギを ちゅーっと吸って、フィーバーゲージにする（減点なし）。キャッチのはばは せまい。',
    hello: '教主様、おかしの 収穫は この私に お任せを！',
    good: 'お見事です、教主様！ この奇跡、末代まで 語り継ぎます！',
    ok: 'よい 実りでした。教主様に 感謝を。',
    bad: '……これも 試練。教主様、どうか もう一度！',
  },
};

export const ITEM_TEXT: Record<ItemKind, { name: string; note: string }> = {
  candy: { name: 'キャンディ', note: '+10' },
  star: { name: 'スターキャンディ', note: '+20' },
  mokaron: { name: 'モカロン', note: '+10 ・ フィーバーゲージ' },
  shucaron: { name: 'シューカロン', note: '+50 ・ フィーバー中だけ' },
  hobagi: { name: 'ホバギ', note: '−20 ・ 当たるとひるむ' },
};

export const RANK_TEXT: Record<RankId, string> = {
  SS: 'おばけの国の伝説！',
  S: 'すばらしい！',
  A: 'じょうず！',
  B: 'いいかんじ',
  C: 'つぎはがんばろう',
};

export const TITLE_TEXT: Record<TitleId, string> = {
  bronze: '見習いおばけ',
  silver: 'おかしハンター',
  gold: 'スイーツ大王',
  platinum: 'おばけの国の伝説',
};
