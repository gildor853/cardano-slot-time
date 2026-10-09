# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-09

### Added

- Era-aware conversions between slots, POSIX time (ms or `Date`) and epochs:
  `slotToTime`, `slotToDate`, `timeToSlot`, `slotToEpoch`, `slotInEpoch`,
  `epochToFirstSlot`, `epochBounds`, `timeToEpoch`, `currentSlot`,
  `currentEpoch`.
- Presets `MAINNET`, `PREPROD` and `PREVIEW` built from the official genesis
  files, including the Byron era on mainnet and preprod.
- `createNetworkConfig` for custom multi-era networks.
- Typed errors (`CardanoSlotTimeError` with a `code`) and non-throwing `try*`
  variants returning a `Result`.
- Test suite built on real on-chain checkpoints for all three networks.

[Unreleased]: https://github.com/gildor853/cardano-slot-time/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gildor853/cardano-slot-time/releases/tag/v0.1.0
