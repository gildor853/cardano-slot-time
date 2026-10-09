# cardano-slot-time

[![CI](https://github.com/gildor853/cardano-slot-time/actions/workflows/ci.yml/badge.svg)](https://github.com/gildor853/cardano-slot-time/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cardano-slot-time.svg)](https://www.npmjs.com/package/cardano-slot-time)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)

Zero-dependency TypeScript conversions between **Cardano slots, POSIX time and
epochs** for mainnet, preprod, preview and custom networks. Era-aware: it models
the 20-second Byron slots that came before today's 1-second slots, instead of
applying a single linear formula. Works in Node.js and browsers.

## Why

Most snippets convert slots with `zeroTime + (slot - zeroSlot) * 1000`. That is
fine for recent slots but silently wrong for anything in the Byron era (mainnet
epochs 0–207, preprod epochs 0–3), and it cannot answer epoch questions
(*when does epoch 600 start? which epoch was slot 1,000,000 in?*).

- **Era-aware**: piecewise conversion across Byron (20 s slots, 21,600-slot
  epochs) and Shelley+ (1 s slots, 432,000-slot epochs on mainnet).
- **Real parameters**: presets come from the official genesis files and are
  tested against real on-chain blocks and epoch boundaries.
- **Small API** with typed errors and non-throwing `try*` variants.
- **No dependencies**, tree-shakeable ESM + CJS, bundled type declarations.

## Install

```sh
npm install cardano-slot-time
```

Requires Node.js 18+ or any modern browser/bundler.

## Quick start

```ts
import { slotToDate, timeToSlot, slotToEpoch, epochBounds, currentEpoch } from "cardano-slot-time";

slotToDate(4_492_800, "mainnet").toISOString(); // "2020-07-29T21:44:51.000Z" (first Shelley slot)
slotToDate(1_000_000, "mainnet").toISOString(); // "2018-05-13T09:18:11.000Z" (Byron, 20 s slots)

timeToSlot(new Date("2026-10-09T18:48:59Z"), "mainnet"); // 200005448
slotToEpoch(200_005_448, "mainnet");                      // 660

epochBounds(208, "mainnet");
// { epoch: 208, startSlot: 4492800, endSlot: 4924799,
//   startTime: 1596059091000, endTime: 1596491091000 }

currentEpoch("preprod"); // uses Date.now()
```

Every function takes the network as its last argument: a preset name
(`"mainnet"`, `"preprod"`, `"preview"`), a preset object (`MAINNET`, `PREPROD`,
`PREVIEW`) or a config from `createNetworkConfig`.

## API reference

### Conversions

| Function | Returns |
| --- | --- |
| `slotToTime(slot, network)` | POSIX ms at which the slot starts. |
| `slotToDate(slot, network)` | Same, as a `Date`. |
| `timeToSlot(time, network)` | Slot in progress at `time` (ms or `Date`); rounds down within a slot. |
| `slotToEpoch(slot, network)` | Epoch containing the slot. |
| `slotInEpoch(slot, network)` | Zero-based index of the slot within its epoch. |
| `epochToFirstSlot(epoch, network)` | First slot of the epoch. |
| `epochBounds(epoch, network)` | `{ epoch, startSlot, endSlot, startTime, endTime }`. `endSlot` is inclusive; `endTime` is exclusive (start of the next epoch). |
| `timeToEpoch(time, network)` | Epoch in progress at `time`. |
| `currentSlot(network, now?)` | Current slot. `now` (ms or `Date`) defaults to `Date.now()`; inject it in tests. |
| `currentEpoch(network, now?)` | Current epoch. |
| `trySlotToTime`, `tryTimeToSlot`, `trySlotToEpoch` | Non-throwing variants returning a `Result`. |

### Networks

| Export | Description |
| --- | --- |
| `MAINNET`, `PREPROD`, `PREVIEW` | Frozen presets (see [Network parameters](#network-parameters)). |
| `createNetworkConfig({ name?, systemStart, eras })` | Build a custom config. `systemStart` is ms, a `Date` or an ISO string. Each era is `{ slotLengthMs, epochLength, epochs? }`; `epochs` is required for every era except the last, which is open-ended. |
| `tryCreateNetworkConfig(input)` | Non-throwing variant. |

```ts
import { createNetworkConfig, slotToTime } from "cardano-slot-time";

const devnet = createNetworkConfig({
  name: "devnet",
  systemStart: "2024-01-01T00:00:00Z",
  eras: [
    { slotLengthMs: 20_000, epochLength: 21_600, epochs: 2 }, // Byron-like
    { slotLengthMs: 1_000, epochLength: 432_000 },            // Shelley-like
  ],
});
slotToTime(50_000, devnet);
```

A resolved `NetworkConfig` exposes `systemStart` and `eras`, each with
`startSlot`, `startEpoch`, `startTime`, `slotLengthMs`, `epochLength` and `epochs`.

### Numbers, not bigint

Slots, epochs and times are plain `number`s. Mainnet is around slot 2 × 10⁸
and POSIX ms around 1.8 × 10¹², far below `Number.MAX_SAFE_INTEGER`
(about 9 × 10¹⁵). Inputs must be safe integers, and any result that would
exceed the safe range throws `Overflow` instead of losing precision.

## Network parameters

| Network | System start (slot 0) | Byron era | Shelley+ era |
| --- | --- | --- | --- |
| mainnet | 2017-09-23T21:44:51Z | epochs 0–207, 20 s slots, 21,600 slots/epoch | from epoch 208 / slot 4,492,800 / 2020-07-29T21:44:51Z, 1 s slots, 432,000 slots/epoch |
| preprod | 2022-06-01T00:00:00Z | epochs 0–3, 20 s slots, 21,600 slots/epoch | from epoch 4 / slot 86,400 / 2022-06-21T00:00:00Z, 1 s slots, 432,000 slots/epoch |
| preview | 2022-10-25T00:00:00Z | none | from slot 0, 1 s slots, 86,400 slots/epoch |

Sources:

- Genesis files in [input-output-hk/cardano-configurations](https://github.com/input-output-hk/cardano-configurations):
  `network/<net>/genesis/byron.json` (`startTime`, `blockVersionData.slotDuration: 20000`,
  `protocolConsts.k: 2160` → Byron epoch = 10k = 21,600 slots) and
  `network/<net>/genesis/shelley.json` (`systemStart`, `slotLength: 1`, `epochLength`).
- Preview has no Byron slots: its node config sets `TestShelleyHardForkAtEpoch: 0`
  (`network/preview/cardano-node/config.json`).
- The Byron → Shelley transition epochs on mainnet (208) and preprod (4) were
  set by on-chain hard forks, so they are not in the genesis files. They match
  the Shelley zero points in Lucid's `SLOT_CONFIG_NETWORK`
  ([spacebudz/lucid `src/plutus/time.ts`](https://github.com/spacebudz/lucid/blob/0.10.7/src/plutus/time.ts))
  and the on-chain blocks used as test fixtures.
- Test checkpoints (block slots/times, epoch start/end times) come from the
  [Koios](https://koios.rest) API for each network.

## Error handling

Throwing functions throw a single error class, `CardanoSlotTimeError`, with a
machine-readable `code`:

| Code | Meaning |
| --- | --- |
| `InvalidSlot` | Slot is negative, not an integer, or not a safe integer. |
| `InvalidEpoch` | Epoch is negative, not an integer, or not a safe integer. |
| `InvalidTime` | Time is `NaN`, infinite, or an invalid `Date`. |
| `BeforeGenesis` | Time is before the network's system start. |
| `InvalidConfig` | `createNetworkConfig` input is invalid. |
| `InvalidNetwork` | Unknown preset name or malformed network config. |
| `Overflow` | Result would exceed `Number.MAX_SAFE_INTEGER`. |

```ts
import { timeToSlot, tryTimeToSlot, isCardanoSlotTimeError } from "cardano-slot-time";

try {
  timeToSlot(new Date("2015-01-01"), "mainnet");
} catch (err) {
  if (isCardanoSlotTimeError(err) && err.code === "BeforeGenesis") {
    // ...
  }
}

const result = tryTimeToSlot(Date.now(), "preview");
if (result.ok) console.log(result.value);
else console.log(result.error.code);
```

Convention: `x()` throws, `tryX()` returns `{ ok: true, value } | { ok: false, error }`.

## Limitations and assumptions

- **Future hard forks**: the presets assume today's slot length (1 s) and epoch
  length continue forever. A future hard fork that changes either would need a
  new era in the config (and a new release); until then, conversions for times
  after such a fork would be wrong. Use `createNetworkConfig` to model it yourself.
- **Slot start times**: `slotToTime` returns when a slot starts. Not every slot
  has a block; the time of an actual block is the start time of its slot.
- **Leap seconds**: Cardano time, like POSIX time, ignores leap seconds.
- **Other networks** (e.g. SanchoNet, private devnets) are not bundled. Build
  them from their genesis files with `createNetworkConfig`.
- **Era transitions** are assumed to happen on epoch boundaries, as they do
  with Cardano's hard fork combinator.

## Disclaimer

**Use at your own risk.** This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement. The author accepts **no responsibility or liability** for any loss of funds, assets, data or any other damages arising from the use or misuse of this library, including incorrect slot, time or epoch conversions (for example in transaction validity intervals or time-locked scripts).

This library is **not audited**. It is not financial advice and is not affiliated with or endorsed by the Cardano Foundation, IOG, EMURGO or Intersect. Always verify results independently, and test thoroughly before using it in production or with real assets.

## Contributing

This repository is maintained by a single author and does not accept external
pull requests. Bug reports via GitHub issues are welcome.

## License

[MIT](./LICENSE) © 2026 Gildor
