import { afterEach, describe, expect, it, vi } from 'vitest';
import { World } from '../src/sim/world';
import { loadSave } from '../src/storage';
import { Tutorial } from '../src/tutorial';

describe('れんしゅう', () => {
  it('うごく → キャッチ → よける → なぐさめる → おかえし で おわる（時間切れにはならない）', () => {
    const w = new World('kommy', 1);
    const t = new Tutorial(w, () => true);
    const run = (sec: number, aim?: () => void) => {
      for (let i = 0; i < sec * 60 && !t.finished; i++) {
        aim?.();
        w.update(1 / 60);
        t.update(1 / 60);
      }
    };
    w.input.target = 0;
    run(2);
    w.input.target = 1;
    run(2);
    expect(t.coach.step).toBe(2);
    // お菓子の下へ
    run(30, () => {
      if (w.items[0]) w.input.target = w.items[0].x;
    });
    expect(t.coach.step).toBe(3);
    // ホバギは よける
    run(30, () => {
      if (w.items[0]) w.input.target = w.items[0].x > 0.5 ? 0 : 1;
    });
    expect(t.coach.step).toBe(4);
    // なぐさめるまで 泣きやまない
    run(20);
    expect(w.spiki.level).toBeGreaterThan(0);
    expect(w.comfort()).toBe(true);
    run(20, () => {
      const gift = w.items.find((it) => it.gift);
      if (gift) w.input.target = gift.x;
    });
    expect(t.finished).toBe(true);
    expect(w.over).toBe(false);
    expect(w.time).toBeGreaterThan(60);
  });

  it('PC は Space、スマホは タップを うながす', () => {
    let touch = true;
    const w = new World('kommy', 1);
    const t = new Tutorial(w, () => touch);
    (t as unknown as { enter(s: string): void }).enter('comfort');
    expect(t.coach.text).toContain('タップ');
    expect(t.coach.key).toBeUndefined();
    touch = false;
    expect(t.coach.text).toContain('Space');
    expect(t.coach.key).toBe('Space');
  });
});

describe('れんしゅうの記録', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (raw: string | null) => vi.stubGlobal('window', { localStorage: { getItem: () => raw, setItem: () => {} } });

  it('はじめての人は、れんしゅうから', () => {
    stub(null);
    expect(loadSave().tutorialDone).toBe(false);
  });

  it('前の版で もう遊んでいた人には、出さない', () => {
    stub(JSON.stringify({ plays: 3 }));
    expect(loadSave().tutorialDone).toBe(true);
    stub(JSON.stringify({ plays: 0 }));
    expect(loadSave().tutorialDone).toBe(false);
  });
});
