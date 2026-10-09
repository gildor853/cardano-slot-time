import { describe, expect, it } from "vitest";
import {
  MAINNET,
  PREPROD,
  PREVIEW,
  createNetworkConfig,
  slotToTime,
  tryCreateNetworkConfig,
  type EraInput,
} from "../src/index.js";
import { codeOf } from "./helpers.js";

describe("presets", () => {
  // Values from the genesis files in
  // https://github.com/input-output-hk/cardano-configurations (network/*/genesis).
  it("mainnet: Byron epochs 0-207, Shelley+ from slot 4492800", () => {
    expect(MAINNET.systemStart).toBe(Date.parse("2017-09-23T21:44:51Z"));
    expect(MAINNET.eras).toHaveLength(2);
    expect(MAINNET.eras[0]).toMatchObject({ slotLengthMs: 20000, epochLength: 21600, startSlot: 0, epochs: 208 });
    expect(MAINNET.eras[1]).toMatchObject({
      slotLengthMs: 1000,
      epochLength: 432000,
      startSlot: 4492800,
      startEpoch: 208,
      startTime: Date.parse("2020-07-29T21:44:51Z"),
    });
  });

  it("preprod: Byron epochs 0-3, Shelley+ from slot 86400", () => {
    expect(PREPROD.systemStart).toBe(Date.parse("2022-06-01T00:00:00Z"));
    expect(PREPROD.eras[1]).toMatchObject({
      startSlot: 86400,
      startEpoch: 4,
      startTime: Date.parse("2022-06-21T00:00:00Z"),
      epochLength: 432000,
    });
  });

  it("preview: single 1 s era with 86400-slot epochs", () => {
    expect(PREVIEW.systemStart).toBe(Date.parse("2022-10-25T00:00:00Z"));
    expect(PREVIEW.eras).toEqual([
      { slotLengthMs: 1000, epochLength: 86400, startSlot: 0, startEpoch: 0, startTime: PREVIEW.systemStart, epochs: undefined },
    ]);
  });

  it("matches Lucid's SLOT_CONFIG_NETWORK Shelley zero points", () => {
    // https://github.com/spacebudz/lucid/blob/0.10.7/src/plutus/time.ts
    expect(slotToTime(4492800, MAINNET)).toBe(1596059091000);
    expect(slotToTime(86400, PREPROD)).toBe(1654041600000 + 1728000000);
    expect(slotToTime(0, PREVIEW)).toBe(1666656000000);
  });

  it("presets are frozen", () => {
    expect(Object.isFrozen(MAINNET)).toBe(true);
    expect(Object.isFrozen(MAINNET.eras)).toBe(true);
    expect(Object.isFrozen(MAINNET.eras[0])).toBe(true);
  });
});

describe("createNetworkConfig", () => {
  it("computes era boundaries", () => {
    const net = createNetworkConfig({
      name: "devnet",
      systemStart: "2024-01-01T00:00:00Z",
      eras: [
        { slotLengthMs: 20000, epochLength: 100, epochs: 2 },
        { slotLengthMs: 1000, epochLength: 500 },
      ],
    });
    expect(net.name).toBe("devnet");
    expect(net.eras[1]).toMatchObject({
      startSlot: 200,
      startEpoch: 2,
      startTime: Date.parse("2024-01-01T00:00:00Z") + 200 * 20000,
    });
  });

  it("accepts Date and number system starts, defaults name", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    const eras = [{ slotLengthMs: 1000, epochLength: 10 }];
    expect(createNetworkConfig({ systemStart: d, eras }).systemStart).toBe(d.getTime());
    expect(createNetworkConfig({ systemStart: 0, eras }).name).toBe("custom");
  });

  const bad: Array<[string, EraInput[] | undefined, unknown]> = [
    ["no eras", [], 0],
    ["eras not an array", undefined, 0],
    ["zero slot length", [{ slotLengthMs: 0, epochLength: 10 }], 0],
    ["fractional slot length", [{ slotLengthMs: 1.5, epochLength: 10 }], 0],
    ["negative epoch length", [{ slotLengthMs: 1000, epochLength: -1 }], 0],
    ["missing epochs on non-final era", [{ slotLengthMs: 1000, epochLength: 10 }, { slotLengthMs: 1000, epochLength: 10 }], 0],
    ["epochs on final era", [{ slotLengthMs: 1000, epochLength: 10, epochs: 3 }], 0],
    ["invalid ISO start", [{ slotLengthMs: 1000, epochLength: 10 }], "not a date"],
    ["NaN start", [{ slotLengthMs: 1000, epochLength: 10 }], Number.NaN],
    [
      "era boundary overflow",
      [{ slotLengthMs: 1000, epochLength: 2 ** 40, epochs: 2 ** 20 }, { slotLengthMs: 1000, epochLength: 1 }],
      0,
    ],
  ];

  it.each(bad)("rejects %s", (_name, eras, systemStart) => {
    const input = { systemStart, eras } as never;
    expect(codeOf(() => createNetworkConfig(input))).toBe("InvalidConfig");
    const r = tryCreateNetworkConfig(input);
    expect(r.ok).toBe(false);
  });

  it("rejects a non-object config", () => {
    expect(codeOf(() => createNetworkConfig(null as never))).toBe("InvalidConfig");
  });
});
