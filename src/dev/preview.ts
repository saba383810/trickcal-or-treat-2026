// 開発用: キャラとお菓子の見た目を一覧で確認する（本番ビルドには含めない）
import { FEET_R, drawChibi, feetR, type Expr } from '../view/draw/chibi';
import { BUTTER, ELFIN, JOANNE, KOMMY, SPIKEY, SPIKI, YOMI } from '../view/draw/characters';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const W = 1500;
const H = 1000;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = `${W}px`;
canvas.style.height = `${H}px`;
const ctx = canvas.getContext('2d')!;
ctx.scale(dpr, dpr);
ctx.fillStyle = '#f6e8f0';
ctx.fillRect(0, 0, W, H);

const cast = [KOMMY, ELFIN, BUTTER, YOMI, JOANNE, SPIKEY, SPIKI];
const big = 66;
cast.forEach((spec, i) => {
  drawChibi(ctx, spec, 110 + i * 205, 230 + (FEET_R - feetR(spec)) * big, big, { expr: 'normal', t: 0, turn: 1 });
});
// 小さく（ゲーム中の大きさ）
cast.forEach((spec, i) => {
  drawChibi(ctx, spec, 60 + i * 95, 520 + (FEET_R - feetR(spec)) * 32, 32, { expr: 'normal', t: 0, turn: 1 });
});
// 表情
const exprs: Expr[] = ['munch', 'dizzy', 'happy', 'surprised', 'worried', 'pinched'];
exprs.forEach((expr, j) => {
  [KOMMY, ELFIN, BUTTER, YOMI, JOANNE, SPIKI].forEach((spec, i) => {
    drawChibi(ctx, spec, 740 + j * 125, 470 + i * 92, 32, { expr, t: 0.3, turn: 1, body: false });
  });
});
// お菓子
import { drawItem, hobagi } from '../view/draw/items';
(['candy', 'star', 'mokaron', 'shucaron', 'hobagi'] as const).forEach((kind, i) => {
  drawItem(ctx, kind, 80 + i * 110, 700, 44, { t: 0, phase: 0, id: i });
  drawItem(ctx, kind, 80 + i * 60, 800, 22, { t: 0, phase: 0, id: i + 1 });
});
ctx.save();
ctx.translate(640, 700);
ctx.scale(44 / 50, 44 / 50);
hobagi(ctx, 'crashed');
ctx.restore();

// ?faces: 5 人の顔を大きく（前髪の形を見る）。?faces=2 で後ろの 2 人
const faces = new URLSearchParams(location.search).get('faces');
if (faces !== null) {
  ctx.fillStyle = '#f6e8f0';
  ctx.fillRect(0, 0, W, H);
  const list = faces === '2' ? [YOMI, JOANNE] : [KOMMY, ELFIN, BUTTER];
  list.forEach((spec, i) => {
    drawChibi(ctx, spec, 250 + i * 500, 420, 170, { expr: 'normal', t: 0.4, turn: 1, body: false });
  });
}
