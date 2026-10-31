// おばけの国の夜の背景。動かない所（空・月・お城・丘・お墓・スピキの丘・ハロウィンの飾り）は画面サイズごとに 1 回だけ焼いておき、
// おばけやコウモリ、クモ、星のまたたきは毎フレーム描く（drawLiveDecor）。
import type { Layout } from '../layout';
import { hobagi } from './items';

const LINE = '#3a2140';

/** 決まった並びの乱数（背景の星や草を毎回同じ位置に） */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export class SceneCache {
  back: HTMLCanvasElement | null = null;
  private key = '';

  invalidate(): void {
    this.key = '';
  }

  ensure(L: Layout, pr: number): HTMLCanvasElement {
    const key = `${L.w}x${L.h}@${pr}`;
    if (this.back && key === this.key) return this.back;
    this.key = key;
    const cv = (this.back ??= document.createElement('canvas'));
    cv.width = Math.ceil(L.w * pr);
    cv.height = Math.ceil(L.h * pr);
    const c = cv.getContext('2d')!;
    c.setTransform(pr, 0, 0, pr, 0, 0);
    drawScene(c, L);
    return cv;
  }
}

/** 地平線（丘のいちばん奥）の y */
function horizon(L: Layout): number {
  return L.ground - L.field.h * (L.portrait ? 0.3 : 0.34);
}

export function drawScene(c: CanvasRenderingContext2D, L: Layout, decor = true): void {
  const { w, h } = L;
  const hy = horizon(L);
  const rand = seeded(20261031);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // 空
  const sky = c.createLinearGradient(0, 0, 0, hy + 30);
  sky.addColorStop(0, '#1a1331');
  sky.addColorStop(0.4, '#2d2154');
  sky.addColorStop(0.75, '#523b7c');
  sky.addColorStop(0.92, '#8c5b93');
  sky.addColorStop(1, '#c98aa6');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  // 星
  for (let i = 0; i < 110; i++) {
    const x = rand() * w;
    const y = rand() * (hy - 20);
    const r = 0.6 + rand() * 1.4;
    c.fillStyle = `rgba(255, 246, 220, ${0.35 + rand() * 0.55})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  // 月（ヨミの月。眠っている顔）
  const mr = Math.min(w, h) * 0.085;
  const mx = L.portrait ? w * 0.22 : L.field.x + L.field.w * 0.16;
  const my = L.portrait ? L.field.y + mr * 1.7 : h * 0.17;
  const glow = c.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.38)');
  glow.addColorStop(1, 'rgba(255, 236, 190, 0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(mx, my, mr * 3.2, 0, Math.PI * 2);
  c.fill();
  const mg = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, '#fffbe6');
  mg.addColorStop(1, '#ffe7a8');
  c.fillStyle = mg;
  c.beginPath();
  c.arc(mx, my, mr, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(230, 196, 120, 0.35)';
  for (const [dx, dy, rr] of [[0.42, -0.35, 0.16], [0.55, 0.3, 0.1], [-0.5, 0.45, 0.12]]) {
    c.beginPath();
    c.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#b98a4e';
  c.lineWidth = Math.max(1.6, mr * 0.05);
  for (const side of [-1, 1]) {
    c.beginPath();
    c.arc(mx + side * mr * 0.32, my - mr * 0.02, mr * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  }
  c.beginPath();
  c.arc(mx, my + mr * 0.28, mr * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
  c.stroke();
  c.fillStyle = 'rgba(255, 150, 140, 0.4)';
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(mx + side * mr * 0.55, my + mr * 0.22, mr * 0.15, mr * 0.09, 0, 0, Math.PI * 2);
    c.fill();
  }
  // 月の Z
  c.fillStyle = 'rgba(255, 240, 200, 0.75)';
  c.font = `800 ${Math.round(mr * 0.38)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('z', mx + mr * 1.15, my - mr * 0.75);
  c.font = `800 ${Math.round(mr * 0.28)}px sans-serif`;
  c.fillText('z', mx + mr * 1.45, my - mr * 1.1);

  // 遠くのお城
  castle(c, L.portrait ? w * 0.68 : L.field.x + L.field.w * 0.58, hy + 6, Math.min(w, h) * 0.22);

  // 奥の丘
  hills(c, w, hy, 26, 0.008, 1.3, '#3b2b5f');
  // お墓（奥）
  const graves = L.portrait ? 4 : 6;
  for (let i = 0; i < graves; i++) {
    const x = ((i + 0.3 + rand() * 0.4) / graves) * w;
    grave(c, x, hy + 26 + rand() * 18, 10 + rand() * 5, '#5a4880', '#45366a');
  }
  // 手前の丘
  const ny = hy + (L.ground - hy) * 0.42;
  hills(c, w, ny, 22, 0.011, 2.1, '#30244f');
  for (let i = 0; i < (L.portrait ? 3 : 5); i++) {
    const x = ((i + 0.2 + rand() * 0.6) / (L.portrait ? 3 : 5)) * w;
    if (Math.abs(x - L.spiki.x) < L.spiki.r * 3) continue;
    if (rand() < 0.5) grave(c, x, ny + 20 + rand() * 14, 15 + rand() * 6, '#6c5b94', '#4d3e74');
    else jackO(c, x, ny + 26 + rand() * 12, 13 + rand() * 6);
  }

  // スピキの丘（ホバギの友だちのかぼちゃ畑）
  spikiHill(c, L);

  // 地面
  const gy = L.ground;
  const gg = c.createLinearGradient(0, gy, 0, h);
  gg.addColorStop(0, '#3d2e52');
  gg.addColorStop(1, '#241a35');
  c.fillStyle = gg;
  c.fillRect(0, gy, w, h - gy);
  // 手前の草
  c.fillStyle = '#4c6a5c';
  c.beginPath();
  c.moveTo(0, gy + 6);
  for (let x = 0; x <= w + 12; x += 12) c.quadraticCurveTo(x + 3, gy - 6 - rand() * 6, x + 6, gy + 3);
  c.lineTo(w, gy + 10);
  c.lineTo(0, gy + 10);
  c.closePath();
  c.fill();
  c.fillStyle = '#5f8470';
  c.fillRect(0, gy + 2, w, 4);
  // 道の石
  c.fillStyle = 'rgba(160, 140, 190, 0.22)';
  for (let x = 12; x < w; x += 46 + rand() * 30) {
    c.beginPath();
    c.ellipse(x, gy + (h - gy) * (0.45 + rand() * 0.25), 12 + rand() * 8, 4 + rand() * 2, 0, 0, Math.PI * 2);
    c.fill();
  }

  if (decor) drawHalloweenDecor(c, L);

  // 横向きは HUD の側を少し暗くして、遊ぶ場所をはっきりさせる。境目には街灯
  if (!L.portrait) {
    const f = L.field;
    c.fillStyle = 'rgba(14, 8, 30, 0.34)';
    c.fillRect(0, 0, f.x, h);
    c.fillRect(f.x + f.w, 0, w - f.x - f.w, h);
    lamp(c, f.x - 6, gy, f.h * 0.42);
    lamp(c, f.x + f.w + 6, gy, f.h * 0.42);
  }
}

function hills(c: CanvasRenderingContext2D, w: number, y: number, amp: number, freq: number, ph: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, y + 400);
  for (let x = 0; x <= w + 10; x += 10) c.lineTo(x, y - Math.sin(x * freq + ph) * amp - Math.sin(x * freq * 2.3 + ph * 2) * amp * 0.35);
  c.lineTo(w, y + 400);
  c.closePath();
  c.fill();
}

function castle(c: CanvasRenderingContext2D, x: number, base: number, s: number): void {
  c.save();
  c.translate(x, base);
  const body = '#33255a';
  const roof = '#2a1e4b';
  const tower = (tx: number, tw: number, th: number) => {
    c.fillStyle = body;
    c.fillRect(tx - tw / 2, -th, tw, th);
    c.fillStyle = roof;
    c.beginPath();
    c.moveTo(tx - tw * 0.7, -th);
    c.lineTo(tx, -th - tw * 1.3);
    c.lineTo(tx + tw * 0.7, -th);
    c.closePath();
    c.fill();
    // 小さな旗
    c.strokeStyle = roof;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(tx, -th - tw * 1.3);
    c.lineTo(tx, -th - tw * 1.75);
    c.stroke();
    c.fillStyle = '#7a4a86';
    c.beginPath();
    c.moveTo(tx, -th - tw * 1.75);
    c.lineTo(tx + tw * 0.45, -th - tw * 1.62);
    c.lineTo(tx, -th - tw * 1.5);
    c.fill();
  };
  c.fillStyle = body;
  c.fillRect(-s * 0.42, -s * 0.34, s * 0.84, s * 0.34);
  // 城壁のぎざぎざ
  for (let i = -4; i <= 3; i++) c.fillRect(i * s * 0.1 + s * 0.02, -s * 0.38, s * 0.06, s * 0.05);
  tower(-s * 0.36, s * 0.13, s * 0.55);
  tower(s * 0.36, s * 0.13, s * 0.5);
  tower(-s * 0.12, s * 0.15, s * 0.68);
  tower(s * 0.14, s * 0.11, s * 0.6);
  // 灯りのついた窓
  c.fillStyle = '#ffd77a';
  const win = (wx: number, wy: number, ww: number) => {
    c.beginPath();
    c.roundRect(wx - ww / 2, wy - ww * 0.7, ww, ww * 1.4, [ww / 2, ww / 2, 1, 1]);
    c.fill();
  };
  const ww = s * 0.035;
  win(-s * 0.36, -s * 0.4, ww);
  win(-s * 0.12, -s * 0.52, ww);
  win(-s * 0.12, -s * 0.36, ww);
  win(s * 0.14, -s * 0.45, ww);
  win(s * 0.36, -s * 0.32, ww);
  win(0, -s * 0.14, ww * 1.1);
  win(-s * 0.24, -s * 0.18, ww);
  // 門
  c.fillStyle = '#1e153a';
  c.beginPath();
  c.roundRect(-s * 0.05, -s * 0.12, s * 0.1, s * 0.12, [s * 0.05, s * 0.05, 0, 0]);
  c.fill();
  c.restore();
}

/** ぽってりしたお墓 */
function grave(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, shade: string): void {
  c.save();
  c.translate(x, y);
  c.rotate((((x * 7) % 10) - 5) * 0.012);
  c.fillStyle = shade;
  c.beginPath();
  c.roundRect(-s * 0.95, -s * 1.9, s * 1.9, s * 2.1, [s, s, 2, 2]);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(-s * 0.8, -s * 1.85, s * 1.6, s * 2.05, [s * 0.8, s * 0.8, 2, 2]);
  c.fill();
  c.strokeStyle = shade;
  c.lineWidth = Math.max(1.5, s * 0.14);
  c.beginPath();
  c.moveTo(0, -s * 1.4);
  c.lineTo(0, -s * 0.5);
  c.moveTo(-s * 0.35, -s * 1.1);
  c.lineTo(s * 0.35, -s * 1.1);
  c.stroke();
  c.restore();
}

/** 光るかぼちゃのランタン */
function jackO(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const g = c.createRadialGradient(x, y - s * 0.6, s * 0.3, x, y - s * 0.6, s * 2.6);
  g.addColorStop(0, 'rgba(255, 170, 70, 0.4)');
  g.addColorStop(1, 'rgba(255, 170, 70, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y - s * 0.6, s * 2.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#e8803a';
  c.beginPath();
  c.ellipse(x, y - s * 0.7, s * 1.15, s * 0.85, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#c9632a';
  c.beginPath();
  c.ellipse(x, y - s * 0.7, s * 0.4, s * 0.85, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5b7a3c';
  c.fillRect(x - s * 0.1, y - s * 1.75, s * 0.2, s * 0.3);
  c.fillStyle = '#ffe48a';
  c.beginPath();
  c.moveTo(x - s * 0.62, y - s * 0.95);
  c.lineTo(x - s * 0.32, y - s * 0.95);
  c.lineTo(x - s * 0.47, y - s * 0.68);
  c.closePath();
  c.moveTo(x + s * 0.62, y - s * 0.95);
  c.lineTo(x + s * 0.32, y - s * 0.95);
  c.lineTo(x + s * 0.47, y - s * 0.68);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(x - s * 0.6, y - s * 0.52);
  c.quadraticCurveTo(x, y - s * 0.12, x + s * 0.6, y - s * 0.52);
  c.quadraticCurveTo(x, y - s * 0.3, x - s * 0.6, y - s * 0.52);
  c.fill();
}

/** スピキの丘。まわりにホバギの友だち（=ω= のかぼちゃ）が並ぶ */
function spikiHill(c: CanvasRenderingContext2D, L: Layout): void {
  const s = L.spiki;
  const r = s.r;
  const top = s.feet;
  const bw = r * 3.4;
  c.save();
  // 丘（まわりの丘より明るく、ふちを光らせる）
  const hill = new Path2D();
  hill.moveTo(s.x - bw * 1.9, L.ground + 4);
  hill.bezierCurveTo(s.x - bw * 1.2, L.ground - 6, s.x - bw * 0.95, top + 4, s.x, top - r * 0.05);
  hill.bezierCurveTo(s.x + bw * 0.95, top + 4, s.x + bw * 1.2, L.ground - 6, s.x + bw * 1.9, L.ground + 4);
  hill.closePath();
  const hg = c.createLinearGradient(0, top, 0, L.ground);
  hg.addColorStop(0, '#5d4a88');
  hg.addColorStop(1, '#2f2350');
  c.fillStyle = hg;
  c.fill(hill);
  c.strokeStyle = 'rgba(200, 180, 255, 0.35)';
  c.lineWidth = Math.max(2, r * 0.07);
  c.stroke(hill);
  // 頂上の草
  c.fillStyle = '#4c6a5c';
  c.beginPath();
  c.ellipse(s.x, top + r * 0.05, r * 1.7, r * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#5f8470';
  c.lineWidth = Math.max(1.5, r * 0.05);
  for (let i = -5; i <= 5; i++) {
    const x = s.x + i * r * 0.3;
    c.beginPath();
    c.moveTo(x, top + r * 0.1);
    c.lineTo(x + r * 0.05, top - r * 0.12);
    c.stroke();
  }
  // かぼちゃ畑
  const pumpkins: [number, number, number][] = [
    [-1.75, 1.0, 0.36],
    [1.6, 0.85, 0.32],
    [-2.6, 2.1, 0.42],
    [2.5, 1.9, 0.38],
  ];
  for (const [dx, dy, k] of pumpkins) {
    const py = top + dy * r;
    if (py > L.ground - 4) continue;
    c.save();
    c.translate(s.x + dx * r, py);
    const sc = (r * k) / 50;
    c.scale(sc, sc);
    hobagi(c, 'lazy');
    c.restore();
  }
  // 立て札「スピキのかぼちゃ畑」の代わりに小さな柵
  c.strokeStyle = '#6e5574';
  c.lineWidth = Math.max(2, r * 0.07);
  for (const side of [-1, 1]) {
    const x0 = s.x + side * r * 3.1;
    const y0 = top + r * 1.6;
    if (y0 > L.ground - 6) continue;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x0, y0 - r * 0.6);
    c.moveTo(x0 + side * r * 0.45, y0 + r * 0.25);
    c.lineTo(x0 + side * r * 0.45, y0 - r * 0.35);
    c.moveTo(x0 - side * r * 0.05, y0 - r * 0.42);
    c.lineTo(x0 + side * r * 0.5, y0 - r * 0.17);
    c.stroke();
  }
  c.restore();
}

/** 街灯（かぼちゃのランプ） */
function lamp(c: CanvasRenderingContext2D, x: number, gy: number, ht: number): void {
  c.fillStyle = '#251b38';
  c.fillRect(x - 3, gy - ht, 6, ht);
  c.beginPath();
  c.ellipse(x, gy, 12, 5, 0, 0, Math.PI * 2);
  c.fill();
  const ly = gy - ht;
  const g = c.createRadialGradient(x, ly + 14, 4, x, ly + 14, 60);
  g.addColorStop(0, 'rgba(255, 190, 90, 0.5)');
  g.addColorStop(1, 'rgba(255, 190, 90, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, ly + 14, 60, 0, Math.PI * 2);
  c.fill();
  jackO(c, x, ly + 26, 13);
  c.strokeStyle = '#251b38';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, ly);
  c.lineTo(x, ly + 6);
  c.stroke();
}

/** 遊ぶ場所の上のふちの飾り: 角のクモの巣と、そのあいだにかけたガーランド */
function drawHalloweenDecor(c: CanvasRenderingContext2D, L: Layout): void {
  const f = L.field;
  const web = webSize(L);
  cobweb(c, f.x, f.y, web, 1);
  cobweb(c, f.x + f.w, f.y, web, -1);
  const s = Math.min(f.w, f.h);
  garland(c, f.x + web * 0.3, f.x + f.w - web * 0.3, f.y + web * 0.16, s * 0.07, s * 0.04);
}

function webSize(L: Layout): number {
  return Math.min(L.field.w, L.field.h) * (L.portrait ? 0.2 : 0.17);
}

/** 角のクモの巣。(x, y) が角で、dir = 1 なら右下へ、-1 なら左下へ広がる */
export function cobweb(c: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number): void {
  const spokes = [0.05, 0.28, 0.5, 0.72, 0.95].map((a) => (a * Math.PI) / 2);
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  c.strokeStyle = 'rgba(236, 228, 255, 0.5)';
  c.lineWidth = Math.max(1, s * 0.012);
  c.beginPath();
  for (const a of spokes) {
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
  }
  // 糸の輪は、まん中に向かって少したるませる
  for (let ring = 1; ring <= 4; ring++) {
    const r = (s * (ring + (ring % 2) * 0.12)) / 4.4;
    c.moveTo(Math.cos(spokes[0]) * r, Math.sin(spokes[0]) * r);
    for (let i = 1; i < spokes.length; i++) {
      const m = (spokes[i - 1] + spokes[i]) / 2;
      c.quadraticCurveTo(Math.cos(m) * r * 0.8, Math.sin(m) * r * 0.8, Math.cos(spokes[i]) * r, Math.sin(spokes[i]) * r);
    }
  }
  c.stroke();
  c.restore();
}

/** かぼちゃ・コウモリ・お月さまの旗をつないだガーランド。x0〜x1 に y からかけて、まん中で sag だけたれる。s は旗の半分の幅 */
export function garland(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, sag: number, s: number): void {
  const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y + sag * 4 * t * (1 - t) });
  const n = Math.max(4, Math.round((x1 - x0) / (s * 2.7)));
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = at(t);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(sag * 4 * (1 - 2 * t), x1 - x0) + Math.sin(i * 2.3) * 0.08);
    pennant(c, s, i % 3);
    c.restore();
  }
  c.strokeStyle = '#d8b67a';
  c.lineWidth = Math.max(1.5, s * 0.1);
  c.beginPath();
  c.moveTo(x0, y);
  c.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
  c.stroke();
  c.restore();
}

/** ガーランドの旗 1 枚（上のふちの中央が原点）。kind 0 = かぼちゃ、1 = コウモリ、2 = お月さま */
function pennant(c: CanvasRenderingContext2D, s: number, kind: number): void {
  const ht = s * 1.45;
  c.fillStyle = ['#f7953f', '#7d5cc6', '#2e2347'][kind];
  c.strokeStyle = LINE;
  c.lineWidth = Math.max(1.2, s * 0.09);
  c.beginPath();
  c.moveTo(-s, 0);
  c.lineTo(s, 0);
  c.lineTo(0, ht);
  c.closePath();
  c.fill();
  c.stroke();
  const cy = ht * 0.36;
  if (kind === 0) {
    // かぼちゃの顔
    c.fillStyle = '#4a2418';
    c.beginPath();
    for (const side of [-1, 1]) {
      c.moveTo(side * s * 0.42, cy - s * 0.16);
      c.lineTo(side * s * 0.14, cy - s * 0.16);
      c.lineTo(side * s * 0.28, cy + s * 0.08);
      c.closePath();
    }
    c.moveTo(-s * 0.38, cy + s * 0.2);
    c.quadraticCurveTo(0, cy + s * 0.58, s * 0.38, cy + s * 0.2);
    c.quadraticCurveTo(0, cy + s * 0.36, -s * 0.38, cy + s * 0.2);
    c.fill();
  } else if (kind === 1) {
    bat(c, 0, cy, s * 0.24, 0.6);
  } else {
    // 三日月
    c.fillStyle = '#ffe7a8';
    c.beginPath();
    c.arc(0, cy, s * 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2e2347';
    c.beginPath();
    c.arc(s * 0.14, cy - s * 0.08, s * 0.26, 0, Math.PI * 2);
    c.fill();
  }
}

/** 毎フレーム動かす飾り（またたく星・ふわふわのおばけ・コウモリ・クモ）。fever = 0〜1 でにぎやかに */
export function drawLiveDecor(c: CanvasRenderingContext2D, L: Layout, t: number, fever: number): void {
  const hy = horizon(L);
  // またたく星
  for (let i = 0; i < 9; i++) {
    const x = ((i * 0.137 + 0.06) % 1) * L.w;
    const y = (((i * 0.311 + 0.1) % 1) * (hy - 60)) + 10;
    const a = 0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.21) + i * 1.7);
    sparkle(c, x, y, 3 + a * 4, `rgba(255, 244, 200, ${0.25 + a * 0.6})`);
  }
  // おばけ
  const ghosts = L.portrait ? 2 : 3;
  for (let i = 0; i < ghosts; i++) {
    const speed = 18 + i * 7;
    const span = L.w + 200;
    const x = ((t * speed + i * span * 0.37) % span) - 100;
    const y = hy - L.field.h * (0.12 + 0.13 * i) + Math.sin(t * 1.4 + i * 2) * 10;
    ghost(c, x, y, 16 + i * 3, t + i, i % 2 ? -1 : 1, 0.55 + fever * 0.35);
  }
  // コウモリ（月の前を通る）
  for (let i = 0; i < 2; i++) {
    const span = L.w + 300;
    const x = span - ((t * (60 + i * 25) + i * 400) % span) - 150;
    const y = L.field.y + L.field.h * (0.12 + i * 0.1) + Math.sin(t * 2 + i) * 18;
    bat(c, x, y, 13 - i * 2, t * (9 + i));
  }
  // 右のクモの巣から、クモがのびちぢみ
  const f = L.field;
  const web = webSize(L);
  spider(c, f.x + f.w - web * 0.42, f.y + web * 0.42, web * (0.75 + 0.3 * Math.sin(t * 0.9)), web * 0.09, t);
}

/** 糸でぶら下がるクモ（x, y が糸の付け根） */
function spider(c: CanvasRenderingContext2D, x: number, y: number, len: number, s: number, t: number): void {
  const by = y + len;
  c.save();
  c.strokeStyle = 'rgba(236, 228, 255, 0.55)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, by);
  c.stroke();
  c.translate(x, by + s);
  c.rotate(Math.sin(t * 1.7) * 0.12);
  c.strokeStyle = '#1b1230';
  c.lineWidth = Math.max(1.2, s * 0.18);
  c.lineCap = 'round';
  const wig = Math.sin(t * 6) * 0.12;
  c.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + i * 0.38 + (i % 2 ? wig : -wig);
      c.moveTo(0, 0);
      c.quadraticCurveTo(side * s * 1.3, -s * 0.6 + a * s, side * s * 1.9, s * 0.2 + a * s * 1.4);
    }
  }
  c.stroke();
  c.fillStyle = '#1b1230';
  c.beginPath();
  c.ellipse(0, 0, s * 0.8, s * 0.9, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(-s * 0.3, -s * 0.1, s * 0.24, 0, Math.PI * 2);
  c.arc(s * 0.3, -s * 0.1, s * 0.24, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1b1230';
  c.beginPath();
  c.arc(-s * 0.28, -s * 0.05, s * 0.11, 0, Math.PI * 2);
  c.arc(s * 0.28, -s * 0.05, s * 0.11, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function sparkle(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x, y, x + s, y);
  c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s, y);
  c.quadraticCurveTo(x, y, x, y - s);
  c.fill();
}

/** ちいさなおばけ（背景用。線は薄め） */
export function ghost(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, dir: number, alpha = 0.7): void {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(dir, 1);
  c.rotate(Math.sin(t * 2) * 0.1);
  c.fillStyle = '#f6f1ff';
  c.strokeStyle = 'rgba(120, 100, 170, 0.8)';
  c.lineWidth = Math.max(1.2, s * 0.08);
  c.beginPath();
  c.moveTo(-s, 0);
  c.arc(0, 0, s, Math.PI, 0);
  c.lineTo(s, s * 1.1);
  const wave = Math.sin(t * 5) * s * 0.12;
  for (let i = 0; i < 4; i++) {
    const x0 = s - (i * s * 2) / 4;
    c.quadraticCurveTo(x0 - s * 0.25, s * 1.4 + (i % 2 ? wave : -wave), x0 - s * 0.5, s * 1.1);
  }
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = LINE;
  c.beginPath();
  c.ellipse(-s * 0.32, -s * 0.05, s * 0.11, s * 0.17, 0, 0, Math.PI * 2);
  c.ellipse(s * 0.32, -s * 0.05, s * 0.11, s * 0.17, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255, 140, 170, 0.55)';
  c.beginPath();
  c.ellipse(-s * 0.55, s * 0.25, s * 0.16, s * 0.1, 0, 0, Math.PI * 2);
  c.ellipse(s * 0.55, s * 0.25, s * 0.16, s * 0.1, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function bat(c: CanvasRenderingContext2D, x: number, y: number, s: number, ph: number): void {
  const flap = Math.sin(ph) * 0.6;
  c.save();
  c.translate(x, y);
  c.fillStyle = '#1b1230';
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    c.rotate(-flap);
    c.beginPath();
    c.moveTo(s * 0.3, 0);
    c.quadraticCurveTo(s * 1.2, -s * 0.9, s * 2, -s * 0.2);
    c.quadraticCurveTo(s * 1.6, -s * 0.1, s * 1.5, s * 0.3);
    c.quadraticCurveTo(s * 1.2, 0, s * 1.0, s * 0.35);
    c.quadraticCurveTo(s * 0.7, 0.05, s * 0.3, s * 0.3);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.beginPath();
  c.ellipse(0, 0, s * 0.45, s * 0.5, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-s * 0.35, -s * 0.3);
  c.lineTo(-s * 0.25, -s * 0.75);
  c.lineTo(-s * 0.05, -s * 0.4);
  c.moveTo(s * 0.35, -s * 0.3);
  c.lineTo(s * 0.25, -s * 0.75);
  c.lineTo(s * 0.05, -s * 0.4);
  c.fill();
  c.fillStyle = '#ffd77a';
  c.beginPath();
  c.arc(-s * 0.15, -s * 0.05, s * 0.08, 0, Math.PI * 2);
  c.arc(s * 0.15, -s * 0.05, s * 0.08, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

