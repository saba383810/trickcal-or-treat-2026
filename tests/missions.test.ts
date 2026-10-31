import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MISSIONS, MISSION_SLOTS, activeMissions, judgeMissions, type Play } from '../src/config/missions';
import { DAILY_RULES, NIGHT, dailyRule, dailySeed, nightOpen } from '../src/config/rules';
import { World, type Stats } from '../src/sim/world';
import { loadSave, type SaveData } from '../src/storage';

function stats(more: Partial<Stats> = {}): Stats {
  return {
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
    ...more,
  };
}

function play(more: Partial<Play> = {}): Play {
  return { char: 'kommy', course: 'normal', score: 0, stats: stats(), ...more };
}

describe('今夜のおかし', () => {
  it('ルールは日付で順番に回る', () => {
    const days = Array.from({ length: DAILY_RULES.length }, (_, i) => dailyRule(`2026-11-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(days).size).toBe(DAILY_RULES.length);
  });

  it('となりの日はちがうルールで、同じ日は同じたね', () => {
    expect(dailyRule('2026-11-01')).not.toBe(dailyRule('2026-11-02'));
    expect(DAILY_RULES).toContain(dailyRule('2026-11-01'));
    expect(dailySeed('2026-11-01')).toBe(dailySeed('2026-11-01'));
    expect(dailySeed('2026-11-01')).not.toBe(dailySeed('2026-11-02'));
  });

  it('同じ日・同じキャラなら、最初のお菓子は同じところに降る', () => {
    const first = () => {
      const w = new World('elfin', dailySeed('2026-11-01'), 0.8, dailyRule('2026-11-01'));
      while (w.items.length === 0) w.update(1 / 60);
      return w.items.map((it) => [it.kind, it.x]);
    };
    expect(first()).toEqual(first());
  });
});

describe('ルール', () => {
  it('まよなかは速く落ちて、点が多い', () => {
    const normal = new World('kommy', 1);
    const night = new World('kommy', 1, 0.8, NIGHT);
    expect(night.fallTime('candy')).toBeCloseTo(normal.fallTime('candy') * NIGHT.fall!);
  });

  it('フィーバーに必要なモカロンは 2 こより減らない', () => {
    const w = new World('yomi', 1, 0.8, { id: 't', name: 't', note: '', feverNeed: -9 });
    expect(w.feverNeed).toBe(2);
  });

  it('まよなかは、ふつうでランク S を取るとあそべる', () => {
    expect(nightOpen({ kommy: 'A' })).toBe(false);
    expect(nightOpen({ kommy: 'A', elfin: 'S' })).toBe(true);
  });
});

describe('おねがい', () => {
  let save: SaveData;
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => {} } });
    save = loadSave();
  });

  it('id が重ならない', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });

  it('リストの順に 3 つずつ出る', () => {
    expect(activeMissions(save).map((m) => m.id)).toEqual(MISSIONS.slice(0, MISSION_SLOTS).map((m) => m.id));
  });

  it('たっせいすると次が出て、ごほうびのおかしが足される', () => {
    const before = save.sweets;
    const cleared = judgeMissions(save, play({ stats: stats({ caught: { candy: 20, star: 0, mokaron: 0, shucaron: 0, hobagi: 0 } }) }));
    expect(cleared.map((m) => m.id)).toEqual(['first', 'candy15']);
    expect(save.sweets - before).toBe(40);
    expect(activeMissions(save).map((m) => m.id)).toEqual(['comfort1', 'fever1', 'chain20']);
  });

  it('いまのおねがいでないものは、できていても数えない', () => {
    judgeMissions(save, play({ stats: stats({ maxChain: 999, fevers: 9 }) }));
    expect(save.missions).toEqual(['first']);
  });

  it('とどかなかった時は、さいこう記録を残す', () => {
    save.missions = ['first'];
    judgeMissions(save, play({ stats: stats({ caught: { candy: 9, star: 0, mokaron: 0, shucaron: 0, hobagi: 0 } }) }));
    expect(save.missionBest.candy15).toBe(9);
    judgeMissions(save, play({ stats: stats({ caught: { candy: 4, star: 0, mokaron: 0, shucaron: 0, hobagi: 0 } }) }));
    expect(save.missionBest.candy15).toBe(9);
  });

  it('キャラ・コースの決まりがあるおねがいは、そのキャラ・コースでだけ数える', () => {
    const elfin = MISSIONS.findIndex((m) => m.id === 'elfinStar');
    save.missions = MISSIONS.slice(0, elfin).map((m) => m.id);
    const many = stats({ caught: { candy: 0, star: 30, mokaron: 0, shucaron: 0, hobagi: 0 } });
    judgeMissions(save, play({ char: 'kommy', stats: many }));
    expect(save.missions).not.toContain('elfinStar');
    judgeMissions(save, play({ char: 'elfin', stats: many }));
    expect(save.missions).toContain('elfinStar');
  });

  it('記録で数えるおねがい（何人で遊んだか）', () => {
    const i = MISSIONS.findIndex((m) => m.id === 'chars2');
    save.missions = MISSIONS.slice(0, i).map((m) => m.id);
    save.charPlays = { kommy: 3 };
    judgeMissions(save, play());
    expect(save.missions).not.toContain('chars2');
    save.charPlays.butter = 1;
    judgeMissions(save, play());
    expect(save.missions).toContain('chars2');
  });
});
