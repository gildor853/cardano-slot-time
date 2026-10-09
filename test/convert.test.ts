import { describe, expect, it } from "vitest";
import {
  MAINNET,
  PREPROD,
  PREVIEW,
  createNetworkConfig,
  currentEpoch,
  currentSlot,
  epochBounds,
  epochToFirstSlot,
  slotInEpoch,
  slotToDate,
  slotToEpoch,
  slotToTime,
  timeToEpoch,
  timeToSlot,
  trySlotToEpoch,
  trySlotToTime,
  tryTimeToSlot,
  type NetworkConfig,
} from "../src/index.js";
import {
  MAINNET_EPOCHS,
  MAINNET_SLOTS,
  PREPROD_EPOCHS,
  PREPROD_SLOTS,
  PREVIEW_EPOCHS,
  PREVIEW_SLOTS,
  type EpochPoint,
  type SlotPoint,
} from "./checkpoints.js";
import { codeOf } from "./helpers.js";

const networks: Array<[string, NetworkConfig, readonly SlotPoint[], readonly EpochPoint[]]> = [
  ["mainnet", MAINNET, MAINNET_SLOTS, MAINNET_EPOCHS],
  ["preprod", PREPROD, PREPROD_SLOTS, PREPROD_EPOCHS],
  ["preview", PREVIEW, PREVIEW_SLOTS, PREVIEW_EPOCHS],
];

describe.each(networks)("%s on-chain checkpoints", (name, net, slots, epochs) => {
  it.each(slots.map((p) => [p.slot, p] as const))("slot %i", (_slot, p) => {
    expect(slotToTime(p.slot, net)).toBe(p.time * 1000);
    expect(slotToDate(p.slot, net).getTime()).toBe(p.time * 1000);
    expect(timeToSlot(p.time * 1000, net)).toBe(p.slot);
    expect(timeToSlot(new Date(p.time * 1000), net)).toBe(p.slot);
    expect(slotToEpoch(p.slot, net)).toBe(p.epoch);
    expect(slotInEpoch(p.slot, net)).toBe(p.slotInEpoch);
    // Preset names resolve to the same config.
    expect(slotToTime(p.slot, name as "mainnet")).toBe(p.time * 1000);
  });

  it.each(epochs.map((e) => [e.epoch, e] as const))("epoch %i", (_epoch, e) => {
    const b = epochBounds(e.epoch, net);
    expect(b.startTime).toBe(e.start * 1000);
    expect(b.endTime).toBe(e.end * 1000);
    expect(b.startSlot).toBe(epochToFirstSlot(e.epoch, net));
    expect(slotToEpoch(b.startSlot, net)).toBe(e.epoch);
    expect(slotToEpoch(b.endSlot, net)).toBe(e.epoch);
    expect(slotToEpoch(b.endSlot + 1, net)).toBe(e.epoch + 1);
    expect(slotInEpoch(b.startSlot, net)).toBe(0);
    expect(timeToEpoch(e.start * 1000, net)).toBe(e.epoch);
    expect(timeToEpoch(e.end * 1000 - 1, net)).toBe(e.epoch);
  });
});

describe("era boundary (mainnet Byron -> Shelley)", () => {
  it("epoch 207 is the last 20 s Byron epoch", () => {
    const b = epochBounds(207, MAINNET);
    expect(b).toEqual({
      epoch: 207,
      startSlot: 4471200,
      endSlot: 4492799,
      startTime: Date.parse("2020-07-24T21:44:51Z"), // Byron epochs last 5 days
      endTime: Date.parse("2020-07-29T21:44:51Z"),
    });
    expect(b.endTime - b.startTime).toBe(21600 * 20000);
  });

  it("epoch 208 is the first 1 s Shelley epoch", () => {
    const b = epochBounds(208, MAINNET);
    expect(b.startSlot).toBe(4492800);
    expect(b.endSlot).toBe(4492800 + 432000 - 1);
    expect(new Date(b.startTime).toISOString()).toBe("2020-07-29T21:44:51.000Z");
    expect(b.endTime - b.startTime).toBe(432000 * 1000);
  });

  it("times inside a Byron slot round down", () => {
    const t = slotToTime(4492799, MAINNET);
    expect(timeToSlot(t + 1, MAINNET)).toBe(4492799);
    expect(timeToSlot(t + 19999, MAINNET)).toBe(4492799);
    expect(timeToSlot(t + 20000, MAINNET)).toBe(4492800);
  });

  it("times inside a Shelley slot round down", () => {
    const t = slotToTime(4492800, MAINNET);
    expect(timeToSlot(t + 999, MAINNET)).toBe(4492800);
    expect(timeToSlot(t + 1000, MAINNET)).toBe(4492801);
  });

  it("preprod Byron -> Shelley boundary at slot 86400", () => {
    expect(slotToTime(86399, PREPROD)).toBe(Date.parse("2022-06-21T00:00:00Z") - 20000);
    expect(slotToEpoch(86399, PREPROD)).toBe(3);
    expect(slotInEpoch(86399, PREPROD)).toBe(21599);
    expect(slotToEpoch(86400, PREPROD)).toBe(4);
  });

  it("a single linear Shelley formula would be wrong for Byron slots", () => {
    const linear = 1596059091000 + (1000000 - 4492800) * 1000;
    expect(slotToTime(1000000, MAINNET)).not.toBe(linear);
  });
});

describe("round-trips", () => {
  const sample = [0, 1, 21599, 21600, 86399, 86400, 4492799, 4492800, 4492801, 10_000_000, 150_000_000, 250_000_000];
  it.each(networks.map(([n, net]) => [n, net] as const))("%s slot -> time -> slot", (_n, net) => {
    for (const slot of sample) expect(timeToSlot(slotToTime(slot, net), net)).toBe(slot);
  });
  it.each(networks.map(([n, net]) => [n, net] as const))("%s epoch -> slot -> epoch", (_n, net) => {
    for (let epoch = 0; epoch < 2000; epoch += 7) {
      expect(slotToEpoch(epochToFirstSlot(epoch, net), net)).toBe(epoch);
    }
  });
});

describe("current slot/epoch", () => {
  it("uses the injected clock", () => {
    const now = 1791571739000;
    expect(currentSlot(MAINNET, now)).toBe(200005448);
    expect(currentEpoch(MAINNET, new Date(now))).toBe(660);
    expect(currentSlot("preview", 1791571749000)).toBe(124915749);
  });
  it("defaults to Date.now()", () => {
    const before = timeToSlot(Date.now(), MAINNET);
    const s = currentSlot(MAINNET);
    expect(s).toBeGreaterThanOrEqual(before);
    expect(currentEpoch(MAINNET)).toBe(slotToEpoch(s, MAINNET));
  });
});

describe("custom networks", () => {
  const net = createNetworkConfig({
    systemStart: 0,
    eras: [
      { slotLengthMs: 2000, epochLength: 10, epochs: 3 },
      { slotLengthMs: 500, epochLength: 4, epochs: 2 },
      { slotLengthMs: 1000, epochLength: 100 },
    ],
  });
  it("handles three eras", () => {
    expect(slotToTime(29, net)).toBe(58000);
    expect(slotToTime(30, net)).toBe(60000);
    expect(slotToTime(38, net)).toBe(64000);
    expect(slotToEpoch(38, net)).toBe(5);
    expect(epochBounds(4, net)).toEqual({ epoch: 4, startSlot: 34, endSlot: 37, startTime: 62000, endTime: 64000 });
    expect(timeToSlot(63999, net)).toBe(37);
    expect(timeToSlot(64000, net)).toBe(38);
  });
});

describe("errors", () => {
  it("rejects invalid slots", () => {
    for (const s of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, "1" as never]) {
      expect(codeOf(() => slotToTime(s, MAINNET))).toBe("InvalidSlot");
      expect(codeOf(() => slotToEpoch(s, MAINNET))).toBe("InvalidSlot");
      expect(codeOf(() => slotInEpoch(s, MAINNET))).toBe("InvalidSlot");
    }
  });

  it("rejects invalid epochs", () => {
    expect(codeOf(() => epochToFirstSlot(-1, MAINNET))).toBe("InvalidEpoch");
    expect(codeOf(() => epochBounds(0.5, MAINNET))).toBe("InvalidEpoch");
  });

  it("rejects times before genesis", () => {
    expect(codeOf(() => timeToSlot(MAINNET.systemStart - 1, MAINNET))).toBe("BeforeGenesis");
    expect(codeOf(() => timeToSlot(new Date("2020-01-01T00:00:00Z"), PREVIEW))).toBe("BeforeGenesis");
    expect(timeToSlot(MAINNET.systemStart, MAINNET)).toBe(0);
  });

  it("rejects invalid times", () => {
    expect(codeOf(() => timeToSlot(Number.NaN, MAINNET))).toBe("InvalidTime");
    expect(codeOf(() => timeToSlot(new Date("nope"), MAINNET))).toBe("InvalidTime");
  });

  it("rejects unknown networks", () => {
    expect(codeOf(() => slotToTime(0, "sanchonet" as never))).toBe("InvalidNetwork");
    expect(codeOf(() => slotToTime(0, { eras: [] } as never))).toBe("InvalidNetwork");
  });

  it("reports overflow instead of returning unsafe numbers", () => {
    expect(codeOf(() => slotToTime(Number.MAX_SAFE_INTEGER, MAINNET))).toBe("Overflow");
    expect(codeOf(() => epochToFirstSlot(2 ** 50, MAINNET))).toBe("Overflow");
  });

  it("try* variants return results", () => {
    expect(trySlotToTime(4492800, MAINNET)).toEqual({ ok: true, value: 1596059091000 });
    const bad = tryTimeToSlot(0, MAINNET);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("BeforeGenesis");
    expect(trySlotToEpoch(-5, PREPROD).ok).toBe(false);
  });
});
