import { Operator, StepRecord, Solution, SolutionVariant, ArtistryInfo, PuzzleDifficultyInfo } from './types.ts';

export type { Operator, StepRecord, Solution, SolutionVariant, ArtistryInfo, PuzzleDifficultyInfo };

interface AST {
  type: 'num' | 'add' | 'mul';
  val: number;
  numVal?: number;
  // Additive group: sum of posTerms minus sum of negTerms
  posTerms?: AST[];
  negTerms?: AST[];
  // Multiplicative group: product of numFactors divided by product of denFactors
  numFactors?: AST[];
  denFactors?: AST[];
}

function makeNum(n: number): AST {
  return { type: 'num', val: n, numVal: n };
}

/**
 * Deterministic comparison for canonical expressions.
 * Orders complex expressions before simple numbers so that expressions like
 * `(5 + 5 + 7 + 7) × 3` format with the grouped calculation first.
 */
function compareCanonical(a: string, b: string): number {
  const numA = Number(a);
  const numB = Number(b);
  const isNumA = !isNaN(numA);
  const isNumB = !isNaN(numB);

  // If both are simple numbers, compare numerically
  if (isNumA && isNumB) {
    return numA - numB;
  }
  // Put complex expressions before simple numbers
  if (isNumA && !isNumB) return 1;
  if (!isNumA && isNumB) return -1;

  // If both are complex, compare lexicographically
  return a.localeCompare(b);
}

function compareAST(a: AST, b: AST): number {
  return compareCanonical(astToCanonical(a), astToCanonical(b));
}

export function astToCanonical(node: AST): string {
  if (node.type === 'num') {
    return String(node.numVal);
  }
  if (node.type === 'add') {
    const pos = (node.posTerms || []).map(astToCanonical).sort(compareCanonical);
    const neg = (node.negTerms || []).map(astToCanonical).sort(compareCanonical);
    return `(+[${pos.join(',')}]-[${neg.join(',')}])`;
  }
  if (node.type === 'mul') {
    const num = (node.numFactors || []).map(astToCanonical).sort(compareCanonical);
    const den = (node.denFactors || []).map(astToCanonical).sort(compareCanonical);
    return `(×[${num.join(',')}]÷[${den.join(',')}])`;
  }
  return '?';
}

export function astToString(node: AST, parentPrec = 0, isRight = false): string {
  if (node.type === 'num') {
    return String(node.numVal);
  }

  if (node.type === 'add') {
    const parts: string[] = [];
    const pos = [...(node.posTerms || [])].sort(compareAST);
    const neg = [...(node.negTerms || [])].sort(compareAST);

    pos.forEach((p, idx) => {
      const s = astToString(p, 1, false);
      if (idx === 0) {
        parts.push(s);
      } else {
        parts.push('+', s);
      }
    });

    neg.forEach((n) => {
      const s = astToString(n, 1, true);
      parts.push('-', s);
    });

    const str = parts.join(' ');
    // Wrap in parentheses if parent has higher precedence (e.g. inside × or ÷)
    return parentPrec > 1 ? `(${str})` : str;
  }

  if (node.type === 'mul') {
    const parts: string[] = [];
    const num = [...(node.numFactors || [])].sort(compareAST);
    const den = [...(node.denFactors || [])].sort(compareAST);

    num.forEach((p, idx) => {
      const s = astToString(p, 2, false);
      if (idx === 0) {
        parts.push(s);
      } else {
        parts.push('×', s);
      }
    });

    den.forEach((d) => {
      const s = astToString(d, 2, true);
      parts.push('÷', s);
    });

    const str = parts.join(' ');
    // Wrap in parentheses if parent has higher precedence (or division right-hand side)
    return parentPrec > 2 ? `(${str})` : str;
  }

  return '?';
}

function combineAST(op: Operator, left: AST, right: AST): AST {
  const val =
    op === '+'
      ? left.val + right.val
      : op === '-'
      ? left.val - right.val
      : op === '×'
      ? left.val * right.val
      : left.val / right.val;

  if (op === '+') {
    const pos: AST[] = [];
    const neg: AST[] = [];

    if (left.type === 'add') {
      pos.push(...(left.posTerms || []));
      neg.push(...(left.negTerms || []));
    } else {
      pos.push(left);
    }

    if (right.type === 'add') {
      pos.push(...(right.posTerms || []));
      neg.push(...(right.negTerms || []));
    } else {
      pos.push(right);
    }

    return { type: 'add', val, posTerms: pos, negTerms: neg };
  }

  if (op === '-') {
    const pos: AST[] = [];
    const neg: AST[] = [];

    if (left.type === 'add') {
      pos.push(...(left.posTerms || []));
      neg.push(...(left.negTerms || []));
    } else {
      pos.push(left);
    }

    if (right.type === 'add') {
      // -(A + B - C) = -A - B + C
      pos.push(...(right.negTerms || []));
      neg.push(...(right.posTerms || []));
    } else {
      neg.push(right);
    }

    return { type: 'add', val, posTerms: pos, negTerms: neg };
  }

  if (op === '×') {
    const num: AST[] = [];
    const den: AST[] = [];

    if (left.type === 'mul') {
      num.push(...(left.numFactors || []));
      den.push(...(left.denFactors || []));
    } else {
      num.push(left);
    }

    if (right.type === 'mul') {
      num.push(...(right.numFactors || []));
      den.push(...(right.denFactors || []));
    } else {
      num.push(right);
    }

    return { type: 'mul', val, numFactors: num, denFactors: den };
  }

  if (op === '÷') {
    const num: AST[] = [];
    const den: AST[] = [];

    if (left.type === 'mul') {
      num.push(...(left.numFactors || []));
      den.push(...(left.denFactors || []));
    } else {
      num.push(left);
    }

    if (right.type === 'mul') {
      // Dividing by (num/den) multiplies by den and divides by num
      num.push(...(right.denFactors || []));
      den.push(...(right.numFactors || []));
    } else {
      den.push(right);
    }

    return { type: 'mul', val, numFactors: num, denFactors: den };
  }

  throw new Error(`Unsupported operator: ${op}`);
}

export interface StepNode {
  val: number;
  op?: Operator;
  left?: StepNode;
  right?: StepNode;
}

function hasOperator(node: StepNode | undefined, op: Operator): boolean {
  if (!node || !node.op) return false;
  if (node.op === op) return true;
  return hasOperator(node.left, op) || hasOperator(node.right, op);
}

function isCompound(node: StepNode | undefined): boolean {
  return !!(node && node.op);
}

/**
 * Converts a step calculation tree into a clean human-readable mathematical formula.
 * Preserves essential grouping, operator precedence, and clarifying brackets
 * (e.g. ((9 - 3) ÷ 3 × 4) × 8).
 */
export function formatStepTree(node: StepNode, parentOp?: Operator, isRight?: boolean): string {
  if (!node.op || !node.left || !node.right) return String(node.val);

  let leftNode = node.left;
  let rightNode = node.right;

  // For commutative operations (+, ×), prefer placing compound operations on the left
  if (node.op === '+' || node.op === '×') {
    if (!isCompound(leftNode) && isCompound(rightNode)) {
      leftNode = node.right;
      rightNode = node.left;
    }
  }

  const prec: Record<Operator, number> = { '+': 1, '-': 1, '×': 2, '÷': 2 };
  const myPrec = prec[node.op];
  const pPrec = parentOp ? prec[parentOp] : 0;

  let needParens = false;
  if (parentOp) {
    if (myPrec < pPrec) {
      needParens = true;
    } else if (myPrec === pPrec) {
      if (isRight && (parentOp === '-' || parentOp === '÷')) {
        needParens = true;
      } else if (!isRight && parentOp === '×' && node.op === '×' && hasOperator(node, '÷')) {
        needParens = true;
      } else if (isRight && parentOp === '×' && (node.op === '÷' || hasOperator(node, '÷'))) {
        needParens = true;
      }
    }
  }

  const leftStr = formatStepTree(leftNode, node.op, false);
  const rightStr = formatStepTree(rightNode, node.op, true);

  const res = `${leftStr} ${node.op} ${rightStr}`;
  return needParens ? `(${res})` : res;
}

interface SearchItem {
  ast: AST;
  rawTree: StepNode;
  usedIndices: number[];
}

/**
 * Checks whether a step is an identity operation with 0 (+0, 0+, -0).
 * In calculation puzzles, X + 0 and X - 0 are algebraically and functionally equivalent.
 */
export function isZeroIdentityStep(st: StepRecord): boolean {
  if (st.operator === '+' && (st.leftValue === 0 || st.rightValue === 0)) return true;
  if (st.operator === '-' && st.rightValue === 0) return true;
  return false;
}

/**
 * Checks whether a step is an identity operation with 1 (×1, 1×, ÷1).
 * In calculation puzzles, X × 1 and X ÷ 1 are algebraically and functionally equivalent.
 */
export function isOneIdentityStep(st: StepRecord): boolean {
  if (st.operator === '×' && (st.leftValue === 1 || st.rightValue === 1)) return true;
  if (st.operator === '÷' && st.rightValue === 1) return true;
  return false;
}

/**
 * Checks whether a given list of factors can be multiplied together in some order
 * such that NO step performs a multiplication of (>=12 and >=2).
 * If at least one such safe order exists, returns true (the big multiplication can be avoided).
 * If no such order exists (big multiplication is unavoidable), returns false.
 */
export function canAvoidBigMultiplication(factors: number[]): boolean {
  if (factors.length <= 1) return true;

  const n = factors.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = factors[i];
      const b = factors[j];

      // Check if multiplying a and b avoids "12以上×2以上"
      const isBigMul = (a >= 12 && b >= 2) || (b >= 12 && a >= 2);
      if (!isBigMul) {
        const nextFactors: number[] = [];
        for (let k = 0; k < n; k++) {
          if (k !== i && k !== j) nextFactors.push(factors[k]);
        }
        nextFactors.push(a * b);

        if (canAvoidBigMultiplication(nextFactors)) {
          return true; // Found at least one safe order
        }
      }
    }
  }

  return false;
}

/**
 * Recursively collects factor lists from multiplication subtrees in an AST.
 */
export function collectMultiplicationFactorGroups(node: AST): Array<{ factors: number[]; desc: string }> {
  const groups: Array<{ factors: number[]; desc: string }> = [];

  function traverse(n: AST) {
    if (n.type === 'add') {
      (n.posTerms || []).forEach(traverse);
      (n.negTerms || []).forEach(traverse);
    } else if (n.type === 'mul') {
      if (n.numFactors && n.numFactors.length >= 2) {
        groups.push({
          factors: n.numFactors.map((f) => f.val),
          desc: n.numFactors.map((f) => astToString(f)).join(' × '),
        });
      }
      if (n.denFactors && n.denFactors.length >= 2) {
        groups.push({
          factors: n.denFactors.map((d) => d.val),
          desc: n.denFactors.map((d) => astToString(d)).join(' × '),
        });
      }
      (n.numFactors || []).forEach(traverse);
      (n.denFactors || []).forEach(traverse);
    }
  }

  traverse(node);
  return groups;
}

/**
 * Extracts connected multiplication factor groups directly from step history if AST is not provided.
 */
function extractFactorGroupsFromSteps(steps: StepRecord[]): number[][] {
  const valFactors = new Map<number, number[]>(); // stepIndex -> factors array
  const groups: number[][] = [];

  for (let idx = 0; idx < steps.length; idx++) {
    const st = steps[idx];
    if (st.operator === '×') {
      let leftFactors = [st.leftValue];
      let rightFactors = [st.rightValue];

      for (let p = idx - 1; p >= 0; p--) {
        if (steps[p].result === st.leftValue && valFactors.has(p)) {
          leftFactors = valFactors.get(p)!;
          break;
        }
      }
      for (let p = idx - 1; p >= 0; p--) {
        if (steps[p].result === st.rightValue && valFactors.has(p)) {
          rightFactors = valFactors.get(p)!;
          break;
        }
      }

      const combined = [...leftFactors, ...rightFactors];
      valFactors.set(idx, combined);
    }
  }

  for (let idx = 0; idx < steps.length; idx++) {
    if (steps[idx].operator === '×') {
      let isConsumed = false;
      for (let next = idx + 1; next < steps.length; next++) {
        if (
          steps[next].operator === '×' &&
          (steps[next].leftValue === steps[idx].result || steps[next].rightValue === steps[idx].result)
        ) {
          isConsumed = true;
          break;
        }
      }
      if (!isConsumed) {
        const factors = valFactors.get(idx);
        if (factors && factors.length >= 2) {
          groups.push(factors);
        }
      }
    }
  }

  return groups;
}

/**
 * Evaluates the "artistry" (意外性・芸術性・複雑さ) of a solution pattern.
 *
 * Revised Criteria:
 * 1. [最高峰の芸術性] 3桁以上（100以上）を経由してからの除算パターン (最も評価が高い: +45点)
 *    TARGET<=99、手札<=9のルールにおいて、計算途中で3桁（144など）へ跳ね上げ、
 *    そこから除算でTARGETに着地する解法を最高芸術として評価。
 * 2. 0の加算・減算（+0, -0）および1の乗算・除算（×1, ÷1）は、等価なので差が出ないようにし、それ自体への加点は行わない。
 * 3. 左右対称ツリー構造: (A op B) OP (C op D) の並行計算 (+30点)
 * 4. 3桁到達: 計算途中で100以上の数値を作る（除算なしの迂回 +20点）
 * 5. 12以上×2以上の掛け算 (最大+20点):
 *    掛ける順序によって12以上×2以上を回避できる場合（例: 2×2×9 を 4×9 として計算可能）は加点対象外。
 *    どのように掛けても必ず12以上×2以上が発生せざるを得ない場合のみ加点。
 * 6. 0の生成・1の生成: 自前で「0」または「1」を創出（各+5点）
 * 7. 演算子の多様性: 4種融合（+20点）、3種融合（+10点）
 */
export function evaluateArtistry(sol: Omit<Solution, 'artistry'>, ast?: AST): ArtistryInfo {
  let score = 15; // base score
  const tags: string[] = [];
  const reasons: string[] = [];

  // Intermediate values and peak value
  const allValues = sol.steps.flatMap((st) => [st.leftValue, st.rightValue, st.result]);
  const peakVal = allValues.length > 0 ? Math.max(...allValues) : 0;

  // 1. [最高峰の芸術性] 3桁除算: 100以上の数を直接除算（÷2以上）するパターン (+45点)
  const directThreeDigitDiv = sol.steps.find(
    (st) => st.operator === '÷' && st.leftValue >= 100 && st.rightValue > 1
  );

  if (directThreeDigitDiv) {
    score += 45;
    tags.push(`3桁除算 (${directThreeDigitDiv.leftValue}÷${directThreeDigitDiv.rightValue}=${directThreeDigitDiv.result})`);
    reasons.push(
      `3桁（${directThreeDigitDiv.leftValue}）まで数値を大きく飛躍させ、そこから直接割り算で目標値へ収束させる最高峰の芸術解法`
    );
  }

  // 2. 左右対称ツリー構造: (A op B) OP (C op D) の並行計算 (+30点)
  if (sol.steps.length >= 3) {
    const s1 = sol.steps[0];
    const s2 = sol.steps[1];
    const isParallel =
      s2.leftValue !== s1.result && s2.rightValue !== s1.result && s2.result !== s1.result;
    if (isParallel) {
      score += 30;
      tags.push('左右対称ツリー構造');
      reasons.push('左右2組のカードを並行して計算し、最後に合体させる左右対称ツリー構造');
    }
  }

  // 3. 3桁到達: 計算途中で100以上の数値を作る（除算なしの迂回 +20点）
  if (peakVal >= 100 && !directThreeDigitDiv) {
    score += 20;
    tags.push(`3桁到達 (${peakVal})`);
    reasons.push(`初期カード（9以下）から3桁（${peakVal}）まで数値を大胆に引き上げてから着地`);
  } else if (peakVal > sol.target * 1.3 && peakVal >= 30 && !directThreeDigitDiv) {
    score += 10;
    tags.push(`大胆な迂回 (${peakVal})`);
    reasons.push(`目標値を超える中間値 (${peakVal}) を作ってから着地する迂回ルート`);
  }

  // 4. 12以上と2以上の掛け算 (最大+20点、厳格判定)
  // 掛ける順番によって12以上×2以上を回避できる場合（例: 2×2×9 を 4×9 として計算可能）は加点対象外
  const factorGroups = ast
    ? collectMultiplicationFactorGroups(ast).map((g) => g.factors)
    : extractFactorGroupsFromSteps(sol.steps);

  const unavoidableBigMuls: string[] = [];
  let mulBonus = 0;

  for (const factors of factorGroups) {
    if (!canAvoidBigMultiplication(factors)) {
      unavoidableBigMuls.push(`${factors.join('×')}`);
      mulBonus += 15;
    }
  }

  if (unavoidableBigMuls.length > 0) {
    score += Math.min(20, mulBonus);
    tags.push(`大数乗算 (${unavoidableBigMuls.join(', ')})`);
    reasons.push(
      `掛ける順序によらず12以上×2以上が不可避となる掛け算（${unavoidableBigMuls.join(', ')}）を活用`
    );
  }

  // 5. 0の生成: すべて +5点
  const zeroGenStep = sol.steps.find(
    (st) => st.result === 0 && st.leftValue > 0
  );
  if (zeroGenStep) {
    score += 5;
    tags.push('0の生成');
    reasons.push(`計算の過程で自前で「0」を創出（${zeroGenStep.leftValue}${zeroGenStep.operator}${zeroGenStep.rightValue}=0）`);
  }

  // 6. 1の生成: すべて +5点
  const unitGenStep = sol.steps.find(
    (st) => st.result === 1 && st.leftValue > 1 && st.rightValue > 1
  );
  if (unitGenStep) {
    score += 5;
    tags.push('1の生成');
    reasons.push(`計算の過程で自前で「1」を創出（${unitGenStep.leftValue}${unitGenStep.operator}${unitGenStep.rightValue}=1）`);
  }

  // 7. 演算子の多様性 (無意味な+0/-0、×1/÷1の水増しを排除した実質演算子数)
  // Group +0 and -0 as equivalent additive identity ('identity_zero') so they do not differentiate or inflate count
  // Group ×1 and ÷1 as equivalent multiplicative identity ('identity_one') so they do not differentiate or inflate count
  const nonIdentityStepOps = new Set(
    sol.steps
      .filter((st) => !isZeroIdentityStep(st) && !isOneIdentityStep(st))
      .map((st) => st.operator)
  );

  // Combine operators from operatorsUsed and non-identity step records
  const substantialOps = new Set<Operator>([
    ...Array.from(nonIdentityStepOps),
    ...sol.operatorsUsed.filter((op) => {
      const isIdentityOnly = sol.steps.length > 0 && sol.steps.every((st) => {
        if (st.operator !== op) return true;
        return isZeroIdentityStep(st) || isOneIdentityStep(st);
      });
      return !isIdentityOnly;
    }),
  ]);

  if (substantialOps.size >= 4) {
    score += 20;
    tags.push('4種演算融合');
    reasons.push('加減乗除の4種の実質的な演算を高度に融合');
  } else if (substantialOps.size === 3) {
    score += 10;
    tags.push('3種演算融合');
    reasons.push('3種類の実質的な演算を柔軟に組み合わせて計算');
  } else if (substantialOps.size === 1) {
    const only = Array.from(substantialOps)[0];
    if (only === '+' || only === '×') {
      score -= 10;
      tags.push('単一演算');
      reasons.push(`同一の演算（${only}）のみを使用した単調な組み立て`);
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine grade and stars
  let grade: 'S' | 'A' | 'B' | 'C' = 'C';
  let stars = 2;
  if (score >= 70) {
    grade = 'S';
    stars = 5;
  } else if (score >= 50) {
    grade = 'A';
    stars = 4;
  } else if (score >= 35) {
    grade = 'B';
    stars = 3;
  }

  return { score, stars, grade, tags, reasons };
}

/**
 * Solves all valid calculation patterns to reach target from initial numbers.
 * Rules:
 * 1. Intermediate results must be non-negative integers (>= 0).
 * 2. No fractions (division must have remainder === 0 and divisor > 0).
 * 3. Each card can only be used once.
 * 4. Deduplicates equivalent mathematical patterns using canonical algebraic AST representation.
 */
interface RawVariant {
  expression: string;
  steps: StepRecord[];
  ast: AST;
  operatorsUsed: Operator[];
  maxIntermediate: number;
}

interface CanonicalGroup {
  canonicalKey: string;
  canonicalFormula: string;
  astExpr: string;
  cardsUsedCount: number;
  totalCardsCount: number;
  usesAllCards: boolean;
  usedInitialValues: number[];
  ast: AST;
  variants: RawVariant[];
}

export function solveGame(initialNumbers: number[], target: number): Solution[] {
  if (initialNumbers.length === 0) return [];

  const groupsMap = new Map<string, CanonicalGroup>();

  function search(pool: SearchItem[], history: StepRecord[]) {
    // Check if any node in current pool equals target
    for (const item of pool) {
      if (item.ast.val === target) {
        const canonical = astToCanonical(item.ast);
        const canonicalKey = `${canonical}#cards:${item.usedIndices.length}`;

        let group = groupsMap.get(canonicalKey);
        if (!group) {
          group = {
            canonicalKey,
            canonicalFormula: canonical,
            astExpr: astToString(item.ast),
            cardsUsedCount: item.usedIndices.length,
            totalCardsCount: initialNumbers.length,
            usesAllCards: item.usedIndices.length === initialNumbers.length,
            usedInitialValues: item.usedIndices.map((i) => initialNumbers[i]),
            ast: item.ast,
            variants: [],
          };
          groupsMap.set(canonicalKey, group);
        }

        const expr = formatStepTree(item.rawTree);

        // Collect all operators that actually appear in the formatted expression or AST
        const ops: Operator[] = [];
        const standardOps: Operator[] = ['+', '-', '×', '÷'];
        for (const op of standardOps) {
          if (expr.includes(op) && !ops.includes(op)) {
            ops.push(op);
          }
        }
        // Also ensure any operators from the calculation steps are included
        for (const s of history) {
          if (!ops.includes(s.operator)) ops.push(s.operator);
        }

        const maxIntermediate = history.reduce((max, s) => Math.max(max, s.result), target);
        const stepsSig = history.map((s) => `${s.leftValue}${s.operator}${s.rightValue}=${s.result}`).join(';');

        const isDup = group.variants.some((v) => {
          const vSig = v.steps.map((s) => `${s.leftValue}${s.operator}${s.rightValue}=${s.result}`).join(';');
          return v.expression === expr && vSig === stepsSig;
        });

        if (!isDup) {
          group.variants.push({
            expression: expr,
            steps: history,
            ast: item.ast,
            operatorsUsed: ops,
            maxIntermediate,
          });
        }
      }
    }

    if (pool.length <= 1) {
      return;
    }

    const n = pool.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const itemA = pool[i];
        const itemB = pool[j];
        const rest = pool.filter((_, idx) => idx !== i && idx !== j);

        const combinations: Array<{ op: Operator; left: SearchItem; right: SearchItem; res: number }> = [];

        // 1. Addition (+) - commutative
        combinations.push({
          op: '+',
          left: itemA.ast.val >= itemB.ast.val ? itemA : itemB,
          right: itemA.ast.val >= itemB.ast.val ? itemB : itemA,
          res: itemA.ast.val + itemB.ast.val,
        });

        // 2. Multiplication (×) - commutative
        combinations.push({
          op: '×',
          left: itemA.ast.val >= itemB.ast.val ? itemA : itemB,
          right: itemA.ast.val >= itemB.ast.val ? itemB : itemA,
          res: itemA.ast.val * itemB.ast.val,
        });

        // 3. Subtraction (-) - Intermediate cannot be negative (>= 0)
        if (itemA.ast.val >= itemB.ast.val) {
          combinations.push({
            op: '-',
            left: itemA,
            right: itemB,
            res: itemA.ast.val - itemB.ast.val,
          });
        }
        if (itemB.ast.val > itemA.ast.val) {
          combinations.push({
            op: '-',
            left: itemB,
            right: itemA,
            res: itemB.ast.val - itemA.ast.val,
          });
        }

        // 4. Division (÷) - Intermediate cannot be fraction, divisor > 0, remainder === 0
        if (itemB.ast.val > 0 && itemA.ast.val % itemB.ast.val === 0) {
          combinations.push({
            op: '÷',
            left: itemA,
            right: itemB,
            res: itemA.ast.val / itemB.ast.val,
          });
        }
        if (itemA.ast.val > 0 && itemB.ast.val % itemA.ast.val === 0 && itemA.ast.val !== itemB.ast.val) {
          combinations.push({
            op: '÷',
            left: itemB,
            right: itemA,
            res: itemB.ast.val / itemA.ast.val,
          });
        }

        for (const combo of combinations) {
          const { op, left, right, res } = combo;

          const newAst = combineAST(op, left.ast, right.ast);
          const newRaw: StepNode = {
            val: res,
            op,
            left: left.rawTree,
            right: right.rawTree,
          };
          const combinedUsedIndices = Array.from(new Set([...left.usedIndices, ...right.usedIndices])).sort(
            (a, b) => a - b
          );

          const cardsBefore = pool.map((p) => p.ast.val);
          const cardsAfter = [...rest.map((p) => p.ast.val), res];

          const newStep: StepRecord = {
            stepIndex: history.length + 1,
            leftValue: left.ast.val,
            operator: op,
            rightValue: right.ast.val,
            result: res,
            cardsBefore,
            cardsAfter,
            expression: `${left.ast.val} ${op} ${right.ast.val} = ${res}`,
          };

          search(
            [...rest, { ast: newAst, rawTree: newRaw, usedIndices: combinedUsedIndices }],
            [...history, newStep]
          );
        }
      }
    }
  }

  const initialItems: SearchItem[] = initialNumbers.map((val, idx) => ({
    ast: makeNum(val),
    rawTree: { val },
    usedIndices: [idx],
  }));

  search(initialItems, []);

  const results: Solution[] = [];
  let groupIndex = 0;

  for (const group of groupsMap.values()) {
    groupIndex++;

    const scoredVariants = group.variants.map((v, vIdx) => {
      const partial: Omit<Solution, 'artistry'> = {
        id: `sol-${groupIndex}-v-${vIdx + 1}`,
        expression: v.expression,
        canonicalFormula: group.canonicalFormula,
        target,
        cardsUsedCount: group.cardsUsedCount,
        totalCardsCount: group.totalCardsCount,
        usesAllCards: group.usesAllCards,
        steps: v.steps,
        usedInitialValues: group.usedInitialValues,
        operatorsUsed: v.operatorsUsed,
      };
      return {
        ...partial,
        artistry: evaluateArtistry(partial, v.ast),
        maxIntermediate: v.maxIntermediate,
      };
    });

    if (scoredVariants.length === 0) continue;

    // Rank variants to pick the representative (best) variant:
    // 1. Prefer variants without unnecessary 3-digit intermediate results (> 100) if any exist
    // 2. Higher artistry score
    // 3. Lower max intermediate
    // 4. Shorter expression string
    scoredVariants.sort((a, b) => {
      const aLarge = a.maxIntermediate > 100 ? 1 : 0;
      const bLarge = b.maxIntermediate > 100 ? 1 : 0;
      if (aLarge !== bLarge) return aLarge - bLarge;

      if (b.artistry.score !== a.artistry.score) {
        return b.artistry.score - a.artistry.score;
      }
      if (a.maxIntermediate !== b.maxIntermediate) {
        return a.maxIntermediate - b.maxIntermediate;
      }
      if (a.expression.length !== b.expression.length) {
        return a.expression.length - b.expression.length;
      }
      return a.expression.localeCompare(b.expression);
    });

    const representative = scoredVariants[0];

    // Deduplicate other variants by unique expression (preserving distinct calculation patterns)
    const seenExprs = new Set<string>([representative.expression]);
    const otherVariants: SolutionVariant[] = [];

    for (const v of scoredVariants.slice(1)) {
      if (!seenExprs.has(v.expression)) {
        seenExprs.add(v.expression);
        otherVariants.push({
          id: v.id,
          expression: v.expression,
          steps: v.steps,
          operatorsUsed: v.operatorsUsed,
          artistry: v.artistry,
        });
      }
    }

    results.push({
      id: `sol-${groupIndex}`,
      expression: representative.expression,
      canonicalFormula: group.canonicalFormula,
      target,
      cardsUsedCount: group.cardsUsedCount,
      totalCardsCount: group.totalCardsCount,
      usesAllCards: group.usesAllCards,
      steps: representative.steps,
      usedInitialValues: group.usedInitialValues,
      operatorsUsed: representative.operatorsUsed,
      artistry: representative.artistry,
      variants: otherVariants.length > 0 ? otherVariants : undefined,
    });
  }

  // Sort solutions:
  // 1. First by usesAllCards (5 cards first)
  // 2. By higher artistry score
  // 3. By fewer steps / cards used
  // 4. Alphabetically by expression
  results.sort((a, b) => {
    if (a.usesAllCards !== b.usesAllCards) {
      return a.usesAllCards ? -1 : 1;
    }
    if (a.cardsUsedCount !== b.cardsUsedCount) {
      return b.cardsUsedCount - a.cardsUsedCount;
    }
    const scoreA = a.artistry?.score ?? 0;
    const scoreB = b.artistry?.score ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    if (a.steps.length !== b.steps.length) {
      return a.steps.length - b.steps.length;
    }
    return a.expression.localeCompare(b.expression);
  });

  return results;
}

/**
 * Solves and returns ONLY solutions that use all cards in initialNumbers (e.g. all 5 cards).
 */
export function solveGameAllCardsOnly(initialNumbers: number[], target: number): Solution[] {
  const all = solveGame(initialNumbers, target);
  return all.filter((s) => s.usesAllCards);
}

/**
 * Evaluates the inherent difficulty of the puzzle based on the number of solutions found.
 * Rule: A problem with only 1 solution is the most difficult (rare unique path),
 * while problems with dozens of solutions are easier.
 */
export function evaluatePuzzleDifficulty(
  solutionsCount: number,
  isConfigured: boolean
): PuzzleDifficultyInfo | null {
  if (!isConfigured) return null;

  if (solutionsCount === 0) {
    return {
      label: '解なし',
      stars: 0,
      description: '全5枚のカードを使った解法が存在しません',
      badgeBg: 'bg-slate-200 text-slate-700',
      textColor: 'text-slate-600',
      borderColor: 'border-slate-300',
    };
  }

  if (solutionsCount === 1) {
    return {
      label: '最難関',
      stars: 5,
      description: 'たった1通りしか解法が存在しない超難問！',
      badgeBg: 'bg-rose-600 text-white shadow-xs',
      textColor: 'text-rose-800',
      borderColor: 'border-rose-300',
    };
  }

  if (solutionsCount <= 3) {
    return {
      label: '難問',
      stars: 4,
      description: `解法がわずか ${solutionsCount} 通りしかない高難度問題`,
      badgeBg: 'bg-orange-500 text-white shadow-xs',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300',
    };
  }

  if (solutionsCount <= 10) {
    return {
      label: '上級',
      stars: 3,
      description: `解法は ${solutionsCount} 通り。適度な工夫と試行錯誤が必要`,
      badgeBg: 'bg-amber-500 text-white shadow-xs',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
    };
  }

  if (solutionsCount <= 30) {
    return {
      label: '中級',
      stars: 2,
      description: `解法は ${solutionsCount} 通り。標準的な難易度`,
      badgeBg: 'bg-blue-600 text-white shadow-xs',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
    };
  }

  return {
    label: '初級',
    stars: 1,
    description: `解法が ${solutionsCount} 通りあり、アプローチしやすい入門問題`,
    badgeBg: 'bg-emerald-600 text-white shadow-xs',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
  };
}
