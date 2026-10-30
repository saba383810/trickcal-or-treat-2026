// 開発用: sabanogames のカードの絵（?kind=thumb 800×515）と、リンクの絵（?kind=og 1200×630）を描く（本番ビルドには含めない）
import { CHAR_SPECS, SPIKI } from '../view/draw/characters';
import { FEET_R, CROUCH_FEET_R, drawChibi, type Expr } from '../view/draw/chibi';
import { drawItem } from '../view/draw/items';
import { drawScene, ghost } from '../view/draw/scene';
import { bubble, outlined } from '../view/draw/ui';
import type { Layout } from '../view/layout';
import { C, font, popFont } from '../view/palette';

const og = new URLSearchParams(location.search).get('kind') !== 'thumb';
const W = og ? 1200 : 800;
const H = og ? 630 : 515;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = W;
canvas.height = H;
const c = canvas.getContext('2d')!;
const k = W / 1200;

const ground = H - 34 * k;
const sr = 50 * k;
const sx = W - 105 * k;
const sy = H * 0.5;
const L: Layout = {
  w: W,
  h: H,
  portrait: false,
  field: { x: 0, y: 0, w: W, h: ground },
  ground,
  headR: 50 * k,
  catchY: 0.8,
  spiki: { x: sx, y: sy, r: sr, feet: sy + CROUCH_FEET_R * sr },
  score: { x: 0, y: 0, w: 0, h: 0 },
  timer: { x: 0, y: 0, w: 0, h: 0 },
  chain: { x: 0, y: 0, w: 0, h: 0 },
  gauge: { x: 0, y: 0, w: 0, h: 0 },
  pauseBtn: { x: 0, y: 0, w: 0, h: 0 },
};

void Promise.all([document.fonts.load(popFont(80), 'おばけの国のおかしキャッチ'), document.fonts.load(font(20), 'トリッカル非公式ファンゲーム')]).then(draw);

function draw(): void {
  drawScene(c, L);
  ghost(c, 150 * k, 300 * k, 22 * k, 0.4, 1, 0.6);
  ghost(c, 1000 * k, 150 * k, 18 * k, 1.2, -1, 0.6);

  // スピキ（泣いてる）
  drawChibi(c, SPIKI, sx, sy, sr, { expr: 'worried', t: 0.3, turn: -1 });
  bubble(c, 'ｳｱｱｰﾝ!!', sx - 40 * k, sy - sr * 2.1, 22 * k, sx - 10 * k, '#e4f6ff');

  // 降ってくるお菓子
  const items: [Parameters<typeof drawItem>[1], number, number, number][] = [
    ['candy', 90, 120, 30],
    ['star', 250, 210, 34],
    ['shucaron', 960, 260, 36],
    ['mokaron', 1090, 110, 34],
    ['candy', 870, 70, 28],
    ['star', 380, 60, 26],
    ['hobagi', 590, 300, 38],
    ['candy', 1135, 560, 24],
  ];
  items.forEach(([kind, x, y, r], i) => drawItem(c, kind, x * k, y * k, r * k, { t: 0.4, phase: i * 1.3, id: i }));

  // 5 人
  const exprs: Expr[] = ['munch', 'happy', 'happy', 'smile', 'happy'];
  const ids = ['kommy', 'elfin', 'butter', 'yomi', 'joanne'] as const;
  const r = 50 * k;
  const span = W * 0.7;
  ids.forEach((id, i) => {
    const x = W * 0.1 + (span * (i + 0.5)) / 5;
    const lift = i % 2 ? 6 * k : 0;
    drawChibi(c, CHAR_SPECS[id], x, ground - FEET_R * r - lift, r, { expr: exprs[i], t: 0.4, turn: i < 2 ? 1 : -1, prop: true, tilt: (i - 2) * 0.04 });
  });

  // タイトル
  const tx = W * 0.45;
  c.save();
  c.font = font(20 * k);
  const pill = 'トリッカル 非公式ファンゲーム';
  const pw = c.measureText(pill).width + 34 * k;
  c.fillStyle = 'rgba(40, 20, 70, 0.85)';
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(tx - pw / 2, 26 * k, pw, 36 * k, 18 * k);
  c.fill();
  c.stroke();
  c.fillStyle = C.white;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(pill, tx, 45 * k);
  c.translate(tx, 0);
  c.rotate(-0.04);
  outlined(c, 'おばけの国の', 0, 104 * k, { size: 52 * k, font: popFont(52 * k), fill: '#e6d6ff', stroke: C.ink, width: 14 * k });
  outlined(c, 'おかしキャッチ', 0, 184 * k, { size: 104 * k, font: popFont(104 * k), fill: '#ffc24d', stroke: C.ink, width: 22 * k });
  c.restore();
  // ?kind=… を headless の --dump-dom で取り出せるよう、PNG を本文に書き出す
  const out = document.createElement('pre');
  out.id = 'png';
  out.textContent = canvas.toDataURL('image/png');
  document.body.append(out);

}
