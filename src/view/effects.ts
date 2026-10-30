// 粒・浮かぶ文字・画面の揺れ。
import { C, popFont } from './palette';
import { outlined } from './draw/ui';

type Kind = 'dot' | 'star' | 'heart' | 'dust' | 'tear';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

interface Floater {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  size: number;
  color: string;
  stroke: string;
  rise: number;
}

export class Effects {
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  shake = 0;
  reduced = false;

  clear(): void {
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const f of this.floaters) f.life += dt;
    this.floaters = this.floaters.filter((f) => f.life < f.max);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  burst(x: number, y: number, kind: Kind, count: number, color: string = C.gold, speed = 220): void {
    const n = this.reduced ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const dust = kind === 'dust';
      const tear = kind === 'tear';
      this.particles.push({
        kind,
        x,
        y,
        vx: dust ? Math.cos(a) * v : tear ? (Math.random() < 0.5 ? -1 : 1) * v * 0.6 : Math.cos(a) * v,
        vy: dust ? -Math.abs(Math.sin(a)) * v * 0.4 : tear ? -v * 0.7 : Math.sin(a) * v - speed * 0.4,
        g: dust ? 80 : kind === 'heart' ? -60 : 600,
        life: 0,
        max: dust ? 0.5 + Math.random() * 0.3 : 0.6 + Math.random() * 0.4,
        size: dust ? 6 + Math.random() * 6 : kind === 'heart' ? 8 + Math.random() * 5 : 5 + Math.random() * 6,
        color,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
      });
    }
  }

  float(text: string, x: number, y: number, opts: { color?: string; size?: number; stroke?: string; max?: number; rise?: number } = {}): void {
    this.floaters.push({
      text,
      x,
      y,
      life: 0,
      max: opts.max ?? 0.9,
      size: opts.size ?? 30,
      color: opts.color ?? C.white,
      stroke: opts.stroke ?? C.ink,
      rise: opts.rise ?? 50,
    });
  }

  addShake(amount: number): void {
    if (!this.reduced) this.shake = Math.max(this.shake, amount);
  }

  draw(c: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const k = 1 - p.life / p.max;
      c.save();
      c.globalAlpha = Math.min(1, k * 1.5);
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      switch (p.kind) {
        case 'star':
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const r = i % 2 === 0 ? p.size : p.size * 0.4;
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
          break;
        case 'heart':
          c.rotate(-p.rot);
          c.beginPath();
          c.moveTo(0, p.size * 0.6);
          c.bezierCurveTo(-p.size * 1.2, -p.size * 0.2, -p.size * 0.4, -p.size, 0, -p.size * 0.35);
          c.bezierCurveTo(p.size * 0.4, -p.size, p.size * 1.2, -p.size * 0.2, 0, p.size * 0.6);
          c.fill();
          break;
        case 'tear':
          c.rotate(-p.rot);
          c.beginPath();
          c.moveTo(0, -p.size);
          c.quadraticCurveTo(p.size * 0.7, 0, 0, p.size * 0.6);
          c.quadraticCurveTo(-p.size * 0.7, 0, 0, -p.size);
          c.fill();
          break;
        case 'dust':
          c.globalAlpha *= 0.55;
          c.beginPath();
          c.arc(0, 0, p.size * (1.4 - k * 0.6), 0, Math.PI * 2);
          c.fill();
          break;
        default:
          c.beginPath();
          c.arc(0, 0, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
          c.fill();
      }
      c.restore();
    }

    for (const f of this.floaters) {
      const t = f.life / f.max;
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : t < 0.25 ? 1.1 - ((t - 0.15) / 0.1) * 0.1 : 1;
      c.save();
      c.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      c.translate(f.x, f.y - Math.sqrt(t) * f.rise);
      c.scale(pop, pop);
      outlined(c, f.text, 0, 0, { size: f.size, fill: f.color, stroke: f.stroke, font: popFont(f.size) });
      c.restore();
    }
  }
}
