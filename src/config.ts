import { attempt, fail, type Result } from "./errors.js";

/** Input description of one era segment for {@link createNetworkConfig}. */
export interface EraInput {
  /** Slot length in milliseconds (positive integer). */
  readonly slotLengthMs: number;
  /** Number of slots per epoch (positive integer). */
  readonly epochLength: number;
  /**
   * How many epochs this era lasts. Required for every era except the last,
   * which is open-ended. Era transitions happen on epoch boundaries, as with
   * Cardano's hard fork combinator.
   */
  readonly epochs?: number;
}

/** A resolved era segment with absolute start coordinates. */
export interface Era {
  readonly slotLengthMs: number;
  readonly epochLength: number;
  /** First slot of the era (absolute slot number). */
  readonly startSlot: number;
  /** First epoch of the era. */
  readonly startEpoch: number;
  /** POSIX time of the era's first slot, in milliseconds. */
  readonly startTime: number;
  /** Number of epochs, or `undefined` for the final open-ended era. */
  readonly epochs: number | undefined;
}

/** A network's time configuration: system start plus ordered eras. */
export interface NetworkConfig {
  readonly name: string;
  /** POSIX time of slot 0, in milliseconds. */
  readonly systemStart: number;
  readonly eras: readonly Era[];
}

/** Input for {@link createNetworkConfig}. */
export interface NetworkConfigInput {
  readonly name?: string;
  /** Time of slot 0: POSIX milliseconds, a `Date`, or an ISO-8601 string. */
  readonly systemStart: number | Date | string;
  /** Eras in chronological order. At least one. */
  readonly eras: readonly EraInput[];
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0;
}

function toMs(value: number | Date | string, what: string): number {
  let ms: number;
  if (typeof value === "number") ms = value;
  else if (value instanceof Date) ms = value.getTime();
  else if (typeof value === "string") ms = Date.parse(value);
  else return fail("InvalidConfig", `${what} must be a number, Date or ISO string`);
  if (!Number.isSafeInteger(ms)) fail("InvalidConfig", `${what} is not a valid time`);
  return ms;
}

/**
 * Builds a validated, frozen {@link NetworkConfig}.
 *
 * @example
 * // A Byron-then-Shelley network like mainnet:
 * createNetworkConfig({
 *   name: "my-devnet",
 *   systemStart: "2024-01-01T00:00:00Z",
 *   eras: [
 *     { slotLengthMs: 20_000, epochLength: 21_600, epochs: 2 },
 *     { slotLengthMs: 1_000, epochLength: 432_000 },
 *   ],
 * });
 */
export function createNetworkConfig(input: NetworkConfigInput): NetworkConfig {
  if (input === null || typeof input !== "object") fail("InvalidConfig", "Config must be an object");
  const systemStart = toMs(input.systemStart, "systemStart");
  if (!Array.isArray(input.eras) || input.eras.length === 0) {
    fail("InvalidConfig", "At least one era is required");
  }

  const eras: Era[] = [];
  let slot = 0;
  let epoch = 0;
  let time = systemStart;
  input.eras.forEach((era, i) => {
    const last = i === input.eras.length - 1;
    if (!isPositiveInt(era.slotLengthMs)) fail("InvalidConfig", `eras[${i}].slotLengthMs must be a positive integer`);
    if (!isPositiveInt(era.epochLength)) fail("InvalidConfig", `eras[${i}].epochLength must be a positive integer`);
    if (!last && !isPositiveInt(era.epochs)) {
      fail("InvalidConfig", `eras[${i}].epochs must be a positive integer (only the last era is open-ended)`);
    }
    if (last && era.epochs !== undefined) {
      fail("InvalidConfig", `eras[${i}].epochs must be omitted: the last era is open-ended`);
    }
    eras.push(
      Object.freeze({
        slotLengthMs: era.slotLengthMs,
        epochLength: era.epochLength,
        startSlot: slot,
        startEpoch: epoch,
        startTime: time,
        epochs: last ? undefined : era.epochs,
      }),
    );
    if (!last) {
      const slots = era.epochs! * era.epochLength;
      slot += slots;
      epoch += era.epochs!;
      time += slots * era.slotLengthMs;
      if (!Number.isSafeInteger(slot) || !Number.isSafeInteger(time)) {
        fail("InvalidConfig", "Era boundaries exceed the safe integer range");
      }
    }
  });

  return Object.freeze({ name: input.name ?? "custom", systemStart, eras: Object.freeze(eras) });
}

/** Non-throwing variant of {@link createNetworkConfig}. */
export function tryCreateNetworkConfig(input: NetworkConfigInput): Result<NetworkConfig> {
  return attempt(() => createNetworkConfig(input));
}

/**
 * Cardano mainnet.
 *
 * - System start 2017-09-23T21:44:51Z (`startTime: 1506203091` in the Byron
 *   genesis, `systemStart` in the Shelley genesis).
 * - Byron: 20 s slots (`blockVersionData.slotDuration: 20000`), 21,600 slots
 *   per epoch (10k with `protocolConsts.k: 2160`), epochs 0-207.
 * - Shelley and later: 1 s slots (`slotLength: 1`), 432,000 slots per epoch
 *   (`epochLength: 432000`), from epoch 208 / slot 4,492,800 /
 *   2020-07-29T21:44:51Z (on-chain hard fork; same zero point as Lucid's
 *   `SLOT_CONFIG_NETWORK.Mainnet`).
 *
 * Sources: https://github.com/input-output-hk/cardano-configurations
 * (network/mainnet/genesis/byron.json, shelley.json).
 */
export const MAINNET: NetworkConfig = createNetworkConfig({
  name: "mainnet",
  systemStart: 1_506_203_091_000,
  eras: [
    { slotLengthMs: 20_000, epochLength: 21_600, epochs: 208 },
    { slotLengthMs: 1_000, epochLength: 432_000 },
  ],
});

/**
 * Cardano preprod testnet.
 *
 * - System start 2022-06-01T00:00:00Z (Byron `startTime: 1654041600`).
 * - Byron: 20 s slots, 21,600 slots per epoch (k = 2160), epochs 0-3.
 * - Shelley and later: 1 s slots, 432,000 slots per epoch, from epoch 4 /
 *   slot 86,400 / 2022-06-21T00:00:00Z (on-chain hard fork; same zero point as
 *   Lucid's `SLOT_CONFIG_NETWORK.Preprod`).
 *
 * Sources: https://github.com/input-output-hk/cardano-configurations
 * (network/preprod/genesis/byron.json, shelley.json).
 */
export const PREPROD: NetworkConfig = createNetworkConfig({
  name: "preprod",
  systemStart: 1_654_041_600_000,
  eras: [
    { slotLengthMs: 20_000, epochLength: 21_600, epochs: 4 },
    { slotLengthMs: 1_000, epochLength: 432_000 },
  ],
});

/**
 * Cardano preview testnet.
 *
 * - System start 2022-10-25T00:00:00Z (Byron `startTime: 1666656000`).
 * - No Byron slots: the node config forks straight into Shelley
 *   (`TestShelleyHardForkAtEpoch: 0`), so all slots are 1 s long with 86,400
 *   slots per epoch (Shelley genesis `epochLength: 86400`).
 *
 * Sources: https://github.com/input-output-hk/cardano-configurations
 * (network/preview/genesis/shelley.json, network/preview/cardano-node/config.json).
 */
export const PREVIEW: NetworkConfig = createNetworkConfig({
  name: "preview",
  systemStart: 1_666_656_000_000,
  eras: [{ slotLengthMs: 1_000, epochLength: 86_400 }],
});

/** Built-in network names accepted wherever a network is expected. */
export type NetworkName = "mainnet" | "preprod" | "preview";

/** A network given as a preset name or a {@link NetworkConfig}. */
export type NetworkInput = NetworkName | NetworkConfig;

/** @internal */
export function resolveNetwork(network: NetworkInput): NetworkConfig {
  if (network === "mainnet") return MAINNET;
  if (network === "preprod") return PREPROD;
  if (network === "preview") return PREVIEW;
  if (network !== null && typeof network === "object" && Array.isArray(network.eras) && network.eras.length > 0) {
    return network;
  }
  return fail("InvalidNetwork", `Unknown network: ${String(network)}`);
}
