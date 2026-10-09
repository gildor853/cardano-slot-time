// Real on-chain reference points.
//
// Source: Koios public API (https://api.koios.rest, https://preprod.koios.rest,
// https://preview.koios.rest), endpoints `/api/v1/blocks` (abs_slot,
// epoch_no, epoch_slot, block_time) and `/api/v1/epoch_info` (start_time,
// end_time), queried on 2026-10-09. Times are POSIX seconds as returned by
// Koios. They can be cross-checked on any explorer (e.g. cardanoscan.io,
// cexplorer.io) by slot or block hash.

export interface SlotPoint {
  readonly slot: number;
  readonly epoch: number;
  readonly slotInEpoch: number;
  /** POSIX seconds */
  readonly time: number;
  readonly note?: string;
}

export interface EpochPoint {
  readonly epoch: number;
  /** POSIX seconds */
  readonly start: number;
  /** POSIX seconds */
  readonly end: number;
}

export const MAINNET_SLOTS: readonly SlotPoint[] = [
  { slot: 0, epoch: 0, slotInEpoch: 0, time: 1506203091, note: "genesis block" },
  { slot: 1, epoch: 0, slotInEpoch: 1, time: 1506203111 },
  { slot: 2, epoch: 0, slotInEpoch: 2, time: 1506203131 },
  { slot: 1000000, epoch: 46, slotInEpoch: 6400, time: 1526203091 },
  { slot: 4471199, epoch: 206, slotInEpoch: 21599, time: 1595627071 },
  { slot: 4471200, epoch: 207, slotInEpoch: 0, time: 1595627091 },
  { slot: 4492799, epoch: 207, slotInEpoch: 21599, time: 1596059071, note: "last Byron block" },
  { slot: 4492800, epoch: 208, slotInEpoch: 0, time: 1596059091, note: "first Shelley block" },
  { slot: 4492900, epoch: 208, slotInEpoch: 100, time: 1596059191 },
  { slot: 200005448, epoch: 660, slotInEpoch: 248648, time: 1791571739, note: "Conway tip, 2026-10-09" },
];

export const MAINNET_EPOCHS: readonly EpochPoint[] = [
  { epoch: 1, start: 1506635091, end: 1507067091 },
  { epoch: 100, start: 1549403091, end: 1549835091 },
  { epoch: 207, start: 1595627091, end: 1596059091 },
  { epoch: 208, start: 1596059091, end: 1596491091 },
  { epoch: 209, start: 1596491091, end: 1596923091 },
  { epoch: 300, start: 1635803091, end: 1636235091 },
  { epoch: 500, start: 1722203091, end: 1722635091 },
  { epoch: 600, start: 1765403091, end: 1765835091 },
  { epoch: 660, start: 1791323091, end: 1791755091 },
];

export const PREPROD_SLOTS: readonly SlotPoint[] = [
  { slot: 21600, epoch: 1, slotInEpoch: 0, time: 1654473600, note: "Byron epoch 1" },
  { slot: 86400, epoch: 4, slotInEpoch: 0, time: 1655769600, note: "first Shelley slot" },
  { slot: 89980, epoch: 4, slotInEpoch: 3580, time: 1655773180 },
  { slot: 90000, epoch: 4, slotInEpoch: 3600, time: 1655773200 },
  { slot: 135888518, epoch: 318, slotInEpoch: 154118, time: 1791571718, note: "tip, 2026-10-09" },
];

export const PREPROD_EPOCHS: readonly EpochPoint[] = [
  { epoch: 4, start: 1655769600, end: 1656201600 },
  { epoch: 5, start: 1656201600, end: 1656633600 },
  { epoch: 100, start: 1697241600, end: 1697673600 },
  { epoch: 200, start: 1740441600, end: 1740873600 },
];

export const PREVIEW_SLOTS: readonly SlotPoint[] = [
  { slot: 0, epoch: 0, slotInEpoch: 0, time: 1666656000, note: "genesis" },
  { slot: 20, epoch: 0, slotInEpoch: 20, time: 1666656020 },
  { slot: 40, epoch: 0, slotInEpoch: 40, time: 1666656040 },
  { slot: 124915749, epoch: 1445, slotInEpoch: 67749, time: 1791571749, note: "tip, 2026-10-09" },
];

export const PREVIEW_EPOCHS: readonly EpochPoint[] = [
  { epoch: 0, start: 1666656000, end: 1666742400 },
  { epoch: 1, start: 1666742400, end: 1666828800 },
  { epoch: 500, start: 1709856000, end: 1709942400 },
  { epoch: 1000, start: 1753056000, end: 1753142400 },
];
