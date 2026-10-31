// 画面に出る文言（日本語）。ko.ts / en.ts はこれと同じ形で訳す。関数になっているものは数字や名前を埋め込む文言。
// せりふはこのゲームのために書いたオリジナル。
import type { ItemKind, RankId, TitleId } from '../config/balance';
import type { CharId } from '../config/characters';
import type { ResultLineId, TalkId } from '../config/lines';
import type { CheekWho } from '../storage';

interface CharText {
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

type Special = Exclude<ResultLineId, 'good' | 'ok' | 'bad'>;

export const ja = {
  /** 数字の区切りに使うロケール */
  locale: 'ja-JP',
  /** 言語の選択肢に出す名前 */
  langName: '日本語',
  /** ゲームの名前（タブの名前・ロゴの読み上げ・シェアの文） */
  docTitle: 'ホバギ・オア・トリート！',
  disclaimer: '本作は『トリッカル・もちもちほっぺ大作戦』の非公式ファンゲームです。公式とは関係ありません。原作に関する権利は各権利者に帰属します。',
  /** タイトルのロゴの 3 行（src/view/draw/logo.ts で描く）。3 行目のおわりの「！」「!」は、点がキャンディの絵になる */
  logo: ['ホバギ', 'オア', 'トリート！'] as [string, string, string],

  common: {
    back: 'もどる',
    close: 'とじる',
    language: '言語',
    best: 'ベスト',
    dailyBest: 'きょうのベスト',
    /** せりふ・称号を かこむかぎかっこ */
    quote: (text: string) => `「${text}」`,
    /** 仮装とキャラの名前（例: 死神コミー） */
    who: (costume: string, name: string) => `${costume}${name}`,
    times: (n: number | string) => `${n} 回`,
  },

  /** あそぶコース（キャラえらびのタブ・きろくの見出し） */
  courses: {
    normal: 'ふつう',
    daily: '今夜のおかし',
    night: 'まよなか',
  },

  chars: {
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
  } satisfies Record<CharId, CharText>,
  /** スピキ（ほっぺを引っぱった相手の名前） */
  spikiName: 'スピキ',

  items: {
    candy: { name: 'キャンディ', note: '+10' },
    star: { name: 'スターキャンディ', note: '+20' },
    mokaron: { name: 'モカロン', note: '+10 ・ フィーバーゲージ' },
    shucaron: { name: 'シューカロン', note: '+50 ・ フィーバー中だけ' },
    hobagi: { name: 'ホバギ', note: '−20 ・ 当たるとひるむ' },
  } satisfies Record<ItemKind, { name: string; note: string }>,

  ranks: {
    SS: 'おばけの国の伝説！',
    S: 'すばらしい！',
    A: 'じょうず！',
    B: 'いいかんじ',
    C: 'つぎはがんばろう',
  } satisfies Record<RankId, string>,

  /** 称号 */
  titles: {
    bronze: '見習いおばけ',
    silver: 'おかしハンター',
    gold: 'スイーツ大王',
    platinum: 'おばけの国の伝説',
  } satisfies Record<TitleId, string>,

  /** コースのルール（src/config/rules.ts の id ごと）。note は一行の説明 */
  rules: {
    normal: { name: 'ふつう', note: 'いつもの ハロウィンの夜' },
    night: { name: 'まよなか', note: 'お菓子が速くて ホバギも多い。点は 1.2 倍' },
    star: { name: 'スターの夜', note: 'スターキャンディが いっぱい降る' },
    moon: { name: '満月の夜', note: 'フィーバーが 1.5 倍 長い' },
    mokaron: { name: 'モカロンの夜', note: 'モカロンが 1 こ少なくても フィーバー' },
    pumpkin: { name: 'かぼちゃの夜', note: 'ホバギが多いけど、スピキのおかえしが 2 倍' },
    wind: { name: 'はやての夜', note: 'お菓子が速く落ちるけど、点が 1.3 倍' },
    chain: { name: 'れんぞくの夜', note: 'れんぞくの倍率が 6 こごとに上がる' },
    calm: { name: 'しずかな夜', note: 'ホバギが 少ない' },
  },

  missions: {
    head: 'ミッション',
    count: (n: number, all: number) => `${n} / ${all} クリア`,
    /** タイトルのミッションの欄（押すとミッション画面）の読み上げ */
    open: 'ミッションを見る',
    reward: 'ごほうびのおかし',
    /** このプレイでクリア / 前にクリア / あたらしく出た / いまのプレイでできた */
    cleared: 'クリア!',
    got: 'ゲット!',
    new: 'NEW',
    done: 'できた!',
    /** 1 回でのさいこう記録（例: さいこう 12/15） */
    best: (progress: string) => `さいこう ${progress}`,
    allDone: 'ぜんぶ クリア！ ありがとう！',
    /** ポーズ */
    atEnd: 'おわった時に クリア',
    // ミッション画面
    clearedHead: 'クリアした ミッション',
    rewardTotal: (n: string) => `ごほうびで もらった おかし ${n} こ`,
    now: 'いまのミッション',
    note: (slots: number) => `いまのミッションは ${slots} つずつ。あそび終わった時に クリアすると、次のミッションが出て ごほうびの おかしが もらえます`,
    all: 'ぜんぶのミッション',
    /** ランクのミッション（下の text に無いもの） */
    rank: (rank: string, points: string) => `ランク ${rank} を とる（${points}点）`,
    /** ミッションの文（src/config/missions.ts の id ごと） */
    text: {
      first: 'さいごまで あそぶ',
      candy15: 'キャンディを 15こ キャッチ',
      comfort1: '泣いたスピキを なぐさめる',
      fever1: 'フィーバーに なる',
      chain20: 'れんぞく 20',
      star8: 'スターキャンディを 8こ キャッチ',
      dodge8: 'ホバギを 8こ よける',
      chars2: '2人で あそぶ',
      cheek10: 'ほっぺを 10かい のばす（タイトルでも）',
      shuca15: 'シューカロンを 15こ キャッチ',
      gift6: 'スピキの おかえしを 6こ キャッチ',
      daily1: '「今夜のおかし」で あそぶ',
      chain40: 'れんぞく 40',
      comfortLv2: 'スピキが 2かい 泣いてから なぐさめる',
      fever2: '1かいで フィーバー 2かい',
      sweets100: '1かいで おかしを 100こ キャッチ',
      elfinStar: 'エルフィンで スターキャンディを 15こ',
      butterGuard: 'バターで ホバギを 3かい うけとめる',
      chars5: '5人 ぜんいんで あそぶ',
      cheekAll: '5人 ぜんいんの ほっぺを のばす',
      lines10: 'セリフずかんを 10こ うめる',
      kommyChain: 'コミーで れんぞく 50',
      comfort5: '1かいで スピキを 5かい なぐさめる',
      yomiFever: 'ヨミで フィーバー 3かい',
      noHit: 'ホバギに 1かいも 当たらずに 3,000点',
      joanneDrain: 'ジョアンで ホバギを 3こ 吸う',
      comfortLv3: 'スピキが 3かい 泣いてから なぐさめる',
      cheekSulk: 'ほっぺを しつこく のばす（つづけて 3かい）',
      chain80: 'れんぞく 80',
      feverScore: 'フィーバー中に 3,000点',
      daily3: '「今夜のおかし」を 3日 あそぶ',
      cheek100: 'ほっぺを 100かい のばす',
      lines30: 'セリフずかんを 30こ うめる',
      allA: '5人 ぜんいんで ランク A（ふつう）',
      sweets180: '1かいで おかしを 180こ キャッチ',
      night1: '「まよなか」で あそぶ',
      chain150: 'れんぞく 150',
      nightA: '「まよなか」で ランク A を とる',
      allS: '5人 ぜんいんで ランク S（ふつう）',
      nightS: '「まよなか」で ランク S を とる',
    } satisfies Record<string, string>,
  },

  // キャラのひとこと（src/config/lines.ts）: 結果のセリフ・遊んでいる途中のひとこと・ほっぺを引っぱりすぎた時のひとこと。
  // 口調は原作に合わせる（docs/design.md「キャラのセリフ」）: コミーは一人称コミーで「にゃ」（語中の「な」も「にゃ」）。
  // 「……」は文の頭に置かず、「〜にゃ……」と眠そうに消える所か「うぅ……」「う～ん……」のつぶやきの後に置く。
  // エルフィンは一人称 私でわがまま（「女王」と自分を呼ぶのは いばる時・言い訳の時だけ）、バターは一人称 あたしで教主様には丁寧語・友達にはタメ口、
  // ヨミは丁寧語で月のたとえ（「〜のです」は 1 セリフに 1 回まで）、ジョアンは教主様に深い敬語・ほかには号令口調。
  lines: {
    /** 結果のセリフ（いつものセリフ good / ok / bad は chars に） */
    result: {
      kommy: {
        ss: 'ふふん。教主、今の 見てたかにゃ？ 二度は やらにゃいにゃん。',
        night: 'まよにゃかは コミーの 時間にゃん……でも、働きすぎて ねむいにゃ。',
        noHit: 'かぼちゃは、ぶつかるより よけるほうが 楽にゃ。それだけにゃ。',
        chain100: '百こも 続いたにゃ？ 数えるのも 面倒くさいにゃ……',
        skill: '鎌で 刈り取れば、働かにゃくても おかしが 集まるにゃ。',
        fever3: 'お祭りが 三回……今日は もう 一歩も 動かにゃいにゃ。',
        comfort3: 'いっぱい 泣かせてから にゃぐさめるの、教主って 意外と ずるいにゃ。',
        cry6: 'スピキが ずっと 泣いてるにゃ。コミーの せいじゃ にゃいにゃ……たぶん。',
        low: 'うぅ……バターには、内緒にしてほしいにゃ。',
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
    } satisfies Record<CharId, Record<Special, string>>,
    /** セリフずかんで、まだ見ていないセリフの出し方（skill はキャラごとに skillHint） */
    hint: {
      ss: 'ランク SS を とる',
      night: '「まよなか」で ランク A いじょう',
      noHit: 'ホバギに 1かいも 当たらずに 3,000点',
      chain100: 'れんぞく 100',
      fever3: 'フィーバー 3かい',
      comfort3: 'スピキが 3かい 泣いてから なぐさめる',
      cry6: 'スピキを 6かい 泣かせて、1かいも なぐさめない',
      low: '1,000点に とどかない',
      good: 'ランク A いじょう',
      ok: 'ランク B',
      bad: 'ランク C',
    } satisfies Record<Exclude<ResultLineId, 'skill'>, string>,
    /** キャラの性能を使った時 */
    skillHint: {
      kommy: 'コミーで おかしを 150こ キャッチ',
      elfin: 'エルフィンで スターキャンディを 15こ',
      butter: 'バターで ホバギを 6かい うけとめる',
      yomi: 'ヨミで フィーバー 4かい',
      joanne: 'ジョアンで ホバギを 6こ 吸う',
    } satisfies Record<CharId, string>,
    /** 遊んでいる途中のひとこと（画面に収まるよう 18 字まで）。fever = フィーバー / spurt = ラストスパート / chain = れんぞく 50・100 / hit = ホバギに当たった / skill = 性能を使った */
    talk: {
      kommy: {
        fever: ['う～ん……起きる価値 あるにゃ！', '動かにゃくても 取れるにゃん'],
        spurt: ['あと少しで 寝られるにゃ……', '目覚ましより うるさいにゃ'],
        chain: ['計算どおりにゃん', '本気は 出してにゃいにゃ'],
        hit: ['うぅ……痛いにゃ。もう寝るにゃ', '今のは 見にゃかったにゃ'],
        skill: [] as string[],
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
        skill: [] as string[],
      },
      joanne: {
        fever: ['奇跡です、教主様！', '皆、祈りを 捧げよ！'],
        spurt: ['祈りの時間は まだ 終わらぬ！', '教主様、最後まで お供します！'],
        chain: ['祈りが 教主様に 届いています！', '教主様の 教えの とおりです！'],
        hit: ['くっ……邪気よ、去れ！', '試練です……耐えます！'],
        skill: ['邪念は 吸い取りました！', 'この邪気、私が 清めます！'],
      },
    } satisfies Record<CharId, Record<TalkId, string[]>>,
    /** ほっぺを短い間に何度も引っぱった時のひとこと。顔は src/config/lines.ts で、同じ順番に決めてある（バターは怒らない） */
    pinch: {
      kommy: ['ほっぺ、のびちゃうにゃ……コミーは もう寝るにゃ', '教主、しつこいにゃ……チッ。'],
      elfin: ['ちょっと！ のびちゃうでしょ!?', 'もう！ チョコくれたら 許してあげる'],
      butter: ['えへへ、くすぐったいです、教主様！', '教主様、もっと 遊んでくれるんですか？'],
      yomi: ['そんなに 引っぱられたら、月が 欠けてしまいます', 'ふふ……月様の いたずらですね'],
      joanne: ['きょ、教主様!? これも 試練なのですね……！', 'なんと 尊い……いえ、少し のびすぎです……！'],
      spiki: ['ｳｱｰ…', 'スピッキー、がまんしますよぉ……！', 'ｳﾜｱｱｱｱｱ! ｽﾋﾟｷﾃﾞﾙｼﾞﾊﾞｾﾞﾖ!!!!'],
    } satisfies Record<CheekWho, string[]>,
  },

  title: {
    sub: 'トリッカル 非公式ファンゲーム',
    play: 'あそぶ',
    badge: (name: string) => `称号「${name}」`,
    noBadge: '称号 まだなし',
    sweets: (n: string) => `今までのおかし ${n} こ`,
    toNext: (n: string) => `つぎの称号まで あと ${n} こ`,
  },

  select: {
    heading: 'だれで あそぶ？',
    speed: 'はやさ',
    reach: 'キャッチ',
    easy: 'かんたん',
    nightLock: 'ランクA達成で解放',
    /** 今夜のおかしの説明の前の、ルールの名前 */
    ruleName: (name: string) => `${name}　`,
    start: 'スタート!',
    /** このキャラで れんしゅう（チュートリアル）から始める */
    practice: 'れんしゅう',
  },

  records: {
    heading: 'きろく',
    now: 'いまの称号',
    none: 'まだなし',
    sweets: (n: string) => `今までのおかし ${n} こ`,
    toNext: (n: string) => ` ・ つぎの称号まで あと ${n} こ`,
    plays: (n: string) => `あそんだ回数 ${n} 回`,
    /** 称号の一覧: いる数・取った・あといくつ */
    need: (n: string) => `おかし ${n} こ`,
    got: 'ゲット!',
    left: (n: string) => `あと ${n} こ`,
    note: 'おかしは あそぶたびと、ミッションの ごほうびで たまっていきます',
    daily: (day: string, rule: string) => `今夜のおかし（${day}・${rule}）`,
    dailyScore: (score: string, name: string) => `${score}（${name}）`,
    dailyDays: (n: number) => `　あそんだ日 ${n} 日`,
    cheek: 'ほっぺ',
    pulled: 'のばした',
    cheekMore: (big: string, sulks: string) => `　めいっぱい ${big} 回・しつこく ${sulks} 回`,
    topCheek: (name: string, n: string) => `いちばん のばしたのは ${name}（${n} 回）`,
    cheekNote: 'キャラの ほっぺは、タイトルでも キャラえらびでも 引っぱれます',
    lines: (n: number, all: number) => `セリフずかん ${n}/${all}`,
  },

  /** セリフずかん */
  linesBook: {
    heading: 'セリフずかん',
    note: (n: number, all: number) => `見つけた セリフ ${n} / ${all}。あそび終わった時の ようすで、ひとことが かわります`,
    unknown: '？？？',
  },

  howTo: {
    heading: 'あそびかた',
    lead: (sec: number) => `おばけの国に、おかしが降ってくる！ ${sec} 秒で たくさんキャッチしよう。`,
    move: 'うごく: ',
    moveTouch: '画面のどこでも、指で左右にドラッグ。',
    moveMouse: 'マウスを左右に動かす / ← → キー（A D）',
    chain: 'れんぞく: ',
    chainText: (sec: number, step: number, max: string) => `${sec} 秒以内に次をキャッチすると つながって、${step} こごとに点数がアップ（最大 ×${max}）。`,
    fever: 'フィーバー: ',
    feverText: 'モカロンでゲージがたまると、シューカロンの雨！ 時間ぎれでも、フィーバーが終わるまで つづくよ。',
    spiki: 'ホバギをよけて地面に落とすと、ともだちのスピッキーが泣いて「スピキ」になっちゃう。',
    spikiTap: 'スピキをタップ',
    spikiClick: 'スピキをクリック（↑キー / スペース）',
    spikiThen: 'でなぐさめると、おかえしのおかしを投げてくれる！ 泣いている間にもっとホバギが落ちると、おかえしが増えるよ。',
    cheek: 'ほっぺを むにーっと引っぱってから離す',
    cheekThen: 'と、おかえしがもう 1 こ！',
    practice: 'れんしゅうする',
  },

  settings: {
    heading: 'せってい',
    sfx: '効果音',
    bgm: 'BGM',
    mute: '音を消す',
    calm: '画面のゆれを へらす',
  },

  pause: {
    heading: 'ひとやすみ',
    resume: 'つづける',
    skip: 'れんしゅうを とばす',
    retry: 'やりなおす',
    select: 'キャラえらびへ',
  },

  result: {
    heading: 'けっか',
    daily: (day: string) => `今夜のおかし ${day}`,
    night: 'まよなかモード',
    best: 'ベスト更新!',
    newLine: 'NEW セリフ',
    candy: 'キャンディ',
    star: 'スター',
    mokaron: 'モカロン',
    shucaron: 'シューカロン',
    drained: 'ホバギを吸った',
    hits: 'ホバギに当たった',
    maxChain: 'さいだいれんぞく',
    fevers: 'フィーバー',
    comforts: 'スピキをなぐさめた',
    nextRank: (rank: string, n: string) => `ランク${rank}まで あと ${n} 点`,
    nightOpen: 'ランクA達成！「まよなか」モードが 解放された！（キャラえらびで）',
    sweets: (n: number) => `おかし +${n} こ`,
    reward: (n: number) => `　ミッションのごほうび +${n} こ`,
    total: (n: string) => `（今までに ${n} こ）`,
    newTitle: (name: string) => ` 称号「${name}」をゲット!`,
    toNext: (n: string) => ` つぎの称号まで あと ${n} こ`,
    unplayed: (names: string[]) => `まだ あそんでいない: ${names.join('・')}`,
    select: 'キャラえらび',
    retry: 'もう一回!',
    title: 'タイトルへ',
    share: 'X でシェア',
    /** シェアの文。where はコース（ふつうは空） */
    shareDaily: (day: string, rule: string) => `の今夜のおかし（${day}・${rule}）`,
    shareNight: 'のまよなかモード',
    shareText: (title: string, where: string, who: string, score: string, rank: string) =>
      `『${title}』${where}で${who}が ${score}点（ランク${rank}）！ #トリッカルオアトリート #トリッカル`,
  },

  /** ゲーム画面（canvas）の文言 */
  game: {
    start: 'スタート!',
    /** カウントダウンの下に出す、コースの名前 */
    dailyTitle: (day: string, rule: string) => `今夜のおかし ${day}「${rule}」`,
    nightTitle: '「まよなか」モード',
    score: 'スコア',
    practice: 'れんしゅう',
    overtime: 'えんちょう!',
    left: 'のこり',
    chain: 'れんぞく',
    fever: 'フィーバー!!',
    feverGauge: 'フィーバーゲージ',
    feverSub: 'シューカロンの雨!',
    lastSpurt: 'ラストスパート!',
    timeUp: 'おしまい!',
    hintMoveTouch: '指で左右にドラッグして うごく',
    hintMoveKey: '← → キー / マウスで うごく',
    hintComfortTouch: 'スピキを タップで なぐさめて!',
    hintComfortKey: 'Space キーで なぐさめて!',
    /** れんしゅうの何ステップ目か */
    coachStep: (step: number, all: number) => `れんしゅう ${step}/${all}`,
    tap: 'タップ!',
    missionClear: 'ミッション クリア!',
    /** スピキの泣き声（泣きレベル 1・2・3） */
    cry: ['ｳｪｪﾝ…', 'ｳｱｱｰﾝ!!', 'ｳｱｱｱｱｱﾝ!!!'],
    /** 泣いていないスピキをつついた / 続けてつついた（「ﾃﾞﾙｼﾞﾊﾞｾﾞﾖ」は 스피키 누르지 마세요＝スピキを押さないで。公式のペットのスピキも、つつくと言う） */
    poke: 'ﾁｮﾜﾖ?',
    pokeAgain: 'ｳﾜｱｱｱｱｱ! ｽﾋﾟｷﾃﾞﾙｼﾞﾊﾞｾﾞﾖ!!!!',
    /** だれもなぐさめずに泣きやんだ。どれか 1 つ（「ｲｼﾞﾒﾇﾝﾃﾞ」は 스피키 열심히 했는데＝スピキ がんばったのに の空耳） */
    calm: ['ｸﾞｽﾝ…', 'ｽﾋﾟｷｦｲｼﾞﾒﾇﾝﾃﾞ…'],
    /** なぐさめた。どれか 1 つ（ﾁｮﾜﾖ = 좋아요。ﾎﾊﾞｷﾞﾁｮﾜﾖ = 호박이 좋아요＝かぼちゃが好き） */
    thanks: ['ﾁｮﾜﾖ!', 'ﾁｮﾜﾖ~ ﾁｮﾜﾖ~', 'ﾎﾊﾞｷﾞﾁｮﾜﾖ~!'],
    mochiBonus: 'もちもち +1!',
    guard: 'ガード!',
    drain: 'ちゅーっ',
    chainEnd: (n: number) => `${n}れんぞく おしまい`,
    gifts: (n: number) => `おかえし ×${n}`,
  },

  /** れんしゅう（src/tutorial.ts） */
  tutorial: {
    moveTouch: '画面を 左右にドラッグして うごこう',
    moveKey: '← → キー か マウスで うごこう',
    moveSub: 'まずは れんしゅう！（ポーズから とばせます）',
    catch: (got: number, goal: number) => `おかしを 頭で キャッチ！（${got}/${goal}）`,
    catchSub: 'つづけて取ると れんぞくで 点が ふえるよ',
    dodge: 'かぼちゃ（ホバギ）は よけよう！',
    dodgeMissed: 'あたっちゃった！ もう一回 よけよう',
    dodgeSub: '落ちる先に 影が出るよ。よけると スピキが泣いちゃう',
    comfortTouch: '泣いている スピキを タップ！',
    comfortKey: 'Space キーで スピキを なぐさめよう！',
    comfortSubTouch: 'ほっぺを 引っぱって 離すと おかえしが +1',
    comfortSubKey: 'スピキを クリックしても なぐさめられるよ',
    gifts: 'おかえしだ！ キャッチしよう',
    giftsSub: 'もっと泣かせてから なぐさめると、おかえしが ふえるよ',
    done: 'じゅんび OK！ 本番 スタート！',
    doneSub: (n: number) => `モカロンを ${n}こ 集めると フィーバー！`,
  },

  html: {
    canvas: 'ゲーム画面',
  },
};

export type Strings = typeof ja;
