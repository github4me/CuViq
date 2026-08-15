# CuViq implementation decisions

## DEC-002: Optional viewport dimensions

**Date:** 2026-08-15  
**Status:** Approved by the product owner

CuViq adds optional `width` and `height` attributes and matching element properties beyond the V2 implementation specification's original attribute list.

- Values are positive finite numbers interpreted as CSS pixels.
- Omitting both preserves the original responsive `width: 100%` and `aspect-ratio: 1 / 1` behavior.
- Providing only `width` keeps the square aspect ratio.
- Providing both creates an explicit rectangular viewport.
- Invalid markup values are ignored. Invalid property assignments throw `RangeError`.
- Consumer page CSS may still override the host's dimensions.

No `length` or model-scale attribute is introduced. Model framing continues to derive from geometry bounds and the actual viewport aspect ratio.
