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

type Kind = Parameters<typeof drawItem>[1];

/** 置き場所（その絵のピクセル）。サムネはカードで上 370px（トップページは 420px）だけ見えるので、顔とタイトルを上に寄せる */
const ART = og
  ? {
      ground: H - 34,
      charR: 50,
      charX: [204, 372, 540, 708, 876],
      spiki: { x: W - 105, y: H * 0.5, r: 50 },
      title: { x: W * 0.45, pill: 26, sub: [104, 52], main: [184, 104] },
      items: [
        ['candy', 90, 120, 30],
        ['star', 250, 210, 34],
        ['shucaron', 960, 260, 36],
        ['mokaron', 1090, 110, 34],
        ['candy', 870, 70, 28],
        ['star', 380, 60, 26],
        ['hobagi', 590, 300, 38],
        ['candy', 1135, 560, 24],
      ] as [Kind, number, number, number][],
      floor: [] as [Kind, number, number, number][],
    }
  : {
      ground: 392,
      charR: 46,
      charX: [78, 190, 302, 414, 526],
      spiki: { x: 700, y: 236, r: 36 },
      title: { x: 336, pill: 12, sub: [66, 36], main: [124, 74] },
      items: [
        ['candy', 36, 92, 20],
        ['star', 640, 40, 22],
        ['mokaron', 752, 70, 24],
        ['shucaron', 612, 128, 22],
        ['hobagi', 258, 200, 20],
      ] as [Kind, number, number, number][],
      floor: [
        ['candy', 90, 452, 24],
        ['star', 230, 456, 26],
        ['mokaron', 380, 452, 28],
        ['shucaron', 530, 452, 28],
        ['candy', 670, 456, 24],
      ] as [Kind, number, number, number][],
    };

const ground = ART.ground;
const { x: sx, y: sy, r: sr } = ART.spiki;
const L: Layout = {
  w: W,
  h: H,
  portrait: false,
  field: { x: 0, y: 0, w: W, h: ground },
  ground,
  headR: ART.charR,
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
  bubble(c, 'ｳｱｱｰﾝ!!', sx - 0.8 * sr, sy - sr * 2.1, 22 * k, sx - 0.2 * sr, '#e4f6ff');

  // 降ってくるお菓子と、地面に並べたお菓子
  [...ART.items, ...ART.floor].forEach(([kind, x, y, r], i) => drawItem(c, kind, x, y, r, { t: 0.4, phase: i * 1.3, id: i }));

  // 5 人（タイトルと同じく、まん中にバターとコミーが向かい合う）
  const exprs: Expr[] = ['smile', 'happy', 'happy', 'munch', 'happy'];
  const ids = ['yomi', 'elfin', 'butter', 'kommy', 'joanne'] as const;
  const r = ART.charR;
  ids.forEach((id, i) => {
    const x = ART.charX[i];
    const lift = i % 2 ? 6 * k : 0;
    drawChibi(c, CHAR_SPECS[id], x, ground - FEET_R * r - lift, r, { expr: exprs[i], t: 0.4, turn: i < 3 ? 1 : -1, prop: true, tilt: (i - 2) * 0.04 });
  });

  // タイトル
  const { x: tx, pill: py, sub, main } = ART.title;
  c.save();
  c.font = font(20 * k);
  const pill = 'トリッカル 非公式ファンゲーム';
  const pw = c.measureText(pill).width + 34 * k;
  c.fillStyle = 'rgba(40, 20, 70, 0.85)';
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(tx - pw / 2, py, pw, 36 * k, 18 * k);
  c.fill();
  c.stroke();
  c.fillStyle = C.white;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(pill, tx, py + 19 * k);
  c.translate(tx, 0);
  c.rotate(-0.04);
  outlined(c, 'おばけの国の', 0, sub[0], { size: sub[1], font: popFont(sub[1]), fill: '#e6d6ff', stroke: C.ink, width: sub[1] * 0.27 });
  outlined(c, 'おかしキャッチ', 0, main[0], { size: main[1], font: popFont(main[1]), fill: '#ffc24d', stroke: C.ink, width: main[1] * 0.21 });
  c.restore();
  // ?kind=… を headless の --dump-dom で取り出せるよう、PNG を本文に書き出す
  const out = document.createElement('pre');
  out.id = 'png';
  out.textContent = canvas.toDataURL('image/png');
  document.body.append(out);
}
