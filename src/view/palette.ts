// 色はここに集約する。おばけの国のハロウィンの夜（くすんだ紫の空）と、キャラのテーマカラー。
export const C = {
  ink: '#4a2a3f',
  inkSoft: '#7a5470',
  line: '#5a2d32',
  white: '#ffffff',
  cream: '#fff6ec',
  night: '#2a2046',
  nightDeep: '#1d1634',
  sky: '#4b3770',
  dusk: '#c47a9e',
  ground: '#3e3157',
  groundTop: '#5b4a7a',
  grass: '#4f6b5a',
  moon: '#fff2c4',
  gold: '#f6c453',
  goldDeep: '#d39a26',
  good: '#7fd68a',
  bad: '#ff6b6b',
  pink: '#ff8fb3',
  orange: '#ff9f43',
  fever: '#ff7ac8',
  shadow: 'rgba(20, 10, 40, 0.28)',
  panel: 'rgba(36, 24, 60, 0.72)',
  kommy: '#c9a0d8',
  elfin: '#f08a6c',
  butter: '#f2c35a',
  yomi: '#a593e0',
  joanne: '#5fae8a',
} as const;

/** 韓国語の文字は M PLUS Rounded 1c にもヒラギノにも無いので、丸い Jua で描く（Jua はヒラギノのあと。半角カナなどの日本語は今までどおりヒラギノ） */
export const FONT = "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Jua', 'Apple SD Gothic Neo', system-ui, sans-serif";
/** 数字・見出し用の丸い太字 */
export const FONT_POP = "'Jua', 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Apple SD Gothic Neo', system-ui, sans-serif";

export function font(size: number, weight = 800): string {
  return `${weight} ${size}px ${FONT}`;
}

export function popFont(size: number): string {
  return `400 ${size}px ${FONT_POP}`;
}
