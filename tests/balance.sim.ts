import { it } from 'vitest';
import { RANKS, rankOf } from '../src/config/balance';
import { CHAR_ORDER } from '../src/config/characters';
import { MISSIONS, fits, playValue } from '../src/config/missions';
import { DAILY_RULES, NIGHT, NORMAL, type CourseId } from '../src/config/rules';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { Bot, SKILLS } from './bot';

// `npm run sim` で 5 人を腕前ごとにボットで遊ばせ、スコアの分布・ランクの分布・フィーバーの割合などを出す。
// RULE=night（まよなか）や RULE=star（今夜のおかしのルールの id）で、そのコースのルールで遊ばせる。
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const RUNS = Number(env.RUNS ?? 150);
const RULE = [NIGHT, ...DAILY_RULES].find((r) => r.id === env.RULE) ?? NORMAL;
const COURSE: CourseId = RULE === NORMAL ? 'normal' : RULE === NIGHT ? 'night' : 'daily';
const DT = 1 / 60;

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

it('balance report', () => {
  const lines: string[] = [`ルール: ${RULE.name}　ランク: ${RANKS.map((r) => `${r.id} ${r.min}`).join(' / ')}`];
  // おねがいごとの、1 回でたっせいできた割合（キャラ・コースの決まりがあるものは、そのキャラ・コースの回だけで数える）
  const missionHit = SKILLS.map(() => new Map<string, [number, number]>());
  for (const skill of SKILLS) {
    lines.push(`\n■ ${skill.name}`);
    lines.push('キャラ      平均   p10   p50   p90 | フィーバー 割合 | 最大連 当たり 泣 なぐさめ | 取れた% | ランク C/B/A/S/SS');
    for (const id of CHAR_ORDER) {
      const scores: number[] = [];
      const acc = { fevers: 0, feverShare: 0, maxChain: 0, hits: 0, cries: 0, comforts: 0, caught: 0, spawned: 0 };
      const ranks: Record<string, number> = { C: 0, B: 0, A: 0, S: 0, SS: 0 };
      for (let r = 0; r < RUNS; r++) {
        const w = new World(id, 1000 + r, 0.85, RULE);
        const rng = new Rng(9000 + r);
        const bot = new Bot(w, skill, () => rng.next());
        while (!w.over) {
          bot.step();
          w.update(DT);
          w.drain();
        }
        const s = w.stats;
        scores.push(w.score);
        acc.fevers += s.fevers;
        acc.feverShare += w.score > 0 ? s.feverScore / w.score : 0;
        acc.maxChain += s.maxChain;
        acc.hits += s.hits;
        acc.cries += s.cries;
        acc.comforts += s.comforts;
        acc.caught += s.caught.candy + s.caught.star + s.caught.mokaron + s.caught.shucaron;
        acc.spawned += s.spawned;
        ranks[rankOf(w.score)]++;
        const play = { char: id, course: COURSE, score: w.score, stats: s };
        for (const m of MISSIONS) {
          if (!fits(m, id, COURSE)) continue;
          const hit = missionHit[SKILLS.indexOf(skill)];
          const [ok, n] = hit.get(m.id) ?? [0, 0];
          hit.set(m.id, [ok + (playValue(m, play) >= m.goal ? 1 : 0), n + 1]);
        }
      }
      scores.sort((a, b) => a - b);
      const mean = scores.reduce((a, b) => a + b, 0) / RUNS;
      const f = (n: number, d = 1) => (n / RUNS).toFixed(d);
      lines.push(
        `${id.padEnd(8)} ${mean.toFixed(0).padStart(6)} ${String(pct(scores, 0.1)).padStart(5)} ${String(pct(scores, 0.5)).padStart(5)} ${String(pct(scores, 0.9)).padStart(5)} |` +
          `   ${f(acc.fevers, 2)}   ${(acc.feverShare / RUNS * 100).toFixed(0).padStart(3)}% |` +
          `  ${f(acc.maxChain, 0).padStart(4)}   ${f(acc.hits)}  ${f(acc.cries)}  ${f(acc.comforts)} |` +
          `  ${((acc.caught / acc.spawned) * 100).toFixed(0)}% | ${['C', 'B', 'A', 'S', 'SS'].map((k) => ranks[k]).join('/')}`,
      );
    }
  }
  lines.push(`\n■ おねがい（1 回でたっせいできた割合: ${SKILLS.map((k) => k.name).join(' / ')}）`);
  for (const m of MISSIONS) {
    if (!m.play) continue;
    const cells = missionHit.map((hit) => {
      const [ok, n] = hit.get(m.id) ?? [0, 0];
      return n ? `${Math.round((ok / n) * 100)}%`.padStart(5) : '    −';
    });
    lines.push(`${cells.join(' ')}  ${m.text}`);
  }
  console.log(lines.join('\n'));
});
