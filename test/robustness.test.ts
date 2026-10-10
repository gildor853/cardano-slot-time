import { describe, expect, it } from "vitest";
import {
  MAINNET,
  PREVIEW,
  createNetworkConfig,
  epochBounds,
  slotToDate,
  slotToEpoch,
  slotToTime,
  timeToSlot,
  tryEpochBounds,
  tryEpochToFirstSlot,
  trySlotInEpoch,
  tryTimeToEpoch,
  tryTimeToSlot,
  type NetworkConfig,
} from "../src/index.js";
import { codeOf } from "./helpers.js";

describe("network configs not built by createNetworkConfig", () => {
  it("accepts a structurally valid copy (e.g. JSON round-trip)", () => {
    const copy = JSON.parse(JSON.stringify(MAINNET)) as NetworkConfig;
    for (const slot of [0, 4_492_799, 4_492_800, 150_000_000]) {
      expect(slotToTime(slot, copy)).toBe(slotToTime(slot, MAINNET));
      expect(slotToEpoch(slot, copy)).toBe(slotToEpoch(slot, MAINNET));
    }
    expect(epochBounds(500, copy)).toEqual(epochBounds(500, MAINNET));
  });

  it("rejects invalid era parameters instead of returning NaN", () => {
    const zero = { ...PREVIEW, eras: [{ ...PREVIEW.eras[0]!, slotLengthMs: 0 }] } as NetworkConfig;
    expect(codeOf(() => timeToSlot(PREVIEW.systemStart + 1000, zero))).toBe("InvalidNetwork");
    const nan = { ...PREVIEW, eras: [{ ...PREVIEW.eras[0]!, epochLength: Number.NaN }] } as NetworkConfig;
    expect(codeOf(() => slotToEpoch(1, nan))).toBe("InvalidNetwork");
    const badStart = { ...PREVIEW, systemStart: "soon" } as unknown as NetworkConfig;
    expect(codeOf(() => slotToTime(1, badStart))).toBe("InvalidNetwork");
    const notObject = { ...PREVIEW, eras: [null] } as unknown as NetworkConfig;
    expect(codeOf(() => slotToTime(1, notObject))).toBe("InvalidNetwork");
  });

  it("rejects start coordinates that disagree with the era lengths", () => {
    const [byron, shelley] = MAINNET.eras;
    const shifted = { ...MAINNET, eras: [byron!, { ...shelley!, startSlot: 1 }] } as NetworkConfig;
    expect(codeOf(() => slotToTime(10, shifted))).toBe("InvalidNetwork");
  });

  it("revalidates once per object and keeps configs from createNetworkConfig as-is", () => {
    const net = createNetworkConfig({ systemStart: 0, eras: [{ slotLengthMs: 1000, epochLength: 10 }] });
    expect(epochBounds(1, net)).toEqual({ epoch: 1, startSlot: 10, endSlot: 19, startTime: 10_000, endTime: 20_000 });
    const copy = { ...net };
    expect(slotToTime(5, copy)).toBe(5000);
    expect(slotToTime(6, copy)).toBe(6000);
  });
});

describe("Date range", () => {
  it("reports BeforeGenesis for times outside the Date range instead of a RangeError", () => {
    expect(codeOf(() => timeToSlot(-1e20, MAINNET))).toBe("BeforeGenesis");
    const r = tryTimeToSlot(-1e20, MAINNET);
    expect(!r.ok && r.error.code).toBe("BeforeGenesis");
  });

  it("slotToDate throws Overflow instead of returning an Invalid Date", () => {
    const net = createNetworkConfig({ systemStart: 0, eras: [{ slotLengthMs: 1_000_000, epochLength: 10 }] });
    expect(slotToDate(8_640_000_000, net).getTime()).toBe(8.64e15);
    expect(codeOf(() => slotToDate(8_640_000_001, net))).toBe("Overflow");
  });
});

describe("try* variants", () => {
  it("cover every throwing conversion", () => {
    expect(trySlotInEpoch(4_492_800 + 5, MAINNET)).toEqual({ ok: true, value: 5 });
    expect(tryEpochToFirstSlot(208, MAINNET)).toEqual({ ok: true, value: 4_492_800 });
    expect(tryTimeToEpoch(PREVIEW.systemStart, "preview")).toEqual({ ok: true, value: 0 });
    const b = tryEpochBounds(0, "preview");
    expect(b.ok && b.value.endSlot).toBe(86_399);
    for (const r of [
      trySlotInEpoch(-1, MAINNET),
      tryEpochToFirstSlot(-1, MAINNET),
      tryTimeToEpoch(Number.NaN, MAINNET),
      tryEpochBounds(1.5, MAINNET),
      tryEpochBounds(0, "nope" as never),
    ]) {
      expect(r.ok).toBe(false);
    }
  });
});
