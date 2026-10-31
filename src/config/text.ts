// 画面に出す文言（キャラの名前・せりふ・説明）。せりふはこのゲームのために書いたオリジナル。
import type { ItemKind, RankId, TitleId } from './balance';
import type { CharId } from './characters';

export const GAME_TITLE = 'もちっと！ハロウィンおかしキャッチ';
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
    good: '……悪くないにゃ。ごほうびに、もうひと眠りするにゃ。',
    ok: 'おなかいっぱい……ちょっとだけ、にゃ。',
    bad: 'おかし、もっとほしかったにゃ……。',
  },
  elfin: {
    name: 'エルフィン',
    costume: '魔女',
    ability: 'ほうきで びゅーん！ いちばん速いけど、すべって止まりにくい。おかし大好きで、スターキャンディが +30 点。',
    hello: 'チョコケーキもある？ ぜーんぶ食べたい！',
    good: 'えへへ、やっぱりエルフィンが一番！',
    ok: 'もうちょっとで、ぜんぶ食べられたのに〜！',
    bad: 'むー、もう一回！ もう一回やるの！',
  },
  butter: {
    name: 'バター',
    costume: 'ミイラ',
    ability: 'ほうたいでガード！ ホバギに当たっても ひるまず、れんぞくも切れない（減点は半分）。',
    hello: 'バター、いっぱいキャッチする！ がおー！',
    good: 'バター、すっごく楽しい！ がおー！',
    ok: 'おかし、いっぱい！ バター、まんぞく！',
    bad: 'バター、つぎは もっとがんばる！',
  },
  yomi: {
    name: 'ヨミ',
    costume: 'おばけ',
    ability: '月のおつげ。モカロン 4 つでフィーバーになる。',
    hello: '月の夜には、おかしが降るのです。',
    good: '月も よろこんでいるのです。',
    ok: '今夜は、まずまずの月なのです。',
    bad: '……今日は 雲が多かったのです。',
  },
  joanne: {
    name: 'ジョアン',
    costume: '吸血鬼',
    ability: 'ホバギを ちゅーっと吸って、フィーバーゲージにする（減点なし）。キャッチのはばは せまい。',
    hello: 'さあ、収穫の時間だ！',
    good: '見事だ。そなたに祝福を授けよう。',
    ok: 'ふむ、よい実りであった。',
    bad: '惑わされてはならぬ……もう一度だ。',
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
