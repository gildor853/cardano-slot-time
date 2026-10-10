/**
 * Machine-readable error codes raised by this library.
 */
export type ErrorCode =
  | "InvalidSlot"
  | "InvalidEpoch"
  | "InvalidTime"
  | "BeforeGenesis"
  | "InvalidConfig"
  | "InvalidNetwork"
  | "Overflow";

/**
 * The single error class thrown by every throwing function in this library.
 * Use the `code` property to branch on the failure reason.
 */
export class CardanoSlotTimeError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "CardanoSlotTimeError";
    this.code = code;
  }
}

/** Result object returned by every `try*` function. Never throws. */
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CardanoSlotTimeError };

/** Narrowing helper: `true` when `err` is a {@link CardanoSlotTimeError}. */
export function isCardanoSlotTimeError(err: unknown): err is CardanoSlotTimeError {
  return err instanceof CardanoSlotTimeError;
}

/** @internal */
export function fail(code: ErrorCode, message: string): never {
  throw new CardanoSlotTimeError(code, message);
}

/** @internal Wraps a throwing function into a `Result`. */
export function attempt<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    if (err instanceof CardanoSlotTimeError) return { ok: false, error: err };
    throw err;
  }
}

/** @internal Short description of an untrusted value for error messages; never throws. */
export function show(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return String(value);
  return Object.prototype.toString.call(value);
}
