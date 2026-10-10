import { describe, expect, it } from "vitest";
import { CardanoSlotTimeError, isCardanoSlotTimeError, trySlotToTime } from "../src/index.js";
import { attempt, show } from "../src/errors.js";

describe("errors", () => {
  it("CardanoSlotTimeError carries name, code and message", () => {
    const err = new CardanoSlotTimeError("InvalidSlot", "bad slot");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CardanoSlotTimeError");
    expect(err.code).toBe("InvalidSlot");
    expect(err.message).toBe("bad slot");
  });

  it("isCardanoSlotTimeError narrows only library errors", () => {
    expect(isCardanoSlotTimeError(new CardanoSlotTimeError("InvalidSlot", "x"))).toBe(true);
    expect(isCardanoSlotTimeError(new Error("x"))).toBe(false);
    expect(isCardanoSlotTimeError({ code: "InvalidSlot" })).toBe(false);
    expect(isCardanoSlotTimeError(undefined)).toBe(false);
  });

  it("try* variants return library errors as results", () => {
    const r = trySlotToTime(-1, "mainnet");
    expect(!r.ok && isCardanoSlotTimeError(r.error) && r.error.code).toBe("InvalidSlot");
  });

  it("attempt rethrows anything that is not a library error", () => {
    const bug = new TypeError("bug");
    expect(() =>
      attempt(() => {
        throw bug;
      }),
    ).toThrow(bug);
    expect(attempt(() => 1)).toEqual({ ok: true, value: 1 });
  });

  it("show describes untrusted values without throwing", () => {
    expect(show("abc")).toBe('"abc"');
    expect(show("x".repeat(50))).toBe(JSON.stringify(`${"x".repeat(40)}…`));
    expect(show(42)).toBe("42");
    expect(show(null)).toBe("null");
    expect(show(undefined)).toBe("undefined");
    expect(show(Symbol("s"))).toBe("Symbol(s)");
    expect(show(Object.create(null))).toBe("[object Object]");
    expect(show([1, 2])).toBe("[object Array]");
    expect(show(new Date(Number.NaN))).toBe("Invalid Date");
    expect(show(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
  });
});
