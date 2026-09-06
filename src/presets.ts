import { CardSuit, Difficulty, PuzzleConfig } from './types.ts';

export interface CardPresetConfig extends PuzzleConfig {
  suits: CardSuit[];
  description: string;
}

export const PRESET_PUZZLES: CardPresetConfig[] = [
  {
    name: '添付画像の例 (中級 ROUND 1/3)',
    target: 31,
    cards: [6, 1, 1, 4, 5],
    suits: ['diamond', 'heart', 'heart', 'spade', 'heart'],
    difficulty: '中級',
    description: 'スクリーンショットの出題例。多様な解き方が存在します。',
  },
  {
    name: '定番の24作り (中級)',
    target: 24,
    cards: [3, 3, 8, 8, 2],
    suits: ['spade', 'heart', 'diamond', 'club', 'spade'],
    difficulty: '中級',
    description: '分数を使わない整数解で24を狙う名作パズル。',
  },
  {
    name: '初級チュートリアル (初級)',
    target: 10,
    cards: [2, 3, 5, 4, 1],
    suits: ['heart', 'diamond', 'spade', 'club', 'heart'],
    difficulty: '初級',
    description: '足し算や引き算の基本で達成しやすいウォーミングアップ。',
  },
  {
    name: '大台チャレンジ (上級)',
    target: 73,
    cards: [4, 5, 6, 7, 8],
    suits: ['diamond', 'spade', 'heart', 'club', 'diamond'],
    difficulty: '上級',
    description: '70超の大きなターゲットを巧みな掛け算・足し算で狙う難問。',
  },
  {
    name: 'ゾロ目の魔術 (上級)',
    target: 50,
    cards: [5, 5, 5, 5, 5],
    suits: ['spade', 'heart', 'diamond', 'club', 'spade'],
    difficulty: '上級',
    description: '全て「5」のカードから50を作るエレガントなパズル。',
  },
  {
    name: '割り算マスター (中級)',
    target: 42,
    cards: [8, 6, 2, 4, 7],
    suits: ['club', 'diamond', 'heart', 'spade', 'club'],
    difficulty: '中級',
    description: '割り算や掛け算の組み合わせが鍵を握るパズル。',
  },
];

const SUIT_POOL: CardSuit[] = ['spade', 'heart', 'diamond', 'club'];

export function getRandomSuit(): CardSuit {
  return SUIT_POOL[Math.floor(Math.random() * SUIT_POOL.length)];
}

export function getDefaultSuits(cards: number[]): CardSuit[] {
  return cards.map((_, i) => SUIT_POOL[i % SUIT_POOL.length]);
}
