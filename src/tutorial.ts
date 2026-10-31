// はじめて遊ぶ時の、実際に動かしてみるれんしゅう。
// 動く → お菓子を 3 こキャッチ → ホバギをよける → 泣いたスピキをなぐさめる → おかえしをキャッチ → 本番へ。
// お菓子はここから 1 こずつ降らせ、時間切れにはならない（World.practice）。
import { BALANCE } from './config/balance';
import type { World } from './sim/world';

type Step = 'move' | 'catch' | 'dodge' | 'comfort' | 'gifts' | 'done';

/** 画面に出す説明。spiki = スピキを指す / key = PC で押すキー */
export interface Coach {
  step: number;
  text: string;
  sub?: string;
  spiki?: boolean;
  key?: string;
}

/** 数えるステップ（done はおまけ） */
const STEPS = 5;
/** どれだけ動いたら次へ（フィールドの幅に対する割合の合計） */
const MOVE_GOAL = 0.8;
const CATCH_GOAL = 3;

export class Tutorial {
  finished = false;
  private step: Step = 'move';
  private t = 0;
  private wait = 0;
  private moved = 0;
  private lastX: number;
  private base = { candy: 0, cries: 0, hits: 0 };
  private missed = false;

  constructor(
    private world: World,
    /** スマホ（タップ）か PC（キー）か。説明の言い方を変える */
    private touch: () => boolean,
  ) {
    world.practice = true;
    this.lastX = world.player.x;
  }

  update(dt: number): void {
    const w = this.world;
    const st = w.stats;
    this.t += dt;
    switch (this.step) {
      case 'move':
        this.moved += Math.abs(w.player.x - this.lastX);
        this.lastX = w.player.x;
        if (this.moved >= MOVE_GOAL) this.enter('catch');
        break;
      case 'catch':
        if (st.caught.candy - this.base.candy >= CATCH_GOAL) this.enter('dodge');
        // 1 こずつ。プレイヤーから少しはなれたところへ
        else this.drop(dt, () => w.spawn({ at: w.time, kind: 'candy', x: w.player.x > 0.5 ? w.rng.range(0.15, 0.4) : w.rng.range(0.6, 0.85) }));
        break;
      case 'dodge':
        if (st.cries > this.base.cries) this.enter('comfort');
        else {
          if (st.hits > this.base.hits) {
            this.base.hits = st.hits;
            this.missed = true;
          }
          // 立っているところへ落とす（よけないと当たる）
          this.drop(dt, () => w.spawn({ at: w.time, kind: 'hobagi', x: Math.min(0.85, Math.max(0.15, w.player.x)) }), 0.8);
        }
        break;
      case 'comfort':
        // なぐさめるまで泣きやまない
        w.spiki.cry = BALANCE.spiki.cry;
        if (st.comforts > 0) this.enter('gifts');
        break;
      case 'gifts':
        if (this.t > 0.8 && !w.items.some((it) => it.gift)) this.enter('done');
        break;
      case 'done':
        if (this.t > 2) this.finished = true;
        break;
    }
  }

  /** 画面にお菓子がなければ、少し待ってから 1 こ降らせる */
  private drop(dt: number, spawn: () => void, delay = 0.35): void {
    if (this.world.items.length) {
      this.wait = delay;
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) spawn();
  }

  private enter(step: Step): void {
    const st = this.world.stats;
    this.step = step;
    this.t = 0;
    this.wait = 0.6;
    this.base = { candy: st.caught.candy, cries: st.cries, hits: st.hits };
  }

  get coach(): Coach {
    const touch = this.touch();
    const got = Math.min(CATCH_GOAL, this.world.stats.caught.candy - this.base.candy);
    switch (this.step) {
      case 'move':
        return {
          step: 1,
          text: touch ? '画面を 左右にドラッグして うごこう' : '← → キー か マウスで うごこう',
          sub: 'まずは れんしゅう！（ポーズから とばせます）',
        };
      case 'catch':
        return { step: 2, text: `おかしを 頭で キャッチ！（${got}/${CATCH_GOAL}）`, sub: 'つづけて取ると れんぞくで 点が ふえるよ' };
      case 'dodge':
        return {
          step: 3,
          text: this.missed ? 'あたっちゃった！ もう一回 よけよう' : 'かぼちゃ（ホバギ）は よけよう！',
          sub: '落ちる先に 影が出るよ。よけると スピキが泣いちゃう',
        };
      case 'comfort':
        return {
          step: 4,
          text: touch ? '泣いている スピキを タップ！' : 'Space キーで スピキを なぐさめよう！',
          sub: touch ? 'ほっぺを 引っぱって 離すと おかえしが +1' : 'スピキを クリックしても なぐさめられるよ',
          spiki: true,
          key: touch ? undefined : 'Space',
        };
      case 'gifts':
        return { step: 5, text: 'おかえしだ！ キャッチしよう', sub: 'もっと泣かせてから なぐさめると、おかえしが ふえるよ' };
      case 'done':
        return { step: STEPS, text: 'じゅんび OK！ 本番 スタート！', sub: `モカロンを ${this.world.feverNeed}こ 集めると フィーバー！` };
    }
  }
}
