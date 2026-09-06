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
 *
 * Revised Criteria:
 * 1. [最高峰の芸術性] 3桁以上（100以上）を経由してからの除算パターン (最も評価が高い: +45点)
 *    TARGET<=99、手札<=9のルールにおいて、計算途中で3桁（144など）へ跳ね上げ、
 *    そこから除算でTARGETに着地する解法を最高芸術として評価。
 * 2. 0の加算・減算（+0, -0）および1の乗算・除算（×1, ÷1）は、等価なので差が出ないようにし、それ自体への加点は行わない。
 * 3. [0の生成] 同数減算（A - A = 0）等により自前で「0」を作り出すことには多少の価値 (+8点)
 * 4. [1の生成] 同数除算（N ÷ N = 1）等により自前で「1」を作り出すことには多少の価値 (+10点)
 * 5. 九九超えの掛け算 (合成した2桁以上同士の掛け算: +15〜+25点)
 * 6. 大胆な迂回 (3桁到達、または目標値を大きく超える中間値)
 * 7. 演算子の多様性 (無意味な+0/-0、×1/÷1の水増しを排除した実質演算子数)
 * 8. 左右対称ツリー構造
 */
export function evaluateArtistry(sol: Omit<Solution, 'artistry'>): ArtistryInfo {
  let score = 15; // base score
  const tags: string[] = [];
  const reasons: string[] = [];

  // Intermediate values and peak value
  const results = sol.steps.map((st) => st.result);
  const peakVal = results.length > 0 ? Math.max(...results) : 0;

  // 1. [最高峰の芸術性] 3桁（>= 100）にしてから除算するパターン
  // TARGET <= 99, cards <= 9 なので、途中で3桁（144等）を作ってから除算で落とし込むのは最高峰の妙技
  const threeDigitDivSteps = sol.steps.filter(
    (st) => st.operator === '÷' && (st.leftValue >= 100 || peakVal >= 100) && st.rightValue > 1
  );
  const directThreeDigitDiv = sol.steps.find(
    (st) => st.operator === '÷' && st.leftValue >= 100 && st.rightValue > 1
  );

  if (directThreeDigitDiv) {
    score += 45;
    tags.push(`3桁除算 (${directThreeDigitDiv.leftValue}÷${directThreeDigitDiv.rightValue})`);
    reasons.push(
      `初期カードから3桁（${directThreeDigitDiv.leftValue}）まで数値を大きく飛躍させ、そこから鮮やかな除算で目標値へ着地する最高峰の芸術解法`
    );
  } else if (peakVal >= 100 && threeDigitDivSteps.length > 0) {
    const divStep = threeDigitDivSteps[0];
    score += 40;
    tags.push(`3桁経由除算 (ピーク${peakVal})`);
    reasons.push(
      `計算途中で3桁（${peakVal}）に達した後、除算（÷${divStep.rightValue}）を絡めて目標値へ鮮やかに着地`
    );
  } else if (peakVal >= 100) {
    // 3桁に達したが除算ではない場合の大胆な迂回
    score += 18;
    tags.push(`3桁到達 (${peakVal})`);
    reasons.push(`初期カード（9以下）から3桁（${peakVal}）まで数値を大胆に引き上げてから着地`);
  } else if (peakVal > sol.target * 1.3 && peakVal >= 30) {
    score += 10;
    tags.push(`大胆な迂回 (${peakVal})`);
    reasons.push(`目標値を超える中間値 (${peakVal}) を作ってから着地する迂回ルート`);
  }

  // 2. [0の生成] 自前で 0 を作り出すこと（A - A = 0 など）には多少の価値（+8点）
  // ※ +0 や -0 の演算自体には加点しない（差が出ないよう等価扱い）
  const zeroGenStep = sol.steps.find(
    (st) => st.result === 0 && (st.operator === '-' || st.operator === '×') && st.leftValue > 0
  );
  if (zeroGenStep) {
    score += 8;
    tags.push('0の生成 (相殺)');
    reasons.push(`同数減算（${zeroGenStep.leftValue}-${zeroGenStep.rightValue}=0）等により意図的に0を創出し、余分な手札を中立化`);
  }

  // 3. [1の生成] 自前で 1 を作り出すこと（N ÷ N = 1 や差による1）には多少の価値（+10点）
  // ※ ×1 や ÷1 の恒等演算自体には加点しない（差が出ないよう等価扱い）
  const unitDivStep = sol.steps.find(
    (st) => st.operator === '÷' && st.leftValue === st.rightValue && st.leftValue > 1
  );
  const unitDiffStep = sol.steps.find(
    (st) => st.operator === '-' && st.result === 1 && st.leftValue > 1 && st.rightValue > 1
  );
  if (unitDivStep) {
    score += 10;
    tags.push('1の生成 (N÷N)');
    reasons.push(`同数除算（${unitDivStep.leftValue}÷${unitDivStep.rightValue}=1）により意図的に「1」を創出して活用`);
  } else if (unitDiffStep) {
    score += 6;
    tags.push('1の生成 (差)');
    reasons.push(`引き算（${unitDiffStep.leftValue}-${unitDiffStep.rightValue}=1）により意図的に「1」を創出して活用`);
  }

  // 4. 九九超えの掛け算 (合成した2桁以上の数同士の掛け算)
  const mulBigs: string[] = [];
  let mulBonus = 0;
  for (const st of sol.steps) {
    if (st.operator === '×') {
      const a = st.leftValue;
      const b = st.rightValue;
      if (a >= 2 && b >= 2 && (a >= 10 || b >= 10)) {
        mulBigs.push(`${a}×${b}`);
        mulBonus += a >= 20 || b >= 20 ? 18 : 12;
        if (a >= 10 && b >= 10) mulBonus += 10;
      }
    }
  }
  if (mulBigs.length > 0) {
    score += Math.min(30, mulBonus);
    tags.push(`九九超え (${mulBigs.join(', ')})`);
    reasons.push(`九九(9×9)を超える掛け算 (${mulBigs.join(', ')}) を巧みに活用`);
  }

  // 5. 通常の巧みな除算（3桁除算や同数除算以外の、2以上の割る数による除算）
  const regularDivSteps = sol.steps.filter(
    (st) =>
      st.operator === '÷' &&
      st.rightValue > 1 &&
      st.leftValue !== st.rightValue &&
      st.leftValue < 100
  );
  if (regularDivSteps.length > 0 && !directThreeDigitDiv) {
    score += 10;
    tags.push('巧みな除算');
    reasons.push('余りの出ない割り算による鮮やかな縮約');
  }

  // 6. Operator diversity
  // Group +0 and -0 as equivalent additive identity ('identity_zero') so they do not differentiate or inflate count
  // Group ×1 and ÷1 as equivalent multiplicative identity ('identity_one') so they do not differentiate or inflate count
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

  // Count substantial arithmetic operators (excluding pure identity pass-through)
  const substantialOps = new Set(
    sol.steps
      .filter((st) => !isZeroIdentityStep(st) && !isOneIdentityStep(st))
      .map((st) => st.operator)
  );

  if (substantialOps.size >= 4) {
    score += 20;
    tags.push('4種演算融合');
    reasons.push('加減乗除の4種の実質的な演算を高度に融合');
  } else if (substantialOps.size === 3) {
    score += 10;
    tags.push('3種演算融合');
    reasons.push('3種類の実質的な演算を柔軟に組み合わせて計算');
  } else if (opCategories.size === 1) {
    const only = Array.from(opCategories)[0];
    if (only === '+' || only === '×') {
      score -= 10;
      reasons.push('単純な同種演算子の反復');
    }
  }

  // 7. Tree structure (parallel pairs calculation)
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
