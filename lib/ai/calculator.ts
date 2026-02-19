/**
 * Calculator module for AI tool calls.
 * Basic arithmetic operations supporting variadic arguments.
 */

/**
 * Add two or more numbers.
 */
export function add(a: number, b: number, ...rest: number[]): number {
  return [a, b, ...rest].reduce((sum, n) => sum + n, 0);
}

/**
 * Subtract b from a, then subtract each additional argument in order.
 * subtract(10, 3, 2) => 10 - 3 - 2 = 5
 */
export function subtract(a: number, b: number, ...rest: number[]): number {
  return [a, b, ...rest].reduce((acc, n, i) => (i === 0 ? n : acc - n), 0);
}

/**
 * Multiply two or more numbers.
 */
export function mult(a: number, b: number, ...rest: number[]): number {
  return [a, b, ...rest].reduce((prod, n) => prod * n, 1);
}

/**
 * Divide a by b, then divide by each additional argument in order.
 * div(100, 5, 2) => 100 / 5 / 2 = 10
 */
export function div(a: number, b: number, ...rest: number[]): number {
  return [a, b, ...rest].reduce((acc, n, i) => (i === 0 ? n : acc / n), 0);
}

/** Args shape for AI tool calls (rest as array) */
export interface CalculatorToolArgs {
  a: number;
  b: number;
  rest?: number[];
}

/** Execute a calculator tool by name. Use when handling AI tool calls. */
export function executeCalculatorTool(
  name: "add" | "subtract" | "mult" | "div",
  args: CalculatorToolArgs
): number {
  const { a, b, rest = [] } = args;
  switch (name) {
    case "add":
      return add(a, b, ...rest);
    case "subtract":
      return subtract(a, b, ...rest);
    case "mult":
      return mult(a, b, ...rest);
    case "div":
      return div(a, b, ...rest);
  }
}
