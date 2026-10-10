// Runtime smoke test of the built package (CJS entry). See smoke.mjs.
"use strict";
const assert = require("node:assert/strict");
const { MAINNET, PREVIEW, slotToTime, slotInEpoch, trySlotToTime, CardanoSlotTimeError } = require("cardano-slot-time");

assert.equal(slotToTime(1000000, MAINNET), 1526203091000);
assert.equal(slotInEpoch(124915749, PREVIEW), 67749);
const bad = trySlotToTime(-1, MAINNET);
assert.equal(bad.ok, false);
assert.ok(bad.error instanceof CardanoSlotTimeError);
assert.equal(bad.error.code, "InvalidSlot");

console.log(`CJS smoke test passed on Node ${process.version}`);
