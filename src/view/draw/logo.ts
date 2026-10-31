// タイトルのロゴ「ホバギ / オア / トリート！」（3 行の字は T.logo）。タイトル画面とサムネイル（src/dev/art.ts）で同じものを描く。
// 文字は 1 字ずつ少し傾けて、かぼちゃ（すじ）・おばけ（うす緑）・キャンディ（しま）の柄とつやを入れる。
// 日本語の 3 行は「バ」「オア」「リーのあいだ」がまっすぐ縦にそろう。ほかの言語は 1 行ずつ まん中に置き、はばに入らない行は字を小さくする。
// 絵（ホバギ・おばけ・コウモリ・キャンディ）は字のまわりに置くだけで、そろえには入れない。
import { T } from '../../i18n';
import { ja } from '../../i18n/ja';
import { C, font } from '../palette';
import { drawItem } from './items';
import { bat, ghost } from './scene';

/** ロゴの幅と高さ（「ホバギ」の文字の大きさ = 1）。(cx) が 3 行のそろう線 */
export const LOGO_W = 5.0;
export const LOGO_H = 3.4;

type Paint = 'pumpkin' | 'ghost' | 'candy';

const SHADOW = '#2a1a40';
const RIM = '#fff3dc';

const BASE: Record<Paint, string[]> = {
  pumpkin: ['#ffd98a', '#ff9a3d', '#e8601c'],
  ghost: ['#f6ffe6', '#c3ee8a', '#86c94a'],
  candy: ['#f6ecff', '#cba6ff', '#9466e0'],
};

const STILL = { t: 0, phase: 0, id: 0 };

interface Glyph {
  ch: string;
  x: number;
  y: number;
  w: number;
  rot: number;
}

/** (cx, top) を上のまん中にして、文字の大きさ s で描く */
export function drawLogo(c: CanvasRenderingContext2D, cx: number, top: number, s: number, lines: readonly string[] = T.logo): void {
  c.save();
  c.translate(cx, top);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const rim = s * 0.09;
  // 日本語のロゴは、決まった字を縦にそろえる
  const jaArt = lines.join('\n') === ja.logo.join('\n');
  const room = LOGO_W * s;

  // 1 行目: ホバギ（バが まん中）。左でホバギ本人がはずみ、ギの後ろからおばけがのぞく
  const t1 = lines[0];
  const y1 = s * 0.8;
  const s1 = jaArt ? s : fit(c, t1, s, room - s * 2.24);
  const w1 = wordWidth(c, t1, s1);
  stickerArt(c, w1 / 2 + s * 0.14, y1 - s * 0.1, s, rim, (o) => {
    o.rotate(0.35);
    ghost(o, 0, -s * 0.12, s * 0.28, 0.5, -1, 1);
  });
  stickerArt(c, -w1 / 2 - s * 0.4, y1 - s * 0.1, s * 1.4, rim, (o) => {
    o.rotate(-0.28);
    drawItem(o, 'hobagi', 0, 0, s * 0.55, STILL);
  });
  word(c, t1, -w1 / 2, y1, s1, 'pumpkin', tilts(t1, [-0.09, 0.06, -0.05]));

  // 2 行目: オア（両わきにコウモリ）
  const t2 = lines[1];
  const s2 = jaArt ? s * 0.6 : fit(c, t2, s * 0.6, room - s * 1.76);
  const y2 = y1 + s * 0.85;
  const w2 = wordWidth(c, t2, s2);
  for (const side of [-1, 1]) {
    stickerArt(c, side * (w2 / 2 + s * 0.48), y2 - s * 0.06, s * 0.8, rim * 0.8, (o) => {
      o.rotate(side * 0.2);
      bat(o, 0, 0, s * 0.15, 0.4);
    });
  }
  word(c, t2, -w2 / 2, y2, s2, 'ghost', tilts(t2, [0.07, -0.07]));

  // 3 行目: トリート！（リとーのあいだが まん中。！の点はキャンディ）
  const bangAt = /[!！]$/.test(lines[2]);
  const t3 = bangAt ? lines[2].slice(0, -1) : lines[2];
  const s3 = jaArt ? s : fit(c, t3, s, room - s * 0.5, bangAt ? 0.46 : 0);
  const y3 = y2 + s * 0.95;
  const w3 = wordWidth(c, t3, s3);
  const bang = bangAt ? s3 * 0.46 : 0;
  let x3 = -(w3 + bang) / 2;
  if (jaArt) {
    const g3 = glyphs(c, t3, 0, 0, s3, []);
    x3 = -(g3[1].x + g3[1].w / 2);
  }
  word(c, t3, x3, y3, s3, 'candy', tilts(t3, [-0.06, 0.05, 0, 0.06]));
  if (bangAt) exclaim(c, x3 + w3 + bang * 0.5, y3, s3, rim);

  // きらきら
  for (const [sx, sy, r] of [
    [-w1 / 2 - s * 1.0, y1 - s * 0.58, 0.12],
    [w1 / 2 + s * 0.62, y1 + s * 0.28, 0.14],
    [x3 - s * 0.12, y3 - s * 0.58, 0.12],
    [x3 + w3 + bang + s * 0.08, y3 + s * 0.46, 0.09],
  ]) {
    twinkle(c, sx, sy, s * r);
  }
  c.restore();
}

/** 1 字ずつの傾き（字が多い時は くり返す） */
function tilts(text: string, base: number[]): number[] {
  return [...text].map((_, i) => base[i % base.length]);
}

/** はば max に入る字の大きさ（入るなら size のまま）。extra = 字のあとに足すはば（字の大きさに対する割合。「！」の分） */
function fit(c: CanvasRenderingContext2D, text: string, size: number, max: number, extra = 0): number {
  const w = wordWidth(c, text, size) + size * extra;
  return w > max ? (size * max) / w : size;
}

function wordWidth(c: CanvasRenderingContext2D, text: string, size: number): number {
  return glyphs(c, text, 0, 0, size, []).reduce((sum, g) => sum + g.w, 0);
}

/** 1 字ずつの置き場所（字間を少しつめて、交互に上下へずらす） */
function glyphs(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, tilts: number[]): Glyph[] {
  c.font = font(size);
  let px = x;
  return [...text].map((ch, i) => {
    const w = c.measureText(ch).width * 0.92;
    const g = { ch, x: px + w / 2, y: y + (i % 2 ? 1 : -1) * size * 0.035, w, rot: tilts[i] ?? 0 };
    px += w;
    return g;
  });
}

/** 文字: 影 → クリーム色のふち → 線 → 色・柄・つや。ふちが となりの字の色にかぶらないよう、段ごとに全部の字を描く */
function word(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, paint: Paint, tilts: number[]): void {
  const gs = glyphs(c, text, x, y, size, tilts);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const each = (fn: (g: Glyph) => void) => {
    for (const g of gs) {
      c.save();
      c.translate(g.x, g.y);
      c.rotate(g.rot);
      fn(g);
      c.restore();
    }
  };
  each((g) => {
    c.strokeStyle = SHADOW;
    c.fillStyle = SHADOW;
    c.lineWidth = size * 0.36;
    c.strokeText(g.ch, 0, size * 0.1);
  });
  each((g) => {
    c.strokeStyle = RIM;
    c.lineWidth = size * 0.36;
    c.strokeText(g.ch, 0, 0);
  });
  each((g) => {
    c.strokeStyle = C.ink;
    c.lineWidth = size * 0.19;
    c.strokeText(g.ch, 0, 0);
  });
  each((g) => {
    for (const fill of fills(c, paint, size, g.w)) {
      c.fillStyle = fill;
      c.fillText(g.ch, 0, 0);
    }
  });
}

/** 色（上から下へ）・柄・つや。字のまん中が原点 */
function fills(c: CanvasRenderingContext2D, paint: Paint, size: number, w: number): CanvasGradient[] {
  const [a, b, d] = BASE[paint];
  const base = c.createLinearGradient(0, -size * 0.45, 0, size * 0.42);
  base.addColorStop(0, a);
  base.addColorStop(0.5, b);
  base.addColorStop(1, d);
  const out = [base];
  if (paint === 'pumpkin') {
    // かぼちゃのすじ（字のまん中と両はし）
    const rib = 'rgba(176, 60, 10, ';
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, `${rib}0.4)`);
    g.addColorStop(0.2, `${rib}0)`);
    g.addColorStop(0.4, `${rib}0)`);
    g.addColorStop(0.5, `${rib}0.3)`);
    g.addColorStop(0.6, `${rib}0)`);
    g.addColorStop(0.8, `${rib}0)`);
    g.addColorStop(1, `${rib}0.4)`);
    out.push(g);
  } else if (paint === 'candy') {
    // ななめのしま
    const n = 4;
    const g = c.createLinearGradient(-size * 0.5, -size * 0.5, size * 0.5, size * 0.5);
    for (let i = 0; i < n; i++) {
      const p = i / n;
      const q = (i + 0.45) / n;
      g.addColorStop(p, 'rgba(255, 128, 196, 0.6)');
      g.addColorStop(q, 'rgba(255, 128, 196, 0.6)');
      g.addColorStop(q + 0.001, 'rgba(255, 128, 196, 0)');
      g.addColorStop((i + 1) / n - 0.001, 'rgba(255, 128, 196, 0)');
    }
    out.push(g);
  }
  // 上半分のつや
  const gloss = c.createLinearGradient(0, -size * 0.48, 0, size * 0.05);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  gloss.addColorStop(0.45, 'rgba(255, 255, 255, 0.25)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  out.push(gloss);
  return out;
}

/** 「！」の棒（文字と同じ描き方）と、点のかわりのキャンディ */
function exclaim(c: CanvasRenderingContext2D, x: number, y: number, size: number, rim: number): void {
  const bar = new Path2D();
  const top = -size * 0.44;
  const bot = size * 0.12;
  bar.moveTo(-size * 0.13, top);
  bar.quadraticCurveTo(0, top - size * 0.08, size * 0.13, top);
  bar.lineTo(size * 0.06, bot);
  bar.quadraticCurveTo(0, bot + size * 0.05, -size * 0.06, bot);
  bar.closePath();
  c.save();
  c.translate(x, y);
  c.rotate(0.06);
  c.save();
  c.translate(0, size * 0.1);
  c.strokeStyle = SHADOW;
  c.lineWidth = size * 0.36;
  c.stroke(bar);
  c.restore();
  c.strokeStyle = RIM;
  c.lineWidth = size * 0.36;
  c.stroke(bar);
  c.strokeStyle = C.ink;
  c.lineWidth = size * 0.19;
  c.stroke(bar);
  for (const fill of fills(c, 'candy', size, size * 0.3)) {
    c.fillStyle = fill;
    c.fill(bar);
  }
  c.restore();
  // 点: キャンディ
  stickerArt(c, x, y + size * 0.42, size * 0.6, rim, (o) => {
    o.rotate(-0.35);
    drawItem(o, 'candy', 0, 0, size * 0.17, STILL);
  });
}

/**
 * 絵に、文字と同じクリーム色のふちと影をつけて描く。絵を box × box の別の canvas に描いて、
 * その形を色でぬったものを まわりにずらして重ね、ふちにする（絵の形どおりに縁取れる）
 */
function stickerArt(c: CanvasRenderingContext2D, x: number, y: number, box: number, rim: number, paint: (o: CanvasRenderingContext2D) => void): void {
  const m = c.getTransform();
  const k = Math.max(1, Math.hypot(m.a, m.b));
  const px = Math.ceil(box * k);
  const art = document.createElement('canvas');
  art.width = px;
  art.height = px;
  const o = art.getContext('2d')!;
  o.setTransform(k, 0, 0, k, px / 2, px / 2);
  o.lineJoin = 'round';
  o.lineCap = 'round';
  paint(o);
  const tint = (color: string) => {
    const t = document.createElement('canvas');
    t.width = px;
    t.height = px;
    const tc = t.getContext('2d')!;
    tc.drawImage(art, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = color;
    tc.fillRect(0, 0, px, px);
    return t;
  };
  const put = (img: HTMLCanvasElement, dx: number, dy: number) => c.drawImage(img, x - box / 2 + dx, y - box / 2 + dy, box, box);
  const ring = (img: HTMLCanvasElement, dy: number) => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      put(img, Math.cos(a) * rim, Math.sin(a) * rim + dy);
    }
  };
  ring(tint(SHADOW), rim * 1.1);
  ring(tint(RIM), 0);
  put(art, 0, 0);
}

function twinkle(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  c.fillStyle = '#fff6c2';
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x, y, x + s, y);
  c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s, y);
  c.quadraticCurveTo(x, y, x, y - s);
  c.fill();
}
