import { C, font } from '../palette';

/** 縁取りした文字 */
export function outlined(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size: number; fill?: string; stroke?: string; width?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; font?: string } ,
): void {
  c.font = opts.font ?? font(opts.size);
  c.textAlign = opts.align ?? 'center';
  c.textBaseline = opts.base ?? 'middle';
  c.lineJoin = 'round';
  c.strokeStyle = opts.stroke ?? C.ink;
  c.lineWidth = opts.width ?? Math.max(3, opts.size * 0.22);
  c.strokeText(text, x, y);
  c.fillStyle = opts.fill ?? C.white;
  c.fillText(text, x, y);
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

/** ふきだし（しっぽは下の tx へ） */
export function bubble(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, tx: number, color = '#ffffff'): void {
  c.font = font(size);
  const w = c.measureText(text).width + size * 1.1;
  const h = size * 1.7;
  const lw = Math.max(2, size * 0.12);
  const by = y + h / 2;
  const tail = (k: number) => {
    c.beginPath();
    c.moveTo(tx - size * 0.32 * k, by - 2);
    c.lineTo(tx + size * 0.12, by + size * 0.6 * k);
    c.lineTo(tx + size * 0.36 * k, by - 2);
    c.closePath();
  };
  c.lineJoin = 'round';
  c.strokeStyle = C.line;
  c.lineWidth = lw;
  c.fillStyle = color;
  tail(1);
  c.fill();
  c.stroke();
  c.beginPath();
  c.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  c.fill();
  c.stroke();
  // しっぽの付け根の線を消す
  tail(0.72);
  c.fill();
  c.fillStyle = C.line;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x, y + size * 0.04);
}
