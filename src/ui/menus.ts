// メニュー画面（DOM）。タイトル・キャラえらび・あそびかた・せってい・ポーズ・けっか。
import type { Sound } from '../audio/sound';
import { BALANCE, RANKS, TITLES, rankOf, titleOf, type ItemKind, type RankId } from '../config/balance';
import { CHARACTERS, CHAR_ORDER, type CharId } from '../config/characters';
import { MISSIONS, MISSION_SLOTS, activeMissions, fits, playValue, progressOf, type Mission, type Play } from '../config/missions';
import { RESULT_LINE_IDS, lineKey, resultHint, resultText, type PickedLine } from '../config/lines';
import { dailyRule, dayKey, dayLabel, nightOpen, ruleOf, type CourseId } from '../config/rules';
import { CHAR_TEXT, DISCLAIMER, GAME_TITLE, ITEM_TEXT, RANK_TEXT, SHARE_URL, TITLE_TEXT } from '../config/text';
import type { World } from '../sim/world';
import type { CheekWho, SaveData } from '../storage';
import { CHAR_SPECS, SPIKEY, SPIKI } from '../view/draw/characters';
import type { ChibiSpec, Expr } from '../view/draw/chibi';
import { LOGO_H, LOGO_W, drawLogo } from '../view/draw/logo';
import { C, font } from '../view/palette';
import { h, itemCanvas, mochiChibi, paintCanvas, starsText } from './dom';

export interface MenuHost {
  save: SaveData;
  sound: Sound;
  persist(): void;
}

function btn(label: string, onClick: () => void, sound: Sound, cls = ''): HTMLButtonElement {
  return h(
    'button',
    {
      class: `btn ${cls}`.trim(),
      type: 'button',
      onclick: () => {
        sound.click();
        onClick();
      },
    },
    label,
  );
}

function num(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

function rankBadge(r: RankId | undefined, cls = ''): HTMLElement {
  return h('span', { class: `rank rank-${r ?? 'none'} ${cls}`.trim() }, r ?? '−');
}

// ===================================================================== ミッション

/**
 * ミッションの 1 行。state: done = このプレイでクリア / new = あたらしく出た / now = いまのミッション。
 * value を渡すと「いま」の数（ポーズ中）、渡さないと記録の数を出す
 */
function missionRow(m: Mission, save: SaveData, state: 'done' | 'new' | 'now' | 'got' | '' = 'now', value?: number): HTMLElement {
  const v = value ?? progressOf(m, save);
  let prog = '';
  if (state === 'done') prog = 'クリア!';
  else if (state === 'got') prog = 'ゲット!';
  else if (state === 'new') prog = 'NEW';
  else if (value !== undefined && v >= m.goal) prog = 'できた!';
  else if (m.goal > 1 && v > 0) prog = `${value === undefined && !m.total ? 'さいこう ' : ''}${num(Math.min(v, m.goal))}/${num(m.goal)}`;
  return h(
    'li',
    { class: `mission ${state}`.trim() },
    h('span', { class: 'm-text' }, m.text),
    prog ? h('small', { class: 'm-prog' }, prog) : null,
    h('span', { class: 'm-reward', title: 'ごほうびのおかし' }, itemCanvas('candy', 16), `+${m.reward}`),
  );
}

function missionsHead(save: SaveData, more = ''): HTMLElement {
  return h('div', { class: 'missions-head' }, h('b', {}, 'ミッション'), h('small', {}, `${save.missions.length} / ${MISSIONS.length} クリア${more}`));
}

/** いまのミッション（タイトル）。押すとミッション画面 */
function missionCard(host: MenuHost, open: () => void): HTMLElement {
  const save = host.save;
  const list = activeMissions(save);
  const go = () => {
    host.sound.click();
    open();
  };
  return h(
    'div',
    {
      class: 'missions link',
      role: 'button',
      tabindex: 0,
      'aria-label': 'ミッションを見る',
      onclick: go,
      onkeydown: (e: Event) => {
        const k = (e as KeyboardEvent).key;
        if (k !== 'Enter' && k !== ' ') return;
        e.preventDefault();
        go();
      },
    },
    missionsHead(save, ' ›'),
    list.length ? h('ul', {}, ...list.map((m) => missionRow(m, save))) : h('p', { class: 'm-all' }, 'ぜんぶ クリア！ ありがとう！'),
  );
}

// ===================================================================== タイトル

export function titleScreen(
  host: MenuHost,
  on: { start: () => void; howTo: () => void; records: () => void; settings: () => void; missions: () => void },
): HTMLElement {
  const s = host.sound;
  // 全員で並ぶ。まん中はバターとコミー（向かい合って、少し大きく前に）
  const cast: [ChibiSpec, Expr, number, boolean, CheekWho][] = [
    [CHAR_SPECS.yomi, 'normal', 0.9, false, 'yomi'],
    [CHAR_SPECS.elfin, 'happy', 0.9, false, 'elfin'],
    [CHAR_SPECS.butter, 'happy', 1.15, false, 'butter'],
    [CHAR_SPECS.kommy, 'smile', 1.15, true, 'kommy'],
    [CHAR_SPECS.joanne, 'smile', 0.9, true, 'joanne'],
    [SPIKI, 'worried', 0.8, true, 'spiki'],
  ];
  const row = h('div', { class: 'title-cast' });
  for (const [spec, expr, k, flip, who] of cast) {
    const m = mochiChibi(spec, expr, 34 * k, { sound: s, flip, who });
    m.style.setProperty('--k', String(k));
    if (k > 1) m.classList.add('lead');
    row.append(m);
  }
  const total = host.save.sweets;
  const t = titleOf(total);
  const next = nextTitle(total);
  return h(
    'div',
    { class: 'screen title' },
    h(
      'div',
      { class: 'logo' },
      h('span', { class: 'logo-sub' }, 'トリッカル 非公式ファンゲーム'),
      h('h1', { 'aria-label': GAME_TITLE }, logoArt()),
    ),
    h('div', { class: 'title-stage' }, row),
    h(
      'div',
      { class: 'menu-buttons' },
      btn('あそぶ', on.start, s, 'primary big'),
      h('div', { class: 'row' }, btn('あそびかた', on.howTo, s), btn('きろく', on.records, s), btn('せってい', on.settings, s)),
    ),
    missionCard(host, on.missions),
    // 称号は押すと「きろく」で一覧が見られる
    h(
      'button',
      {
        class: 'badge',
        type: 'button',
        onclick: () => {
          s.click();
          on.records();
        },
      },
      h('b', {}, t ? `称号「${TITLE_TEXT[t]}」` : '称号 まだなし'),
      h('span', {}, `今までのおかし ${num(total)} こ`),
      next ? h('small', {}, `つぎの称号まで あと ${num(next.min - total)} こ`) : null,
    ),
    h('p', { class: 'disclaimer' }, DISCLAIMER),
  );
}

/** ロゴの絵。字の形はフォントで描くので、フォントが届いたら描き直す */
function logoArt(): HTMLCanvasElement {
  const S = 64;
  const make = () => paintCanvas(LOGO_W * S, LOGO_H * S, (c) => drawLogo(c, (LOGO_W * S) / 2, 0, S), 'logo-art');
  const cv = make();
  if (!document.fonts.check(font(S), GAME_TITLE)) void document.fonts.load(font(S), GAME_TITLE).then(() => cv.replaceWith(make()));
  return cv;
}

/** まだ取っていない称号のうち、いちばん近いもの */
function nextTitle(total: number): (typeof TITLES)[number] | undefined {
  return [...TITLES].reverse().find((x) => x.min > total);
}

// ===================================================================== キャラえらび

export function charSelect(host: MenuHost, on: { pick: (id: CharId, course: CourseId) => void; back: () => void }): HTMLElement {
  const s = host.sound;
  const save = host.save;
  let chosen: CharId = save.lastChar;
  const today = dayKey();
  const nightOK = nightOpen(save.rank);
  let course: CourseId = save.lastCourse === 'night' && !nightOK ? 'normal' : save.lastCourse;
  const wishes = activeMissions(save);
  /** えらんでいるコースの記録（今夜のおかしは、きょうの分） */
  const recordOf = (id: CharId): { best?: number; rank?: RankId } => {
    if (course === 'night') return { best: save.night.best[id], rank: save.night.rank[id] };
    if (course === 'daily') {
      const best = save.daily.day === today ? save.daily.best[id] : undefined;
      return { best, rank: best === undefined ? undefined : rankOf(best) };
    }
    return { best: save.best[id], rank: save.rank[id] };
  };
  const badgeSlots = new Map<CharId, HTMLElement>();
  const bestSlots = new Map<CharId, HTMLElement>();
  // 5 人分の説明を同じ場所に重ねて、えらんだ人だけ見せる（説明の長さでボタンの位置が動かない）
  const details = h('div', { class: 'details' });
  const detailEls = new Map<CharId, HTMLElement>();
  const cards = h('div', { class: 'cards' });
  const cardEls = new Map<CharId, HTMLElement>();

  const detailOf = (id: CharId) => {
    const d = CHARACTERS[id];
    const tx = CHAR_TEXT[id];
    const bestSlot = h('p', { class: 'best-line' });
    bestSlots.set(id, bestSlot);
    return h(
      'div',
      { class: 'detail', style: `--c:${C[id]}` },
      h('div', { class: 'detail-face' }, mochiChibi(CHAR_SPECS[id], 'happy', 30, { sound: s, who: id })),
      h('div', { class: 'detail-name' }, h('small', {}, tx.costume), tx.name),
      h('p', { class: 'hello' }, `「${tx.hello}」`),
      h(
        'div',
        { class: 'stat-rows' },
        h('div', { class: 'stat' }, h('span', {}, 'はやさ'), starsText(d.stars.speed)),
        h('div', { class: 'stat' }, h('span', {}, 'キャッチ'), starsText(d.stars.reach)),
        h('div', { class: 'stat' }, h('span', {}, 'かんたん'), starsText(d.stars.easy)),
      ),
      h('p', { class: 'ability' }, tx.ability),
      bestSlot,
    );
  };
  const showDetail = () => {
    for (const [cid, el] of detailEls) el.classList.toggle('on', cid === chosen);
    for (const [cid, el] of cardEls) el.classList.toggle('on', cid === chosen);
  };

  // コース（ふつう・今夜のおかし・まよなか）
  const note = h('p', { class: 'course-note' });
  const tabs = new Map<CourseId, HTMLButtonElement>();
  const courseList: [CourseId, string, string][] = [
    ['normal', 'ふつう', ''],
    ['daily', '今夜のおかし', dayLabel(today)],
    ['night', 'まよなか', nightOK ? '' : 'ランクA達成で解放'],
  ];
  const courseRow = h('div', { class: 'courses', role: 'tablist' });
  for (const [cid, label, sub] of courseList) {
    const tab = h(
      'button',
      {
        class: `tab${wishes.some((m) => m.course === cid) ? ' wish' : ''}`,
        type: 'button',
        role: 'tab',
        disabled: cid === 'night' && !nightOK,
        onclick: () => {
          if (course === cid) return;
          course = cid;
          s.click();
          showCourse();
        },
      },
      label,
      sub ? h('small', {}, sub) : null,
    );
    tabs.set(cid, tab);
    courseRow.append(tab);
  }
  const showCourse = () => {
    for (const [cid, tab] of tabs) {
      tab.classList.toggle('on', cid === course);
      tab.setAttribute('aria-selected', String(cid === course));
    }
    const r = ruleOf(course, today);
    note.replaceChildren(course === 'daily' ? h('b', {}, `${r.name}　`) : '', r.note);
    note.className = `course-note ${course}`;
    for (const id of CHAR_ORDER) {
      const rec = recordOf(id);
      badgeSlots.get(id)!.replaceChildren(rankBadge(rec.rank, 'small'));
      bestSlots.get(id)!.replaceChildren(course === 'daily' ? 'きょうのベスト ' : 'ベスト ', h('b', {}, rec.best ? num(rec.best) : '−'), ' ', rankBadge(rec.rank, 'small'));
      // このキャラ・コースで数えるミッションがあれば、カードに印
      cardEls.get(id)!.classList.toggle('wish', wishes.some((m) => m.char === id && fits(m, id, course)));
    }
  };

  for (const id of CHAR_ORDER) {
    const tx = CHAR_TEXT[id];
    const badgeSlot = h('span', { class: 'badge-slot' });
    badgeSlots.set(id, badgeSlot);
    const card = h(
      'button',
      {
        class: 'card',
        type: 'button',
        style: `--c:${C[id]}`,
        onclick: () => {
          if (chosen === id) {
            s.click();
            start();
            return;
          }
          chosen = id;
          s.click();
          showDetail();
        },
      },
      mochiChibi(CHAR_SPECS[id], 'normal', 30, { sound: s, who: id }),
      h('span', { class: 'card-name' }, h('small', {}, tx.costume), tx.name),
      badgeSlot,
    );
    cardEls.set(id, card);
    cards.append(card);
    const detail = detailOf(id);
    detailEls.set(id, detail);
    details.append(detail);
  }
  const start = () => {
    save.lastChar = chosen;
    save.lastCourse = course;
    host.persist();
    on.pick(chosen, course);
  };
  showDetail();
  showCourse();
  return h(
    'div',
    { class: 'panel select' },
    h('h2', {}, 'だれで あそぶ？'),
    courseRow,
    note,
    cards,
    details,
    h('div', { class: 'row' }, btn('もどる', on.back, s), btn('スタート!', start, s, 'primary')),
  );
}

// ===================================================================== きろく

const whoName = (who: CheekWho) => (who === 'spiki' ? 'スピキ' : CHAR_TEXT[who].name);

export function recordsPanel(host: MenuHost, on: { close: () => void; lines: () => void }): HTMLElement {
  const s = host.sound;
  const save = host.save;
  const total = save.sweets;
  const t = titleOf(total);
  const next = nextTitle(total);
  // つぎの称号までの進み具合（ひとつ前の称号から数える）
  const from = [...TITLES].find((x) => x.min <= total)?.min ?? 0;
  const ratio = next ? (total - from) / (next.min - from) : 1;
  const today = dayKey();
  const cheek = save.cheek;
  const topCheek = (Object.entries(cheek.by) as [CheekWho, number][]).sort((a, b) => b[1] - a[1])[0];
  const dailyBest =
    save.daily.day === today
      ? CHAR_ORDER.map((id) => [id, save.daily.best[id] ?? -1] as const)
          .filter(([, v]) => v >= 0)
          .sort((a, b) => b[1] - a[1])[0]
      : undefined;
  /** キャラごとのベストとランク */
  const charGrid = (best: Partial<Record<CharId, number>>, rank: Partial<Record<CharId, RankId>>) =>
    h(
      'div',
      { class: 'rec-chars' },
      ...CHAR_ORDER.map((id) =>
        h(
          'div',
          { class: 'rec-char', style: `--c:${C[id]}` },
          mochiChibi(CHAR_SPECS[id], best[id] ? 'smile' : 'normal', 18, { sound: s, body: false, who: id }),
          h('span', { class: 'card-name' }, CHAR_TEXT[id].name),
          h('b', {}, best[id] ? num(best[id]) : '−'),
          rankBadge(rank[id], 'small'),
        ),
      ),
    );
  return h(
    'div',
    { class: 'panel records' },
    h('h2', {}, 'きろく'),
    h(
      'div',
      { class: 'rec-title' },
      h('small', {}, 'いまの称号'),
      h('b', {}, t ? `「${TITLE_TEXT[t]}」` : 'まだなし'),
      h('div', { class: 'meter' }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
      h('p', {}, `今までのおかし ${num(total)} こ`, next ? h('small', {}, ` ・ つぎの称号まで あと ${num(next.min - total)} こ`) : null),
      h('p', {}, h('small', {}, `あそんだ回数 ${num(save.plays)} 回`)),
    ),
    h(
      'ul',
      { class: 'rec-titles' },
      ...[...TITLES].reverse().map((x) =>
        h(
          'li',
          { class: total >= x.min ? 'got' : '' },
          h('b', {}, TITLE_TEXT[x.id]),
          h('small', {}, `おかし ${num(x.min)} こ`),
          h('span', { class: 'state' }, total >= x.min ? 'ゲット!' : `あと ${num(x.min - total)} こ`),
        ),
      ),
    ),
    h('p', { class: 'rec-note' }, 'おかしは あそぶたびと、ミッションの ごほうびで たまっていきます'),
    h('h3', { class: 'rec-sub' }, 'ふつう'),
    charGrid(save.best, save.rank),
    nightOpen(save.rank) ? h('h3', { class: 'rec-sub' }, 'まよなか') : null,
    nightOpen(save.rank) ? charGrid(save.night.best, save.night.rank) : null,
    h('h3', { class: 'rec-sub' }, `今夜のおかし（${dayLabel(today)}・${dailyRule(today).name}）`),
    h('p', { class: 'rec-daily' }, h('small', {}, `きょうのベスト `), h('b', {}, dailyBest ? `${num(dailyBest[1])}（${CHAR_TEXT[dailyBest[0]].name}）` : '−'), h('small', {}, `　あそんだ日 ${save.dailyDays} 日`)),
    h('h3', { class: 'rec-sub' }, 'ほっぺ'),
    h('p', { class: 'rec-daily' }, h('small', {}, 'のばした '), h('b', {}, `${num(cheek.pulls)} 回`), h('small', {}, `　めいっぱい ${num(cheek.big)} 回・しつこく ${num(cheek.sulks)} 回`)),
    h('p', { class: 'rec-note' }, topCheek ? `いちばん のばしたのは ${whoName(topCheek[0])}（${num(topCheek[1])} 回）` : 'キャラの ほっぺは、タイトルでも キャラえらびでも 引っぱれます'),
    h('div', { class: 'row' }, btn(`セリフずかん ${foundLines(save)}/${LINE_TOTAL}`, on.lines, s), btn('とじる', on.close, s, 'primary')),
  );
}

// ===================================================================== セリフずかん

const LINE_TOTAL = CHAR_ORDER.length * RESULT_LINE_IDS.length;
const foundLines = (save: SaveData) => CHAR_ORDER.reduce((n, id) => n + RESULT_LINE_IDS.filter((l) => save.lines.includes(lineKey(id, l))).length, 0);

export function linesPanel(host: MenuHost, on: { close: () => void }): HTMLElement {
  const s = host.sound;
  const found = new Set(host.save.lines);
  return h(
    'div',
    { class: 'panel lines-panel' },
    h('h2', {}, 'セリフずかん'),
    h('p', { class: 'rec-note' }, `見つけた セリフ ${foundLines(host.save)} / ${LINE_TOTAL}。あそび終わった時の ようすで、ひとことが かわります`),
    ...CHAR_ORDER.map((id) => {
      const got = RESULT_LINE_IDS.filter((l) => found.has(lineKey(id, l))).length;
      return h(
        'details',
        { class: 'lines-char', style: `--c:${C[id]}` },
        h('summary', {}, h('b', {}, CHAR_TEXT[id].name), h('small', {}, `${got} / ${RESULT_LINE_IDS.length}`)),
        h(
          'ul',
          {},
          ...RESULT_LINE_IDS.map((l) =>
            found.has(lineKey(id, l))
              ? h('li', { class: 'got' }, h('span', {}, `「${resultText(id, l)}」`), h('small', {}, resultHint(id, l)))
              : h('li', {}, h('span', {}, '？？？'), h('small', {}, resultHint(id, l))),
          ),
        ),
      );
    }),
    h('div', { class: 'row' }, btn('もどる', on.close, s, 'primary')),
  );
}

// ===================================================================== ミッション画面

export function missionsPanel(host: MenuHost, on: { close: () => void }): HTMLElement {
  const s = host.save;
  const now = activeMissions(s);
  const got = MISSIONS.filter((m) => s.missions.includes(m.id)).reduce((n, m) => n + m.reward, 0);
  const ratio = s.missions.length / MISSIONS.length;
  return h(
    'div',
    { class: 'panel missions-panel' },
    h('h2', {}, 'ミッション'),
    h(
      'div',
      { class: 'rec-title' },
      h('small', {}, 'クリアした ミッション'),
      h('b', {}, `${s.missions.length} / ${MISSIONS.length}`),
      h('div', { class: 'meter' }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
      h('p', {}, `ごほうびで もらった おかし ${num(got)} こ`),
    ),
    h('h3', { class: 'rec-sub' }, 'いまのミッション'),
    now.length
      ? h('div', { class: 'missions' }, h('ul', {}, ...now.map((m) => missionRow(m, s))))
      : h('p', { class: 'm-all' }, 'ぜんぶ クリア！ ありがとう！'),
    h('p', { class: 'rec-note' }, `いまのミッションは ${MISSION_SLOTS} つずつ。あそび終わった時に クリアすると、次のミッションが出て ごほうびの おかしが もらえます`),
    h('h3', { class: 'rec-sub' }, 'ぜんぶのミッション'),
    h(
      'div',
      { class: 'missions' },
      h('ul', {}, ...MISSIONS.map((m) => missionRow(m, s, s.missions.includes(m.id) ? 'got' : now.includes(m) ? 'now' : ''))),
    ),
    h('div', { class: 'row' }, btn('とじる', on.close, host.sound, 'primary')),
  );
}

// ===================================================================== あそびかた

export function howToPanel(host: MenuHost, on: { close: () => void; practice?: () => void }): HTMLElement {
  const s = host.sound;
  const kinds: ItemKind[] = ['candy', 'star', 'mokaron', 'shucaron', 'hobagi'];
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return h(
    'div',
    { class: 'panel howto' },
    h('h2', {}, 'あそびかた'),
    h('p', { class: 'lead' }, `おばけの国に、おかしが降ってくる！ ${BALANCE.duration} 秒で たくさんキャッチしよう。`),
    h(
      'ul',
      { class: 'items' },
      ...kinds.map((k) => h('li', {}, itemCanvas(k, 44), h('span', {}, h('b', {}, ITEM_TEXT[k].name), h('small', {}, ITEM_TEXT[k].note)))),
    ),
    h(
      'div',
      { class: 'tips' },
      h('p', {}, h('b', {}, 'うごく: '), touch ? '画面のどこでも、指で左右にドラッグ。' : 'マウスを左右に動かす / ← → キー（A D）'),
      h('p', {}, h('b', {}, 'れんぞく: '), `${BALANCE.chain.window} 秒以内に次をキャッチすると つながって、${BALANCE.chain.step} こごとに点数がアップ（最大 ×${BALANCE.chain.max.toFixed(1)}）。`),
      h('p', {}, h('b', {}, 'フィーバー: '), 'モカロンでゲージがたまると、シューカロンの雨！ 時間ぎれでも、フィーバーが終わるまで つづくよ。'),
    ),
    h(
      'div',
      { class: 'spiki-tip' },
      h('div', { class: 'tip-face' }, mochiChibi(SPIKEY, 'smile', 24, { sound: s, who: 'spiki' }), h('span', { class: 'arrow' }, '→'), mochiChibi(SPIKI, 'worried', 24, { sound: s, who: 'spiki' })),
      h(
        'p',
        {},
        'ホバギをよけて地面に落とすと、ともだちのスピッキーが泣いて「スピキ」になっちゃう。',
        h('br'),
        h('b', {}, touch ? 'スピキをタップ' : 'スピキをクリック（↑キー / スペース）'),
        'でなぐさめると、おかえしのおかしを投げてくれる！ 泣いている間にもっとホバギが落ちると、おかえしが増えるよ。',
        h('br'),
        h('b', {}, 'ほっぺを むにーっと引っぱってから離す'),
        'と、おかえしがもう 1 こ！',
      ),
    ),
    h('div', { class: 'row' }, on.practice ? btn('れんしゅうする', on.practice, s) : null, btn('とじる', on.close, s, 'primary')),
  );
}

// ===================================================================== せってい

export function settingsPanel(host: MenuHost, on: { close: () => void }): HTMLElement {
  const s = host.sound;
  const save = host.save;
  const slider = (label: string, value: number, set: (v: number) => void) => {
    const input = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(value * 100), 'aria-label': label });
    input.addEventListener('input', () => {
      set(Number(input.value) / 100);
      s.applyVolume();
    });
    input.addEventListener('change', () => {
      host.persist();
      s.click();
    });
    return h('label', { class: 'setting' }, h('span', {}, label), input);
  };
  const check = (label: string, value: boolean, set: (v: boolean) => void) => {
    const input = h('input', { type: 'checkbox' });
    input.checked = value;
    input.addEventListener('change', () => {
      set(input.checked);
      s.applyVolume();
      host.persist();
      s.click();
    });
    return h('label', { class: 'setting check' }, input, h('span', {}, label));
  };
  return h(
    'div',
    { class: 'panel settings' },
    h('h2', {}, 'せってい'),
    slider('効果音', save.sfxVolume, (v) => (save.sfxVolume = s.sfxVolume = v)),
    slider('BGM', save.bgmVolume, (v) => (save.bgmVolume = s.bgmVolume = v)),
    check('音を消す', save.muted, (v) => (save.muted = s.muted = v)),
    check('画面のゆれを へらす', save.calm, (v) => (save.calm = v)),
    h('div', { class: 'row' }, btn('とじる', on.close, s, 'primary')),
  );
}

// ===================================================================== ポーズ

/** play が null なられんしゅう中（ミッションは出さず、やりなおすの代わりに skip） */
export function pausePanel(
  host: MenuHost,
  play: Play | null,
  on: { resume: () => void; retry: () => void; select: () => void; howTo: () => void; skip?: () => void },
): HTMLElement {
  const s = host.sound;
  const save = host.save;
  const list = play ? activeMissions(save) : [];
  // いまのプレイで数えるものは「いま」の数を、そうでないもの（記録で数える・ほかのキャラ）は記録を出す
  const rows = list.map((m) => (play && fits(m, play.char, play.course) ? missionRow(m, save, 'now', playValue(m, play)) : missionRow(m, save)));
  return h(
    'div',
    { class: 'panel pause' },
    h('h2', {}, 'ひとやすみ'),
    h(
      'div',
      { class: 'col' },
      btn('つづける', on.resume, s, 'primary'),
      on.skip ? btn('れんしゅうを とばす', on.skip, s) : btn('やりなおす', on.retry, s),
      btn('あそびかた', on.howTo, s),
      btn('キャラえらびへ', on.select, s),
    ),
    rows.length ? h('div', { class: 'missions' }, h('div', { class: 'missions-head' }, h('b', {}, 'ミッション'), h('small', {}, 'おわった時に クリア')), h('ul', {}, ...rows)) : null,
  );
}

// ===================================================================== けっか

export interface ResultInfo {
  world: World;
  charId: CharId;
  course: CourseId;
  /** 遊んだ日（今夜のおかし） */
  day: string;
  /** このコースの、前のベスト */
  prevBest: number;
  /** 遊ぶ前の、今までのおかし */
  prevSweets: number;
  /** このプレイで取ったおかし */
  sweets: number;
  /** 遊ぶ前のミッション（id） */
  before: string[];
  /** このプレイでクリアしたミッション */
  cleared: Mission[];
  /** まよなかモードがあそべるようになった */
  nightNew: boolean;
  /** キャラのひとこと（はじめて見たものは NEW） */
  line: PickedLine;
}

export function resultPanel(host: MenuHost, info: ResultInfo, on: { retry: () => void; select: () => void; title: () => void }): HTMLElement {
  const s = host.sound;
  const w = info.world;
  const id = info.charId;
  const score = w.score;
  const rank = rankOf(score);
  const tx = CHAR_TEXT[id];
  const good = rank === 'SS' || rank === 'S' || rank === 'A';
  const expr: Expr = good ? 'happy' : rank === 'C' ? 'worried' : 'smile';
  const isBest = score > info.prevBest && score > 0;
  const st = w.stats;
  const caught = (k: ItemKind) => st.caught[k];
  const sweets = info.sweets;
  const save = host.save;
  const reward = info.cleared.reduce((a, m) => a + m.reward, 0);
  const total = save.sweets;
  const before = titleOf(info.prevSweets);
  const after = titleOf(total);
  const next = nextTitle(total);
  const rule = ruleOf(info.course, info.day);
  const courseLabel = info.course === 'daily' ? `今夜のおかし ${dayLabel(info.day)}` : info.course === 'night' ? 'まよなかモード' : '';
  const bestLabel = info.course === 'daily' ? 'きょうのベスト' : 'ベスト';
  // ミッション: クリアしたもの → いまのミッション（あたらしく出たものは NEW）
  const now = activeMissions(save);
  const missionRows = [
    ...info.cleared.map((m) => missionRow(m, save, 'done')),
    ...now.map((m) => missionRow(m, save, info.before.includes(m.id) ? 'now' : 'new')),
  ];
  const unplayed = CHAR_ORDER.filter((c) => !save.charPlays[c]);
  const nextRank = [...RANKS].reverse().find((r) => r.min > score);

  const scoreEl = h('div', { class: 'score' }, '0');
  // 点数を数え上げる
  const t0 = performance.now();
  const dur = 900;
  const count = (t: number) => {
    const k = Math.min(1, Math.max(0, (t - t0) / dur));
    scoreEl.textContent = num(score * (1 - Math.pow(1 - k, 3)));
    if (k < 1 && scoreEl.isConnected) requestAnimationFrame(count);
    else if (k >= 1) {
      stamp.classList.add('show');
      s.rank(good);
    }
  };
  requestAnimationFrame(count);
  const stamp = rankBadge(rank, 'stamp');

  const row = (kind: ItemKind | null, label: string, value: string) =>
    h('li', {}, kind ? itemCanvas(kind, 30) : h('span', { class: 'dot' }), h('span', { class: 'k' }, label), h('b', {}, value));

  const share = () => {
    const where = info.course === 'daily' ? `の今夜のおかし（${dayLabel(info.day)}・${rule.name}）` : info.course === 'night' ? 'のまよなかモード' : '';
    const text = `『${GAME_TITLE}』${where}で${tx.costume}${tx.name}が ${num(score)}点（ランク${rank}）！ #トリッカルオアトリート #トリッカル`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, '_blank', 'noopener');
  };

  return h(
    'div',
    { class: 'panel result' },
    h('h2', {}, 'けっか'),
    h(
      'div',
      { class: 'result-top' },
      h('div', { class: 'result-face' }, mochiChibi(CHAR_SPECS[id], expr, 40, { sound: s, who: id })),
      h(
        'div',
        { class: 'score-box' },
        courseLabel ? h('small', { class: `course-tag ${info.course}` }, courseLabel) : null,
        h('small', {}, `${tx.costume}${tx.name}`),
        scoreEl,
        h('div', { class: 'rank-row' }, stamp, h('span', { class: 'rank-text' }, RANK_TEXT[rank])),
        isBest ? h('div', { class: 'new' }, 'ベスト更新!') : h('div', { class: 'prev' }, `${bestLabel} ${num(info.prevBest)}`),
      ),
    ),
    h('p', { class: 'line' }, `「${info.line.text}」`, info.line.isNew ? h('small', { class: 'line-new' }, 'NEW セリフ') : null),
    h(
      'ul',
      { class: 'breakdown' },
      row('candy', 'キャンディ', `${caught('candy')}`),
      row('star', 'スター', `${caught('star')}`),
      row('mokaron', 'モカロン', `${caught('mokaron')}`),
      row('shucaron', 'シューカロン', `${caught('shucaron')}`),
      row('hobagi', id === 'joanne' ? 'ホバギを吸った' : 'ホバギに当たった', `${st.hits}`),
      row(null, 'さいだいれんぞく', `${st.maxChain}`),
      row(null, 'フィーバー', `${st.fevers} 回`),
      row(null, 'スピキをなぐさめた', `${st.comforts} 回`),
    ),
    nextRank ? h('p', { class: 'next-rank' }, `ランク${nextRank.id}まで あと ${num(nextRank.min - score)} 点`) : null,
    info.nightNew ? h('p', { class: 'unlock' }, 'ランクA達成！「まよなか」モードが 解放された！（キャラえらびで）') : null,
    missionRows.length
      ? h(
          'div',
          { class: 'missions' },
          missionsHead(save),
          h('ul', {}, ...missionRows),
        )
      : null,
    h(
      'p',
      { class: 'title-line' },
      `おかし +${sweets} こ`,
      reward ? h('b', { class: 'reward' }, `　ミッションのごほうび +${reward} こ`) : null,
      `（今までに ${num(total)} こ）`,
      after && after !== before ? h('b', { class: 'new-title' }, ` 称号「${TITLE_TEXT[after]}」をゲット!`) : null,
      next && !(after && after !== before) ? h('small', {}, ` つぎの称号まで あと ${num(next.min - total)} こ`) : null,
    ),
    unplayed.length ? h('p', { class: 'hint-line' }, `まだ あそんでいない: ${unplayed.map((c) => CHAR_TEXT[c].name).join('・')}`) : null,
    // スマホで下まで長くなっても、ボタンは画面の下に残す
    h(
      'div',
      { class: 'result-actions' },
      h('div', { class: 'row' }, btn('キャラえらび', on.select, s), btn('もう一回!', on.retry, s, 'primary')),
      h('div', { class: 'row small' }, btn('タイトルへ', on.title, s, 'ghost'), btn('X でシェア', share, s, 'ghost share')),
    ),
  );
}

