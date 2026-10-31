// 遊んでいる画面: 背景・お菓子・キャラ・スピキ・HUD・演出と、操作（ドラッグ・マウス・キー・スピキをなぐさめる）。
// 中身（World）は固定刻みで App が進める。ここは World のイベントを見て、絵と音にする。
import type { Bgm } from '../audio/bgm';
import type { Sound } from '../audio/sound';
import { BALANCE, type ItemKind } from '../config/balance';
import type { CharId } from '../config/characters';
import { talkLine, type TalkId } from '../config/lines';
import { MochiBody } from '../mochi/body';
import type { GameEvent, Item, World } from '../sim/world';
import { CHAR_SPECS, SPIKEY, SPIKI } from './draw/characters';
import { FEET_R, feetR, type ChibiSpec, type Expr } from './draw/chibi';
import { drawItem, hobagi, hobagiShadow } from './draw/items';
import { SceneCache, drawLiveDecor } from './draw/scene';
import { bubble, outlined, roundRect } from './draw/ui';
import { Effects } from './effects';
import { fx, fy, inside, makeLayout, type Layout, type Point, type Rect } from './layout';
import { C, font, popFont } from './palette';
import type { Screen } from './screen';
import type { Coach } from '../tutorial';

/** 動かしたとみなす指の移動（px） */
const DRAG_START = 8;
/** ほっぺをこれだけ伸ばしてから離すと、おかえしが 1 個増える（pinch.intensity） */
const MOCHI_BONUS = 0.45;
/** 指で動かす時の倍率（指の移動 → キャラの移動） */
const DRAG_GAIN = 1.15;

const KIND_COLOR: Record<ItemKind, string> = {
  candy: '#ff9cbc',
  star: C.gold,
  mokaron: '#ffa489',
  shucaron: C.fever,
  hobagi: C.orange,
};

/** ミッションクリアのお知らせを出しておく秒数 */
const TOAST = 2.6;
/** キャラのひとことを出しておく秒数と、次に話すまでの間 */
const TALK = 1.8;
const TALK_GAP = 7;
const CRY_TEXT = ['', 'ｳｪｪﾝ…', 'ｳｱｱｰﾝ!!', 'ｳｱｱｱｱｱﾝ!!!'];

interface Banner {
  text: string;
  sub?: string;
  color: string;
  t: number;
  max: number;
  size: number;
}

interface Landed {
  kind: ItemKind;
  x: number;
  t: number;
  id: number;
}

/** はね返ったホバギ（suck = ジョアンに吸われて縮む） */
interface Flying {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  t: number;
  suck: boolean;
}

interface SpikiPress {
  id: number;
  start: Point;
  moved: boolean;
  grabbed: boolean;
}

export class GameView {
  L: Layout;
  readonly fx = new Effects();
  private scene: SceneCache;
  private t = 0;
  inputEnabled = false;
  /** なぐさめ方のヒントを出す（はじめの数回） */
  hintComfort = true;
  /** 動き方のヒントを出す */
  hintMove = true;
  onPause: () => void = () => {};
  /** スマホ（指）で遊んでいる（ヒントの文言を変える） */
  touchUI: boolean;

  private body = new MochiBody();
  private spec: ChibiSpec;
  private expr: Expr = 'normal';
  private exprT = 0;
  private lastV = 0;
  private trail: { x: number; t: number }[] = [];
  private swoosh: { x0: number; x1: number; t: number } | null = null;

  private spikiBody = new MochiBody();
  private spikiPress: SpikiPress | null = null;
  private spikiTalk: { text: string; t: number; max: number; color: string } | null = null;
  /** 遊んでいるキャラのひとこと */
  private talk: { text: string; t: number } | null = null;
  private talkGap = 0;
  /** スピキのほっぺを引っぱって離した時（記録する） */
  onCheek: ((k: number) => void) | null = null;
  private spikiHop = 0;
  private tearT = 0;

  private landed: Landed[] = [];
  private flying: Flying[] = [];
  private banners: Banner[] = [];
  private toasts: { text: string; t: number }[] = [];
  /** れんしゅう中の説明（なければ出さない） */
  coach: Coach | null = null;
  private shownScore = 0;
  private scorePop = 0;
  private chainPop = 0;
  private gaugePop: number[] = [];
  private timerPop = 0;
  private feverGlow = 0;
  private shucaronCount = 0;
  private moved = false;

  /** 指で動かしている指（相対ドラッグ） */
  private drag: { id: number; lastX: number } | null = null;
  private target = 0.5;
  private keys = { left: false, right: false };

  constructor(
    readonly world: World,
    readonly charId: CharId,
    private screen: Screen,
    private sound: Sound,
    private bgm: Bgm,
    scene: SceneCache,
  ) {
    this.scene = scene;
    this.spec = CHAR_SPECS[charId];
    this.L = makeLayout(screen.w, screen.h, screen.portrait);
    world.catchY = this.L.catchY;
    this.touchUI = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.target = world.player.x;
  }

  relayout(): void {
    this.L = makeLayout(this.screen.w, this.screen.h, this.screen.portrait);
    this.world.catchY = this.L.catchY;
  }

  // ===================================================================== 入力

  /** 遊び始め: 押しているキー・指している場所をそのまま使う */
  enable(): void {
    this.inputEnabled = true;
    if (this.keys.left || this.keys.right) this.applyKeys();
    else this.world.input.target = this.target;
  }

  /** 時間切れ: もう動かさない */
  disable(): void {
    this.inputEnabled = false;
    this.cancelInput();
    this.world.input.target = null;
  }

  private setTarget(x: number): void {
    this.target = Math.max(0, Math.min(1, x));
    if (!this.inputEnabled) return;
    this.world.input.target = this.target;
    this.world.input.dir = 0;
  }

  /** スピキのあたり（つまむ・タップする場所） */
  private nearSpiki(p: Point, pad = 1): boolean {
    const s = this.L.spiki;
    const cy = s.y + s.r * 0.6;
    return Math.hypot(p.x - s.x, (p.y - cy) * 0.8) < s.r * 1.55 * pad;
  }

  private spikiHead(): { x: number; y: number; r: number; spec: ChibiSpec } {
    const s = this.L.spiki;
    const spec = this.spikiSpec();
    return { x: s.x, y: s.feet - feetR(spec) * s.r - this.spikiHop * s.r * 0.25, r: s.r, spec };
  }

  private spikiSpec(): ChibiSpec {
    return this.world.crying ? SPIKI : SPIKEY;
  }

  pointerDown(id: number, p: Point, kind: string): void {
    const mouse = kind === 'mouse';
    this.touchUI = !mouse;
    if (inside(this.L.pauseBtn, p, 10)) {
      this.sound.click();
      this.onPause();
      return;
    }
    if (!this.spikiPress && this.nearSpiki(p)) {
      const h = this.spikiHead();
      const g = this.spikiBody.grab(id, MochiBody.toLocal(p, h.x, h.y, h.r));
      this.spikiPress = { id, start: p, moved: false, grabbed: !!g };
      if (g) this.sound.mochiGrab();
      return;
    }
    if (mouse) {
      this.setTarget((p.x - this.L.field.x) / this.L.field.w);
      return;
    }
    if (!this.drag) {
      this.drag = { id, lastX: p.x };
      this.target = this.world.player.x;
    }
  }

  pointerMove(id: number, p: Point, kind: string): void {
    const sp = this.spikiPress;
    if (sp?.id === id) {
      if (Math.hypot(p.x - sp.start.x, p.y - sp.start.y) > DRAG_START) sp.moved = true;
      const h = this.spikiHead();
      if (sp.grabbed) this.spikiBody.pinch.move(id, MochiBody.toLocal(p, h.x, h.y, h.r));
      return;
    }
    if (kind === 'mouse') {
      // マウスはカーソルの x へ。スピキに手を伸ばしている間はキャラを動かさない
      if (this.spikiPress || this.nearSpiki(p, 1.2)) return;
      this.keys.left = this.keys.right = false;
      this.setTarget((p.x - this.L.field.x) / this.L.field.w);
      return;
    }
    const d = this.drag;
    if (d?.id !== id) return;
    const dx = p.x - d.lastX;
    d.lastX = p.x;
    this.setTarget(this.target + (dx / this.L.field.w) * DRAG_GAIN);
  }

  pointerUp(id: number): void {
    if (this.drag?.id === id) this.drag = null;
    const sp = this.spikiPress;
    if (sp?.id !== id) return;
    this.spikiPress = null;
    const pinch = this.spikiBody.pinch;
    const g = pinch.find(id);
    const stretch = g ? pinch.intensity(g) : 0;
    pinch.release(id);
    if (stretch > 0.05) this.sound.mochiRelease(stretch, pinch.params.releaseFreq);
    if (stretch >= 0.3) this.onCheek?.(stretch);
    this.comfort(stretch >= MOCHI_BONUS ? 1 : 0);
  }

  pointerCancel(id: number): void {
    if (this.drag?.id === id) this.drag = null;
    if (this.spikiPress?.id === id) {
      this.spikiPress = null;
      this.spikiBody.pinch.release(id);
    }
  }

  /** ポーズなどで指が離れたことにする */
  cancelInput(): void {
    if (this.spikiPress) this.spikiBody.pinch.release(this.spikiPress.id);
    this.spikiPress = null;
    this.drag = null;
    this.keys.left = this.keys.right = false;
    this.world.input.dir = 0;
  }

  /** 使ったキーなら true */
  keyDown(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.left = true;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.right = true;
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'ArrowDown' || k === 's' || k === 'S') {
      this.comfort(0);
      return true;
    } else return false;
    this.applyKeys();
    return true;
  }

  keyUp(e: KeyboardEvent): void {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.right = false;
    else return;
    this.applyKeys();
  }

  private applyKeys(): void {
    if (!this.inputEnabled) return;
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    this.world.input.dir = dir;
    this.world.input.target = null;
    this.target = this.world.player.x;
    this.touchUI = false;
  }

  /** スピキをなぐさめる（泣いていなければ、つついた反応だけ） */
  private comfort(extra: number): void {
    const w = this.world;
    if (!this.inputEnabled) return;
    if (!w.crying) {
      if (w.spiki.happy <= 0) this.say('ﾁｮﾜﾖ?', 0.7, C.white);
      return;
    }
    const level = w.spiki.level;
    if (!w.comfort(extra)) return;
    if (extra > 0) {
      const h = this.spikiHead();
      this.fx.float('もちもち +1!', h.x, h.y - h.r * 1.6, { color: C.pink, size: 24, max: 1.1 });
    }
    this.sound.comfort(level);
  }

  private say(text: string, max: number, color: string): void {
    this.spikiTalk = { text, t: 0, max, color };
  }

  // ===================================================================== 更新

  /** ミッションをクリアした時のお知らせ（画面の上のほうに、1 つずつ） */
  toast(text: string): void {
    this.toasts.push({ text, t: 0 });
  }

  banner(text: string, color: string, max = 1.3, size = 76, sub?: string): void {
    this.banners = this.banners.filter((b) => b.t < 0.2);
    this.banners.push({ text, color, t: 0, max, size, sub });
  }

  update(dt: number): void {
    this.t += dt;
    const w = this.world;
    for (const e of w.drain()) this.onEvent(e);

    // キャラ
    const p = w.player;
    const dv = p.v - this.lastV;
    this.lastV = p.v;
    this.body.jolt((dv * this.L.field.w) / this.L.headR / 6);
    this.body.update(dt);
    if (Math.abs(p.v) > 0.05) this.moved = true;
    this.exprT = Math.max(0, this.exprT - dt);
    // エルフィンの残像
    if (this.charId === 'elfin' && Math.abs(p.v) > 0.8) this.trail.push({ x: p.x, t: 0 });
    for (const tr of this.trail) tr.t += dt;
    this.trail = this.trail.filter((tr) => tr.t < 0.18);
    if (this.swoosh) {
      this.swoosh.t += dt;
      if (this.swoosh.t > 0.22) this.swoosh = null;
    }

    // スピキ
    this.spikiBody.update(dt);
    if (this.spikiTalk) {
      this.spikiTalk.t += dt;
      if (this.spikiTalk.t > this.spikiTalk.max) this.spikiTalk = null;
    }
    if (this.talk && (this.talk.t += dt) > TALK) this.talk = null;
    this.talkGap -= dt;
    const cheer = w.fever > 0 || w.spiki.happy > 0;
    this.spikiHop = cheer && !w.crying ? Math.abs(Math.sin(this.t * (w.fever > 0 ? 7 : 9))) : 0;
    if (w.crying) {
      this.tearT -= dt;
      if (this.tearT <= 0) {
        this.tearT = 0.32 - w.spiki.level * 0.06;
        const h = this.spikiHead();
        for (const side of [-1, 1]) this.fx.burst(h.x + side * h.r * 0.38, h.y + h.r * 0.3, 'tear', 1, '#9fdcf5', 120 + w.spiki.level * 30);
      }
    }

    for (const f of this.flying) {
      f.t += dt;
      if (f.suck) continue;
      f.vy += 1500 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
    }
    this.flying = this.flying.filter((f) => (f.suck ? f.t < 0.4 : f.y < this.L.h + 80));
    for (const l of this.landed) l.t += dt;
    this.landed = this.landed.filter((l) => l.t < (l.kind === 'hobagi' ? 1.3 : 0.5));
    for (const b of this.banners) b.t += dt;
    if (this.toasts.length) {
      const first = this.toasts[0];
      if (first.t === 0) this.sound.mission();
      first.t += dt;
      if (first.t > TOAST) this.toasts.shift();
    }
    this.banners = this.banners.filter((b) => b.t < b.max);

    const diff = w.score - this.shownScore;
    this.shownScore = Math.abs(diff) < 1 ? w.score : this.shownScore + diff * Math.min(1, dt * 14);
    this.scorePop = Math.max(0, this.scorePop - dt * 5);
    this.chainPop = Math.max(0, this.chainPop - dt * 4);
    this.timerPop = Math.max(0, this.timerPop - dt * 3);
    this.gaugePop = this.gaugePop.map((g) => Math.max(0, g - dt * 3));
    this.feverGlow += ((w.fever > 0 ? 1 : 0) - this.feverGlow) * Math.min(1, dt * 4);
    this.fx.update(dt);
  }

  /** できごとに合わせて、キャラがひとこと（フィーバー・ラストスパートは必ず、ほかは間をあけて） */
  private react(e: GameEvent): void {
    if (this.world.practice) return;
    let kind: TalkId | null = null;
    if (e.type === 'feverStart') kind = 'fever';
    else if (e.type === 'lastSpurt') kind = 'spurt';
    else if (this.talkGap > 0) return;
    else if (e.type === 'catch' && (e.chain === 50 || e.chain === 100)) kind = 'chain';
    else if (e.type === 'catch' && e.kind === 'star' && this.charId === 'elfin' && Math.random() < 0.3) kind = 'skill';
    else if (e.type === 'hit' && Math.random() < 0.5) kind = e.guarded ? 'skill' : 'hit';
    else if (e.type === 'drain' && Math.random() < 0.5) kind = 'skill';
    if (!kind) return;
    const text = talkLine(this.charId, kind, this.talk?.text);
    if (!text) return;
    this.talk = { text, t: 0 };
    this.talkGap = TALK_GAP;
  }

  private onEvent(e: GameEvent): void {
    const w = this.world;
    const L = this.L;
    this.react(e);
    switch (e.type) {
      case 'catch': {
        const x = fx(L, e.x);
        const y = fy(L, Math.min(e.y, w.catchY));
        this.setExpr('munch', 0.22);
        const color = KIND_COLOR[e.kind];
        this.fx.burst(x, y, 'star', e.kind === 'shucaron' ? 7 : 5, color, 230);
        if (e.gift) this.fx.burst(x, y, 'heart', 3, C.pink, 120);
        const big = e.kind === 'shucaron' || e.kind === 'star';
        this.fx.float(`+${e.pts}`, x, y - L.headR * 0.8, { color: e.kind === 'shucaron' ? '#ffe0f2' : C.white, stroke: e.kind === 'shucaron' ? '#b0306e' : C.ink, size: big ? 32 : 26 });
        this.scorePop = 1;
        if (e.chain >= 2) this.chainPop = 1;
        if (this.charId === 'kommy' && Math.abs(e.x - w.player.x) > w.body) this.swoosh = { x0: w.player.x, x1: e.x, t: 0 };
        switch (e.kind) {
          case 'candy':
            this.sound.catchCandy(e.chain);
            break;
          case 'star':
            this.sound.catchStar(e.chain);
            break;
          case 'mokaron':
            this.sound.catchMokaron(w.gauge);
            break;
          case 'shucaron':
            this.sound.catchShucaron(this.shucaronCount++);
            break;
        }
        break;
      }
      case 'hit': {
        const x = fx(L, e.x);
        const y = fy(L, w.catchY) - L.headR;
        if (e.guarded) {
          this.setExpr('angry', 0.5);
          this.fx.float('ガード!', x, y - 20, { color: C.butter, size: 30 });
          this.fx.float(`${e.pts}`, x + 40, y + 10, { color: C.bad, size: 24 });
          this.fx.burst(x, y, 'dot', 8, '#fff3d6', 260);
          this.sound.guard();
          this.fx.addShake(0.25);
        } else {
          this.fx.float(`${e.pts}`, x, y - 10, { color: C.bad, size: 32 });
          this.fx.burst(x, y, 'star', 6, C.orange, 260);
          this.sound.bonk();
          this.fx.addShake(0.6);
        }
        // ホバギは頭ではね返って飛んでいく（バターはもっと高く）
        this.flying.push({ x, y, vx: (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 80), vy: e.guarded ? -620 : -420, rot: 0, vr: (Math.random() - 0.5) * 14, t: 0, suck: false });
        break;
      }
      case 'drain': {
        const x = fx(L, e.x);
        const y = fy(L, w.catchY) - L.headR;
        this.fx.float('ちゅーっ', x, y - 24, { color: '#ffb0b8', stroke: '#6b1e3a', size: 28 });
        this.fx.burst(x, y, 'dot', 10, C.orange, 160);
        this.fx.burst(x, y, 'heart', 2, C.bad, 90);
        this.flying.push({ x, y: y - L.headR * 1.2, vx: 0, vy: 0, rot: 0, vr: 6, t: 0, suck: true });
        this.sound.slurp();
        break;
      }
      case 'land':
        this.landed.push({ kind: e.kind, x: e.x, t: 0, id: Math.floor(Math.random() * 99) });
        if (e.kind === 'hobagi') {
          this.fx.burst(fx(L, e.x), L.ground, 'dust', 8, '#c9b6e6', 160);
          this.fx.addShake(0.35);
          this.sound.thud();
        } else {
          this.fx.burst(fx(L, e.x), L.ground - 6, 'dust', 4, '#c9b6e6', 90);
          this.sound.miss();
        }
        break;
      case 'chainBreak':
        if (e.chain >= 10) {
          this.fx.float(`${e.chain}れんぞく おしまい`, this.chainAnchor().x, this.chainAnchor().y + 40, { color: '#d9cdf0', size: 20, rise: 20 });
          this.sound.chainBreak();
        }
        break;
      case 'chainTier': {
        const a = this.chainAnchor();
        this.fx.float(`×${e.mult.toFixed(1)}!`, a.x, a.y, { color: C.gold, size: 34, max: 1.1 });
        this.sound.chainTier(e.mult);
        break;
      }
      case 'gauge':
        this.gaugePop[e.value - 1] = 1;
        break;
      case 'spikiCry': {
        const h = this.spikiHead();
        this.say(CRY_TEXT[e.level], BALANCE.spiki.cry, '#e4f6ff');
        this.fx.burst(h.x, h.y, 'tear', 6, '#9fdcf5', 220);
        this.sound.wail(e.level);
        break;
      }
      case 'spikiCalm':
        this.say('ｸﾞｽﾝ…', 1.0, C.white);
        this.sound.sniff();
        break;
      case 'comfort': {
        const h = this.spikiHead();
        this.say('ﾁｮﾜﾖ!', 1.3, '#fff2a8');
        this.fx.burst(h.x, h.y, 'heart', 8, C.pink, 200);
        this.fx.float(`おかえし ×${e.gifts}`, h.x, h.y - h.r * 2.4, { color: C.gold, size: 26, max: 1.3 });
        for (let i = 0; i < e.gifts; i++) window.setTimeout(() => this.sound.toss(), i * BALANCE.spiki.throwGap * 1000);
        this.hintComfort = false;
        break;
      }
      case 'feverStart':
        this.banner('フィーバー!!', C.fever, 1.5, 88, 'シューカロンの雨!');
        this.sound.feverStart();
        this.setExpr('happy', 1);
        this.fx.burst(fx(L, w.player.x), fy(L, w.catchY), 'heart', 12, C.fever, 320);
        this.bgm.mode = 'fever';
        break;
      case 'feverEnd':
        this.sound.feverEnd();
        this.bgm.mode = w.spurt ? 'hurry' : 'normal';
        break;
      case 'lastSpurt':
        this.banner('ラストスパート!', C.orange, 1.3, 64);
        this.sound.lastSpurt();
        if (w.fever <= 0) this.bgm.mode = 'hurry';
        break;
      case 'tick':
        this.timerPop = 1;
        this.sound.tick();
        break;
      case 'timeUp':
        // 残っているお菓子は、ぽんっと消える
        for (const it of w.items) this.fx.burst(fx(L, it.x), fy(L, it.y), 'star', 3, KIND_COLOR[it.kind], 160);
        w.items = [];
        this.banner('おしまい!', C.gold, 2.4, 92);
        this.sound.timeUp();
        this.setExpr('happy', 3);
        break;
    }
  }

  private setExpr(e: Expr, dur: number): void {
    this.expr = e;
    this.exprT = dur;
  }

  private chainAnchor(): Point {
    const r = this.L.chain;
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  // ===================================================================== 描画

  render(): void {
    const scr = this.screen;
    const c = scr.ctx;
    const L = this.L;
    scr.clear('#1a1331');
    scr.begin();
    const back = this.scene.ensure(L, scr.pixelRatio);
    c.save();
    const sh = this.fx.shake;
    if (sh > 0) c.translate((Math.random() - 0.5) * sh * 16, (Math.random() - 0.5) * sh * 16);
    c.drawImage(back, 0, 0, L.w, L.h);
    drawLiveDecor(c, L, this.t, this.feverGlow);
    if (this.feverGlow > 0.01) this.drawFeverBack(c);
    this.drawSpiki(c);
    this.drawLanded(c);
    this.drawShadows(c);
    this.drawPlayer(c);
    this.drawItems(c);
    this.drawFlying(c);
    this.fx.draw(c);
    this.drawSpikiTalk(c);
    this.drawTalk(c);
    c.restore();
    this.drawSpurtVignette(c);
    this.drawHud(c);
    this.drawHints(c);
    this.drawBanners(c);
    this.drawToast(c);
    this.drawCoach(c);
  }

  private drawFeverBack(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const f = L.field;
    const a = this.feverGlow;
    c.save();
    c.globalAlpha = a;
    const g = c.createRadialGradient(f.x + f.w / 2, f.y, 20, f.x + f.w / 2, f.y, f.h * 1.1);
    g.addColorStop(0, 'rgba(255, 122, 200, 0.42)');
    g.addColorStop(1, 'rgba(255, 122, 200, 0)');
    c.fillStyle = g;
    c.fillRect(f.x, f.y, f.w, f.h);
    // 回る光の帯
    c.translate(f.x + f.w / 2, f.y);
    c.rotate(Math.sin(this.t * 0.6) * 0.3);
    c.fillStyle = 'rgba(255, 240, 200, 0.08)';
    for (let i = 0; i < 7; i++) {
      const a0 = Math.PI * (0.12 + i * 0.12);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a0) * f.h * 1.6, Math.sin(a0) * f.h * 1.6);
      c.lineTo(Math.cos(a0 + 0.05) * f.h * 1.6, Math.sin(a0 + 0.05) * f.h * 1.6);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  private drawSpiki(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const h = this.spikiHead();
    let expr: Expr = 'smile';
    if (this.spikiBody.pinch.held) expr = 'pinched';
    else if (w.crying) expr = w.spiki.level >= 2 ? 'worried' : 'normal';
    else if (w.spiki.happy > 0 || w.fever > 0) expr = 'happy';
    const shake = w.crying ? Math.sin(this.t * 30) * h.r * 0.03 * w.spiki.level : 0;
    // 泣いている時は、泣き止むまでの残りの輪とおかえしの数
    if (w.crying) this.drawGiftBadge(c, h.x, h.y - h.r * 2.25);
    this.spikiBody.draw(c, h.spec, h.x + shake, h.y, h.r, { expr, t: this.t, turn: -1 });
  }

  private drawGiftBadge(c: CanvasRenderingContext2D, x: number, y: number): void {
    const w = this.world;
    const r = this.L.spiki.r * 0.62;
    const left = w.spiki.cry / BALANCE.spiki.cry;
    const n = w.giftCount(w.spiki.level);
    const pulse = 1 + Math.sin(this.t * 10) * 0.05;
    c.save();
    c.translate(x, y);
    c.scale(pulse, pulse);
    c.fillStyle = 'rgba(40, 24, 64, 0.85)';
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = left < 0.3 ? C.bad : '#9fdcf5';
    c.lineWidth = r * 0.2;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, 0, r * 0.88, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    c.stroke();
    drawItem(c, 'star', -r * 0.22, -r * 0.05, r * 0.42, { t: 0, phase: 0, id: 0 });
    outlined(c, `×${n}`, r * 0.3, r * 0.22, { size: r * 0.55, font: popFont(r * 0.55), fill: C.gold });
    c.restore();
  }

  private drawSpikiTalk(c: CanvasRenderingContext2D): void {
    const tk = this.spikiTalk;
    if (!tk) return;
    const h = this.spikiHead();
    const s = this.L.spiki;
    const size = Math.max(16, s.r * 0.46);
    const pop = Math.min(1, tk.t * 8);
    const x = Math.min(this.L.w - size * 4, h.x - s.r * 0.6);
    const y = h.y - s.r * (this.world.crying ? 3.55 : 2.1) + (1 - pop) * 10;
    c.save();
    c.globalAlpha = Math.min(1, (tk.max - tk.t) * 4);
    bubble(c, tk.text, x, y, size, h.x - s.r * 0.2, tk.color);
    c.restore();
  }

  private drawTalk(c: CanvasRenderingContext2D): void {
    const tk = this.talk;
    if (!tk) return;
    const L = this.L;
    const f = L.field;
    const r = L.headR;
    // 縦画面は全体が縮んで見えるので、大きめに出す
    const size = L.portrait ? 26 : Math.max(17, r * 0.46);
    c.save();
    c.font = font(size);
    const half = (c.measureText(tk.text).width + size * 1.1) / 2;
    const px = fx(L, this.world.player.x);
    const x = Math.max(f.x + half + 6, Math.min(f.x + f.w - half - 6, px));
    const pop = Math.min(1, tk.t * 8);
    const y = L.ground - FEET_R * r - r * 2.9 - size * 0.9 + (1 - pop) * 10;
    c.globalAlpha = Math.min(1, (TALK - tk.t) * 4);
    bubble(c, tk.text, x, y, size, Math.max(x - half + size, Math.min(x + half - size, px)));
    c.restore();
  }

  private drawLanded(c: CanvasRenderingContext2D): void {
    const L = this.L;
    for (const l of this.landed) {
      const x = fx(L, l.x);
      if (l.kind === 'hobagi') {
        const r = BALANCE.radius.hobagi * L.field.w * 1.25;
        c.save();
        c.globalAlpha = Math.min(1, (1.3 - l.t) * 3);
        const bounce = l.t < 0.25 ? Math.sin((l.t / 0.25) * Math.PI) * r * 0.35 : 0;
        c.translate(x, L.ground - r * 0.62 - bounce);
        const k = r / 50;
        c.scale(k, k);
        hobagi(c, 'crashed');
        c.restore();
      } else {
        c.save();
        c.globalAlpha = Math.max(0, 1 - l.t / 0.5) * 0.7;
        drawItem(c, l.kind, x, L.ground - 8, BALANCE.radius[l.kind] * L.field.w, { t: 0, phase: 0, id: l.id });
        c.restore();
      }
    }
  }

  private drawFlying(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    const r = BALANCE.radius.hobagi * L.field.w * 1.25;
    for (const f of this.flying) {
      c.save();
      if (f.suck) {
        // ジョアンの口へ吸いこまれていく
        const k = f.t / 0.4;
        const px = fx(L, w.player.x);
        const py = fy(L, w.catchY) + L.headR * 0.5;
        c.translate(f.x + (px - f.x) * k, f.y + (py - f.y) * k);
        c.rotate(f.t * 10);
        const s = (r / 50) * (1 - k) * (1 + Math.sin(f.t * 40) * 0.08);
        c.scale(s, s * (1 + k * 0.6));
      } else {
        c.translate(f.x, f.y);
        c.rotate(f.rot);
        c.scale(r / 50, r / 50);
      }
      hobagi(c, 'crashed');
      c.restore();
    }
  }

  private drawShadows(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    // キャラの足もとの輪 = キャッチできる幅
    const px = fx(L, w.player.x);
    const reach = w.reach * L.field.w;
    c.save();
    c.fillStyle = w.fever > 0 ? 'rgba(255, 122, 200, 0.32)' : 'rgba(255, 246, 220, 0.16)';
    c.strokeStyle = w.fever > 0 ? 'rgba(255, 190, 230, 0.8)' : 'rgba(255, 246, 220, 0.38)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(px, L.ground - 2, reach, Math.max(6, reach * 0.16), 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
    // ホバギの落ちる所
    for (const it of w.items) {
      if (it.kind !== 'hobagi') continue;
      const near = Math.max(0, Math.min(1, it.y));
      const x = fx(L, it.x);
      hobagiShadow(c, x, L.ground - 2, BALANCE.radius.hobagi * L.field.w * 1.4, near);
    }
  }

  private drawItems(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    c.save();
    c.beginPath();
    c.rect(0, L.field.y, L.w, L.h);
    c.clip();
    for (const it of w.items) this.drawOne(c, it);
    c.restore();
  }

  private drawOne(c: CanvasRenderingContext2D, it: Item): void {
    const L = this.L;
    const x = fx(L, it.x);
    const y = fy(L, it.y);
    const r = BALANCE.radius[it.kind] * L.field.w * (it.kind === 'hobagi' ? 1.25 : 1.35);
    if (it.gift || it.kind === 'shucaron') {
      // きらきらの光
      const g = c.createRadialGradient(x, y, r * 0.3, x, y, r * 1.7);
      g.addColorStop(0, it.gift ? 'rgba(255, 240, 160, 0.55)' : 'rgba(255, 170, 220, 0.5)');
      g.addColorStop(1, 'rgba(255, 240, 160, 0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r * 1.7, 0, Math.PI * 2);
      c.fill();
    }
    if (it.kind === 'mokaron' && this.world.fever <= 0) {
      // モカロンは目立たせる（ゲージがたまる）
      c.save();
      c.strokeStyle = `rgba(255, 220, 150, ${0.45 + 0.35 * Math.sin(this.t * 8 + it.phase)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, r * 1.35, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    drawItem(c, it.kind, x, y, r, { t: this.t, phase: it.phase, id: it.id });
  }

  private drawPlayer(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    const p = w.player;
    const r = L.headR;
    const x = fx(L, p.x);
    const run = Math.min(1, Math.abs(p.v) / 0.5);
    const bob = Math.abs(Math.sin(this.t * 13)) * run * r * 0.1;
    const y = L.ground - FEET_R * r - bob;
    let expr: Expr = 'normal';
    if (p.stun > 0) expr = 'dizzy';
    else if (p.freeze > 0) expr = 'munch';
    else if (this.exprT > 0) expr = this.expr;
    else if (w.fever > 0) expr = 'happy';
    else if (w.over) expr = 'happy';
    const tilt = Math.max(-0.16, Math.min(0.16, p.v * 0.14));
    const pose = { expr, t: this.t, tilt, turn: p.face, prop: true, squash: 1 - bob / r / 4 };
    // エルフィンの残像
    for (const tr of this.trail) {
      c.save();
      c.globalAlpha = 0.25 * (1 - tr.t / 0.18);
      this.body.draw(c, this.spec, fx(L, tr.x), y, r, pose);
      c.restore();
    }
    // コミーの鎌のひと振り
    if (this.swoosh) {
      const s = this.swoosh;
      const k = s.t / 0.22;
      c.save();
      c.globalAlpha = 1 - k;
      c.strokeStyle = '#e9dcff';
      c.lineWidth = r * 0.22 * (1 - k);
      c.lineCap = 'round';
      const x0 = fx(L, s.x0);
      const x1 = fx(L, s.x1);
      const cy = fy(L, w.catchY);
      c.beginPath();
      c.moveTo(x0, cy + r * 0.8);
      c.quadraticCurveTo((x0 + x1) / 2, cy - r * 1.2, x1, cy);
      c.stroke();
      c.restore();
    }
    if (p.stun > 0) {
      // 頭のまわりの星
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        c.fillStyle = C.gold;
        c.beginPath();
        c.arc(x + Math.cos(a) * r * 0.9, y - r * 1.05 + Math.sin(a) * r * 0.22, r * 0.1, 0, Math.PI * 2);
        c.fill();
      }
    }
    this.body.draw(c, this.spec, x, y, r, pose);
  }

  private drawSpurtVignette(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const L = this.L;
    if (w.over || w.left > 5 || w.left <= 0) return;
    const a = 0.12 + 0.1 * Math.sin(this.t * 8);
    const g = c.createRadialGradient(L.w / 2, L.h / 2, Math.min(L.w, L.h) * 0.35, L.w / 2, L.h / 2, Math.max(L.w, L.h) * 0.7);
    g.addColorStop(0, 'rgba(255, 60, 80, 0)');
    g.addColorStop(1, `rgba(255, 60, 80, ${a})`);
    c.fillStyle = g;
    c.fillRect(0, 0, L.w, L.h);
  }

  // ---------------------------------------------------------------- HUD

  private panel(c: CanvasRenderingContext2D, r: Rect, glow = false): void {
    roundRect(c, r.x, r.y, r.w, r.h, 18);
    c.fillStyle = glow ? 'rgba(90, 30, 80, 0.8)' : C.panel;
    c.fill();
    c.strokeStyle = glow ? 'rgba(255, 150, 210, 0.9)' : 'rgba(255, 255, 255, 0.16)';
    c.lineWidth = 2.5;
    c.stroke();
  }

  private drawHud(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    // スコア
    const s = L.score;
    this.panel(c, s);
    const labelSize = L.portrait ? 18 : 20;
    outlined(c, 'スコア', s.x + 18, s.y + labelSize * 0.9, { size: labelSize, fill: C.gold, align: 'left', width: 4 });
    const num = Math.round(this.shownScore).toLocaleString('ja-JP');
    const ns = Math.min(s.h * 0.52, (s.w - 30) / Math.max(3, num.length * 0.55));
    c.save();
    c.translate(s.x + s.w - 18, s.y + s.h * 0.64);
    const sp = 1 + this.scorePop * 0.08;
    c.scale(sp, sp);
    outlined(c, num, 0, 0, { size: ns, font: popFont(ns), align: 'right', width: 7 });
    c.restore();

    // のこり時間
    const t = L.timer;
    this.panel(c, t, w.overtime);
    outlined(c, w.practice ? 'れんしゅう' : w.overtime ? 'えんちょう!' : 'のこり', t.x + 18, t.y + labelSize * 0.9, {
      size: labelSize,
      fill: w.overtime ? C.fever : C.gold,
      align: 'left',
      width: 4,
    });
    const left = Math.ceil(w.left);
    const urgent = left <= 5 && !w.overtime;
    c.save();
    c.translate(t.x + t.w - 18, t.y + t.h * 0.64);
    const tp = 1 + this.timerPop * 0.25;
    c.scale(tp, tp);
    const ts = t.h * 0.52;
    outlined(c, w.overtime || w.practice ? '♪' : `${left}`, 0, 0, { size: ts, font: popFont(ts), align: 'right', fill: urgent ? '#ff8a8a' : C.white, width: 7 });
    c.restore();
    // 時間のバー
    const prog = Math.min(1, w.time / BALANCE.duration);
    roundRect(c, t.x + 16, t.y + t.h - 13, t.w - 32, 6, 3);
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fill();
    roundRect(c, t.x + 16, t.y + t.h - 13, (t.w - 32) * (1 - prog), 6, 3);
    c.fillStyle = urgent ? '#ff8a8a' : C.gold;
    c.fill();

    this.drawChain(c);
    this.drawGauge(c);

    // ポーズ
    const pb = L.pauseBtn;
    roundRect(c, pb.x, pb.y, pb.w, pb.h, 16);
    c.fillStyle = C.panel;
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.3)';
    c.lineWidth = 2.5;
    c.stroke();
    c.fillStyle = C.white;
    const bw = pb.w * 0.13;
    c.fillRect(pb.x + pb.w * 0.33, pb.y + pb.h * 0.28, bw, pb.h * 0.44);
    c.fillRect(pb.x + pb.w * 0.67 - bw, pb.y + pb.h * 0.28, bw, pb.h * 0.44);
  }

  private drawChain(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    const r = L.chain;
    const on = w.chain >= 2;
    c.save();
    c.globalAlpha = on ? 1 : 0.5;
    this.panel(c, r);
    const cx = r.x + 16;
    const cy = r.y + r.h * 0.46;
    const size = Math.min(r.h * 0.5, 34);
    const pop = 1 + this.chainPop * 0.2;
    c.save();
    c.translate(cx, cy);
    c.scale(pop, pop);
    outlined(c, `${on ? w.chain : 0}`, 0, 0, { size, font: popFont(size), align: 'left', width: 6 });
    c.font = popFont(size);
    const nw = c.measureText(`${on ? w.chain : 0}`).width;
    outlined(c, 'れんぞく', nw + 6, size * 0.12, { size: size * 0.5, align: 'left', fill: '#e5dcff', width: 4 });
    c.restore();
    const mult = w.multiplier;
    const ms = size * 0.72;
    outlined(c, `×${mult.toFixed(1)}`, r.x + r.w - 14, cy, { size: ms, font: popFont(ms), align: 'right', fill: mult > 1 ? C.gold : '#cfc4e6', width: 5 });
    // れんぞくが切れるまで
    if (on) {
      const k = Math.max(0, 1 - (w.time - w.lastCatch) / BALANCE.chain.window);
      roundRect(c, r.x + 16, r.y + r.h - 12, (r.w - 32) * k, 5, 2.5);
      c.fillStyle = k < 0.3 ? '#ff9a8a' : '#9fdcf5';
      c.fill();
    }
    c.restore();
  }

  private drawGauge(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    const r = L.gauge;
    const fever = w.fever > 0;
    this.panel(c, r, fever);
    const labelSize = L.portrait ? 16 : 18;
    if (!L.portrait) outlined(c, fever ? 'フィーバー!!' : 'フィーバーゲージ', r.x + 16, r.y + labelSize * 0.95, { size: labelSize, fill: fever ? C.fever : C.gold, align: 'left', width: 4 });
    const top = L.portrait ? r.y : r.y + labelSize * 1.6;
    const ht = r.y + r.h - top;
    const x0 = r.x + 14;
    const wd = r.w - 28;
    if (fever) {
      const k = w.fever / w.feverLen;
      const by = top + ht * 0.5 - 11;
      roundRect(c, x0, by, wd, 22, 11);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fill();
      const g = c.createLinearGradient(x0, 0, x0 + wd, 0);
      const ph = (this.t * 0.6) % 1;
      ['#ff7ac8', '#ffb86b', '#ffe66b', '#8de08a', '#7fd0f0', '#b48cf0'].forEach((col, i) => g.addColorStop(((i / 6 + ph) % 1), col));
      roundRect(c, x0, by, wd * k, 22, 11);
      c.fillStyle = g;
      c.fill();
      if (L.portrait) outlined(c, 'フィーバー!!', x0 + wd / 2, by + 11, { size: 18, fill: C.white, stroke: '#9c2a6a', width: 4 });
      return;
    }
    const n = w.feverNeed;
    const slot = Math.min(ht * 0.82, wd / n - 6);
    const gap = (wd - slot * n) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const cx = x0 + slot / 2 + i * (slot + gap);
      const cy = top + ht * 0.48;
      const filled = i < w.gauge;
      c.beginPath();
      c.arc(cx, cy, slot * 0.46, 0, Math.PI * 2);
      c.fillStyle = filled ? 'rgba(255, 200, 150, 0.25)' : 'rgba(0, 0, 0, 0.25)';
      c.fill();
      c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      c.lineWidth = 2;
      c.setLineDash(filled ? [] : [4, 4]);
      c.stroke();
      c.setLineDash([]);
      if (filled) {
        const pop = 1 + (this.gaugePop[i] ?? 0) * 0.5;
        drawItem(c, 'mokaron', cx, cy, slot * 0.4 * pop, { t: 0, phase: 0, id: 0 });
      }
    }
  }

  private drawHints(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const w = this.world;
    if (this.hintMove && !this.moved && w.time < 6 && this.inputEnabled) {
      const text = this.touchUI ? '指で左右にドラッグして うごく' : '← → キー / マウスで うごく';
      const a = 0.6 + 0.4 * Math.sin(this.t * 5);
      c.save();
      c.globalAlpha = a;
      outlined(c, text, L.field.x + L.field.w / 2, L.ground - L.headR * 3.3, { size: L.portrait ? 26 : 26, fill: C.white, width: 6 });
      c.restore();
    }
    if (this.hintComfort && w.crying && !w.over) {
      const s = L.spiki;
      const text = this.touchUI ? 'スピキを タップで なぐさめて!' : 'Space キーで なぐさめて!';
      const size = L.portrait ? 20 : 20;
      const y = s.feet + s.r * 0.75;
      const a = 0.7 + 0.3 * Math.sin(this.t * 6);
      c.save();
      c.globalAlpha = a;
      c.font = font(size);
      const tw = c.measureText(text).width;
      const x = Math.min(L.w - tw / 2 - 10, s.x);
      outlined(c, text, x, y, { size, fill: '#bff0ff', width: 5 });
      c.restore();
    }
  }

  /** れんしゅうの説明（上のほう）と、スピキを指す矢印・押すキー */
  private drawCoach(c: CanvasRenderingContext2D): void {
    const co = this.coach;
    if (!co) return;
    const L = this.L;
    const f = L.field;
    // 縦画面は全体が縮んで見えるので、大きめに出す
    const k = L.portrait ? 1.45 : Math.min(1, f.w / 420);
    c.save();
    c.font = popFont(22 * k);
    const tw = Math.max(c.measureText(co.text).width, co.sub ? (c.measureText(co.sub).width * 15) / 22 : 0);
    const w = Math.min(f.w - 16, tw + 48 * k);
    const h = (co.sub ? 78 : 56) * k;
    const x = f.x + (f.w - w) / 2;
    const y = f.y + 12 * k;
    roundRect(c, x, y, w, h, 18 * k);
    c.fillStyle = 'rgba(40, 20, 70, 0.9)';
    c.fill();
    c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    c.lineWidth = 2.5;
    c.stroke();
    // 何ステップ目か
    outlined(c, `れんしゅう ${co.step}/5`, x + 14 * k, y - 2 * k, { size: 13 * k, fill: C.gold, align: 'left', width: 4 });
    outlined(c, co.text, f.x + f.w / 2, y + 30 * k, { size: 22 * k, font: popFont(22 * k), fill: C.white, width: 6 });
    if (co.sub) outlined(c, co.sub, f.x + f.w / 2, y + 58 * k, { size: 14 * k, fill: '#d9cdf0', width: 4 });
    c.restore();
    if (!co.spiki) return;
    // スピキの上で はずむ矢印。PC はその下に押すキー
    const s = L.spiki;
    const a = L.portrait ? 1.4 : 1;
    const bob = Math.sin(this.t * 7) * 6 * a;
    c.save();
    c.translate(s.x, s.y - s.r * 2.1 + bob);
    c.scale(a, a);
    c.beginPath();
    c.moveTo(0, 18);
    c.lineTo(-16, -4);
    c.lineTo(-6, -4);
    c.lineTo(-6, -22);
    c.lineTo(6, -22);
    c.lineTo(6, -4);
    c.lineTo(16, -4);
    c.closePath();
    c.fillStyle = C.gold;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 3;
    c.stroke();
    c.restore();
    c.save();
    const label = co.key ?? 'タップ!';
    const size = 18 * a;
    c.font = popFont(size);
    const lw = c.measureText(label).width + 24 * a;
    const lh = 32 * a;
    const ly = s.feet + 8;
    const lx = Math.min(L.w - lw / 2 - 8, s.x);
    roundRect(c, lx - lw / 2, ly, lw, lh, (co.key ? 8 : 16) * a);
    c.fillStyle = co.key ? '#f4efe6' : C.pink;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 3;
    c.stroke();
    outlined(c, label, lx, ly + lh / 2 + 1, { size, font: popFont(size), fill: co.key ? C.ink : C.white, stroke: co.key ? '#fff' : C.ink, width: co.key ? 3 : 5 });
    c.restore();
  }

  private drawToast(c: CanvasRenderingContext2D): void {
    const ts = this.toasts[0];
    if (!ts) return;
    const L = this.L;
    const f = L.field;
    const k = Math.min(1, f.w / 420);
    // 上から すっと出て、少しとまって、上へもどる
    const inK = Math.min(1, ts.t / 0.25);
    const outK = Math.max(0, (ts.t - (TOAST - 0.3)) / 0.3);
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const y = f.y + 14 * k - (1 - ease(inK) + ease(outK)) * 40 * k;
    const head = 'ミッション クリア!';
    c.save();
    c.globalAlpha = Math.min(ease(inK), 1 - outK);
    c.font = font(17 * k);
    const tw = Math.max(c.measureText(ts.text).width, c.measureText(head).width * 1.2);
    const w = Math.min(f.w - 24, tw + 44 * k);
    const h = 58 * k;
    const x = f.x + (f.w - w) / 2;
    roundRect(c, x, y, w, h, h / 2);
    c.fillStyle = 'rgba(40, 20, 70, 0.92)';
    c.fill();
    c.strokeStyle = C.gold;
    c.lineWidth = 3;
    c.stroke();
    outlined(c, head, f.x + f.w / 2, y + h * 0.36, { size: 19 * k, font: popFont(19 * k), fill: C.gold, width: 5 });
    outlined(c, ts.text, f.x + f.w / 2, y + h * 0.74, { size: 15 * k, fill: C.white, width: 4 });
    c.restore();
  }

  private drawBanners(c: CanvasRenderingContext2D): void {
    const L = this.L;
    const f = L.field;
    const k = Math.min(1, f.w / 820);
    for (const b of this.banners) {
      const p = b.t / b.max;
      const inT = Math.min(1, b.t / 0.18);
      const scale = (inT < 1 ? 0.4 + inT * 0.75 : 1.15 - Math.min(0.15, (b.t - 0.18) * 0.6)) * k;
      c.save();
      c.globalAlpha = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
      c.translate(f.x + f.w / 2, f.y + f.h * 0.36);
      c.scale(scale, scale);
      c.rotate(-0.04);
      outlined(c, b.text, 0, 0, { size: b.size, font: popFont(b.size), fill: b.color, stroke: C.ink, width: b.size * 0.2 });
      if (b.sub) outlined(c, b.sub, 0, b.size * 0.85, { size: b.size * 0.36, fill: C.white, width: 6 });
      c.restore();
    }
  }
}
