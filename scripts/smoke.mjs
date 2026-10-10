// Runtime smoke test of the built package (ESM entry), run by CI on Node
// versions the test runner no longer supports. No dependencies, no network.
// The bare specifier resolves to ./dist through the package's "exports" map.
import assert from "node:assert/strict";
import { epochBounds, slotToEpoch, slotToTime, timeToSlot } from "cardano-slot-time";

// Real mainnet checkpoints (first Shelley block; Conway tip on 2026-10-09).
assert.equal(slotToTime(4492800, "mainnet"), 1596059091000);
assert.equal(slotToTime(4492799, "mainnet"), 1596059071000); // last Byron slot (20 s)
assert.equal(timeToSlot(new Date(1791571739000), "mainnet"), 200005448);
assert.equal(slotToEpoch(200005448, "mainnet"), 660);
assert.equal(epochBounds(4, "preprod").startTime, 1655769600000);

console.log(`ESM smoke test passed on Node ${process.version}`);
