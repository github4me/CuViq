# CuViq technical and framework compatibility review

Date: 2026-09-13  
Reviewed commit: `cc28ec721b2d34dbefd48924315c8fb4f283d8bb`  
Package: `cuviq-viewer@0.1.0`

## 0.1.1 resolution follow-up

All six findings below have been addressed in the 0.1.1 release candidate.
The original review is retained below as historical evidence about 0.1.0,
not as a description of the corrected implementation.

Final `npm run check`: **45 unit tests and 17 Chromium E2E tests pass**, along
with TypeScript, all builds, bundle budgets, SSR imports, and the installed
tarball's strict declaration checks. Browser tests use two workers to bound
GPU contention; physical React HTML fixtures let Vite discover dependencies
before starting the tests. Bundle sizes are 8.1 KiB authored ESM and 225.8 KiB
standalone ESM, both gzip.

| Finding | Resolution | Regression evidence |
| --- | --- | --- |
| F1 optional dimensions | Both setters and React JSX types accept `null` and `undefined`; removal restores defaults. | Unit tests, actual React resets/omitted props, strict packed consumer types, Angular property bindings. |
| F2 detached sources | Synchronize the requested source while detached; load it only after reconnect. | Detached replacement/clear/File preservation unit tests; real Vue KeepAlive replacement and clear. |
| F3 pending cancellation | Explicit operation tracking settles cancelled loads without waiting for parsing or a frame. Stale results and failed-fit models are disposed. | Eleven runtime tests cover clear/dispose/replacement, suspended frames, late results/errors, and active failures. |
| F4 ESM declarations | Relative source specifiers use `.js`, producing Node ESM-compatible declarations. | Installed-tarball Bundler, NodeNext, and Node16 strict consumer compilation with `skipLibCheck: false`. |
| F5 duplicate initial load | Explicit activation skips the automatic source load. | An inactive lazy viewer loads a selected File exactly once. |
| F6 React hydration | The shipped example registers in `useEffect`, after hydration and listener setup. README explains the timing requirement. | Real server rendering and browser hydration of the exact example, with StrictMode and no warnings. Early static registration remains an intentionally unsupported hydration pattern. |

Separate consumers reinstalled `cuviq-viewer-0.1.1.tgz`, without source aliases:

- React 19.3.0 / TypeScript 7.0.2: strict production build, null-dimension type
  diagnostics, Node SSR, nine positive browser checks, plus an expected-warning
  early-registration negative control all pass.
- Angular 22.1.6 / TypeScript 6.0.3: strict AOT production build, six browser
  scenarios, and both null/undefined dimension reset cases pass without
  unexpected console or page errors.
- Vue 3.5.42 / TypeScript 5.9.3: strict SFC checking, production and SSR builds,
  and all eleven browser scenarios pass, including hydration and cached source
  updates/clears. No unexpected console or page errors.

A final source-clearing edge case found after those separate consumer runs was
also fixed: `viewer.src = ""` clears an explicit File/Blob/URL load even when
no `src` attribute exists. Two additional unit cases cover connected and
detached viewers; the final full repository check above includes this fix.

Automated coverage is scoped to these tested versions and Chromium. Complete
Next.js/Nuxt/Angular SSR deployments and physical Safari/iOS/Android acceptance
remain outside this sign-off. For cancellation semantics see [API.md](../API.md).

## Original 0.1.0 verdict

CuViq's native custom-element architecture integrates successfully with React,
Angular, and Vue for ordinary client rendering, model loading, events,
dimension changes, and component creation/destruction. The current npm release
does **not** yet qualify for an unconditional compatibility sign-off: the review
reproduced errors with optional dimension bindings and stale models in cached
views, plus cancellation and TypeScript resolution issues.

This is a review. Production source, package dependencies, and release versions
were not changed. Diagnostic consumer projects were created outside the
repository. Findings below distinguish browser reproductions from isolated
lifecycle tests.

## What was tested

The repository was built and packed with npm. Separate consumer projects
installed the resulting tarball and imported the public package entries; no
source aliases or CDN runtime substitutes were used.

The public npm registry tarball was also downloaded. All **23 JavaScript and
declaration files** in its `dist` directory match this build byte-for-byte.
Accordingly, these runtime and typing findings also apply to the published
0.1.0 package. The newer repository README and some non-runtime package content
differ from the published artifact.

| Consumer | Toolchain tested | Verified results |
| --- | --- | --- |
| React | React/React DOM/types 19.3.0, TypeScript 7.0.2, Vite 6.4.3 | Strict TypeScript with `skipLibCheck: false`, production bundle, initial GLB render, typed ref/native events, reactive source and numeric dimension changes, error recovery, source clearing, ordinary unmount/remount, development StrictMode, Node server rendering. Optional dimension update fails (F1); hydration needs registration timing care (F6). |
| Angular | Angular 22.1.6, CLI/build 22.1.8, TypeScript 6.0.3 | Strict AOT production compilation with `strictTemplates` and `skipLibCheck: false`, model render, property bindings, ready/error events, recovery, `@if` destroy/recreate. Optional dimension update fails; see F1. Full Angular SSR/hydration was not tested. |
| Vue | Vue/server-renderer 3.5.42, Vite 8.3.0, plugin-vue 6.0.8, vue-tsc 3.3.11, TypeScript 5.9.3 | Strict SFC type checking with `skipLibCheck: false`, production build, reactive sources/dimensions, null/undefined resets, ready/error events, recovery, `v-if` remount, server rendering and browser hydration. Cached `KeepAlive` reuse fails; see F2. |

Environment: Windows, Node.js 24.20.0. Browser checks used Chromium; Angular and
Vue diagnostics recorded Chromium 151.0.7922.34.

The existing repository checks also passed: TypeScript, **25 unit tests**, library
and standalone builds, bundle budgets, SSR import validation, and **15 Chromium
E2E tests**. These existing tests do not cover the failures found below.

## Findings

### F1 — High: undefined dimensions break React and Angular updates

Source: [dimension setters](../src/cuviq-viewer.ts#L94),
[dimension validation](../src/cuviq-viewer.ts#L258),
[React props](../src/react.ts#L15).

Reproduction: render a viewer with numeric dimensions, then change those
framework bindings to `undefined`.

```tsx
// First render:
<cuviq-viewer width={640} height={480} src="/models/product.glb" />

// Later render:
<cuviq-viewer width={undefined} height={undefined} src="/models/product.glb" />
```

React assigns the value through the custom element's property setter. The setter
only treats `null` as removal and throws `RangeError` for `undefined`. In the
tested React application without an error boundary, this unmounted the React
root. Omitting a previously supplied prop entirely also fails; an initially
undefined prop does not. Angular's strictly compiled `[width]`/`[height]` bindings likewise report
`RangeError` and retain the previous dimensions when set to `undefined`.

Vue's tested binding path handles dimension removal without this error.
Explicit `null` clears dimensions at runtime; the React JSX helper currently
only declares optional numeric values, so JSX with `width={null}` or
`height={null}` fails with TS2322.

Recommended fix: treat both `null` and `undefined` as an absent dimension, while
retaining validation for invalid supplied numbers. Align the public setters and
React types. Add consumer regressions for setting, updating, omitting, and
clearing dimensions.

Interim integration option: use responsive CSS without numeric dimension props,
or normalize framework values deliberately. In Angular,
`[width]="configuredWidth ?? null"` (and the equivalent height binding) works.
Avoid switching numeric React or Angular dimension bindings directly to
`undefined` until fixed.

### F2 — High: Vue KeepAlive can show the previous model after src changes

Source: [connected-only source synchronization](../src/cuviq-viewer.ts#L144)
and [source selection during activation](../src/cuviq-viewer.ts#L190).

Real Vue browser reproduction:

1. Render a viewer in a `KeepAlive` component.
2. Update its connected source to a URL ending in `?kept=1`.
3. Deactivate the cached component and change the reactive source to `?kept=2`.
4. Reactivate the component.

The element's `src` now says `?kept=2`, but the ready event reports
`?kept=1`: the old model was actually loaded. Ordinary `v-if` destruction and
creation passes because it creates a new element.

The element preserves `pendingSource` across disconnect, ignores source changes
while disconnected, and then prioritizes the saved value over the current
attribute. Isolated element tests also reproduce this when changing or clearing
`src` between removal and reinsertion. It can therefore affect other systems
that detach and reuse the same DOM element.

Recommended fix: synchronize the requested source regardless of connection
state; only defer the actual load until connected. Preserve explicit File/Blob
sources when no later source replacement has occurred. Test cached reuse and
clearing a detached viewer.

Interim integration option: recreate/key the viewer when changing a cached
model instead of reusing the stale element.

### F3 — Medium: removing a viewer can leave load() pending forever

Source: [promise awaiting the first frame](../src/runtime/viewer-runtime.ts#L66),
[runtime disposal](../src/runtime/viewer-runtime.ts#L144), and
[scheduler disposal](../src/runtime/render-scheduler.ts#L39).

An isolated test reproduces this sequence: the source finishes parsing, the load
waits for its first rendered frame, and the viewer is disposed before that frame.
Disposal clears the scheduler's callbacks without resolving or rejecting the
promise. A caller awaiting `load()` can remain pending after navigation or
component removal.

This reproduction uses real runtime/scheduler code with controlled rendering
and source-loader test doubles; it is not a claim that every framework unmount
fails. Normal unmount/remount browser tests passed.

Recommended fix: track in-flight loads and settle them explicitly on disposal,
replacement, or cancellation. Define whether cancellation rejects or resolves;
do not depend solely on a future animation frame to settle the operation.

### F4 — Medium: declarations fail strict NodeNext/Node16 resolution

Source: [root declaration imports](../src/index.ts#L1),
[React declaration import](../src/react.ts#L4), and
[declaration build configuration](../tsconfig.build.json).

The emitted declarations retain extensionless relative imports such as
`"./cuviq-viewer"`, `"./define"`, and `"./types"`. A strict TypeScript 5.8.3
NodeNext consumer of the published declarations fails with TS2834.

The tested React/Vite, Angular, and Vue configurations use bundler resolution
and pass; this is a compatibility limit for Node ESM/server-oriented TypeScript
configurations, not a failure of those tested browser builds.

Recommended fix: emit ESM-compatible declaration specifiers using explicit
`.js` extensions, or bundle the declarations appropriately. Check both
`Bundler` and `NodeNext` consumers against the packed artifact.

### F5 — Medium: the first explicit load() on a lazy viewer starts twice

Source: [load method](../src/cuviq-viewer.ts#L157) and
[activation's automatic load](../src/cuviq-viewer.ts#L190).

An isolated element test on a connected, inactive lazy viewer records two
runtime `load("/model.glb")` calls for one public call. `load()` records the
source and activates the viewer; activation starts that source automatically,
and the public method immediately starts it again.

Latest-source-wins prevents the first result from replacing the second, but
loading and parsing work are duplicated. This matters for consumers that call
`load(file)` from a mount effect, file picker, or framework ref.

Recommended fix: separate initialization from automatic loading, or return and
await the initial load when activation has already started it.

### F6 — Medium: eager registration causes React hydration warnings

Source: [connection-time attributes](../src/cuviq-viewer.ts#L106),
[state updates](../src/cuviq-viewer.ts#L211),
[dimension styles](../src/cuviq-viewer.ts#L269), and the
[README SSR guidance](../README.md#react-19).

With React-rendered server markup, synchronously importing
`cuviq-viewer/auto` before hydration upgrades the custom element. It changes
host attributes such as `role`, `aria-label`, `data-state`, and dimension
styles before React compares the DOM against its expected markup. The browser
reproduction reports an attribute mismatch warning; the model still renders.

Moving registration to a post-hydration `useEffect` passed without a warning.
The README's advice to use a `"use client"` module alone does not resolve
registration timing for server-rendered markup.

Recommended fix: document and test a hydration-aware registration pattern for
React SSR consumers, for example a dynamic `/auto` import in a mount effect.
Keep type-only imports for JSX and element types. A complete Next.js deployment
was not tested, so this finding is specifically about the reproduced React
SSR/hydration path.

## Architecture and packaging assessment

The framework-neutral design is appropriate: there is one custom element API
and no React, Angular, or Vue runtime dependency. Three.js is correctly declared
as a runtime dependency; the separate standalone bundle includes it.

The package exposes the root, `/auto`, `/react`, and `/browser` entries. The
registration entry is marked side-effectful, and consumer production builds
confirm that registration survives bundling. The React helper preserves refs
and augments scoped JSX namespaces. Server imports and string rendering work;
this is distinct from testing a complete SSR framework deployment.

Consumer setup remains:

- React 19: import `cuviq-viewer/auto` and the type-only
  `cuviq-viewer/react` entry; use refs and native custom-event listeners.
- Angular: import `cuviq-viewer/auto` and use `CUSTOM_ELEMENTS_SCHEMA`.
- Vue: import `cuviq-viewer/auto` and configure the compiler's
  `isCustomElement` option.

These patterns align with the official
[React custom-element behavior](https://react.dev/reference/react-dom/components),
[Angular schema API](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA), and
[Vue custom-element integration guidance](https://vuejs.org/guide/extras/web-components.html).

The authored ESM measures **8.0 KiB gzip** and the standalone bundle
**225.6 KiB gzip**, both within existing project budgets. Demand rendering and
lazy activation are useful for product pages. Multiple active viewers still
allocate separate WebGL contexts. Long-running GPU/memory behavior was not
profiled in this review.

## Scope limits and follow-up

- Do not generalize these specific framework versions into all-version support.
  React 18, Angular older majors, Vue 2, and complete Next.js/Nuxt deployments
  were not tested.
- Physical iOS/Android and desktop Safari/Edge acceptance remains pending in
  [manual device QA](MANUAL_DEVICE_QA.md).
- The Vue fixture initially encountered an incompatibility between vue-tsc
  3.3.11 and TypeScript 7.0.2 inside tooling. TypeScript 5.9.3 passed. This was
  isolated from CuViq's package behavior.
- Strict CSP deployments, compressed-model decoder support, and broad glTF
  extension coverage were not newly validated.
- No confirmed namespace conflict was found from the legacy global JSX helper;
  it should not be treated as a proven defect based on speculation alone.
- Before advertising unconditional framework compatibility, address the
  findings and retain installed-package consumer regressions in the release
  checks. A changed npm artifact requires a new version.

## Diagnostic artifacts

Reproducible consumer projects and tests remain on this review machine at:

```text
D:\Temp\cuviq-framework-review-5496ae44d58549dab782434c04187c31
  cuviq-viewer-0.1.0.tgz
  registry/                 Published registry tarball and extracted files
  react/                    React consumer and SSR/hydration fixtures
  angular/                  Angular AOT consumer and browser diagnostics
  vue/                      Vue consumer, SSR build, browser results
  lifecycle.test.ts         Duplicate load and stale detached-source reproductions
  lifecycle.config.mjs
  runtime.test.ts           Pending-load disposal reproduction
  runtime.config.mjs
  nodenext-consumer.mts      Published declaration resolution reproduction
```

The four isolated lifecycle test cases fail against the reviewed implementation;
they are intentional bug reproductions, not failures of the repository's
existing baseline suite. Consumer package-lock files record resolved dependency
versions.
