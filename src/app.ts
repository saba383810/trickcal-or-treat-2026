import { Bgm } from './audio/bgm';
import { Sound } from './audio/sound';
import { rankOf, RANKS, type RankId } from './config/balance';
import type { CharId } from './config/characters';
import { activeMissions, fits, judgeMissions, playValue, type Mission, type Play } from './config/missions';
import { dailySeed, dayKey, dayLabel, nightOpen, ruleOf, type CourseId } from './config/rules';
import { World } from './sim/world';
import { Tutorial } from './tutorial';
import { loadSave, writeSave, type SaveData } from './storage';
import { capture, h } from './ui/dom';
import { charSelect, howToPanel, missionsPanel, pausePanel, recordsPanel, resultPanel, settingsPanel, titleScreen, type MenuHost } from './ui/menus';
import { SceneCache, drawLiveDecor } from './view/draw/scene';
import { outlined } from './view/draw/ui';
import { GameView } from './view/gameView';
import { makeLayout } from './view/layout';
import { C, popFont } from './view/palette';
import { Screen, pageZoom } from './view/screen';

type Mode = 'menu' | 'countdown' | 'playing' | 'paused' | 'closing' | 'result';

/** シミュレーションの固定刻み */
const STEP = 1 / 60;
const COUNTDOWN = 3;
/** 時間切れからけっかを出すまで */
const CLOSING = 2.2;

export class App implements MenuHost {
  readonly save: SaveData = loadSave();
  readonly sound = new Sound();
  private bgm = new Bgm(this.sound);
  private screen: Screen;
  private ui: HTMLElement;
  private mode: Mode = 'menu';
  private pausedFrom: Mode = 'playing';
  private charId: CharId = this.save.lastChar;
  private course: CourseId = this.save.lastCourse;
  /** 遊び始めた日（今夜のおかしは、遊んでいる途中で日付が変わってもその日の分） */
  private day = dayKey();
  /** 途中でクリアが分かるミッションと、もうお知らせしたもの */
  private liveMissions: Mission[] = [];
  private toasted = new Set<string>();
  /** れんしゅう中（終わったら同じキャラ・コースで本番） */
  private tutorial: Tutorial | null = null;
  private world: World | null = null;
  private view: GameView | null = null;
  private scene = new SceneCache();
  private acc = 0;
  private last = 0;
  private timer = 0;
  private menuT = 0;
  /** 開発用: 自動で遊ぶボット（?dev=play&bot） */
  private devBot: { step(): void } | null = null;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.screen = new Screen(canvas);
    this.ui = ui;
    this.sound.sfxVolume = this.save.sfxVolume;
    this.sound.bgmVolume = this.save.bgmVolume;
    this.sound.muted = this.save.muted;
    this.bindInput(canvas);
    void document.fonts?.load(popFont(40), '0123456789スタートフィーバー').catch(() => {});
    this.goTitle();
    requestAnimationFrame((t) => {
      this.last = t;
      requestAnimationFrame(this.frame);
    });
  }

  persist(): void {
    writeSave(this.save);
  }

  // ================================================================= 画面遷移

  private show(el: HTMLElement): void {
    const layer = h('div', { class: 'layer' }, el);
    this.ui.replaceChildren(layer);
    el.querySelector<HTMLButtonElement>('.btn.primary')?.focus({ preventScroll: true });
  }

  private clearUi(): void {
    this.ui.replaceChildren();
  }

  private toMenu(): void {
    this.mode = 'menu';
    this.world = null;
    this.view = null;
    this.bgm.mode = 'title';
    this.startBgm();
  }

  goTitle(): void {
    this.toMenu();
    this.show(
      titleScreen(this, {
        start: () => this.goSelect(),
        howTo: () => this.showHowTo(() => this.goTitle(), () => this.startTutorial(this.save.lastChar, 'normal')),
        records: () => this.show(recordsPanel(this, { close: () => this.goTitle() })),
        missions: () => this.show(missionsPanel(this, { close: () => this.goTitle() })),
        settings: () => this.show(settingsPanel(this, { close: () => this.goTitle() })),
      }),
    );
  }

  private goSelect(): void {
    this.toMenu();
    this.show(charSelect(this, { pick: (id, course) => this.start(id, course), back: () => this.goTitle() }));
  }

  private showHowTo(back: () => void, practice?: () => void): void {
    this.show(howToPanel(this, { close: back, practice }));
  }

  private start(id: CharId, course: CourseId = this.course): void {
    if (!this.save.tutorialDone) return this.startTutorial(id, course);
    this.tutorial = null;
    this.clearUi();
    this.charId = id;
    this.course = course;
    this.day = dayKey();
    const seed = course === 'daily' ? dailySeed(this.day) : (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    const world = new World(id, seed, undefined, ruleOf(course, this.day));
    this.liveMissions = activeMissions(this.save).filter((m) => m.live && fits(m, id, course));
    this.toasted.clear();
    const view = new GameView(world, id, this.screen, this.sound, this.bgm, this.scene);
    view.onPause = () => this.pause();
    view.hintComfort = this.save.comforts < 3;
    view.hintMove = this.save.plays < 3;
    view.fx.reduced = this.save.calm;
    this.world = world;
    this.view = view;
    this.acc = 0;
    this.mode = 'countdown';
    this.timer = COUNTDOWN;
    this.bgm.stop();
    this.sound.countdown(false);
  }

  /** れんしゅう。カウントダウンなしで始めて、終わったら本番へ */
  private startTutorial(id: CharId, course: CourseId): void {
    this.clearUi();
    this.charId = id;
    this.course = course;
    const world = new World(id, (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
    const view = new GameView(world, id, this.screen, this.sound, this.bgm, this.scene);
    const tutorial = new Tutorial(world, () => view.touchUI);
    view.onPause = () => this.pause();
    view.hintComfort = false;
    view.hintMove = false;
    view.fx.reduced = this.save.calm;
    view.coach = tutorial.coach;
    view.enable();
    this.world = world;
    this.view = view;
    this.tutorial = tutorial;
    this.liveMissions = [];
    this.acc = 0;
    this.mode = 'playing';
    this.bgm.mode = 'normal';
    this.startBgm();
  }

  private endTutorial(): void {
    this.save.tutorialDone = true;
    this.persist();
    this.tutorial = null;
    this.bgm.stop();
    this.start(this.charId, this.course);
  }

  private pause(): void {
    if (this.mode !== 'playing' && this.mode !== 'countdown') return;
    this.pausedFrom = this.mode;
    this.mode = 'paused';
    this.view?.cancelInput();
    this.bgm.stop();
    this.showPause();
  }

  private showPause(): void {
    this.show(
      pausePanel(this, this.tutorial ? null : this.play(this.world!), {
        resume: () => this.resume(),
        skip: this.tutorial ? () => this.endTutorial() : undefined,
        retry: () => this.start(this.charId, this.course),
        select: () => this.goSelect(),
        howTo: () => this.showHowTo(() => this.showPause()),
      }),
    );
  }

  private resume(): void {
    if (this.mode !== 'paused') return;
    this.clearUi();
    this.mode = this.pausedFrom;
    if (this.mode === 'playing') this.startBgm();
  }

  private play(w: World): Play {
    return { char: this.charId, course: this.course, score: w.score, stats: w.stats };
  }

  /** このコースの記録（今夜のおかしは、その日の分） */
  private records(): { best: Partial<Record<CharId, number>>; rank?: Partial<Record<CharId, RankId>> } {
    const save = this.save;
    if (this.course === 'night') return save.night;
    if (this.course === 'daily') {
      if (save.daily.day !== this.day) {
        save.daily = { day: this.day, best: {} };
        save.dailyDays++;
      }
      return save.daily;
    }
    return save;
  }

  /** 遊んでいる途中でクリアしたミッションを、ゲームの画面でお知らせする */
  private checkLiveMissions(): void {
    const w = this.world!;
    for (const m of this.liveMissions) {
      if (this.toasted.has(m.id) || playValue(m, this.play(w)) < m.goal) continue;
      this.toasted.add(m.id);
      this.view?.toast(m.text);
    }
  }

  private showResult(): void {
    const w = this.world!;
    const id = this.charId;
    const save = this.save;
    const wasNight = nightOpen(save.rank);
    const rec = this.records();
    const prevBest = rec.best[id] ?? 0;
    const prevSweets = save.sweets;
    const st = w.stats;
    const sweets = st.caught.candy + st.caught.star + st.caught.mokaron + st.caught.shucaron;
    rec.best[id] = Math.max(prevBest, w.score);
    const rank = rankOf(w.score);
    if (rec.rank) {
      const prevRank = rec.rank[id];
      const order = RANKS.map((r) => r.id as string);
      if (!prevRank || order.indexOf(rank) < order.indexOf(prevRank)) rec.rank[id] = rank;
    }
    save.plays++;
    save.charPlays[id] = (save.charPlays[id] ?? 0) + 1;
    save.sweets += sweets;
    save.comforts += st.comforts;
    const before = activeMissions(save).map((m) => m.id);
    const cleared = judgeMissions(save, this.play(w));
    this.persist();
    this.mode = 'result';
    this.bgm.mode = 'title';
    this.startBgm();
    this.show(
      resultPanel(
        this,
        { world: w, charId: id, course: this.course, day: this.day, prevBest, prevSweets, sweets, before, cleared, nightNew: !wasNight && nightOpen(save.rank) },
        {
          retry: () => this.start(id, this.course),
          select: () => this.goSelect(),
          title: () => this.goTitle(),
        },
      ),
    );
  }

  /**
   * 開発用: URL の ?dev=select|howto|settings|records|missions|tutorial|pause|play|result で画面を飛ばす（スクリーンショットの確認用）。
   * play は &char= &course=daily|night &t=（その秒まで進める） &cry=（スピキの泣きレベル） &fever &bot（ボットが遊ぶ）
   * tutorial は &step=catch|dodge|comfort|gifts|done（そのステップから）
   */
  devJump(q: URLSearchParams, makeBot: (w: World) => { step(): void }): void {
    const dev = q.get('dev');
    const id = (q.get('char') as CharId | null) ?? this.save.lastChar;
    const course = q.get('course') as CourseId | null;
    if (course) this.save.lastCourse = this.course = course;
    if (dev === 'select') return this.goSelect();
    if (dev === 'howto') return this.showHowTo(() => this.goTitle());
    if (dev === 'settings') return this.show(settingsPanel(this, { close: () => this.goTitle() }));
    if (dev === 'records') return this.show(recordsPanel(this, { close: () => this.goTitle() }));
    if (dev === 'missions') return this.show(missionsPanel(this, { close: () => this.goTitle() }));
    if (dev === 'tutorial') {
      this.startTutorial(id, this.course);
      const step = q.get('step');
      if (step) (this.tutorial as unknown as { enter(s: string): void }).enter(step);
      if (step === 'comfort') {
        this.world!.spiki.level = 1;
        this.world!.spiki.cry = 3;
      }
      return;
    }
    this.start(id);
    const w = this.world!;
    const view = this.view!;
    const bot = makeBot(w);
    const t = Number(q.get('t') ?? 8);
    while (w.time < t && !w.over) {
      bot.step();
      w.update(STEP);
      view.update(STEP);
    }
    if (q.has('fever')) (w as unknown as { startFever(): void }).startFever();
    if (q.has('cry')) {
      w.spiki.level = Number(q.get('cry'));
      w.spiki.cry = 3;
    }
    this.mode = 'playing';
    view.enable();
    this.bgm.mode = 'normal';
    if (q.has('bot')) this.devBot = bot;
    if (dev === 'pause') this.pause();
    if (dev === 'result') {
      while (!w.over) {
        bot.step();
        w.update(STEP);
      }
      view.update(STEP);
      this.showResult();
    }
  }

  // ===================================================================== 入力

  private unlockAudio(): void {
    this.sound.unlock();
    if (!this.bgm.playing && (this.mode === 'menu' || this.mode === 'playing' || this.mode === 'result')) this.startBgm();
  }

  private startBgm(): void {
    if (this.sound.ctx) this.bgm.play(this.bgm.mode);
  }

  private get inGame(): boolean {
    return this.mode === 'playing' || this.mode === 'countdown';
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    // 音の解禁はユーザー操作の中で行う。タッチは pointerdown では解禁されない端末があるので離した時にも試す
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
      document.addEventListener(type, () => this.unlockAudio(), { capture: true });
    }

    canvas.addEventListener('pointerdown', (e) => {
      const view = this.view;
      if (!view || !this.inGame) return;
      e.preventDefault();
      // 指が画面の外へ出ても追い続ける（もう離れた指だと投げるので無視）
      if (e.pointerType !== 'mouse') capture(canvas, e.pointerId);
      view.pointerDown(e.pointerId, this.screen.toLogical(e.clientX, e.clientY), e.pointerType);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.inGame) return;
      this.view?.pointerMove(e.pointerId, this.screen.toLogical(e.clientX, e.clientY), e.pointerType);
    });
    const up = (e: PointerEvent) => this.view?.pointerUp(e.pointerId);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('pointercancel', (e) => this.view?.pointerCancel(e.pointerId));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;
      if (this.mode === 'paused') {
        if (!e.repeat && (key === 'Escape' || key === 'p' || key === 'P')) {
          e.preventDefault();
          this.resume();
        }
        return;
      }
      const view = this.view;
      if (!view || !this.inGame) return;
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      if (view.keyDown(e)) {
        e.preventDefault();
        return;
      }
      if (key === 'Escape' || key === 'p' || key === 'P') {
        e.preventDefault();
        this.pause();
      }
    });
    window.addEventListener('keyup', (e) => this.view?.keyUp(e));

    const onResize = () => {
      this.screen.resize();
      this.view?.relayout();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    // ピンチでページを拡大・縮小した時は resize が来ないので、拡大率が変わったら描き直す
    let zoom = pageZoom();
    let zoomTimer = 0;
    const onZoom = () => {
      clearTimeout(zoomTimer);
      zoomTimer = window.setTimeout(() => {
        if (pageZoom() === zoom) return;
        zoom = pageZoom();
        onResize();
      }, 200);
    };
    window.visualViewport?.addEventListener('resize', onZoom);
    try {
      if (window.top && window.top !== window) window.top.visualViewport?.addEventListener('resize', onZoom);
    } catch {
      // 別オリジンのフレームの中では外側を読めない
    }
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // タブを離れたら自動でポーズ
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
        this.bgm.stop();
        this.sound.sleep();
      } else {
        this.sound.wake();
      }
    });
    window.addEventListener('blur', () => this.pause());
  }

  // =================================================================== ループ

  private frame = (now: number): void => {
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.tick(dt);
    requestAnimationFrame(this.frame);
  };

  private tick(dt: number): void {
    const view = this.view;
    const world = this.world;
    switch (this.mode) {
      case 'menu':
        this.menuT += dt;
        this.drawBackdrop();
        return;
      case 'countdown': {
        const before = Math.ceil(this.timer);
        this.timer -= dt;
        const after = Math.ceil(this.timer);
        if (this.timer <= 0) {
          this.mode = 'playing';
          view!.enable();
          view!.banner('スタート!', C.gold, 1.0, 84);
          this.sound.countdown(true);
          this.bgm.mode = 'normal';
          this.startBgm();
        } else if (after !== before) this.sound.countdown(false);
        break;
      }
      case 'playing':
        this.acc += dt;
        while (this.acc >= STEP) {
          this.devBot?.step();
          world!.update(STEP);
          this.tutorial?.update(STEP);
          this.acc -= STEP;
        }
        this.checkLiveMissions();
        if (this.tutorial) {
          view!.coach = this.tutorial.coach;
          if (this.tutorial.finished) return this.endTutorial();
        }
        if (world!.over) {
          this.mode = 'closing';
          this.timer = CLOSING;
          view!.disable();
          this.bgm.stop();
        }
        break;
      case 'closing':
        this.timer -= dt;
        if (this.timer <= 0) this.showResult();
        break;
      case 'paused':
        view?.render();
        return;
      case 'result':
        break;
    }
    if (!view) return;
    view.update(dt);
    view.render();
    if (this.mode === 'countdown') this.drawCountdown();
  }

  private drawCountdown(): void {
    const scr = this.screen;
    const c = scr.ctx;
    scr.begin();
    const n = Math.ceil(this.timer);
    const p = 1 - (this.timer - (n - 1));
    const s = 1.4 - Math.min(1, p * 4) * 0.4;
    const f = this.view!.L.field;
    c.save();
    c.globalAlpha = Math.min(1, (1 - p) * 4);
    c.translate(f.x + f.w / 2, f.y + f.h * 0.4);
    c.scale(s, s);
    outlined(c, String(n), 0, 0, { size: 150, font: popFont(150), fill: C.white, stroke: C.ink, width: 26 });
    c.restore();
    // 今夜のおかし・まよなかは、ルールを出しておく
    if (this.course === 'normal') return;
    const rule = ruleOf(this.course, this.day);
    const k = Math.min(1, f.w / 420);
    const title = this.course === 'daily' ? `今夜のおかし ${dayLabel(this.day)}「${rule.name}」` : '「まよなか」モード';
    outlined(c, title, f.x + f.w / 2, f.y + f.h * 0.4 + 120 * k, { size: 30 * k, font: popFont(30 * k), fill: this.course === 'night' ? '#c9b6ff' : C.gold, width: 7 });
    outlined(c, rule.note, f.x + f.w / 2, f.y + f.h * 0.4 + 160 * k, { size: 18 * k, fill: C.white, width: 5 });
  }

  /** メニューの後ろの、おばけの国の夜景 */
  private drawBackdrop(): void {
    const scr = this.screen;
    const c = scr.ctx;
    const L = makeLayout(scr.w, scr.h, scr.portrait);
    const back = this.scene.ensure(L, scr.pixelRatio);
    scr.clear('#1a1331');
    scr.begin();
    c.drawImage(back, 0, 0, L.w, L.h);
    drawLiveDecor(c, L, this.menuT, 0);
    c.fillStyle = 'rgba(20, 10, 40, 0.35)';
    c.fillRect(0, 0, L.w, L.h);
  }
}
