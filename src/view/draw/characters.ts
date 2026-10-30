import type { CharId } from '../../config/characters';
import type { ChibiSpec } from './chibi';

// GiGO コラボ「トリッカル or トリート!!」の仮装をした 5 人と、スピッキー（スピキ）の描き起こし用の仕様。
// 原作の設定・配色から起こした（公式イラストの模写ではない）。色は低彩度のパステル。

// コミー（死神）: 白いロングヘア（毛先はピンク）に猫耳とアホ毛、頭の横に大きなドクロ。眠たげな半目の金色の瞳と八重歯。
// フード付きの黒いローブ（袖口はピンク）、ねじれた木の柄の大鎌、白いしっぽ
export const KOMMY: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#f7f4f5',
  hairShade: '#dfc6d0',
  hairTip: '#f0b4c2',
  shine: '#ffffff',
  halfLid: true,
  mouth: 'fang',
  style: 'long',
  bangs: 'split',
  outfit: '#4a444f',
  outfitShade: '#38333d',
  collar: '#f3a3ad',
  legs: '#4a444f',
  shoes: '#38333d',
  ears: 'cat',
  tail: { kind: 'cat', color: '#ffffff', tip: '#f2c4cc' },
  ahoge: true,
  hat: 'skull',
  hatColor: '#ffffff',
  wings: null,
  extra: 'kommyReaper',
  eyeColor: '#f2b53e',
};

// エルフィン（魔女）: 床まで届く金の髪と片側の三つ編み、先の折れた大きな魔女の帽子（つばの裏は赤・白い羽）、
// 星のきらめく赤い瞳と八重歯。黒いワンピースに赤い襟と宝石のブローチ、穂を上にしたほうき
export const ELFIN: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#fbe6a6',
  hairShade: '#e5b88c',
  hairTip: '#f6d79c',
  shine: '#fffbe8',
  mouth: 'fang',
  style: 'long',
  bangs: 'blunt',
  outfit: '#4f3f47',
  outfitShade: '#3d3037',
  collar: '#dc5f5f',
  legs: '#f6eeee',
  shoes: '#4a3036',
  ears: null,
  hat: 'witch',
  hatColor: '#544249',
  wings: null,
  extra: 'elfinWitch',
  eyeColor: '#e45a43',
  starEyes: true,
};

// バター（ミイラ）: ミルクティー色のロングヘアと垂れ耳、アホ毛。頭に巻いた包帯と黄色いリボン、水色の瞳と八重歯。
// 包帯でぐるぐるの体に大きな白いリボン、黄色いリボン。両手を上げて「がおー」
export const BUTTER: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#e2c0a5',
  hairShade: '#c59485',
  hairTip: '#d6ad92',
  shine: '#fff3e2',
  mouth: 'fang',
  style: 'long',
  bangs: 'blunt',
  outfit: '#fbf7ef',
  outfitShade: '#e4d9c9',
  collar: '#ffffff',
  legs: '#fbf7ef',
  shoes: '#e4d9c9',
  ears: 'dog',
  tail: { kind: 'dog', color: '#ece0d2', tip: '#fbf7ef' },
  ahoge: true,
  hat: 'bandage',
  hatColor: '#fbcf5a',
  wings: null,
  extra: 'butterMummy',
  eyeColor: '#4dbccb',
};

// ヨミ（おばけ）: 白に近いラベンダーの髪、ぱっつん前髪と紺のカチューシャ、床まで届く二本の三つ編み、アホ毛。
// 眠たげな紫の瞳。後ろに三日月の付いた金の飾り枠。おばけの顔の白いシーツ、かぼちゃのバケツ
export const YOMI: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#eeebf6',
  hairShade: '#c5bcda',
  hairTip: '#e0d9ef',
  shine: '#ffffff',
  halfLid: true,
  mouth: 'cat',
  style: 'long',
  bangs: 'hime',
  outfit: '#fdfcfe',
  outfitShade: '#e2dfee',
  collar: '#ffffff',
  legs: '#fdfcfe',
  shoes: '#4b4780',
  ears: null,
  ahoge: true,
  hat: 'headband',
  hatColor: '#504c8f',
  wings: null,
  extra: 'yomiGhost',
  eyeColor: '#9b80dc',
};

// ジョアン（吸血鬼）: 深い緑の髪、頭の左右に金の縁の黒い羽の飾り、橙の葉の髪飾り。赤い瞳と小さな口。
// 裏地が緑の黒いマント、白いブラウスに黒いリボン、編み上げのコルセット、フリルのスカート、白いニーハイ
export const JOANNE: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#447f66',
  hairShade: '#2d5a48',
  hairTip: '#3a6f59',
  shine: '#86bfa1',
  brows: '#2b4a3d',
  mouth: 'o',
  style: 'long',
  bangs: 'swept',
  outfit: '#ffffff',
  outfitShade: '#e4e0ea',
  collar: '#2f2b35',
  legs: '#fbf8fb',
  shoes: '#2f2b35',
  ears: null,
  hat: 'batWings',
  hatColor: '#2f2b35',
  wings: null,
  extra: 'joanneVampire',
  eyeColor: '#d8414a',
};

// スピッキー: ネルのまねをしたシスター姿の幽霊。灰色がかったクリーム色のまっすぐな長い髪とぱっつん前髪、
// 白い帯と金の星の黒い頭巾、琥珀色の瞳。かぼちゃのバケツと十字の杖
export const SPIKEY: ChibiSpec = {
  skin: '#fff4ef',
  hair: '#efe9de',
  hairShade: '#c9bdb0',
  hairTip: '#e2dacd',
  shine: '#ffffff',
  mouth: 'open',
  style: 'straight',
  bangs: 'hime',
  outfit: '#3f3756',
  outfitShade: '#302a45',
  collar: '#ffffff',
  legs: '#f4f1f4',
  shoes: '#8da6c8',
  ears: null,
  hat: 'veil',
  hatColor: '#352e4b',
  wings: null,
  extra: 'spikey',
  eyeColor: '#e3a046',
};

// スピキ: 泣いてしゃがみこんだスピッキー。涙の粒がたまったうるうるの黒目と、大きく開けた口
export const SPIKI: ChibiSpec = {
  ...SPIKEY,
  legs: '#ddd3df',
  shoes: '#4a3a4e',
  extra: 'speaki',
  eyeColor: undefined,
  crouch: true,
};

export const CHAR_SPECS: Record<CharId, ChibiSpec> = {
  kommy: KOMMY,
  elfin: ELFIN,
  butter: BUTTER,
  yomi: YOMI,
  joanne: JOANNE,
};
