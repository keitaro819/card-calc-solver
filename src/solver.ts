import { Operator, StepRecord, Solution, ArtistryInfo } from './types.ts';

export type { Operator, StepRecord, Solution, ArtistryInfo };

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

interface SearchItem {
  ast: AST;
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
 * Evaluates the "artistry" (意外性・芸術性・複雑さ) of a solution pattern.
 * Criteria:
 * 1. Zero usage: +0 and -0 are treated strictly as equivalent (+35)
 * 2. One usage: ×1 and ÷1 are treated strictly as equivalent (+15)
 * 3. Beyond 9x9 multiplication (e.g. 13×7, 24×3; excluding ×1 and ×0): High score (+16 to +45)
 * 4. Operator diversity: +0 and -0 share the same additive-identity category; ×1 and ÷1 share the same multiplicative-identity category
 * 5. Clever division: substantive integer division where divisor > 1; unit generator N÷N=1 (+12 to +20)
 * 6. Bold detour / Peak value: creating a large number and landing gracefully on target
 * 7. Symmetric tree structure: parallel pairs calculation
 */
export function evaluateArtistry(sol: Omit<Solution, 'artistry'>): ArtistryInfo {
  let score = 15; // base score
  const tags: string[] = [];
  const reasons: string[] = [];

  // 1. Check for 0 usage (0の加算と減算は等価として評価)
  const usesZero = sol.steps.some(
    (st) => st.leftValue === 0 || st.rightValue === 0 || st.result === 0
  );
  if (usesZero) {
    score += 35;
    tags.push('0の活用 (相殺)');
    reasons.push('0の加減算（+0 / -0）や中間値0を活用し、相殺・中立化マジックを達成');
  }

  // 2. Check for 1 identity usage (1の乗算と除算は等価として評価)
  const usesOneIdentity = sol.steps.some(isOneIdentityStep);
  if (usesOneIdentity) {
    score += 15;
    tags.push('1の活用 (×1 / ÷1)');
    reasons.push('1の乗算・除算（×1 / ÷1）を等価に活用し、値を保ったまま手札をスマートに消化');
  }

  // 3. Beyond 9x9 multiplication (excluding identity ×1 and ×0)
  const mulBigs: string[] = [];
  let mulBonus = 0;
  for (const st of sol.steps) {
    if (st.operator === '×') {
      const a = st.leftValue;
      const b = st.rightValue;
      // Must be a substantive non-trivial multiplication (both factors >= 2)
      if (a >= 2 && b >= 2 && (a >= 10 || b >= 10)) {
        mulBigs.push(`${a}×${b}`);
        mulBonus += a >= 20 || b >= 20 ? 22 : 16;
        if (a >= 10 && b >= 10) mulBonus += 12;
      }
    }
  }
  if (mulBigs.length > 0) {
    score += Math.min(45, mulBonus);
    tags.push(`九九超え (${mulBigs.join(', ')})`);
    reasons.push(`九九(9×9)を超える掛け算 (${mulBigs.join(', ')}) を巧みに活用`);
  }

  // 4. Operator diversity
  // Group +0 and -0 as equivalent additive identity ('identity_zero')
  // Group ×1 and ÷1 as equivalent multiplicative identity ('identity_one')
  const opCategories = new Set<string>();
  for (const st of sol.steps) {
    if (isZeroIdentityStep(st)) {
      opCategories.add('identity_zero');
    } else if (isOneIdentityStep(st)) {
      opCategories.add('identity_one');
    } else {
      opCategories.add(st.operator);
    }
  }

  const opCount = opCategories.size;
  if (opCount >= 4) {
    score += 26;
    tags.push('4種演算融合');
    reasons.push('加減乗除や相殺・中立化を含む4種の演算構造を完全に融合');
  } else if (opCount === 3) {
    score += 15;
    tags.push('3種演算融合');
    reasons.push('3種類の多様な演算・構造を柔軟に組み合わせて計算');
  } else if (opCount === 1) {
    const only = Array.from(opCategories)[0];
    if (only === '+' || only === '×') {
      score -= 10;
      reasons.push('単純な同種演算子の反復');
    }
  }

  // 5. Clever division (substantive division where divisor > 1; ÷1 is evaluated equivalently to ×1 above)
  const substantiveDivSteps = sol.steps.filter((st) => st.operator === '÷' && st.rightValue > 1);
  if (substantiveDivSteps.length > 0) {
    score += 12;
    tags.push('巧みな除算');
    const hasUnitDiv = substantiveDivSteps.some((st) => st.leftValue === st.rightValue);
    if (hasUnitDiv) {
      score += 8;
      tags.push('1の生成 (N÷N)');
      reasons.push('同数除算（N÷N）により「1」をスマートに生成');
    } else {
      reasons.push('余りの出ない割り算による鮮やかな縮約');
    }
  }

  // 6. Bold detour / Peak value
  const peakVal = sol.steps.length > 0 ? Math.max(...sol.steps.map((st) => st.result)) : 0;
  if (peakVal > sol.target * 1.25 && peakVal >= 25) {
    score += 14;
    tags.push(`大胆な迂回 (${peakVal})`);
    reasons.push(`目標値を超える中間値 (${peakVal}) を作ってから着地する迂回ルート`);
  }

  // 7. Tree structure (parallel pairs)
  if (sol.steps.length >= 3) {
    const s1 = sol.steps[0];
    const s2 = sol.steps[1];
    if (s2.leftValue !== s1.result && s2.rightValue !== s1.result) {
      score += 10;
      tags.push('左右並行構造');
      reasons.push('2つのグループを個別に組み立てて合体させる高度な対称構造');
    }
  }

  // Clamp (5 - 100)
  score = Math.max(5, Math.min(100, score));

  // Grade & Stars
  let grade: 'S' | 'A' | 'B' | 'C' | 'D';
  let stars: number;
  if (score >= 85) {
    grade = 'S';
    stars = 5;
  } else if (score >= 70) {
    grade = 'A';
    stars = 4;
  } else if (score >= 50) {
    grade = 'B';
    stars = 3;
  } else if (score >= 30) {
    grade = 'C';
    stars = 2;
  } else {
    grade = 'D';
    stars = 1;
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
export function solveGame(initialNumbers: number[], target: number): Solution[] {
  if (initialNumbers.length === 0) return [];

  const solutionsMap = new Map<string, Solution>();

  function search(pool: SearchItem[], history: StepRecord[]) {
    // Check if any node in current pool equals target
    for (const item of pool) {
      if (item.ast.val === target) {
        const canonical = astToCanonical(item.ast);
        const canonicalKey = `${canonical}#cards:${item.usedIndices.length}`;

        if (!solutionsMap.has(canonicalKey)) {
          const usedValues = item.usedIndices.map((i) => initialNumbers[i]);
          const ops: Operator[] = [];
          for (const s of history) {
            if (!ops.includes(s.operator)) ops.push(s.operator);
          }

          const partialSol: Omit<Solution, 'artistry'> = {
            id: `sol-${solutionsMap.size + 1}`,
            expression: astToString(item.ast),
            canonicalFormula: canonical,
            target,
            cardsUsedCount: item.usedIndices.length,
            totalCardsCount: initialNumbers.length,
            usesAllCards: item.usedIndices.length === initialNumbers.length,
            steps: history,
            usedInitialValues: usedValues,
            operatorsUsed: ops,
          };

          solutionsMap.set(canonicalKey, {
            ...partialSol,
            artistry: evaluateArtistry(partialSol),
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
            [...rest, { ast: newAst, usedIndices: combinedUsedIndices }],
            [...history, newStep]
          );
        }
      }
    }
  }

  const initialItems: SearchItem[] = initialNumbers.map((val, idx) => ({
    ast: makeNum(val),
    usedIndices: [idx],
  }));

  search(initialItems, []);

  const results = Array.from(solutionsMap.values());

  // Sort solutions:
  // 1. First by usesAllCards (5 cards first)
  // 2. By fewer steps / cards used
  // 3. Alphabetically by expression
  results.sort((a, b) => {
    if (a.usesAllCards !== b.usesAllCards) {
      return a.usesAllCards ? -1 : 1;
    }
    if (a.cardsUsedCount !== b.cardsUsedCount) {
      return b.cardsUsedCount - a.cardsUsedCount;
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
