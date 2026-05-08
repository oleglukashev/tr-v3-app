// Verbatim port of tr-v2/src/utils/fib.ts — kept identical so tr-v2 and the
// client-side backtest produce the same values.

interface CalculateInterface {
  levels: Record<number | string, number | string>;
  answerLevels?: any;
}

function calculate({ levels, answerLevels }: CalculateInterface) {
  if (
    !levels ||
    typeof levels !== 'object' ||
    Array.isArray(levels) ||
    Object.keys(levels).length === 0
  ) {
    throw new Error('Unable to compute fib trace with the referenced `levels`');
  }

  const one = Number(levels[1]);
  const zero = Number(levels[0]);

  if (isNaN(one) || isNaN(zero)) {
    return {};
  }

  const distance = Math.abs(one - zero);
  const operation =
    one > zero
      ? (first: number, second: number) => first - second
      : (first: number, second: number) => first + second;

  return Object.fromEntries(
    (answerLevels || defaultLevels).map((level: any) => {
      const difference = (1 - level) * distance;
      const value = operation(Number(levels[1]), difference);
      return [level, value];
    }),
  );
}

export function getFibRetracement({ levels, answerLevels }: CalculateInterface) {
  return calculate({ levels, answerLevels } as CalculateInterface);
}

export const defaultLevels = [
  0, 0.132, 0.236, 0.25, 0.368, 0.382, 0.49, 0.5, 0.608, 0.618, 0.768, 0.86, 1,
  1.286, 1.618, 2.414,
];
