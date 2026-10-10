import { attempt, fail, show, type Result } from "./errors.js";
import { resolveNetwork, type Era, type NetworkConfig, type NetworkInput } from "./config.js";

/** A point in time: POSIX milliseconds or a `Date`. */
export type TimeInput = number | Date;

/** Slot and time bounds of an epoch. */
export interface EpochBounds {
  readonly epoch: number;
  /** First slot of the epoch. */
  readonly startSlot: number;
  /** Last slot of the epoch (inclusive). */
  readonly endSlot: number;
  /** POSIX ms at which the epoch starts (start of `startSlot`). */
  readonly startTime: number;
  /** POSIX ms at which the epoch ends (exclusive; start of the next epoch). */
  readonly endTime: number;
}

function checkSlot(slot: number): void {
  if (typeof slot !== "number" || !Number.isSafeInteger(slot) || slot < 0) {
    fail("InvalidSlot", `Slot must be a non-negative safe integer, got ${show(slot)}`);
  }
}

function checkEpoch(epoch: number): void {
  if (typeof epoch !== "number" || !Number.isSafeInteger(epoch) || epoch < 0) {
    fail("InvalidEpoch", `Epoch must be a non-negative safe integer, got ${show(epoch)}`);
  }
}

function toMs(time: TimeInput): number {
  const ms = time instanceof Date ? time.getTime() : time;
  if (typeof ms !== "number" || !Number.isFinite(ms)) fail("InvalidTime", `Invalid time: ${show(time)}`);
  return ms;
}

/** Largest absolute time value a `Date` can hold (ECMA-262, 100 million days). */
const MAX_DATE_MS = 8.64e15;

/** ISO string for times a `Date` can represent, raw milliseconds otherwise. */
function formatMs(ms: number): string {
  return Math.abs(ms) <= MAX_DATE_MS ? new Date(ms).toISOString() : `${ms} ms`;
}

function safe(n: number, what: string): number {
  if (!Number.isSafeInteger(n)) fail("Overflow", `${what} exceeds Number.MAX_SAFE_INTEGER`);
  return n;
}

function findEra<K extends "startSlot" | "startEpoch" | "startTime">(
  net: NetworkConfig,
  key: K,
  value: number,
): Era {
  let found = net.eras[0]!;
  for (const era of net.eras) {
    if (era[key] <= value) found = era;
    else break;
  }
  return found;
}

/** POSIX time (ms) at which `slot` begins. */
export function slotToTime(slot: number, network: NetworkInput): number {
  const net = resolveNetwork(network);
  checkSlot(slot);
  const era = findEra(net, "startSlot", slot);
  return safe(era.startTime + (slot - era.startSlot) * era.slotLengthMs, "Time");
}

/** `Date` at which `slot` begins. */
export function slotToDate(slot: number, network: NetworkInput): Date {
  const ms = slotToTime(slot, network);
  if (Math.abs(ms) > MAX_DATE_MS) fail("Overflow", `Slot ${slot} is beyond the range of a JavaScript Date`);
  return new Date(ms);
}

/** Non-throwing variant of {@link slotToTime}. */
export function trySlotToTime(slot: number, network: NetworkInput): Result<number> {
  return attempt(() => slotToTime(slot, network));
}

/**
 * The slot in progress at `time` (POSIX ms or `Date`). Times inside a slot
 * round down to that slot. Throws `BeforeGenesis` for times before slot 0.
 */
export function timeToSlot(time: TimeInput, network: NetworkInput): number {
  const net = resolveNetwork(network);
  const ms = toMs(time);
  if (ms < net.systemStart) {
    fail("BeforeGenesis", `Time ${formatMs(ms)} is before the ${net.name} system start`);
  }
  const era = findEra(net, "startTime", ms);
  return safe(era.startSlot + Math.floor((ms - era.startTime) / era.slotLengthMs), "Slot");
}

/** Non-throwing variant of {@link timeToSlot}. */
export function tryTimeToSlot(time: TimeInput, network: NetworkInput): Result<number> {
  return attempt(() => timeToSlot(time, network));
}

/** The epoch containing `slot`. */
export function slotToEpoch(slot: number, network: NetworkInput): number {
  const net = resolveNetwork(network);
  checkSlot(slot);
  const era = findEra(net, "startSlot", slot);
  return era.startEpoch + Math.floor((slot - era.startSlot) / era.epochLength);
}

/** Non-throwing variant of {@link slotToEpoch}. */
export function trySlotToEpoch(slot: number, network: NetworkInput): Result<number> {
  return attempt(() => slotToEpoch(slot, network));
}

/** Zero-based index of `slot` within its epoch. */
export function slotInEpoch(slot: number, network: NetworkInput): number {
  const net = resolveNetwork(network);
  checkSlot(slot);
  const era = findEra(net, "startSlot", slot);
  return (slot - era.startSlot) % era.epochLength;
}

/** Non-throwing variant of {@link slotInEpoch}. */
export function trySlotInEpoch(slot: number, network: NetworkInput): Result<number> {
  return attempt(() => slotInEpoch(slot, network));
}

/** First slot of `epoch`. */
export function epochToFirstSlot(epoch: number, network: NetworkInput): number {
  const net = resolveNetwork(network);
  checkEpoch(epoch);
  const era = findEra(net, "startEpoch", epoch);
  return safe(era.startSlot + (epoch - era.startEpoch) * era.epochLength, "Slot");
}

/** Non-throwing variant of {@link epochToFirstSlot}. */
export function tryEpochToFirstSlot(epoch: number, network: NetworkInput): Result<number> {
  return attempt(() => epochToFirstSlot(epoch, network));
}

/** The epoch in progress at `time`. */
export function timeToEpoch(time: TimeInput, network: NetworkInput): number {
  return slotToEpoch(timeToSlot(time, network), network);
}

/** Non-throwing variant of {@link timeToEpoch}. */
export function tryTimeToEpoch(time: TimeInput, network: NetworkInput): Result<number> {
  return attempt(() => timeToEpoch(time, network));
}

/** Start/end slots and times of `epoch`. */
export function epochBounds(epoch: number, network: NetworkInput): EpochBounds {
  const net = resolveNetwork(network);
  const startSlot = epochToFirstSlot(epoch, net);
  const nextSlot = epochToFirstSlot(safe(epoch + 1, "Epoch"), net);
  return {
    epoch,
    startSlot,
    endSlot: nextSlot - 1,
    startTime: slotToTime(startSlot, net),
    endTime: slotToTime(nextSlot, net),
  };
}

/** Non-throwing variant of {@link epochBounds}. */
export function tryEpochBounds(epoch: number, network: NetworkInput): Result<EpochBounds> {
  return attempt(() => epochBounds(epoch, network));
}

/** The current slot. `now` defaults to `Date.now()` (inject it in tests). */
export function currentSlot(network: NetworkInput, now: TimeInput = Date.now()): number {
  return timeToSlot(now, network);
}

/** The current epoch. `now` defaults to `Date.now()` (inject it in tests). */
export function currentEpoch(network: NetworkInput, now: TimeInput = Date.now()): number {
  return timeToEpoch(now, network);
}
