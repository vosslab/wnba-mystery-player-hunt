/**
 * Nominal identifiers prevent unrelated primitive values from being mixed.
 */
export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type PlayerId = Brand<string, "PlayerId">;
export type PuzzleNumber = Brand<number, "PuzzleNumber">;

export function playerIdFromString(value: string): PlayerId {
  if (!/^\d+$/.test(value)) {
    throw new Error("PlayerId must contain decimal digits only.");
  }

  return value as PlayerId;
}

export function puzzleNumberFromInteger(value: number): PuzzleNumber {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("PuzzleNumber must be a non-negative integer.");
  }

  return value as PuzzleNumber;
}
