import type { ItemKind } from '../config/balance';
import { pinchReaction } from '../config/lines';
import type { Sound } from '../audio/sound';
import type { CheekWho } from '../storage';
import { MochiBody } from '../mochi/body';
import { drawChibi, feetR, type ChibiPose, type ChibiSpec, type Expr } from '../view/draw/chibi';
import { drawItem } from '../view/draw/items';
import { renderRatio } from '../view/screen';

type Child = Node | string | null | undefined | false;

/** 小さな DOM ビルダー */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | ((e: Event) => void)> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, '').toLowerCase(), v);
    else if (k === 'class') el.className = String(v);
    else if (typeof v === 'boolean') {
      if (v) el.setAttribute(k, '');
    } else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

function dpr(): number {
  return renderRatio();
}

/** 絵の上下左右の端（頭の中心から、頭の半径を 1 とした長さ） */
interface Reach {
  l: number;
  r: number;
  t: number;
  b: number;
}

const reaches = new WeakMap<ChibiSpec, Map<boolean, Reach>>();

/**
 * 帽子・額縁・羽まで含めて、絵がどこまで届くかを実際に描いて測る（キャラ × 体のあり・なしで 1 回だけ）。
 * 決め打ちの枠だと、背の高い帽子や横に広い羽が canvas の外で切れる
 */
function reachOf(spec: ChibiSpec, body: boolean): Reach {
  let m = reaches.get(spec);
  if (!m) reaches.set(spec, (m = new Map()));
  const hit = m.get(body);
  if (hit) return hit;
  const R = 50;
  const S = 640;
  const ox = S / 2;
  const oy = S * 0.45;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  // 測れない環境では、頭と体がおさまる大きさ
  let out: Reach = { l: 1.85, r: 1.85, t: 1.85, b: body ? feetR(spec) + 0.1 : 1.25 };
  if (c) {
    drawChibi(c, spec, ox, oy, R, { expr: 'normal', t: 0.4, body });
    const a = c.getImageData(0, 0, S, S).data;
    let x0 = S;
    let y0 = S;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (a[(y * S + x) * 4 + 3] < 8) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 >= 0) out = { l: (ox - x0) / R, r: (x1 + 1 - ox) / R, t: (oy - y0) / R, b: (y1 + 1 - oy) / R };
  }
  m.set(body, out);
  return out;
}

/**
 * キャラの絵の枠（size = 頭の半径 px）。w = 幅、ht = 高さ、cx・top = 頭の中心の位置。
 * 絵の端に少しだけ余白を足す（線の太さとアンチエイリアスの分）
 */
function chibiBox(spec: ChibiSpec, size: number, body: boolean): { w: number; ht: number; cx: number; top: number } {
  const e = reachOf(spec, body);
  const pad = 0.06;
  return { w: (e.l + e.r + 2 * pad) * size, ht: (e.t + e.b + 2 * pad) * size, cx: (e.l + pad) * size, top: (e.t + pad) * size };
}

/** canvas を置いた大きさ ÷ 作った大きさ（CSS で縮めて置く所がある） */
const fitScale = new WeakMap<HTMLCanvasElement, number>();

/**
 * 幅 w × 高さ ht（CSS px）の絵の canvas を、ページに置かれた大きさで描く（置き直されたら描き直す）。
 * タイトルや遊び方は CSS で絵を縮めて並べるので、作った大きさで描いて縮めると線が細く薄くなり、
 * 置かれた大きさで描くつまんだ時の絵とも線の太さがずれる。paint は CSS px の座標で描き、s は縮めた倍率
 */
function fitCanvas(cv: HTMLCanvasElement, w: number, ht: number, paint: (c: CanvasRenderingContext2D, s: number) => void): void {
  cv.style.width = `${w}px`;
  cv.style.height = `${ht}px`;
  let drawn = '';
  const draw = (shownHt: number) => {
    const s = shownHt > 0 ? shownHt / ht : 1;
    const k = dpr() * s;
    const pw = Math.ceil(w * k);
    const ph = Math.ceil(ht * k);
    const key = `${pw}x${ph}`;
    if (key === drawn) return;
    drawn = key;
    fitScale.set(cv, s);
    cv.width = pw;
    cv.height = ph;
    const c = cv.getContext('2d')!;
    c.setTransform(k, 0, 0, k, 0, 0);
    paint(c, s);
  };
  draw(0);
  new ResizeObserver((es) => draw(es[es.length - 1].contentRect.height)).observe(cv);
}

/** キャラの絵を canvas 要素として作る（size = 頭の半径 px） */
export function chibiCanvas(spec: ChibiSpec, expr: Expr, size: number, opts: { body?: boolean; flip?: boolean } = {}): HTMLCanvasElement {
  const body = opts.body !== false;
  const { w, ht, cx, top } = chibiBox(spec, size, body);
  const cv = document.createElement('canvas');
  cv.className = 'chibi';
  // 頭の半径を 1 とした絵の大きさ。CSS で頭の大きさ（--u）を決めて並べる所が使う
  cv.style.setProperty('--wu', (w / size).toFixed(3));
  cv.style.setProperty('--hu', (ht / size).toFixed(3));
  fitCanvas(cv, w, ht, (c) => {
    if (opts.flip) {
      c.translate(w, 0);
      c.scale(-1, 1);
    }
    drawChibi(c, spec, cx, top, size, { expr, t: 0.4, body });
  });
  return cv;
}

/**
 * ほっぺを引っぱれるキャラ。chibiCanvas と同じ大きさで並び、つまんでいる間と揺れている間だけ、
 * 絵を隠して上に重ねた大きめの canvas へ変形した絵を描く（伸びた分は枠の外へはみ出す）
 */
/** ほっぺを引っぱって離した時に呼ぶ（記録する。app がつなぐ）。k = 伸ばした量 0〜1、sulk = しつこく引っぱって ひとこと言われた */
export const cheekHooks: { pulled?: (who: CheekWho | undefined, k: number, sulk: boolean) => void } = {};

/** これだけ伸ばしたら 1 回と数える */
const PULL_MIN = 0.3;
/** 短い間にこれだけ引っぱると、ひとこと言われる（たいていは すねる） */
const SULK_PULLS = 3;
const SULK_WINDOW = 6000;
const SULK_MS = 2200;

/** who = だれのほっぺか（数える・すねた時のセリフ） */
export function mochiChibi(
  spec: ChibiSpec,
  expr: Expr,
  size: number,
  opts: { body?: boolean; flip?: boolean; sound?: Sound; who?: CheekWho; onGrab?: () => void } = {},
): HTMLElement {
  const body = opts.body !== false;
  const base = chibiCanvas(spec, expr, size, opts);
  const { w, ht, cx, top } = chibiBox(spec, size, body);
  const flip = opts.flip ? -1 : 1;
  // 左右を返した絵では、頭の中心も返した位置にある
  const hx = flip < 0 ? w - cx : cx;
  const mochi = new MochiBody();
  const m = (mochi.pinch.lmax * 1.25 * size) / 50;
  const over = document.createElement('canvas');
  over.className = 'chibi mochi-over';
  // 置き場所ごとの canvas の大きさ指定（!important）より強く、絵の枠に合わせる
  const place = (k: string, v: number) => over.style.setProperty(k, `${v * 100}%`, 'important');
  place('left', -m / w);
  place('top', -m / ht);
  place('width', (w + 2 * m) / w);
  place('height', (ht + 2 * m) / ht);
  // 引っぱっていない間は置かない（枠より大きいので、画面の端のキャラだと横スクロールが出てしまう）
  over.style.display = 'none';
  const wrap = h('span', { class: 'mochi' }, base, over);

  const shown = () => base.getBoundingClientRect().height / ht || 1;
  const local = (e: PointerEvent) => {
    const r = base.getBoundingClientRect();
    const s = shown();
    return MochiBody.toLocal({ x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }, hx, top, size, flip);
  };
  const draw = () => {
    // 下の絵と同じ大きさ・同じ線の太さで描く
    const k = dpr() * (fitScale.get(base) ?? shown());
    const pw = Math.ceil((w + 2 * m) * k);
    const ph = Math.ceil((ht + 2 * m) * k);
    if (over.width !== pw || over.height !== ph) {
      over.width = pw;
      over.height = ph;
    }
    const c = over.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, pw, ph);
    c.setTransform(k, 0, 0, k, k * m, k * m);
    if (flip < 0) {
      c.translate(w, 0);
      c.scale(-1, 1);
    }
    const pose: ChibiPose = { expr: mochi.pinch.held ? 'pinched' : sulking() ? sulkExpr : expr, t: 0.4, body };
    mochi.draw(c, spec, cx, top, size, pose);
  };
  let raf = 0;
  let last = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    over.getContext('2d')!.clearRect(0, 0, over.width, over.height);
    over.style.display = 'none';
    base.style.visibility = '';
    wrap.style.zIndex = '';
  };
  const tick = (t: number) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
    last = t;
    mochi.update(dt);
    if ((!mochi.active && !sulking()) || !wrap.isConnected) {
      mochi.reset();
      stop();
      return;
    }
    draw();
    raf = requestAnimationFrame(tick);
  };
  // 引っぱりすぎると、少しの間すねた顔になって ひとこと
  let sulkUntil = 0;
  let sulkExpr: Expr = 'sulk';
  const sulking = () => performance.now() < sulkUntil;
  const recent: number[] = [];
  const talk = (text: string) => {
    wrap.querySelector('.mochi-talk')?.remove();
    const el = h('span', { class: 'mochi-talk' }, text);
    wrap.append(el);
    // 画面の端で はみ出さないように寄せる
    const r = el.getBoundingClientRect();
    const dx = Math.max(0, 6 - r.left) - Math.max(0, r.right - (document.documentElement.clientWidth - 6));
    if (dx) el.style.setProperty('--dx', `${dx}px`);
    setTimeout(() => el.remove(), SULK_MS);
  };
  const end = (e: PointerEvent) => {
    const g = mochi.pinch.find(e.pointerId);
    if (!g) return;
    const k = mochi.pinch.intensity(g);
    opts.sound?.mochiRelease(k, mochi.pinch.params.releaseFreq);
    mochi.pinch.release(e.pointerId);
    if (k < PULL_MIN) return;
    const now = performance.now();
    while (recent.length && now - recent[0] > SULK_WINDOW) recent.shift();
    recent.push(now);
    const sulk = !!opts.who && recent.length >= SULK_PULLS && !sulking();
    if (sulk) {
      recent.length = 0;
      sulkUntil = now + SULK_MS;
      const re = pinchReaction(opts.who!);
      sulkExpr = re.expr;
      talk(re.text);
    }
    cheekHooks.pulled?.(opts.who, k, sulk);
  };
  // ボタンの中のキャラ（モード選択）は、引っぱったあとに離してもボタンを押したことにしない
  let start: { x: number; y: number } | null = null;
  let pulled = false;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.isTrusted && passDown(wrap, base, e)) return;
    if (!mochi.grab(e.pointerId, local(e))) return;
    e.preventDefault();
    capture(wrap, e.pointerId);
    // 重ねて並べたキャラの上へ、伸びたほっぺを出す
    wrap.style.zIndex = '2';
    start = { x: e.clientX, y: e.clientY };
    pulled = false;
    opts.sound?.mochiGrab();
    opts.onGrab?.();
    over.style.display = '';
    draw();
    base.style.visibility = 'hidden';
    if (!raf) raf = requestAnimationFrame(tick);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) pulled = true;
    mochi.pinch.move(e.pointerId, local(e));
  });
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener(
    'click',
    (e) => {
      if (!pulled) return;
      pulled = false;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );
  return wrap;
}

/**
 * 絵の透明な所を押されて、その下に別のキャラが重なっていたら、そちらへ押したことを渡す。
 * 下に何もなければ渡さない（絵の少し外を押しても、今までどおりそのキャラをつまめる）
 */
function passDown(wrap: HTMLElement, base: HTMLCanvasElement, e: PointerEvent): boolean {
  const r = base.getBoundingClientRect();
  const px = Math.floor(((e.clientX - r.left) / r.width) * base.width);
  const py = Math.floor(((e.clientY - r.top) / r.height) * base.height);
  // 枠の外は読まない（Chrome は枠の外を透明で返さないことがある）
  const x0 = Math.max(0, px - 4);
  const y0 = Math.max(0, py - 4);
  const x1 = Math.min(base.width, px + 5);
  const y1 = Math.min(base.height, py + 5);
  if (x1 <= x0 || y1 <= y0) return false;
  const near = base.getContext('2d')!.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  for (let i = 3; i < near.length; i += 4) if (near[i] > 0) return false;
  const below = document
    .elementsFromPoint(e.clientX, e.clientY)
    .map((el) => el.closest('.mochi'))
    .find((m) => m && m !== wrap);
  if (!below) return false;
  if (!below.dispatchEvent(new PointerEvent('pointerdown', e))) e.preventDefault();
  return true;
}

/** お菓子の絵 */
export function itemCanvas(kind: ItemKind, size: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.className = 'item';
  fitCanvas(cv, size, size, (c) => drawItem(c, kind, size / 2, size / 2, size * 0.42, { t: 0, phase: 0, id: 0 }));
  return cv;
}

/** 好きな絵を描く小さな canvas（size × size） */
export function paintCanvas(w: number, ht: number, paint: (c: CanvasRenderingContext2D) => void, cls = 'pic'): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.className = cls;
  fitCanvas(cv, w, ht, paint);
  return cv;
}

export function starsText(n: number, max = 5): HTMLElement {
  const wrap = h('span', { class: 'stars', 'aria-label': `★${n}` });
  for (let i = 0; i < max; i++) wrap.append(h('span', { class: i < n ? 'star on' : 'star' }, '★'));
  return wrap;
}

/** setPointerCapture は、もう離れた指だと投げる */
export function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // 取れなくても、そのまま続ける
  }
}
