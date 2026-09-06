export type Operator = '+' | '-' | '×' | '÷';
export type CardSuit = 'spade' | 'heart' | 'diamond' | 'club';

export interface CardItem {
  id: string;
  value: number;
  suit?: CardSuit;
  label?: string;
  isInitial?: boolean;
}

export interface StepRecord {
  stepIndex: number;
  leftValue: number;
  operator: Operator;
  rightValue: number;
  result: number;
  cardsBefore: number[];
  cardsAfter: number[];
  expression: string;
}

export interface ArtistryInfo {
  score: number; // 5 - 100
  stars: number; // 1 - 5
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  tags: string[];
  reasons: string[];
}

export interface Solution {
  id: string;
  expression: string;
  canonicalFormula: string;
  target: number;
  cardsUsedCount: number;
  totalCardsCount: number;
  usesAllCards: boolean;
  steps: StepRecord[];
  usedInitialValues: number[];
  operatorsUsed: Operator[];
  artistry?: ArtistryInfo;
}

export interface PuzzleDifficultyInfo {
  label: string; // '最難関' | '難問' | '上級' | '中級' | '初級' | '解なし'
  stars: number; // 0 - 5
  description: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export type Difficulty = '初級' | '中級' | '上級' | 'カスタム';

export interface PuzzleConfig {
  target: number;
  cards: number[];
  difficulty: Difficulty;
  name?: string;
}
