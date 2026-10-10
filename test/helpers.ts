import { CardanoSlotTimeError, type ErrorCode } from "../src/index.js";

export function codeOf(fn: () => unknown): ErrorCode | undefined {
  try {
    fn();
  } catch (err) {
    if (err instanceof CardanoSlotTimeError) return err.code;
    throw err;
  }
  return undefined;
}
