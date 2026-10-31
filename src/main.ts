import { App } from './app';
import { isLang } from './i18n';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const app = new App(canvas, ui);
// 開発中だけ、ブラウザのコンソールから状態を触れるようにする
if (import.meta.env.DEV) {
  (window as unknown as { app: App }).app = app;
  const q = new URLSearchParams(location.search);
  // ヘッドレスのスクリーンショットでは CSS アニメーションが進まないので止める
  if (q.has('still')) document.head.append(Object.assign(document.createElement('style'), { textContent: '*{animation:none!important;transition:none!important}' }));
  // ?lang=ja|ko|en で言語を決める（保存はしない）
  const lang = q.get('lang');
  if (isLang(lang)) app.changeLang(lang, false);
  if (q.has('dev')) {
    void import('../tests/bot').then(({ Bot, SKILLS }) => app.devJump(q, (w) => new Bot(w, SKILLS[2], Math.random)));
  }
}
