import { describe, expect, it, vi } from 'vitest';
import { clearedSave, loadSave } from '../src/storage';

describe('データを消す', () => {
  it('遊んだ記録は はじめにもどし、音・画面のゆれ・言語の設定は残す', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => {} } });
    const fresh = loadSave();
    vi.unstubAllGlobals();
    const old = {
      ...fresh,
      best: { kommy: 9000 },
      plays: 12,
      missions: ['rankB'],
      lines: ['kommy.good'],
      tutorialDone: true,
      cheek: { pulls: 30, big: 3, sulks: 2, by: { spiki: 5 } },
      lastChar: 'yomi' as const,
      sfxVolume: 0.3,
      bgmVolume: 0.1,
      muted: true,
      calm: true,
      lang: 'ko' as const,
    };
    expect(clearedSave(old)).toEqual({ ...fresh, sfxVolume: 0.3, bgmVolume: 0.1, muted: true, calm: true, lang: 'ko' });
    // もとの記録は書きかえない（app が Object.assign で入れかえる）
    expect(old.plays).toBe(12);
  });
});
