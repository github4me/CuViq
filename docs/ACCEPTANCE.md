# CuViq V1 acceptance evidence

Status as of 2026-09-13, for the 0.1.1 release candidate. “Automated pass” is not
a substitute for the physical-device gate. See the
[framework review and resolution evidence](TECHNICAL_REVIEW_2026-09-13.md).

| Criterion | Evidence | Status |
| --- | --- | --- |
| AC-001 no Google viewer | Dependency/output string audit in final verification | Automated pass |
| AC-002 plain HTML | `examples/html` plus Chromium E2E | Automated pass |
| AC-003 React | Installed npm tarball strict build and browser checks; documented SSR/hydration example and dimension regressions | Automated pass (React 19); complete Next.js deployment not tested |
| AC-004 URL GLB/GLTF | Chromium E2E with GLB and external-buffer GLTF | Automated pass |
| AC-005 local GLB | File E2E; `createObjectURL` count remains zero | Automated pass |
| AC-006 rotation | Mouse drag E2E; touch requires device | Partial |
| AC-007 zoom | Wheel E2E; pinch and limit feel require device | Partial |
| AC-008 no extra controls | DOM E2E | Automated pass |
| AC-009 responsive cube | CSS contract/unit behavior; target-width visual review pending | Partial |
| AC-010 lazy/poster | Below-fold E2E | Automated pass |
| AC-011 errors/recovery | HTTP, malformed, missing, decoder, empty fixtures; CORS mapping unit | Automated pass except real CORS server |
| AC-012 latest source wins | Rapid A/B/C E2E | Automated pass |
| AC-013 cleanup | Disposal and cancellation regressions cover replacement/disconnection/late results; repeated real memory profiling pending | Partial |
| AC-014 idle rendering | scheduler unit and browser frame-count E2E | Automated pass |
| AC-015 context recovery | simulated browser context events | Automated pass |
| AC-016 browsers/devices | Chromium automated only | Pending physical/mobile and Edge/Safari |
