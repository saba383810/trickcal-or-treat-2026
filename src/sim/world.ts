// ゲームの中身（描画や DOM に触らない）。ボットのシミュレーションと単体テストからも同じものを動かす。
import { BALANCE, chainMultiplier, lerp2, type ItemKind } from '../config/balance';
import { CHARACTERS, DRAIN_FREEZE, type CharDef, type CharId } from '../config/characters';
import { NORMAL, type Rule } from '../config/rules';
import { normalPattern, feverX, type Spawn } from './patterns';
import { Rng } from './rng';

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 下向きの加速度（ホバギの重さ・投げたおかえしの放物線） */
  ay: number;
  /** 出てからの秒数 */
  age: number;
  /** スピキのおかえし */
  gift: boolean;
  /** 見た目の位相（揺れ・回転をばらけさせる） */
  phase: number;
  /** キャッチの高さを過ぎた（もう取れない） */
  passed: boolean;
  /** 取られた・地面に落ちた */
  done: boolean;
}

export type GameEvent =
  | { type: 'catch'; kind: ItemKind; x: number; y: number; pts: number; chain: number; gift: boolean }
  | { type: 'hit'; x: number; y: number; pts: number; guarded: boolean }
  | { type: 'drain'; x: number; y: number }
  | { type: 'land'; kind: ItemKind; x: number }
  | { type: 'chainBreak'; chain: number }
  | { type: 'chainTier'; mult: number }
  | { type: 'gauge'; value: number }
  | { type: 'spikiCry'; level: number }
  | { type: 'spikiCalm' }
  | { type: 'comfort'; level: number; gifts: number }
  | { type: 'feverStart' }
  | { type: 'feverEnd' }
  | { type: 'lastSpurt' }
  | { type: 'tick'; left: number }
  | { type: 'timeUp' };

export interface Stats {
  caught: Record<ItemKind, number>;
  /** ホバギに当たった数（バターのガード・ジョアンの吸うも含む） */
  hits: number;
  /** 地面に落ちたホバギの数（スピキを泣かせた数） */
  cries: number;
  comforts: number;
  /** なぐさめた時の泣きレベルのさいだい */
  maxComfort: number;
  /** おかえしで取った数 */
  gifts: number;
  fevers: number;
  maxChain: number;
  /** フィーバー中に稼いだ点 */
  feverScore: number;
  /** 出てきたお菓子（ホバギ以外）の数 */
  spawned: number;
}

export interface PlayerState {
  x: number;
  v: number;
  /** ひるみの残り秒 */
  stun: number;
  /** 動けない残り秒（ジョアンが吸っている間） */
  freeze: number;
  /** 向いている側 */
  face: -1 | 1;
}

export interface Input {
  /** キー操作の向き（-1 / 0 / 1） */
  dir: number;
  /** 指・カーソルの x（null ならキー操作） */
  target: number | null;
}

export class World {
  readonly char: CharDef;
  readonly rng: Rng;
  /** コースのルール（今夜のおかし・まよなか） */
  readonly rule: Rule;
  /** れんしゅう（チュートリアル）: お菓子は外から降らせ、時間切れにならない */
  practice = false;
  /** キャッチの高さ（キャラの頭の中心。縦の正規化座標）。画面の縦横比で変わる（遊んでいる途中に画面を回したら変える） */
  catchY: number;
  time = 0;
  over = false;
  score = 0;
  chain = 0;
  lastCatch = -99;
  gauge = 0;
  /** フィーバーの残り秒（0 ならふつう） */
  fever = 0;
  /** このフィーバーの長さ */
  feverLen = 0;
  /** フィーバーが始まってからの秒 */
  feverT = 0;
  readonly player: PlayerState = { x: 0.5, v: 0, stun: 0, freeze: 0, face: 1 };
  readonly input: Input = { dir: 0, target: null };
  items: Item[] = [];
  readonly spiki = { level: 0, cry: 0, happy: 0 };
  readonly stats: Stats = {
    caught: { candy: 0, star: 0, mokaron: 0, shucaron: 0, hobagi: 0 },
    hits: 0,
    cries: 0,
    comforts: 0,
    maxComfort: 0,
    gifts: 0,
    fevers: 0,
    maxChain: 0,
    feverScore: 0,
    spawned: 0,
  };
  events: GameEvent[] = [];
  private queue: Spawn[] = [];
  private nextBeat = 0.9;
  private nextMokaron: number = BALANCE.firstMokaron;
  private nextFever = 0;
  private nextId = 1;
  private spurtShown = false;
  private lastTick = 99;

  constructor(charId: CharId, seed: number, catchY = 0.8, rule: Rule = NORMAL) {
    this.char = CHARACTERS[charId];
    this.rng = new Rng(seed);
    this.catchY = catchY;
    this.rule = rule;
  }

  /** 残り秒（フィーバーで延長中は 0） */
  get left(): number {
    if (this.practice) return BALANCE.duration;
    return Math.max(0, BALANCE.duration - this.time);
  }

  /** 進み具合 0〜1 */
  get progress(): number {
    if (this.practice) return 0;
    return Math.min(1, this.time / BALANCE.duration);
  }

  get spurt(): boolean {
    return this.left <= BALANCE.lastSpurt;
  }

  /** 時間切れのあと、フィーバーが終わるまで延長している */
  get overtime(): boolean {
    return !this.practice && this.time >= BALANCE.duration && this.fever > 0;
  }

  get feverNeed(): number {
    return Math.max(2, (this.char.feverNeed ?? BALANCE.fever.need) + (this.rule.feverNeed ?? 0));
  }

  get multiplier(): number {
    return chainMultiplier(this.chain, this.rule.chainStep);
  }

  /** キャッチの半幅 */
  get reach(): number {
    return BALANCE.player.reach * this.char.reach * (this.fever > 0 ? BALANCE.fever.reach : 1);
  }

  /** ホバギに当たる半幅（体の幅。コミーの鎌の長さでは当たらない） */
  get body(): number {
    return BALANCE.player.reach * 0.7;
  }

  /** 上端からキャッチの高さまでの秒数 */
  fallTime(kind: ItemKind): number {
    return lerp2(BALANCE.fall[kind], this.progress) * (this.rule.fall ?? 1);
  }

  update(dt: number): void {
    if (this.over) return;
    this.time += dt;
    this.updatePlayer(dt);
    this.direct();
    this.moveItems(dt);
    this.updateSpiki(dt);
    this.updateFever(dt);
    this.updateChain();
    this.updateClock();
  }

  // ---------------------------------------------------------------- プレイヤー

  private updatePlayer(dt: number): void {
    const p = this.player;
    const B = BALANCE.player;
    p.stun = Math.max(0, p.stun - dt);
    p.freeze = Math.max(0, p.freeze - dt);
    let maxV = B.speed * this.char.speed;
    const accel = B.accel * this.char.accel;
    if (p.stun > 0) maxV *= BALANCE.stunSpeed;
    if (p.freeze > 0) maxV = 0;
    let want: number;
    const target = this.input.target;
    if (target !== null) {
      // 指・カーソルへ。すべるキャラも行きすぎないよう、止まれる速さまでに抑える
      const d = target - p.x;
      const s = Math.min(maxV, Math.abs(d) * B.follow, Math.sqrt(2 * accel * Math.abs(d) * 0.9));
      want = Math.sign(d) * s;
    } else {
      want = Math.max(-1, Math.min(1, this.input.dir)) * maxV;
    }
    const step = accel * dt * (Math.sign(want) !== Math.sign(p.v) && p.v !== 0 ? 1.15 : 1);
    p.v += Math.max(-step, Math.min(step, want - p.v));
    p.x += p.v * dt;
    const e = BALANCE.edge;
    if (p.x < e) {
      p.x = e;
      p.v = Math.max(0, p.v);
    } else if (p.x > 1 - e) {
      p.x = 1 - e;
      p.v = Math.min(0, p.v);
    }
    if (Math.abs(p.v) > 0.06) p.face = p.v > 0 ? 1 : -1;
  }

  // ---------------------------------------------------------------- 降らせる

  /** パターンの予約を時間どおりに出し、次のパターンとモカロンを決める */
  private direct(): void {
    const playing = this.time < BALANCE.duration && !this.practice;
    if (this.fever > 0 && !this.practice) {
      if (this.time >= this.nextFever) {
        const x = feverX(this.feverT, this.rng, this.feverLen);
        this.spawn({ at: this.time, kind: 'shucaron', x });
        this.nextFever = this.time + BALANCE.fever.interval;
      }
    } else if (playing) {
      if (this.time >= this.nextBeat) {
        const u = this.progress;
        const len = normalPattern(this, this.time, (s) => this.queue.push(s));
        const gap = lerp2(BALANCE.gap, u) * (this.spurt ? BALANCE.spurtGap : 1) * (this.rule.gap ?? 1);
        this.nextBeat = this.time + len + gap;
      }
      if (this.time >= this.nextMokaron) {
        this.queueMokaron();
        this.nextMokaron = this.time + this.rng.range(BALANCE.mokaronEvery[0], BALANCE.mokaronEvery[1]);
      }
    }
    if (this.queue.length === 0) return;
    const due: Spawn[] = [];
    this.queue = this.queue.filter((s) => {
      if (s.at > this.time) return true;
      due.push(s);
      return false;
    });
    for (const s of due) this.spawn(s);
  }

  /** モカロン。半分はプレイヤーから遠い側に置いて「走る」判断を作る。後半はホバギが付き添うことも */
  private queueMokaron(): void {
    const p = this.player.x;
    let x: number;
    if (this.rng.next() < 0.5) {
      const far = p < 0.5 ? this.rng.range(0.62, 0.9) : this.rng.range(0.1, 0.38);
      x = far;
    } else x = this.rng.range(0.1, 0.9);
    this.queue.push({ at: this.time, kind: 'mokaron', x });
    if (this.progress > 0.35 && this.rng.next() < Math.min(0.8, 0.35 * (this.rule.hobagi ?? 1))) {
      const side = x < 0.5 ? 1 : -1;
      this.queue.push({ at: this.time + 0.25, kind: 'hobagi', x: clampX(x + side * 0.1) });
    }
  }

  spawn(s: Spawn): void {
    let kind = s.kind;
    // フィーバー中はぜんぶシューカロン（おかえしも）
    if (this.fever > 0) kind = 'shucaron';
    const T = this.fallTime(kind);
    const y = s.y ?? -0.04;
    let vy = s.vy ?? this.catchY / T;
    let ay = s.ay ?? 0;
    if (kind === 'hobagi' && s.vy === undefined) {
      vy = (BALANCE.hobagiStart * this.catchY) / T;
      ay = (2 * (this.catchY - vy * T)) / (T * T);
    }
    if (kind !== 'hobagi') this.stats.spawned++;
    this.items.push({
      id: this.nextId++,
      kind,
      x: s.x,
      y,
      vx: s.vx ?? 0,
      vy,
      ay,
      age: 0,
      gift: s.gift === true,
      phase: this.rng.next() * Math.PI * 2,
      passed: false,
      done: false,
    });
  }

  // ---------------------------------------------------------------- 落とす・取る

  private moveItems(dt: number): void {
    const p = this.player;
    const band = BALANCE.band;
    for (const it of this.items) {
      if (it.done) continue;
      it.age += dt;
      it.vy += it.ay * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      if (it.x < 0.02 || it.x > 0.98) {
        it.x = Math.max(0.02, Math.min(0.98, it.x));
        it.vx = -it.vx * 0.5;
      }
      if (!it.passed && it.y >= this.catchY - band.above) {
        if (it.y > this.catchY + band.below) it.passed = true;
        else this.touch(it, p);
      }
      if (!it.done && it.y >= 1) {
        it.done = true;
        this.land(it);
      }
    }
    this.items = this.items.filter((it) => !it.done);
  }

  private touch(it: Item, p: PlayerState): void {
    const dx = Math.abs(it.x - p.x);
    const r = BALANCE.radius[it.kind];
    if (it.kind === 'hobagi') {
      if (dx > this.body + r || p.stun > 0) return;
      it.done = true;
      this.hitHobagi(it);
      return;
    }
    if (dx > this.reach + r || p.stun > 0) return;
    it.done = true;
    this.catchItem(it);
  }

  private catchItem(it: Item): void {
    if (this.time - this.lastCatch > BALANCE.chain.window) this.chain = 0;
    const before = this.multiplier;
    this.chain++;
    this.lastCatch = this.time;
    this.stats.maxChain = Math.max(this.stats.maxChain, this.chain);
    const mult = this.multiplier;
    const pts = Math.round((BALANCE.points[it.kind] + (this.char.bonus?.[it.kind] ?? 0)) * mult * (this.rule.points ?? 1));
    this.score += pts;
    if (this.fever > 0) this.stats.feverScore += pts;
    this.stats.caught[it.kind]++;
    if (it.gift) this.stats.gifts++;
    this.events.push({ type: 'catch', kind: it.kind, x: it.x, y: it.y, pts, chain: this.chain, gift: it.gift });
    if (mult > before) this.events.push({ type: 'chainTier', mult });
    if (it.kind === 'mokaron') this.addGauge();
  }

  private addGauge(): void {
    if (this.fever > 0) return;
    this.gauge++;
    this.events.push({ type: 'gauge', value: this.gauge });
    if (this.gauge >= this.feverNeed) this.startFever();
  }

  private hitHobagi(it: Item): void {
    const p = this.player;
    this.stats.hits++;
    switch (this.char.hobagi) {
      case 'drain':
        // ジョアン: ちゅーっと吸ってゲージにする（減点なし。吸う間は止まる。れんぞくは切れも延びもしない）
        p.freeze = DRAIN_FREEZE;
        this.stats.caught.hobagi++;
        this.events.push({ type: 'drain', x: it.x, y: it.y });
        this.addGauge();
        return;
      case 'guard': {
        // バター: ほうたいで受けて、ひるまない。減点は半分、れんぞくもそのまま
        const pts = Math.round((BALANCE.points.hobagi / 2) * (this.rule.points ?? 1));
        this.score = Math.max(0, this.score + pts);
        this.events.push({ type: 'hit', x: it.x, y: it.y, pts, guarded: true });
        return;
      }
      case 'hit': {
        const pts = Math.round(BALANCE.points.hobagi * (this.rule.points ?? 1));
        this.score = Math.max(0, this.score + pts);
        p.stun = BALANCE.stun;
        this.events.push({ type: 'hit', x: it.x, y: it.y, pts, guarded: false });
        this.breakChain();
      }
    }
  }

  private land(it: Item): void {
    this.events.push({ type: 'land', kind: it.kind, x: it.x });
    if (it.kind !== 'hobagi') return;
    // よけたホバギが地面に落ちると、スピッキーが泣いてスピキになる（泣いている間に落ちると、もっと泣く）
    const s = this.spiki;
    s.level = Math.min(BALANCE.spiki.maxLevel, s.level + 1);
    s.cry = BALANCE.spiki.cry;
    s.happy = 0;
    this.stats.cries++;
    this.events.push({ type: 'spikiCry', level: s.level });
  }

  private breakChain(): void {
    if (this.chain > 0) this.events.push({ type: 'chainBreak', chain: this.chain });
    this.chain = 0;
    this.lastCatch = -99;
  }

  private updateChain(): void {
    if (this.chain > 0 && this.time - this.lastCatch > BALANCE.chain.window) this.breakChain();
  }

  // ---------------------------------------------------------------- スピキ

  private updateSpiki(dt: number): void {
    const s = this.spiki;
    if (s.happy > 0) s.happy = Math.max(0, s.happy - dt);
    if (s.level > 0) {
      s.cry -= dt;
      if (s.cry <= 0) {
        s.level = 0;
        s.cry = 0;
        this.events.push({ type: 'spikiCalm' });
      }
    }
  }

  /** 泣いているスピキ */
  get crying(): boolean {
    return this.spiki.level > 0;
  }

  /**
   * なぐさめる（タップ・ほっぺを引っぱって離した・↑キー）。泣いていれば泣き止んで、泣きレベルに応じた
   * おかえしをプレイヤーの近くへ投げてくれる。extra = ほっぺをむにーっと伸ばしてから離した時に増える数。泣いていなければ何もしない
   */
  /** 泣きレベルごとのおかえしの数（ほっぺを伸ばした分は入らない） */
  giftCount(level: number): number {
    return Math.round(BALANCE.spiki.gift[level] * (this.rule.gift ?? 1));
  }

  comfort(extra = 0): boolean {
    const s = this.spiki;
    if (s.level <= 0 || this.over) return false;
    const S = BALANCE.spiki;
    const level = s.level;
    const n = this.giftCount(level) + extra;
    const mok = S.giftMokaron[level];
    // モカロンはおかえしの真ん中あたりに混ぜる
    const mokAt = new Set<number>();
    for (let i = 0; i < mok; i++) mokAt.add(Math.floor(((i + 1) * n) / (mok + 1)));
    const p = this.player.x;
    for (let i = 0; i < n; i++) {
      const T = this.rng.range(S.flight[0], S.flight[1]);
      // プレイヤーのまわりに、左右へ扇のように散らす
      const spread = n <= 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(0.55, 0.12 * n);
      const tx = clampX(p + spread + this.rng.range(-0.04, 0.04));
      const g = 1.4;
      const y0 = S.y;
      const vy = (this.catchY - y0 - 0.5 * g * T * T) / T;
      const kind: ItemKind = mokAt.has(i) ? 'mokaron' : 'star';
      this.queue.push({ at: this.time + i * S.throwGap, kind, x: S.x, y: y0, vx: (tx - S.x) / T, vy, ay: g, gift: true });
    }
    s.level = 0;
    s.cry = 0;
    s.happy = S.happy;
    this.stats.comforts++;
    this.stats.maxComfort = Math.max(this.stats.maxComfort, level);
    this.events.push({ type: 'comfort', level, gifts: n });
    return true;
  }

  // ---------------------------------------------------------------- フィーバー

  private startFever(): void {
    const F = BALANCE.fever;
    this.feverLen = (F.duration + (this.char.feverBonus ?? 0)) * (this.rule.feverLen ?? 1);
    this.fever = this.feverLen;
    this.feverT = 0;
    this.gauge = 0;
    this.stats.fevers++;
    this.nextFever = this.time;
    // 画面にあるものはぜんぶシューカロンに（ホバギも）。予約していたふつうのお菓子はやめる（おかえしは残す）
    const T = this.fallTime('shucaron');
    for (const it of this.items) {
      if (it.done || it.passed) continue;
      it.kind = 'shucaron';
      if (!it.gift) {
        it.vy = this.catchY / T;
        it.ay = 0;
      }
    }
    this.queue = this.queue.filter((s) => s.gift);
    this.events.push({ type: 'feverStart' });
  }

  private updateFever(dt: number): void {
    if (this.fever <= 0) return;
    this.feverT += dt;
    this.fever -= dt;
    if (this.fever > 0) return;
    this.fever = 0;
    this.events.push({ type: 'feverEnd' });
    this.nextBeat = this.time + BALANCE.fever.breath;
    this.nextMokaron = Math.max(this.nextMokaron, this.time + BALANCE.fever.breath + 1.2);
  }

  // ---------------------------------------------------------------- 時計

  private updateClock(): void {
    if (this.practice) return;
    const left = this.left;
    if (!this.spurtShown && left <= BALANCE.lastSpurt && this.time < BALANCE.duration) {
      this.spurtShown = true;
      this.events.push({ type: 'lastSpurt' });
    }
    const sec = Math.ceil(left);
    if (sec <= 5 && sec >= 1 && sec < this.lastTick) {
      this.lastTick = sec;
      this.events.push({ type: 'tick', left: sec });
    }
    if (this.time >= BALANCE.duration && this.fever <= 0) {
      this.over = true;
      this.events.push({ type: 'timeUp' });
    }
  }

  /** イベントを受け取って空にする */
  drain(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

export function clampX(x: number): number {
  return Math.max(0.07, Math.min(0.93, x));
}
