import type { ItemKind } from '../../config/balance';

// 降ってくるお菓子とホバギの描き起こし。(x, y) を中心に、半径 r の大きさで描く。
// 線は SD キャラと同じ赤茶。原作のアイコンの模写ではなく、特徴（色・形）から起こしたもの。

const LINE = '#5a2d32';
const WHITE = '#fffdfb';

/** キャンディの包み紙の色（id でばらけさせる） */
const CANDY = [
  ['#ff9cbc', '#f27199'],
  ['#8fd9e6', '#5bb8cb'],
  ['#c7b0f2', '#a387e0'],
  ['#ffd36b', '#f2ae3d'],
  ['#9fe0a5', '#6cc27a'],
] as const;

export interface ItemLook {
  /** アニメの経過秒 */
  t: number;
  /** 見た目をばらけさせる位相 */
  phase: number;
  /** 何番目か（色をばらけさせる） */
  id: number;
}

export function drawItem(c: CanvasRenderingContext2D, kind: ItemKind, x: number, y: number, r: number, look: ItemLook): void {
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const k = r / 50;
  switch (kind) {
    case 'candy':
      c.rotate(Math.sin(look.t * 2.4 + look.phase) * 0.35);
      c.scale(k, k);
      candy(c, look.id);
      break;
    case 'star':
      c.rotate(look.t * 1.6 + look.phase);
      c.scale(k, k);
      starCandy(c);
      break;
    case 'mokaron':
      c.rotate(Math.sin(look.t * 2 + look.phase) * 0.18);
      c.scale(k, k);
      mokaron(c);
      break;
    case 'shucaron':
      c.rotate(Math.sin(look.t * 2.2 + look.phase) * 0.2);
      c.scale(k, k);
      shucaron(c);
      break;
    case 'hobagi':
      c.rotate(Math.sin(look.t * 3 + look.phase) * 0.12);
      c.scale(k, k);
      hobagi(c, 'lazy');
      break;
  }
  c.restore();
}

function fs(c: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = 4): void {
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = lw;
  c.stroke();
}

function vg(c: CanvasRenderingContext2D, y0: number, y1: number, stops: string[]): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  return g;
}

/** 両端をねじった包み紙のキャンディ（しま模様） */
function candy(c: CanvasRenderingContext2D, id: number): void {
  const [color, shade] = CANDY[id % CANDY.length];
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * 26, 0);
    c.lineTo(side * 50, -22);
    c.quadraticCurveTo(side * 44, 0, side * 50, 22);
    c.closePath();
    fs(c, shade, 4);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(side * 32, -2);
    c.lineTo(side * 44, -13);
    c.stroke();
  }
  c.beginPath();
  c.ellipse(0, 0, 31, 26, 0, 0, Math.PI * 2);
  fs(c, color, 4.5);
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = 6;
  c.beginPath();
  for (const x of [-26, -6, 14, 34]) {
    c.moveTo(x - 14, 28);
    c.lineTo(x + 6, -28);
  }
  c.stroke();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.ellipse(-12, -12, 7, 4.5, -0.5, 0, Math.PI * 2);
  c.fill();
}

/** ぷっくりした星のキャンディ */
function starCandy(c: CanvasRenderingContext2D): void {
  const pts = (R: number, rr: number) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const l = i % 2 ? rr : R;
      const px = Math.cos(a) * l;
      const py = Math.sin(a) * l;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  };
  c.lineJoin = 'round';
  pts(50, 26);
  c.fillStyle = vg(c, -50, 45, ['#fff3a6', '#ffd447', '#f4a92c']);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 5;
  c.stroke();
  pts(30, 16);
  c.fillStyle = 'rgba(255, 250, 220, 0.55)';
  c.fill();
  c.fillStyle = WHITE;
  c.beginPath();
  c.ellipse(-9, -14, 6, 4, -0.6, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(10, -6, 2.6, 0, Math.PI * 2);
  c.fill();
}

/** モカロン: サーモンの殻に黄色いクリーム、上に白いアイシングとカラフルなスプリンクル */
function mokaron(c: CanvasRenderingContext2D): void {
  // 下の殻
  c.beginPath();
  c.ellipse(0, 18, 44, 20, 0, 0, Math.PI * 2);
  fs(c, vg(c, 0, 38, ['#f7957c', '#e2694f']), 4.5);
  // クリーム
  c.beginPath();
  c.roundRect(-44, -4, 88, 22, 10);
  fs(c, vg(c, -4, 18, ['#fff1b3', '#f8d36a']), 4);
  // 上の殻
  c.beginPath();
  c.ellipse(0, -16, 46, 28, 0, Math.PI, 0);
  c.quadraticCurveTo(46, 0, 0, 0);
  c.quadraticCurveTo(-46, 0, -46, -16);
  fs(c, vg(c, -44, 0, ['#ffb39b', '#f68769']), 4.5);
  // 白いアイシングとスプリンクル
  c.beginPath();
  c.ellipse(-8, -30, 24, 11, -0.12, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255, 252, 245, 0.95)';
  c.fill();
  const sprinkles: [number, number, string][] = [[-20, -32, '#7fd0f0'], [-8, -36, '#ff8fb3'], [4, -30, '#9fe0a5'], [-14, -25, '#ffd36b'], [10, -36, '#c7b0f2']];
  c.lineWidth = 3.4;
  for (const [sx, sy, col] of sprinkles) {
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(sx - 2.5, sy + 1);
    c.lineTo(sx + 2.5, sy - 1);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.ellipse(28, -18, 5, 3, 0.6, 0, Math.PI * 2);
  c.fill();
}

/** シューカロン: ふっくらしたシュー生地の上にピンクのバラと真珠、間にピンクのクリーム */
function shucaron(c: CanvasRenderingContext2D): void {
  c.beginPath();
  c.ellipse(0, 22, 44, 18, 0, 0, Math.PI * 2);
  fs(c, vg(c, 6, 40, ['#fde3b8', '#edbd84']), 4.5);
  c.beginPath();
  c.roundRect(-44, 2, 88, 18, 9);
  fs(c, vg(c, 2, 20, ['#f7a1b5', '#e2668a']), 4);
  // ふくらんだシュー（もこもこの上の縁）
  c.beginPath();
  c.moveTo(-46, 6);
  c.bezierCurveTo(-52, -18, -36, -38, -18, -36);
  c.bezierCurveTo(-10, -50, 12, -50, 20, -36);
  c.bezierCurveTo(40, -38, 52, -16, 46, 6);
  c.quadraticCurveTo(0, 14, -46, 6);
  c.closePath();
  fs(c, vg(c, -48, 8, ['#fff4dc', '#f8d9a6', '#eebd80']), 4.5);
  // 真珠
  for (const [px, py, pr] of [[-24, -18, 5], [-6, -30, 4.5], [-30, -2, 4]] as const) {
    c.beginPath();
    c.arc(px, py, pr, 0, Math.PI * 2);
    fs(c, vg(c, py - pr, py + pr, ['#ffffff', '#f3d8c6']), 2.4);
  }
  // バラ
  c.beginPath();
  c.arc(20, -26, 15, 0, Math.PI * 2);
  fs(c, vg(c, -40, -12, ['#ffc2d1', '#ef7d9d']), 4);
  c.strokeStyle = '#c94f74';
  c.lineWidth = 2.6;
  c.beginPath();
  for (let a = 0; a <= Math.PI * 3; a += 0.3) {
    const rr = 2 + a * 3;
    c.lineTo(20 + Math.cos(a) * rr, -26 + Math.sin(a) * rr);
  }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.beginPath();
  c.ellipse(-34, -16, 4, 7, 0.4, 0, Math.PI * 2);
  c.fill();
}

/**
 * ホバギ（スピッキーのかぼちゃの友だち）。lazy = ふだんのやる気のない「=ω=」の顔、
 * crashed = 地面に落ちてつぶれた目の回った顔
 */
export function hobagi(c: CanvasRenderingContext2D, face: 'lazy' | 'crashed'): void {
  const squash = face === 'crashed' ? 0.8 : 1;
  c.save();
  if (face === 'crashed') c.translate(0, 8);
  c.scale(1 / squash, squash);
  // へた
  c.beginPath();
  c.moveTo(-5, -34);
  c.quadraticCurveTo(-6, -48, 4, -54);
  c.lineTo(10, -48);
  c.quadraticCurveTo(4, -42, 6, -34);
  c.closePath();
  fs(c, '#6f8a4a', 3.6);
  // つるの葉
  c.beginPath();
  c.moveTo(6, -40);
  c.quadraticCurveTo(22, -56, 34, -44);
  c.quadraticCurveTo(22, -34, 6, -40);
  fs(c, '#8fbf5a', 3.2);
  // かぼちゃ（3 つのふくらみ）
  const body = new Path2D();
  body.moveTo(0, -36);
  body.bezierCurveTo(-30, -44, -54, -30, -52, 2);
  body.bezierCurveTo(-50, 32, -24, 42, 0, 38);
  body.bezierCurveTo(24, 42, 50, 32, 52, 2);
  body.bezierCurveTo(54, -30, 30, -44, 0, -36);
  body.closePath();
  c.fillStyle = vg(c, -40, 40, ['#ffb766', '#f7953f', '#e0742c']);
  c.fill(body);
  c.save();
  c.clip(body);
  c.strokeStyle = '#d06a2a';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(-20, 2, 18, 38, 0, -Math.PI / 2, Math.PI / 2, true);
  c.moveTo(20, -36);
  c.ellipse(20, 2, 18, 38, 0, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  c.fillStyle = 'rgba(255, 236, 200, 0.55)';
  c.beginPath();
  c.ellipse(-30, -16, 8, 13, 0.4, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.strokeStyle = LINE;
  c.lineWidth = 4.5;
  c.stroke(body);
  // 顔
  c.strokeStyle = '#4a2418';
  c.fillStyle = '#4a2418';
  c.lineWidth = 3.6;
  if (face === 'lazy') {
    // =ω= のやる気のない目
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(side * 9, 0);
      c.lineTo(side * 25, -2);
      c.moveTo(side * 10, 6);
      c.lineTo(side * 24, 5);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(-7, 14);
    c.quadraticCurveTo(-3.5, 20, 0, 15);
    c.quadraticCurveTo(3.5, 20, 7, 14);
    c.stroke();
    // ほっぺ
    c.fillStyle = 'rgba(255, 120, 110, 0.55)';
    for (const side of [-1, 1]) {
      c.beginPath();
      c.ellipse(side * 32, 14, 7, 4.5, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    // ぐるぐるの目と、への字の口
    for (const side of [-1, 1]) {
      c.beginPath();
      for (let a = 0; a <= Math.PI * 3.2; a += 0.3) {
        const rr = (8 * a) / (Math.PI * 3.2);
        c.lineTo(side * 16 + Math.cos(a * side) * rr, 2 + Math.sin(a * side) * rr);
      }
      c.stroke();
    }
    c.beginPath();
    c.moveTo(-8, 22);
    c.quadraticCurveTo(0, 15, 8, 22);
    c.stroke();
  }
  c.restore();
}

/** ホバギが地面に落ちる場所の影（近づくほど濃く大きく） */
export function hobagiShadow(c: CanvasRenderingContext2D, x: number, y: number, r: number, near: number): void {
  const a = 0.12 + 0.4 * near;
  c.fillStyle = `rgba(30, 10, 40, ${a})`;
  c.beginPath();
  c.ellipse(x, y, r * (0.5 + 0.6 * near), r * (0.16 + 0.12 * near), 0, 0, Math.PI * 2);
  c.fill();
  if (near > 0.35) {
    c.strokeStyle = `rgba(255, 110, 90, ${(near - 0.35) * 1.2})`;
    c.lineWidth = Math.max(2, r * 0.08);
    c.beginPath();
    c.ellipse(x, y, r * (0.5 + 0.6 * near) + 3, r * (0.16 + 0.12 * near) + 2, 0, 0, Math.PI * 2);
    c.stroke();
  }
}
