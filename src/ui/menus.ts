// メニュー画面（DOM）。タイトル・キャラえらび・あそびかた・せってい・ポーズ・けっか。
import type { Sound } from '../audio/sound';
import { BALANCE, RANKS, TITLES, rankOf, titleOf, type ItemKind, type RankId } from '../config/balance';
import { CHARACTERS, CHAR_ORDER, type CharId } from '../config/characters';
import { MISSIONS, MISSION_SLOTS, activeMissions, fits, missionText, playValue, progressOf, type Mission, type Play } from '../config/missions';
import { RESULT_LINE_IDS, lineKey, resultHint, resultText, type PickedLine } from '../config/lines';
import { dailyRule, dayKey, dayLabel, nightOpen, ruleOf, ruleText, type CourseId } from '../config/rules';
import { lang, LANGS, langName, num, T, type Lang } from '../i18n';
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
  if (state === 'done') prog = T.missions.cleared;
  else if (state === 'got') prog = T.missions.got;
  else if (state === 'new') prog = T.missions.new;
  else if (value !== undefined && v >= m.goal) prog = T.missions.done;
  else if (m.goal > 1 && v > 0) {
    prog = `${num(Math.min(v, m.goal))}/${num(m.goal)}`;
    if (value === undefined && !m.total) prog = T.missions.best(prog);
  }
  return h(
    'li',
    { class: `mission ${state}`.trim() },
    h('span', { class: 'm-text' }, missionText(m)),
    prog ? h('small', { class: 'm-prog' }, prog) : null,
    h('span', { class: 'm-reward', title: T.missions.reward }, itemCanvas('candy', 16), `+${m.reward}`),
  );
}

function missionsHead(save: SaveData, more = ''): HTMLElement {
  return h('div', { class: 'missions-head' }, h('b', {}, T.missions.head), h('small', {}, `${T.missions.count(save.missions.length, MISSIONS.length)}${more}`));
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
      'aria-label': T.missions.open,
      onclick: go,
      onkeydown: (e: Event) => {
        const k = (e as KeyboardEvent).key;
        if (k !== 'Enter' && k !== ' ') return;
        e.preventDefault();
        go();
      },
    },
    missionsHead(save, ' ›'),
    list.length ? h('ul', {}, ...list.map((m) => missionRow(m, save))) : h('p', { class: 'm-all' }, T.missions.allDone),
  );
}

// ===================================================================== タイトル

/**
 * タイトル右上の言語ボタン。押すたびに 日本語 → 한국어 → English → 日本語 … と切り替わる。
 * ボタンには次の言語の名前をその言語で書く（日本語の画面には「한국어」。今の言語が読めない人にも、言語のボタンだとわかる）。
 * 画面の右上に置くので、タイトル（出てくる時に拡大のアニメーションがかかる）の中ではなく、その外側に足す
 */
export function langButton(host: MenuHost, onPick: (l: Lang) => void): HTMLElement {
  const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
  return h(
    'button',
    {
      class: 'lang-btn',
      type: 'button',
      lang: next,
      'aria-label': `${T.common.language}: ${langName(next)}`,
      onclick: () => {
        host.sound.click();
        onPick(next);
      },
    },
    h('span', { class: 'lang-icon', 'aria-hidden': 'true' }),
    langName(next),
  );
}

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
      h('span', { class: 'logo-sub' }, T.title.sub),
      h('h1', { 'aria-label': T.docTitle }, logoArt()),
    ),
    h('div', { class: 'title-stage' }, row),
    h(
      'div',
      { class: 'menu-buttons' },
      btn(T.title.play, on.start, s, 'primary big'),
      h('div', { class: 'row' }, btn(T.howTo.heading, on.howTo, s), btn(T.records.heading, on.records, s), btn(T.settings.heading, on.settings, s)),
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
      h('b', {}, t ? T.title.badge(T.titles[t]) : T.title.noBadge),
      h('span', {}, T.title.sweets(num(total))),
      next ? h('small', {}, T.title.toNext(num(next.min - total))) : null,
    ),
    h('p', { class: 'disclaimer' }, T.disclaimer),
  );
}

/** ロゴの絵。字の形はフォントで描くので、フォントが届いたら描き直す（韓国語の字は Jua なので、いまの言語の字で待つ） */
function logoArt(): HTMLCanvasElement {
  const S = 64;
  const make = () => paintCanvas(LOGO_W * S, LOGO_H * S, (c) => drawLogo(c, (LOGO_W * S) / 2, 0, S), 'logo-art');
  const cv = make();
  const text = T.logo.join('');
  if (!document.fonts.check(font(S), text)) void document.fonts.load(font(S), text).then(() => cv.replaceWith(make()));
  return cv;
}

/** まだ取っていない称号のうち、いちばん近いもの */
function nextTitle(total: number): (typeof TITLES)[number] | undefined {
  return [...TITLES].reverse().find((x) => x.min > total);
}

// ===================================================================== キャラえらび

export function charSelect(
  host: MenuHost,
  on: { pick: (id: CharId, course: CourseId) => void; practice: (id: CharId, course: CourseId) => void; back: () => void },
): HTMLElement {
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
    const tx = T.chars[id];
    const bestSlot = h('p', { class: 'best-line' });
    bestSlots.set(id, bestSlot);
    return h(
      'div',
      { class: 'detail', style: `--c:${C[id]}` },
      h('div', { class: 'detail-face' }, mochiChibi(CHAR_SPECS[id], 'happy', 30, { sound: s, who: id })),
      h('div', { class: 'detail-name' }, h('small', {}, tx.costume), tx.name),
      h('p', { class: 'hello' }, T.common.quote(tx.hello)),
      h(
        'div',
        { class: 'stat-rows' },
        h('div', { class: 'stat' }, h('span', {}, T.select.speed), starsText(d.stars.speed)),
        h('div', { class: 'stat' }, h('span', {}, T.select.reach), starsText(d.stars.reach)),
        h('div', { class: 'stat' }, h('span', {}, T.select.easy), starsText(d.stars.easy)),
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
    ['normal', T.courses.normal, ''],
    ['daily', T.courses.daily, dayLabel(today)],
    ['night', T.courses.night, nightOK ? '' : T.select.nightLock],
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
    const r = ruleText(ruleOf(course, today));
    note.replaceChildren(course === 'daily' ? h('b', {}, T.select.ruleName(r.name)) : '', r.note);
    note.className = `course-note ${course}`;
    for (const id of CHAR_ORDER) {
      const rec = recordOf(id);
      badgeSlots.get(id)!.replaceChildren(rankBadge(rec.rank, 'small'));
      bestSlots.get(id)!.replaceChildren(`${course === 'daily' ? T.common.dailyBest : T.common.best} `, h('b', {}, rec.best ? num(rec.best) : '−'), ' ', rankBadge(rec.rank, 'small'));
      // このキャラ・コースで数えるミッションがあれば、カードに印
      cardEls.get(id)!.classList.toggle('wish', wishes.some((m) => m.char === id && fits(m, id, course)));
    }
  };

  for (const id of CHAR_ORDER) {
    const tx = T.chars[id];
    const badgeSlot = h('span', { class: 'badge-slot' });
    badgeSlots.set(id, badgeSlot);
    const card = h(
      'button',
      {
        class: 'card',
        type: 'button',
        style: `--c:${C[id]}`,
        // えらんだカードをもう一度押しても始めない（ほっぺを引っぱった後に始まってしまうので）。始めるのはスタートのボタンだけ
        onclick: () => {
          if (chosen === id) return;
          s.click();
          choose(id);
        },
      },
      // ほっぺをつまんでも、そのキャラをえらぶ
      mochiChibi(CHAR_SPECS[id], 'normal', 30, { sound: s, who: id, onGrab: () => choose(id) }),
      h('span', { class: 'card-name' }, h('small', {}, tx.costume), tx.name),
      badgeSlot,
    );
    cardEls.set(id, card);
    cards.append(card);
    const detail = detailOf(id);
    detailEls.set(id, detail);
    details.append(detail);
  }
  function choose(id: CharId): void {
    if (chosen === id) return;
    chosen = id;
    showDetail();
  }
  // れんしゅうは、えらんだキャラで チュートリアルから。終わったら、えらんだコースの本番へ
  const go = (then: (id: CharId, course: CourseId) => void) => () => {
    save.lastChar = chosen;
    save.lastCourse = course;
    host.persist();
    then(chosen, course);
  };
  showDetail();
  showCourse();
  return h(
    'div',
    { class: 'panel select' },
    h('h2', {}, T.select.heading),
    courseRow,
    note,
    cards,
    details,
    h(
      'div',
      { class: 'row' },
      btn(T.common.back, on.back, s),
      btn(T.select.practice, go(on.practice), s),
      btn(T.select.start, go(on.pick), s, 'primary'),
    ),
  );
}

// ===================================================================== きろく

const whoName = (who: CheekWho) => (who === 'spiki' ? T.spikiName : T.chars[who].name);

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
          h('span', { class: 'card-name' }, T.chars[id].name),
          h('b', {}, best[id] ? num(best[id]) : '−'),
          rankBadge(rank[id], 'small'),
        ),
      ),
    );
  return h(
    'div',
    { class: 'panel records' },
    h('h2', {}, T.records.heading),
    h(
      'div',
      { class: 'rec-title' },
      h('small', {}, T.records.now),
      h('b', {}, t ? T.common.quote(T.titles[t]) : T.records.none),
      h('div', { class: 'meter' }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
      h('p', {}, T.records.sweets(num(total)), next ? h('small', {}, T.records.toNext(num(next.min - total))) : null),
      h('p', {}, h('small', {}, T.records.plays(num(save.plays)))),
    ),
    h(
      'ul',
      { class: 'rec-titles' },
      ...[...TITLES].reverse().map((x) =>
        h(
          'li',
          { class: total >= x.min ? 'got' : '' },
          h('b', {}, T.titles[x.id]),
          h('small', {}, T.records.need(num(x.min))),
          h('span', { class: 'state' }, total >= x.min ? T.records.got : T.records.left(num(x.min - total))),
        ),
      ),
    ),
    h('p', { class: 'rec-note' }, T.records.note),
    h('h3', { class: 'rec-sub' }, T.courses.normal),
    charGrid(save.best, save.rank),
    nightOpen(save.rank) ? h('h3', { class: 'rec-sub' }, T.courses.night) : null,
    nightOpen(save.rank) ? charGrid(save.night.best, save.night.rank) : null,
    h('h3', { class: 'rec-sub' }, T.records.daily(dayLabel(today), ruleText(dailyRule(today)).name)),
    h(
      'p',
      { class: 'rec-daily' },
      h('small', {}, `${T.common.dailyBest} `),
      h('b', {}, dailyBest ? T.records.dailyScore(num(dailyBest[1]), T.chars[dailyBest[0]].name) : '−'),
      h('small', {}, T.records.dailyDays(save.dailyDays)),
    ),
    h('h3', { class: 'rec-sub' }, T.records.cheek),
    h('p', { class: 'rec-daily' }, h('small', {}, `${T.records.pulled} `), h('b', {}, T.common.times(num(cheek.pulls))), h('small', {}, T.records.cheekMore(num(cheek.big), num(cheek.sulks)))),
    h('p', { class: 'rec-note' }, topCheek ? T.records.topCheek(whoName(topCheek[0]), num(topCheek[1])) : T.records.cheekNote),
    h('div', { class: 'row' }, btn(T.records.lines(foundLines(save), LINE_TOTAL), on.lines, s), btn(T.common.close, on.close, s, 'primary')),
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
    h('h2', {}, T.linesBook.heading),
    h('p', { class: 'rec-note' }, T.linesBook.note(foundLines(host.save), LINE_TOTAL)),
    ...CHAR_ORDER.map((id) => {
      const got = RESULT_LINE_IDS.filter((l) => found.has(lineKey(id, l))).length;
      return h(
        'details',
        { class: 'lines-char', style: `--c:${C[id]}` },
        h('summary', {}, h('b', {}, T.chars[id].name), h('small', {}, `${got} / ${RESULT_LINE_IDS.length}`)),
        h(
          'ul',
          {},
          ...RESULT_LINE_IDS.map((l) =>
            found.has(lineKey(id, l))
              ? h('li', { class: 'got' }, h('span', {}, T.common.quote(resultText(id, l))), h('small', {}, resultHint(id, l)))
              : h('li', {}, h('span', {}, T.linesBook.unknown), h('small', {}, resultHint(id, l))),
          ),
        ),
      );
    }),
    h('div', { class: 'row' }, btn(T.common.back, on.close, s, 'primary')),
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
    h('h2', {}, T.missions.head),
    h(
      'div',
      { class: 'rec-title' },
      h('small', {}, T.missions.clearedHead),
      h('b', {}, `${s.missions.length} / ${MISSIONS.length}`),
      h('div', { class: 'meter' }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
      h('p', {}, T.missions.rewardTotal(num(got))),
    ),
    h('h3', { class: 'rec-sub' }, T.missions.now),
    now.length
      ? h('div', { class: 'missions' }, h('ul', {}, ...now.map((m) => missionRow(m, s))))
      : h('p', { class: 'm-all' }, T.missions.allDone),
    h('p', { class: 'rec-note' }, T.missions.note(MISSION_SLOTS)),
    h('h3', { class: 'rec-sub' }, T.missions.all),
    h(
      'div',
      { class: 'missions' },
      h('ul', {}, ...MISSIONS.map((m) => missionRow(m, s, s.missions.includes(m.id) ? 'got' : now.includes(m) ? 'now' : ''))),
    ),
    h('div', { class: 'row' }, btn(T.common.close, on.close, host.sound, 'primary')),
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
    h('h2', {}, T.howTo.heading),
    h('p', { class: 'lead' }, T.howTo.lead(BALANCE.duration)),
    h(
      'ul',
      { class: 'items' },
      ...kinds.map((k) => h('li', {}, itemCanvas(k, 44), h('span', {}, h('b', {}, T.items[k].name), h('small', {}, T.items[k].note)))),
    ),
    h(
      'div',
      { class: 'tips' },
      h('p', {}, h('b', {}, T.howTo.move), touch ? T.howTo.moveTouch : T.howTo.moveMouse),
      h('p', {}, h('b', {}, T.howTo.chain), T.howTo.chainText(BALANCE.chain.window, BALANCE.chain.step, BALANCE.chain.max.toFixed(1))),
      h('p', {}, h('b', {}, T.howTo.fever), T.howTo.feverText),
    ),
    h(
      'div',
      { class: 'spiki-tip' },
      h('div', { class: 'tip-face' }, mochiChibi(SPIKEY, 'smile', 24, { sound: s, who: 'spiki' }), h('span', { class: 'arrow' }, '→'), mochiChibi(SPIKI, 'worried', 24, { sound: s, who: 'spiki' })),
      h(
        'p',
        {},
        T.howTo.spiki,
        h('br'),
        h('b', {}, touch ? T.howTo.spikiTap : T.howTo.spikiClick),
        T.howTo.spikiThen,
        h('br'),
        h('b', {}, T.howTo.cheek),
        T.howTo.cheekThen,
      ),
    ),
    h('div', { class: 'row' }, on.practice ? btn(T.howTo.practice, on.practice, s) : null, btn(T.common.close, on.close, s, 'primary')),
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
    h('h2', {}, T.settings.heading),
    slider(T.settings.sfx, save.sfxVolume, (v) => (save.sfxVolume = s.sfxVolume = v)),
    slider(T.settings.bgm, save.bgmVolume, (v) => (save.bgmVolume = s.bgmVolume = v)),
    check(T.settings.mute, save.muted, (v) => (save.muted = s.muted = v)),
    check(T.settings.calm, save.calm, (v) => (save.calm = v)),
    h('div', { class: 'row' }, btn(T.common.close, on.close, s, 'primary')),
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
    h('h2', {}, T.pause.heading),
    h(
      'div',
      { class: 'col' },
      btn(T.pause.resume, on.resume, s, 'primary'),
      on.skip ? btn(T.pause.skip, on.skip, s) : btn(T.pause.retry, on.retry, s),
      btn(T.howTo.heading, on.howTo, s),
      btn(T.pause.select, on.select, s),
    ),
    rows.length ? h('div', { class: 'missions' }, h('div', { class: 'missions-head' }, h('b', {}, T.missions.head), h('small', {}, T.missions.atEnd)), h('ul', {}, ...rows)) : null,
  );
}

// ===================================================================== けっか

/** X でシェアする時のリンク */
const SHARE_URL = 'https://sabanogames.com/entertainments/trickcal-or-treat-2026-1/';

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
  const tx = T.chars[id];
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
  const rule = ruleText(ruleOf(info.course, info.day));
  const courseLabel = info.course === 'daily' ? T.result.daily(dayLabel(info.day)) : info.course === 'night' ? T.result.night : '';
  const bestLabel = info.course === 'daily' ? T.common.dailyBest : T.common.best;
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
    const where = info.course === 'daily' ? T.result.shareDaily(dayLabel(info.day), rule.name) : info.course === 'night' ? T.result.shareNight : '';
    const text = T.result.shareText(T.docTitle, where, T.common.who(tx.costume, tx.name), num(score), rank);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, '_blank', 'noopener');
  };

  return h(
    'div',
    { class: 'panel result' },
    h('h2', {}, T.result.heading),
    h(
      'div',
      { class: 'result-top' },
      h('div', { class: 'result-face' }, mochiChibi(CHAR_SPECS[id], expr, 40, { sound: s, who: id })),
      h(
        'div',
        { class: 'score-box' },
        courseLabel ? h('small', { class: `course-tag ${info.course}` }, courseLabel) : null,
        h('small', {}, T.common.who(tx.costume, tx.name)),
        scoreEl,
        h('div', { class: 'rank-row' }, stamp, h('span', { class: 'rank-text' }, T.ranks[rank])),
        isBest ? h('div', { class: 'new' }, T.result.best) : h('div', { class: 'prev' }, `${bestLabel} ${num(info.prevBest)}`),
      ),
    ),
    h('p', { class: 'line' }, T.common.quote(info.line.text), info.line.isNew ? h('small', { class: 'line-new' }, T.result.newLine) : null),
    h(
      'ul',
      { class: 'breakdown' },
      row('candy', T.result.candy, `${caught('candy')}`),
      row('star', T.result.star, `${caught('star')}`),
      row('mokaron', T.result.mokaron, `${caught('mokaron')}`),
      row('shucaron', T.result.shucaron, `${caught('shucaron')}`),
      row('hobagi', id === 'joanne' ? T.result.drained : T.result.hits, `${st.hits}`),
      row(null, T.result.maxChain, `${st.maxChain}`),
      row(null, T.result.fevers, T.common.times(st.fevers)),
      row(null, T.result.comforts, T.common.times(st.comforts)),
    ),
    nextRank ? h('p', { class: 'next-rank' }, T.result.nextRank(nextRank.id, num(nextRank.min - score))) : null,
    info.nightNew ? h('p', { class: 'unlock' }, T.result.nightOpen) : null,
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
      T.result.sweets(sweets),
      reward ? h('b', { class: 'reward' }, T.result.reward(reward)) : null,
      T.result.total(num(total)),
      after && after !== before ? h('b', { class: 'new-title' }, T.result.newTitle(T.titles[after])) : null,
      next && !(after && after !== before) ? h('small', {}, T.result.toNext(num(next.min - total))) : null,
    ),
    unplayed.length ? h('p', { class: 'hint-line' }, T.result.unplayed(unplayed.map((c) => T.chars[c].name))) : null,
    // スマホで下まで長くなっても、ボタンは画面の下に残す
    h(
      'div',
      { class: 'result-actions' },
      h('div', { class: 'row' }, btn(T.result.select, on.select, s), btn(T.result.retry, on.retry, s, 'primary')),
      h('div', { class: 'row small' }, btn(T.result.title, on.title, s, 'ghost'), btn(T.result.share, share, s, 'ghost share')),
    ),
  );
}

