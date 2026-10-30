// 画面の配置。横向きはフィールドを真ん中に置いて左右に HUD、縦向きは上に HUD、下にフィールド。
// フィールドの中はシミュレーションの正規化座標（横 0〜1、縦 0〜1 = 上端〜地面）。
import { BALANCE } from '../config/balance';
import { CROUCH_FEET_R, FEET_R } from './draw/chibi';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  w: number;
  h: number;
  portrait: boolean;
  /** 遊ぶ場所（上端〜地面） */
  field: Rect;
  /** 地面の y */
  ground: number;
  /** キャラの頭の半径 */
  headR: number;
  /** キャッチの高さ（キャラの頭の中心。縦の正規化座標） */
  catchY: number;
  /** スピキ（頭の中心と半径、丘の上の足もと） */
  spiki: { x: number; y: number; r: number; feet: number };
  score: Rect;
  timer: Rect;
  chain: Rect;
  gauge: Rect;
  pauseBtn: Rect;
}

export function inside(r: Rect, p: Point, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
}

/** 縦の正規化座標 → 画面の y */
export function fy(L: Layout, y: number): number {
  return L.field.y + y * L.field.h;
}

/** 横の正規化座標 → 画面の x */
export function fx(L: Layout, x: number): number {
  return L.field.x + x * L.field.w;
}

export function makeLayout(w: number, h: number, portrait: boolean): Layout {
  let field: Rect;
  let score: Rect;
  let timer: Rect;
  let chain: Rect;
  let gauge: Rect;
  let pauseBtn: Rect;
  if (!portrait) {
    const groundH = Math.round(Math.max(40, h * 0.065));
    const side = 220;
    const fw = Math.min(w - side * 2, h * 1.3);
    field = { x: Math.round((w - fw) / 2), y: 0, w: Math.round(fw), h: h - groundH };
    const pw = field.x - 28;
    score = { x: 14, y: 18, w: pw, h: 112 };
    chain = { x: 14, y: 140, w: pw, h: 72 };
    const rx = field.x + field.w + 14;
    timer = { x: rx, y: 18, w: pw, h: 112 };
    gauge = { x: rx, y: 140, w: pw, h: 96 };
    pauseBtn = { x: w - 70, y: h - groundH - 72, w: 56, h: 56 };
  } else {
    const top = 178;
    const groundH = Math.round(Math.max(48, h * 0.045));
    field = { x: 0, y: top, w, h: h - top - groundH };
    score = { x: 14, y: 14, w: w * 0.5 - 20, h: 92 };
    timer = { x: w * 0.5 + 6, y: 14, w: w * 0.5 - 92, h: 92 };
    pauseBtn = { x: w - 72, y: 24, w: 58, h: 58 };
    gauge = { x: 14, y: 114, w: w * 0.6 - 20, h: 56 };
    chain = { x: w * 0.6 + 4, y: 114, w: w * 0.4 - 18, h: 56 };
  }
  const ground = field.y + field.h;
  const headR = field.w * 0.052;
  const catchY = (ground - FEET_R * headR - field.y) / field.h;
  // スピキはおかえしを投げる場所（BALANCE.spiki）にしゃがむ。体のまんなかがそこに来るよう、頭は少し上
  const sr = field.w * 0.05;
  const sx = field.x + BALANCE.spiki.x * field.w;
  const sy = field.y + BALANCE.spiki.y * field.h - sr * 1.05;
  return {
    w,
    h,
    portrait,
    field,
    ground,
    headR,
    catchY,
    spiki: { x: sx, y: sy, r: sr, feet: sy + CROUCH_FEET_R * sr },
    score,
    timer,
    chain,
    gauge,
    pauseBtn,
  };
}
