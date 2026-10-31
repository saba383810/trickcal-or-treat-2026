import { afterEach, describe, expect, it, vi } from 'vitest';
import { MISSIONS, missionText } from '../src/config/missions';
import { DAILY_RULES, NIGHT, NORMAL, ruleText } from '../src/config/rules';
import { LANGS, num, setLang, T } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { ko } from '../src/i18n/ko';
import { loadSave } from '../src/storage';

/** 形だけ取り出す（文言は捨てて、キー・配列の長さ・関数かどうかを残す） */
function shape(v: unknown): unknown {
  if (typeof v === 'function') return 'function';
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]));
  return typeof v;
}

describe('言語', () => {
  afterEach(() => setLang('ja'));

  it.each([
    ['ko', ko],
    ['en', en],
  ])('%s は ja と同じ形（キーも関数も配列の長さも）', (_, s) => {
    expect(shape(s)).toEqual(shape(ja));
  });

  it('ミッションとルールは、ぜんぶ文がある', () => {
    for (const m of MISSIONS) expect(missionText(m), m.id).not.toBe(m.id);
    expect(missionText(MISSIONS.find((m) => m.id === 'rankB')!)).toBe('ランク B を とる（3,000点）');
    for (const r of [NORMAL, NIGHT, ...DAILY_RULES]) expect(ruleText(r).note, r.id).toBeTruthy();
  });

  it('切り替えると、import した T も 切り替わる', () => {
    setLang('en');
    expect(T.locale).toBe('en-US');
    expect(num(12345.4)).toBe('12,345');
    setLang('ja');
    expect(T).toBe(ja);
    expect(LANGS).toEqual(['ja', 'ko', 'en']);
  });

  it('保存: 前の版の記録や 知らない言語は、まだ選んでいないことにする', () => {
    const stub = (raw: string | null) => vi.stubGlobal('window', { localStorage: { getItem: () => raw, setItem: () => {} } });
    stub(null);
    expect(loadSave().lang).toBeNull();
    stub(JSON.stringify({ plays: 3 }));
    expect(loadSave().lang).toBeNull();
    stub(JSON.stringify({ lang: 'fr' }));
    expect(loadSave().lang).toBeNull();
    stub(JSON.stringify({ lang: 'ko' }));
    expect(loadSave().lang).toBe('ko');
    vi.unstubAllGlobals();
  });
});
