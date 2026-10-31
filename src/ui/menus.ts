// メニュー画面（DOM）。タイトル・キャラえらび・あそびかた・せってい・ポーズ・けっか。
import type { Sound } from '../audio/sound';
import { BALANCE, RANKS, TITLES, rankOf, titleOf, type ItemKind, type RankId } from '../config/balance';
import { CHARACTERS, CHAR_ORDER, type CharId } from '../config/characters';
import { CHAR_TEXT, DISCLAIMER, GAME_TITLE, ITEM_TEXT, RANK_TEXT, SHARE_URL, TITLE_TEXT } from '../config/text';
import type { World } from '../sim/world';
import type { SaveData } from '../storage';
import { CHAR_SPECS, SPIKEY, SPIKI } from '../view/draw/characters';
import type { ChibiSpec, Expr } from '../view/draw/chibi';
import { C } from '../view/palette';
import { h, itemCanvas, mochiChibi, starsText } from './dom';

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

// ===================================================================== タイトル

export function titleScreen(
  host: MenuHost,
  on: { start: () => void; howTo: () => void; records: () => void; settings: () => void },
): HTMLElement {
  const s = host.sound;
  // 全員で並ぶ。まん中はバターとコミー（向かい合って、少し大きく前に）
  const cast: [ChibiSpec, Expr, number, boolean][] = [
    [CHAR_SPECS.yomi, 'normal', 0.9, false],
    [CHAR_SPECS.elfin, 'happy', 0.9, false],
    [CHAR_SPECS.butter, 'happy', 1.15, false],
    [CHAR_SPECS.kommy, 'smile', 1.15, true],
    [CHAR_SPECS.joanne, 'smile', 0.9, true],
    [SPIKI, 'worried', 0.8, true],
  ];
  const row = h('div', { class: 'title-cast' });
  for (const [spec, expr, k, flip] of cast) {
    const m = mochiChibi(spec, expr, 34 * k, { sound: s, flip });
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
      h('h1', {}, h('span', { class: 'l1' }, 'もちっと！ハロウィン'), h('span', { class: 'l2' }, 'おかしキャッチ')),
    ),
    h('div', { class: 'title-stage' }, row),
    h(
      'div',
      { class: 'menu-buttons' },
      btn('あそぶ', on.start, s, 'primary big'),
      h('div', { class: 'row' }, btn('あそびかた', on.howTo, s), btn('きろく', on.records, s), btn('せってい', on.settings, s)),
    ),
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

/** まだ取っていない称号のうち、いちばん近いもの */
function nextTitle(total: number): (typeof TITLES)[number] | undefined {
  return [...TITLES].reverse().find((x) => x.min > total);
}

// ===================================================================== キャラえらび

export function charSelect(host: MenuHost, on: { pick: (id: CharId) => void; back: () => void }): HTMLElement {
  const s = host.sound;
  let chosen: CharId = host.save.lastChar;
  // 5 人分の説明を同じ場所に重ねて、えらんだ人だけ見せる（説明の長さでボタンの位置が動かない）
  const details = h('div', { class: 'details' });
  const detailEls = new Map<CharId, HTMLElement>();
  const cards = h('div', { class: 'cards' });
  const cardEls = new Map<CharId, HTMLElement>();

  const detailOf = (id: CharId) => {
    const d = CHARACTERS[id];
    const tx = CHAR_TEXT[id];
    const best = host.save.best[id];
    return h(
      'div',
      { class: 'detail', style: `--c:${C[id]}` },
      h('div', { class: 'detail-face' }, mochiChibi(CHAR_SPECS[id], 'happy', 30, { sound: s })),
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
      h('p', { class: 'best-line' }, 'ベスト ', h('b', {}, best ? num(best) : '−'), ' ', rankBadge(host.save.rank[id], 'small')),
    );
  };
  const showDetail = () => {
    for (const [cid, el] of detailEls) el.classList.toggle('on', cid === chosen);
    for (const [cid, el] of cardEls) el.classList.toggle('on', cid === chosen);
  };

  for (const id of CHAR_ORDER) {
    const tx = CHAR_TEXT[id];
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
      mochiChibi(CHAR_SPECS[id], 'normal', 30, { sound: s }),
      h('span', { class: 'card-name' }, h('small', {}, tx.costume), tx.name),
      rankBadge(host.save.rank[id], 'small'),
    );
    cardEls.set(id, card);
    cards.append(card);
    const detail = detailOf(id);
    detailEls.set(id, detail);
    details.append(detail);
  }
  const start = () => {
    host.save.lastChar = chosen;
    host.persist();
    on.pick(chosen);
  };
  showDetail();
  return h(
    'div',
    { class: 'panel select' },
    h('h2', {}, 'だれで あそぶ？'),
    cards,
    details,
    h('div', { class: 'row' }, btn('もどる', on.back, s), btn('スタート!', start, s, 'primary')),
  );
}

// ===================================================================== きろく

export function recordsPanel(host: MenuHost, on: { close: () => void }): HTMLElement {
  const s = host.sound;
  const save = host.save;
  const total = save.sweets;
  const t = titleOf(total);
  const next = nextTitle(total);
  // つぎの称号までの進み具合（ひとつ前の称号から数える）
  const from = [...TITLES].find((x) => x.min <= total)?.min ?? 0;
  const ratio = next ? (total - from) / (next.min - from) : 1;
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
    h('p', { class: 'rec-note' }, 'おかしは あそぶたびに たまっていきます'),
    h(
      'div',
      { class: 'rec-chars' },
      ...CHAR_ORDER.map((id) =>
        h(
          'div',
          { class: 'rec-char', style: `--c:${C[id]}` },
          mochiChibi(CHAR_SPECS[id], save.best[id] ? 'smile' : 'normal', 18, { sound: s, body: false }),
          h('span', { class: 'card-name' }, CHAR_TEXT[id].name),
          h('b', {}, save.best[id] ? num(save.best[id]) : '−'),
          rankBadge(save.rank[id], 'small'),
        ),
      ),
    ),
    h('div', { class: 'row' }, btn('とじる', on.close, s, 'primary')),
  );
}

// ===================================================================== あそびかた

export function howToPanel(host: MenuHost, on: { close: () => void }): HTMLElement {
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
      h('div', { class: 'tip-face' }, mochiChibi(SPIKEY, 'smile', 24, { sound: s }), h('span', { class: 'arrow' }, '→'), mochiChibi(SPIKI, 'worried', 24, { sound: s })),
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
    h('div', { class: 'row' }, btn('とじる', on.close, s, 'primary')),
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

export function pausePanel(host: MenuHost, on: { resume: () => void; retry: () => void; select: () => void; howTo: () => void }): HTMLElement {
  const s = host.sound;
  return h(
    'div',
    { class: 'panel pause' },
    h('h2', {}, 'ひとやすみ'),
    h('div', { class: 'col' }, btn('つづける', on.resume, s, 'primary'), btn('やりなおす', on.retry, s), btn('あそびかた', on.howTo, s), btn('キャラえらびへ', on.select, s)),
  );
}

// ===================================================================== けっか

export interface ResultInfo {
  world: World;
  charId: CharId;
  prevBest: number;
  prevSweets: number;
}

export function resultPanel(host: MenuHost, info: ResultInfo, on: { retry: () => void; select: () => void; title: () => void }): HTMLElement {
  const s = host.sound;
  const w = info.world;
  const id = info.charId;
  const score = w.score;
  const rank = rankOf(score);
  const tx = CHAR_TEXT[id];
  const good = rank === 'SS' || rank === 'S' || rank === 'A';
  const line = good ? tx.good : rank === 'C' ? tx.bad : tx.ok;
  const expr: Expr = good ? 'happy' : rank === 'C' ? 'worried' : 'smile';
  const isBest = score > info.prevBest && score > 0;
  const st = w.stats;
  const caught = (k: ItemKind) => st.caught[k];
  const sweets = caught('candy') + caught('star') + caught('mokaron') + caught('shucaron');
  const before = titleOf(info.prevSweets);
  const after = titleOf(info.prevSweets + sweets);
  const next = nextTitle(info.prevSweets + sweets);
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
    const text = `『${GAME_TITLE}』で${tx.costume}${tx.name}が ${num(score)}点（ランク${rank}）！ #トリッカル #おかしキャッチ`;
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
      h('div', { class: 'result-face' }, mochiChibi(CHAR_SPECS[id], expr, 40, { sound: s })),
      h(
        'div',
        { class: 'score-box' },
        h('small', {}, `${tx.costume}${tx.name}`),
        scoreEl,
        h('div', { class: 'rank-row' }, stamp, h('span', { class: 'rank-text' }, RANK_TEXT[rank])),
        isBest ? h('div', { class: 'new' }, 'ベスト更新!') : h('div', { class: 'prev' }, `ベスト ${num(info.prevBest)}`),
      ),
    ),
    h('p', { class: 'line' }, `「${line}」`),
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
    h(
      'p',
      { class: 'title-line' },
      `おかし +${sweets} こ（今までに ${num(info.prevSweets + sweets)} こ）`,
      after && after !== before ? h('b', { class: 'new-title' }, ` 称号「${TITLE_TEXT[after]}」をゲット!`) : null,
      next && !(after && after !== before) ? h('small', {}, ` つぎの称号まで あと ${num(next.min - info.prevSweets - sweets)} こ`) : null,
    ),
    h('div', { class: 'row' }, btn('キャラえらび', on.select, s), btn('もう一回!', on.retry, s, 'primary')),
    h('div', { class: 'row small' }, btn('タイトルへ', on.title, s, 'ghost'), btn('X でシェア', share, s, 'ghost share')),
  );
}

