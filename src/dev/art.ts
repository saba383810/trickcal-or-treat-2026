// 開発用: sabanogames のカードの絵（?kind=thumb 800×515）と、リンクの絵（?kind=og 1200×630）を描く（本番ビルドには含めない）。&lang=ko|en でほかの言語
import { isLang, setLang, T } from '../i18n';
import { CHAR_SPECS, SPIKI } from '../view/draw/characters';
import { FEET_R, CROUCH_FEET_R, drawChibi, type Expr } from '../view/draw/chibi';
import { drawItem } from '../view/draw/items';
import { drawLogo } from '../view/draw/logo';
import { cobweb, drawScene, garland, ghost } from '../view/draw/scene';
import { bubble } from '../view/draw/ui';
import type { Layout } from '../view/layout';
import { C, font } from '../view/palette';

const q = new URLSearchParams(location.search);
const og = q.get('kind') !== 'thumb';
const lang = q.get('lang');
if (isLang(lang)) setLang(lang);
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
      charX: [264, 432, 600, 768, 936],
      spiki: { x: W - 105, y: H * 0.5, r: 50 },
      title: { x: W / 2, pill: 22, top: 62, s: 82 },
      items: [
        ['candy', 90, 120, 30],
        ['star', 250, 210, 34],
        ['shucaron', 960, 260, 36],
        ['mokaron', 1090, 110, 34],
        ['candy', 870, 70, 28],
        ['star', 335, 150, 22],
        ['candy', 1135, 560, 24],
      ] as [Kind, number, number, number][],
      floor: [] as [Kind, number, number, number][],
    }
  : {
      ground: 426,
      charR: 42,
      charX: [188, 294, 400, 506, 612],
      spiki: { x: 730, y: 226, r: 34 },
      title: { x: W / 2, pill: 8, top: 42, s: 56 },
      items: [
        ['candy', 36, 92, 20],
        ['star', 640, 40, 22],
        ['mokaron', 752, 70, 24],
        ['shucaron', 612, 128, 22],
      ] as [Kind, number, number, number][],
      floor: [
        ['candy', 90, 474, 22],
        ['star', 230, 478, 24],
        ['mokaron', 380, 474, 26],
        ['shucaron', 530, 474, 26],
        ['candy', 670, 478, 22],
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

// 空白はぬいて読み込む（空白を入れると 英字の字形まで先に読まれて、日本語の絵が 前と変わってしまう）
void Promise.all([document.fonts.load(font(80), T.logo.join('')), document.fonts.load(font(20), T.title.sub.replace(/\s/g, ''))]).then(draw);

function draw(): void {
  // 上のふちの飾りは、タイトルの後ろにかける
  drawScene(c, L, false);
  cobweb(c, 0, 0, 150 * k, 1);
  cobweb(c, W, 0, 150 * k, -1);
  garland(c, 50 * k, W - 50 * k, 6 * k, 26 * k, 22 * k);
  ghost(c, 150 * k, 300 * k, 22 * k, 0.4, 1, 0.6);
  ghost(c, 1000 * k, 150 * k, 18 * k, 1.2, -1, 0.6);

  // スピキ（泣いてる）
  drawChibi(c, SPIKI, sx, sy, sr, { expr: 'worried', t: 0.3, turn: -1 });
  bubble(c, T.game.cry[1], sx - 0.8 * sr, sy - sr * 2.1, 22 * k, sx - 0.2 * sr, '#e4f6ff');

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
  const { x: tx, pill: py } = ART.title;
  c.save();
  c.font = font(20 * k);
  const pill = T.title.sub;
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
  c.restore();
  drawLogo(c, tx, ART.title.top, ART.title.s);
  // ?kind=… を headless の --dump-dom で取り出せるよう、PNG を本文に書き出す
  const out = document.createElement('pre');
  out.id = 'png';
  out.textContent = canvas.toDataURL('image/png');
  document.body.append(out);
}
