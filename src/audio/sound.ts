// 効果音はすべて WebAudio で合成する（公式の音声・効果音は使わない）。

/** 操作しても AudioContext が動かないまま、これだけ経ったら作り直す（ms） */
const STUCK_MS = 1500;

export class Sound {
  ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  bgmGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  sfxVolume = 0.8;
  bgmVolume = 0.5;
  muted = false;
  /** 操作しても AudioContext が動かないままになった時刻（0 = 動いている） */
  private stuckSince = 0;
  /** 画面を離れて戻ってきた（次の操作で AudioContext を作り直す） */
  private revive = false;

  /**
   * ユーザー操作の中で呼ぶ（自動再生制限・iOS 対策）。
   * 別のアプリから戻った後の最初の操作では、AudioContext を作り直す
   * （iOS は 'running' と言いながら鳴らないままのことがあり、状態では見分けられない）。
   * 画面にいたまま止まった時（電話・アラームなど）は操作のたびに起こし直し、それでも STUCK_MS 戻らなければ作り直す
   */
  unlock(): AudioContext | null {
    if (this.revive) {
      this.revive = false;
      this.reset();
    }
    if (this.ctx && this.ctx.state !== 'running') {
      const now = performance.now();
      if (this.ctx.state === 'closed' || (this.stuckSince && now - this.stuckSince > STUCK_MS)) this.reset();
      else if (!this.stuckSince) this.stuckSince = now;
    }
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
      const master = this.ctx.createGain();
      master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain.connect(master);
      this.bgmGain.connect(master);
      this.applyVolume();
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.silence();
    }
    if (this.ctx.state === 'running') {
      this.stuckSince = 0;
    } else {
      this.silence();
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  /** 画面を離れる時に止める */
  sleep(): void {
    this.stuckSince = 0;
    if (this.ctx) this.revive = true;
    void this.ctx?.suspend().catch(() => undefined);
  }

  /** 画面に戻った時に起こす（操作を待たずに戻る端末向け。戻らなくても、次の unlock で作り直す） */
  wake(): void {
    void this.ctx?.resume().catch(() => undefined);
  }

  /** iOS: 操作の中で無音を鳴らして解禁する */
  private silence(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  }

  /** 固まった AudioContext を捨てる（呼んだ unlock の中で作り直す。BGM は新しい時計から刻み直す） */
  private reset(): void {
    const old = this.ctx;
    this.ctx = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.noiseBuf = null;
    this.stuckSince = 0;
    void old?.close().catch(() => undefined);
  }

  applyVolume(): void {
    if (!this.sfxGain || !this.bgmGain) return;
    this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
    this.bgmGain.gain.value = this.muted ? 0 : this.bgmVolume * 0.55;
  }

  // ---------------------------------------------------------------- 部品

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; to?: number; vol?: number; at?: number; attack?: number } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime + (opts.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, opts: { freq?: number; to?: number; q?: number; vol?: number; at?: number; type?: BiquadFilterType } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noiseBuf || this.muted) return;
    const t = ctx.currentTime + (opts.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private bell(freq: number, at = 0, vol = 0.22, dur = 0.6): void {
    this.tone(freq, dur, { at, vol, type: 'sine' });
    this.tone(freq * 2.01, dur * 0.5, { at, vol: vol * 0.35, type: 'sine' });
  }

  // ---------------------------------------------------------------- 効果音

  click(): void {
    this.tone(900, 0.05, { type: 'triangle', vol: 0.15 });
  }

  /** キャンディ。れんぞくが伸びるほど音が上がる（ドレミの音階で 2 オクターブ） */
  catchCandy(chain: number): void {
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const i = Math.min(chain - 1, 20);
    const semi = scale[i % 7] + 12 * Math.floor(i / 7);
    const f = 523 * Math.pow(2, semi / 12);
    this.tone(f, 0.09, { type: 'triangle', vol: 0.17 });
    this.tone(f * 2, 0.06, { type: 'sine', vol: 0.06, at: 0.02 });
  }

  catchStar(chain: number): void {
    this.catchCandy(chain);
    this.bell(1568, 0.04, 0.1, 0.4);
    this.bell(2093, 0.1, 0.08, 0.4);
  }

  /** モカロン: ゲージがたまる「ぽこん」 */
  catchMokaron(filled: number): void {
    this.tone(392, 0.12, { to: 784, type: 'sine', vol: 0.26 });
    this.bell(784 * Math.pow(2, filled / 12) * 1.5, 0.08, 0.13, 0.5);
  }

  catchShucaron(i: number): void {
    const f = [1046, 1175, 1318, 1568, 1760][i % 5];
    this.tone(f, 0.12, { type: 'triangle', vol: 0.13 });
    this.bell(f * 2, 0.03, 0.06, 0.3);
  }

  /** ホバギが頭に「ごちん」 */
  bonk(): void {
    this.tone(180, 0.18, { to: 90, type: 'square', vol: 0.12 });
    this.noise(0.12, { type: 'lowpass', freq: 600, vol: 0.25 });
    [1318, 1568, 1318].forEach((f, i) => this.tone(f, 0.07, { type: 'sine', vol: 0.06, at: 0.12 + i * 0.07 }));
  }

  /** バターのほうたいで「ぼよん」 */
  guard(): void {
    this.tone(150, 0.25, { to: 420, type: 'sine', vol: 0.3 });
    this.tone(300, 0.2, { to: 600, type: 'triangle', vol: 0.08, at: 0.05 });
  }

  /** ジョアンが「ちゅーっ」と吸う */
  slurp(): void {
    this.noise(0.35, { freq: 900, to: 2600, q: 6, vol: 0.18 });
    this.tone(600, 0.3, { to: 1200, type: 'sine', vol: 0.08 });
    this.tone(880, 0.12, { type: 'triangle', vol: 0.12, at: 0.34 });
  }

  /** ホバギが地面に「どすん」 */
  thud(): void {
    this.tone(110, 0.2, { to: 55, type: 'sine', vol: 0.32 });
    this.noise(0.15, { type: 'lowpass', freq: 380, vol: 0.2 });
  }

  /** お菓子が地面に落ちた */
  miss(): void {
    this.tone(500, 0.08, { to: 300, type: 'sine', vol: 0.06 });
  }

  /** スピキが泣く「うあーん」（泣きレベルで高く） */
  wail(level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const base = 520 + level * 70;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 1.35, t + 0.18);
    osc.frequency.linearRampToValueAtTime(base * 1.1, t + 0.4);
    osc.frequency.linearRampToValueAtTime(base * 1.25, t + 0.55);
    osc.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.8);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const depth = ctx.createGain();
    depth.gain.value = base * 0.04;
    lfo.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.05);
    g.gain.setValueAtTime(0.14, t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.9);
    lfo.start(t);
    lfo.stop(t + 0.9);
  }

  /** なぐさめた「チョワヨ!」: 明るい鈴 */
  comfort(level: number): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.bell(f, i * 0.06, 0.12, 0.5));
    if (level >= 3) [2093, 2637].forEach((f, i) => this.bell(f, 0.3 + i * 0.08, 0.1, 0.6));
  }

  /** おかえしを投げる「ぽい」 */
  toss(): void {
    this.tone(700, 0.06, { to: 1100, type: 'sine', vol: 0.08 });
  }

  /** スピキが自分で泣き止んだ（おかえしなし） */
  sniff(): void {
    this.tone(420, 0.1, { to: 360, type: 'sine', vol: 0.08 });
    this.tone(400, 0.12, { to: 330, type: 'sine', vol: 0.08, at: 0.14 });
  }

  chainTier(mult: number): void {
    const f = 660 * (1 + (mult - 1) * 0.8);
    [f, f * 1.25, f * 1.5].forEach((x, i) => this.tone(x, 0.1, { type: 'square', vol: 0.06, at: i * 0.05 }));
  }

  chainBreak(): void {
    this.tone(392, 0.16, { to: 262, type: 'triangle', vol: 0.12 });
  }

  /** フィーバー: 駆け上がって、鈴がきらめく */
  feverStart(): void {
    [523, 659, 784, 988, 1175, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.13, at: i * 0.045 }));
    [1568, 2093, 2637].forEach((f, i) => this.bell(f, 0.4 + i * 0.08, 0.12, 0.6));
    this.noise(0.9, { freq: 9000, q: 2, vol: 0.05, at: 0.2, type: 'highpass' });
  }

  feverEnd(): void {
    [1319, 1047, 784].forEach((f, i) => this.bell(f, i * 0.1, 0.1, 0.5));
  }

  /** ミッションをクリアした（ゲームの途中） */
  mission(): void {
    [1318, 1760].forEach((f, i) => this.bell(f, i * 0.09, 0.11, 0.5));
  }

  lastSpurt(): void {
    [659, 784, 659, 988].forEach((f, i) => this.tone(f, 0.1, { type: 'square', vol: 0.08, at: i * 0.09 }));
  }

  countdown(go: boolean): void {
    if (go) {
      this.tone(1046, 0.4, { type: 'square', vol: 0.12 });
      this.tone(1568, 0.4, { type: 'triangle', vol: 0.15 });
    } else {
      this.tone(784, 0.12, { type: 'square', vol: 0.1 });
    }
  }

  tick(): void {
    this.tone(1200, 0.03, { type: 'square', vol: 0.05 });
  }

  timeUp(): void {
    for (let i = 0; i < 6; i++) this.tone(i % 2 ? 1760 : 1568, 0.07, { type: 'sine', vol: 0.18, at: i * 0.07 });
    this.tone(1568, 0.5, { type: 'sine', vol: 0.18, at: 0.42 });
  }

  /** リザルトのランクの判子 */
  rank(good: boolean): void {
    this.noise(0.1, { type: 'lowpass', freq: 700, vol: 0.3 });
    if (good) [1046, 1318, 1568, 2093].forEach((f, i) => this.bell(f, 0.05 + i * 0.07, 0.12, 0.6));
  }

  fanfare(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.16, at: i * 0.1 }));
    this.tone(1046, 0.8, { type: 'triangle', vol: 0.16, at: 0.45 });
    this.tone(1318, 0.8, { type: 'triangle', vol: 0.12, at: 0.45 });
  }

  /** つまんだ「むに」 */
  mochiGrab(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(185, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.3, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
    this.noise(0.07, { type: 'lowpass', freq: 500, vol: 0.1 });
  }

  /** 離した「ぷるん」。揺れと同じ周波数のトレモロで音もぷるぷるさせる */
  mochiRelease(intensity: number, freqHz: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted || intensity < 0.05) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.3);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.12 + 0.3 * intensity, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    const trem = ctx.createGain();
    trem.gain.setValueAtTime(1, t);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = freqHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    osc.connect(env).connect(trem).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);
    lfo.start(t);
    lfo.stop(t + 0.45);
  }
}
