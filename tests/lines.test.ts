import { describe, expect, it } from 'vitest';
import { CHAR_ORDER } from '../src/config/characters';
import { RESULT_LINE_IDS, lineKey, pickResultLine, pinchReaction, resultHint, resultText, talkLine } from '../src/config/lines';
import type { Play } from '../src/config/missions';
import { ja } from '../src/i18n/ja';
import type { Stats } from '../src/sim/world';

function play(more: Partial<Play> = {}, st: Partial<Stats> = {}): Play {
  const stats: Stats = {
    caught: { candy: 0, star: 0, mokaron: 0, shucaron: 0, hobagi: 0 },
    hits: 1,
    cries: 0,
    comforts: 0,
    maxComfort: 0,
    gifts: 0,
    fevers: 0,
    maxChain: 0,
    feverScore: 0,
    spawned: 0,
    ...st,
  };
  return { char: 'kommy', course: 'normal', score: 4000, stats, ...more };
}

/** そのキャラが話すセリフ ぜんぶ（日本語。T ははじめ ja） */
function spoken(id: (typeof CHAR_ORDER)[number]): string[] {
  const tx = ja.chars[id];
  const talk = (['fever', 'spurt', 'chain', 'hit', 'skill'] as const).flatMap((k) => [0, 0.99].map((r) => talkLine(id, k, undefined, () => r) ?? ''));
  const pinch = [0, 0.99].map((r) => pinchReaction(id, () => r).text);
  return [tx.hello, ...RESULT_LINE_IDS.map((l) => resultText(id, l)), ...talk, ...pinch].filter(Boolean);
}

describe('結果のセリフ', () => {
  it('5人 ぜんいん、ぜんぶの種類に セリフと ヒントがある', () => {
    for (const id of CHAR_ORDER)
      for (const l of RESULT_LINE_IDS) {
        expect(resultText(id, l), lineKey(id, l)).toBeTruthy();
        expect(resultHint(id, l), lineKey(id, l)).toBeTruthy();
      }
  });

  it('何も合わなければ、ランクで決まる いつものセリフ', () => {
    expect(pickResultLine([], play({ score: 4000 }), 'B')).toMatchObject({ key: 'kommy.ok', isNew: true });
    expect(pickResultLine([], play({ score: 2000 }), 'C').key).toBe('kommy.bad');
  });

  it('合うもののうち、まだ見ていないものを先に出す', () => {
    const p = play({ char: 'butter', score: 9000 }, { hits: 7, fevers: 3 });
    expect(pickResultLine([], p, 'S').key).toBe('butter.skill');
    expect(pickResultLine(['butter.skill'], p, 'S').key).toBe('butter.fever3');
    const seen = ['butter.skill', 'butter.fever3', 'butter.good'];
    const again = pickResultLine(seen, p, 'S', () => 0);
    expect(seen).toContain(again.key);
    expect(again.isNew).toBe(false);
  });

  it('キャラの性能のセリフは、そのキャラの決まりで出る', () => {
    expect(pickResultLine([], play({ char: 'joanne' }, { caught: { candy: 0, star: 0, mokaron: 0, shucaron: 0, hobagi: 6 } }), 'B').key).toBe('joanne.skill');
    expect(pickResultLine([], play({ char: 'kommy' }, { caught: { candy: 0, star: 0, mokaron: 0, shucaron: 0, hobagi: 6 } }), 'B').key).toBe('kommy.ok');
  });
});

describe('原作の口調', () => {
  it('コミーは「にゃ」で話し、言葉の中の「な」も「にゃ」になる', () => {
    for (const t of spoken('kommy')) {
      expect(t, t).toContain('にゃ');
      expect(t.replace(/にゃ/g, ''), t).not.toContain('な');
    }
  });

  it('コミーの「……」は 文の頭に置かない（「〜にゃ……」と消えるか、「うぅ……」のつぶやきの後）', () => {
    for (const t of spoken('kommy')) expect(t, t).not.toMatch(/(^|[。？！] ?)……/);
  });

  it('エルフィンは 名前で自分を呼ばない（一人称は 私）。「女王」と自分を呼ぶのは いばる時・言い訳の時だけ', () => {
    for (const t of spoken('elfin')) expect(t, t).not.toContain('エルフィン');
    expect(spoken('elfin').filter((t) => t.includes('女王')).length).toBeLessThanOrEqual(2);
  });

  it('バターは「がおー」と言わない（犬の獣人）。ほっぺを引っぱっても怒らない', () => {
    for (const t of spoken('butter')) expect(t, t).not.toContain('がおー');
    for (const r of [0, 0.99]) expect(['angry', 'sulk']).not.toContain(pinchReaction('butter', () => r).expr);
  });

  it('ヨミの「〜のです」は 1 セリフに 1 回まで', () => {
    for (const t of spoken('yomi')) expect(t.split('のです').length - 1, t).toBeLessThanOrEqual(1);
  });

  it('ジョアンの決めゼリフ「惑わされてはならぬ」は、そのまま使わない（公式のセリフ）', () => {
    for (const t of spoken('joanne')) expect(t.replace(/\s/g, ''), t).not.toContain('惑わされてはならぬ');
  });

  it('ジョアンは 教主様を見下ろさない（「そなた」と言わない）', () => {
    for (const t of spoken('joanne')) expect(t, t).not.toMatch(/そなた|お前/);
  });

  it('だれも かぼちゃを 食べない（スピッキーの友達）', () => {
    for (const id of CHAR_ORDER) for (const t of spoken(id)) expect(t, t).not.toMatch(/かぼちゃ.*食べ|ホバギ.*食べ/);
  });

  it('遊んでいる途中のひとことは、画面に収まる長さ', () => {
    for (const id of CHAR_ORDER)
      for (const k of ['fever', 'spurt', 'chain', 'hit', 'skill'] as const)
        for (const r of [0, 0.99]) expect((talkLine(id, k, undefined, () => r) ?? '').length).toBeLessThanOrEqual(18);
  });
});
