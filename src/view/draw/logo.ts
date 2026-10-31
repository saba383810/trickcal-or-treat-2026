// タイトルのロゴ「ホバギ / オア / トリート！」。タイトル画面とサムネイル（src/dev/art.ts）で同じものを描く。
// 文字は 1 字ずつ少し傾けて、かぼちゃ（すじ）・おばけ（うす緑）・キャンディ（しま）の柄とつやを入れる。
import { C, font } from '../palette';
import { drawItem } from './items';
import { bat } from './scene';

/** ロゴの幅と高さ（「ホバギ」の文字の大きさ = 1） */
export const LOGO_W = 4.9;
export const LOGO_H = 3.3;

type Paint = 'pumpkin' | 'ghost' | 'candy';

const SHADOW = '#2a1a40';
const RIM = '#fff3dc';

const BASE: Record<Paint, string[]> = {
  pumpkin: ['#ffd98a', '#ff9a3d', '#e8601c'],
  ghost: ['#f6ffe6', '#c3ee8a', '#86c94a'],
  candy: ['#f6ecff', '#cba6ff', '#9466e0'],
};

interface Glyph {
  ch: string;
  x: number;
  y: number;
  w: number;
  rot: number;
}

/** (cx, top) を上のまん中にして、文字の大きさ s で描く */
export function drawLogo(c: CanvasRenderingContext2D, cx: number, top: number, s: number): void {
  c.save();
  c.translate(cx, top);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // 1 行目: ホバギ（左にホバギ本人）
  const y1 = s * 0.72;
  const icon = s * 1.05;
  const w1 = wordWidth(c, 'ホバギ', s);
  let x = -(icon + w1) / 2;
  sticker(c, x + icon * 0.42, y1 + s * 0.06, s * 0.5);
  c.save();
  c.translate(x + icon * 0.42, y1 + s * 0.06);
  c.rotate(-0.22);
  drawItem(c, 'hobagi', 0, 0, s * 0.44, { t: 0, phase: 0, id: 0 });
  c.restore();
  word(c, 'ホバギ', x + icon, y1, s, 'pumpkin', [-0.09, 0.06, -0.05]);

  // 2 行目: オア（両わきにコウモリ）
  const s2 = s * 0.6;
  const y2 = y1 + s * 0.85;
  const w2 = wordWidth(c, 'オア', s2);
  for (const side of [-1, 1]) logoBat(c, side * (w2 / 2 + s * 0.5), y2 - s * 0.04, s * 0.15, side);
  word(c, 'オア', -w2 / 2, y2, s2, 'ghost', [0.07, -0.07]);

  // 3 行目: トリート！（！の点はキャンディ）
  const s3 = s;
  const y3 = y2 + s * 0.95;
  const w3 = wordWidth(c, 'トリート', s3);
  const bang = s3 * 0.46;
  x = -(w3 + bang) / 2;
  word(c, 'トリート', x, y3, s3, 'candy', [-0.06, 0.05, 0, 0.06]);
  exclaim(c, x + w3 + bang * 0.5, y3, s3);

  // きらきら
  for (const [sx, sy, r] of [
    [w1 / 2 + icon / 2 + s * 0.12, y1 - s * 0.42, 0.16],
    [-(w3 + bang) / 2 - s * 0.1, y3 - s * 0.55, 0.13],
    [(w3 + bang) / 2 + s * 0.05, y3 + s * 0.48, 0.1],
    [-w1 / 2 + s * 0.2, y1 + s * 0.6, 0.08],
  ]) {
    twinkle(c, sx, sy, s * r);
  }
  c.restore();
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
function exclaim(c: CanvasRenderingContext2D, x: number, y: number, size: number): void {
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
  const cy = y + size * 0.42;
  sticker(c, x, cy, size * 0.2);
  c.save();
  c.translate(x, cy);
  c.rotate(-0.35);
  drawItem(c, 'candy', 0, 0, size * 0.17, { t: 0, phase: 0, id: 0 });
  c.restore();
}

/** 絵の後ろの、影とクリーム色のまる（文字のふちと合わせる） */
function sticker(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.fillStyle = SHADOW;
  c.beginPath();
  c.arc(x, y + r * 0.18, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = RIM;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** ふちどりしたコウモリ（side = -1 は左向き） */
function logoBat(c: CanvasRenderingContext2D, x: number, y: number, s: number, side: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(side * 0.18);
  const d = s * 0.22;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    bat(c, Math.cos(a) * d, Math.sin(a) * d, s, 0.4, RIM);
  }
  bat(c, 0, 0, s, 0.4);
  c.restore();
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
