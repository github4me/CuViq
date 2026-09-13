# Release notes

## 0.1.1 — 2026-09-13

- Fixed React and Angular optional width/height resets with `null` and `undefined`, including React JSX types.
- Fixed stale sources when a detached viewer is reused, including Vue `KeepAlive`.
- Empty `src` property assignments now also clear explicit File/Blob/URL loads when no `src` attribute exists.
- Settle cancelled loads immediately on replacement, clearing, or disconnection, even before parsing or the first frame completes; late results are disposed.
- Fixed duplicate parsing on the first explicit `load()` of a lazy viewer.
- Fixed strict TypeScript NodeNext/Node16 declaration resolution with ESM file extensions.
- Updated the React example to register after hydration and added real React hydration/dimension regressions.
- Added installed-tarball type and SSR checks to the release gate, and GitHub links to npm metadata.

## 0.1.0 — 2026-08-15

- Added optional numeric `width` and `height` attributes and properties while preserving the responsive square default.
- Added React 19 typings plus React, Angular, and Vue integration samples.
- Added the packaged brass ferrule GLB sample and absolute-URL loading coverage.
- Added the `<cuviq-viewer>` Web Component using a direct Three.js runtime.
- Added URL GLB/hosted GLTF and local binary GLB loading with latest-source-wins semantics.
- Added automatic framing, model-relative zoom constraints, orbit-only controls, demand rendering, lazy visibility, resize/DPR handling, context recovery, and deterministic resource cleanup.
- Added package, self-registering, and standalone browser ESM entries plus TypeScript/JSX declarations.
- Added plain HTML and React examples, public API/model delivery documentation, unit/E2E checks, and bundle budgets.

Physical iPhone, Android, desktop Edge, and desktop Safari acceptance is required before promoting this build to a V1 release.
