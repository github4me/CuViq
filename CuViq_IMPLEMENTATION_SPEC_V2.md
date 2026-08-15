---
project: CuViq
document: implementation-spec
version: 2.0
status: ready-for-implementation
updated: 2026-08-15
source_of_truth_for: v1
architecture: threejs-direct
supersedes: 1.0-model-viewer
---

# CuViq V1 Implementation Specification

## 0. Instructions for Codex

Read this file completely before editing code.

1. Read every applicable `AGENTS.md`, then inspect the repository structure, `package.json`, lockfile, TypeScript configuration, build configuration, existing tests, and established conventions.
2. Treat **Must**, **Won't**, **Architecture decision**, **Public contract**, and **Acceptance criteria** as binding.
3. CuViq V1 must use Three.js directly. Do not add Google `<model-viewer>`, a wrapper around it, or another hosted viewer runtime.
4. Do not add a feature merely because Three.js supports it.
5. Preserve repository conventions unless they conflict with a binding requirement in this specification.
6. Ask the user only when a decision changes the public API, dependency strategy, browser support, licensing, or V1 scope. Make ordinary implementation decisions yourself and record them briefly.
7. Work phase by phase. After each phase, run the relevant type checks, tests, build, examples, and bundle-size checks before continuing.
8. Never claim mobile acceptance from desktop emulation alone. Record at least one physical iPhone and one physical Android result.

## 1. Product definition

CuViq is a lightweight, framework-independent Web Component for displaying a product model inside a compact square “cube viewport”. The cube is a visual container metaphor, not an opaque 3D box around the product.

V1 deliberately exposes only two user capabilities:

- 360-degree orbit rotation around the product.
- Zoom in and out within safe limits.

Loading, automatic framing, a poster, errors, accessibility, WebGL recovery, and cleanup are required infrastructure rather than additional product features.

## 2. Fixed naming

| Item | Required name |
| --- | --- |
| Product brand | `CuViq` |
| Working package name | `cuviq-viewer` |
| Custom element | `<cuviq-viewer>` |
| Element class | `CuviqViewerElement` |
| Ready event | `cuviq-ready` |
| Error event | `cuviq-error` |
| CSS custom-property prefix | `--cuviq-` |

Brand text is always `CuViq`. HTML tag names remain lowercase because custom-element names are case-insensitive and must contain a hyphen.

## 3. Scope

### 3.1 Must

- Render a GLB from an HTTP(S) URL.
- Render a hosted GLTF from an HTTP(S) URL when its `.bin` and texture dependencies are reachable and CORS-compatible.
- Load a local single-file GLB supplied as `File` or `Blob` through `load(source)`.
- Automatically center the model and frame the complete product on first load and after a meaningful viewport resize.
- Allow unrestricted horizontal orbit and a constrained vertical orbit that prevents the product from flipping into an unusable view.
- Support mouse or trackpad drag for rotation and wheel/trackpad zoom.
- Support one-finger rotation and two-finger pinch zoom on touch devices.
- Disable camera panning through all mouse, touch, modifier-key, and keyboard paths.
- Constrain zoom so the camera cannot pass through the model or move so far away that the product becomes unusable.
- Use a responsive square viewport by default.
- Support a poster, lazy/eager loading, loading state, recoverable error state, accessible description, WebGL context events, and complete cleanup.
- Work in plain HTML and React without a React runtime dependency inside the package.
- Support multiple instances while avoiding unnecessary loading and rendering for off-screen instances.
- Make no implicit network request except the requested model, poster, and hosted GLTF dependencies.

### 3.2 Won't

Do not implement any of the following in V1:

- CAD, DWG, STEP, or IGES conversion.
- Local multi-file GLTF dependency discovery.
- Camera panning.
- Auto-rotate.
- Public reset-camera control.
- Fullscreen.
- Screenshot capture.
- Material variants.
- Hotspots or annotations.
- Part tree, selection, hide, isolate, or explode.
- Measurement or section cutting.
- Animation controls.
- AR.
- Upload backend, user accounts, permissions, analytics, or telemetry.
- Browser-side mesh repair or automatic polygon reduction.
- WebGPU; V1 uses the stable `WebGLRenderer` path.
- Default inclusion of Draco, KTX2/Basis, or Meshopt decoder payloads. Decoder support requires a separate approved entry point or a V1.1 decision.

## 4. Architecture decision

### 4.1 ADR-001: Direct Three.js runtime

**Decision:** CuViq owns its scene, camera, renderer, loader, controls, render scheduling, and disposal directly through Three.js.

**Consequences:**

- No Google `<model-viewer>` package, element, runtime, branding, network request, or API appears in CuViq.
- CuViq gains deterministic control over gestures, camera fitting, rendering frequency, error semantics, DOM, styling, and future extensions.
- CuViq also owns mobile interaction QA, lighting, color management, WebGL context handling, and GPU resource disposal.

### 4.2 Required dependencies

Use direct ESM imports from the `three` package:

```ts
import {
  Box3,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
```

Rules:

- Pin the chosen Three.js release in the lockfile after the Phase 1 compatibility spike.
- Do not import the aggregate `three/addons` barrel.
- Do not fetch Three.js or decoder code from a third-party CDN at runtime.
- Include the Three.js MIT licence notice in the published package.
- An upgrade requires unit, E2E, visual, interaction, disposal, and target-device regression checks.

### 4.3 Runtime modules

| Module | Responsibility |
| --- | --- |
| `CuviqViewerElement` | Public attributes, method, events, Shadow DOM, lifecycle, accessibility |
| `ViewerRuntime` | Coordinates initialization, state transitions, source replacement, and teardown |
| `SceneController` | Scene, `PerspectiveCamera`, `WebGLRenderer`, neutral studio environment, color/tone configuration |
| `SourceLoader` | URL/local GLB loading, hosted GLTF base paths, stale-result rejection, error normalization |
| `CameraFitter` | Bounds validation, center/target calculation, initial camera placement, near/far and zoom limits |
| `InteractionController` | `OrbitControls`, rotation/zoom-only policy, touch mappings, change/start/end events |
| `RenderScheduler` | Demand-driven frames during load, resize, interaction, and damping; no idle permanent loop |
| `ResourceDisposer` | Scene traversal and deterministic disposal of geometry, materials, textures, images, controls, renderer, and observers |
| `VisibilityController` | `IntersectionObserver`, page visibility, lazy threshold, off-screen suspension |
| `SizeController` | `ResizeObserver`, drawing-buffer size, aspect ratio, DPR cap, reframe threshold |

### 4.4 Suggested source layout

```text
src/
  cuviq-viewer.ts
  define.ts
  runtime/
    viewer-runtime.ts
    scene-controller.ts
    source-loader.ts
    camera-fitter.ts
    interaction-controller.ts
    render-scheduler.ts
    resource-disposer.ts
  platform/
    visibility-controller.ts
    size-controller.ts
  styles.ts
  errors.ts
  types.ts
tests/
  unit/
  e2e/
  fixtures/
examples/
  html/
  react/
```

Use the repository's existing compatible structure when present, while keeping equivalent responsibilities separated.

### 4.5 Packaging

Produce:

- A side-effect-light ESM package for NPM/bundlers.
- A browser ESM entry that registers `<cuviq-viewer>` automatically.
- TypeScript declarations.
- Minimal plain HTML and React examples.
- README, API reference, model delivery guide, licence notices, and release notes.

The NPM package may resolve `three` as a normal runtime dependency. The standalone browser entry includes the validated Three.js runtime so a consumer does not need a separate script tag. Do not bundle two Three.js copies inside one CuViq output.

## 5. Public contract

### 5.1 Minimal HTML

```html
<script type="module" src="/cuviq.js"></script>

<cuviq-viewer
  src="/models/product.glb"
  poster="/images/product.webp"
  alt="Product 3D model"
></cuviq-viewer>
```

### 5.2 React usage

```tsx
import "cuviq-viewer/auto";

export function ProductModel() {
  return (
    <cuviq-viewer
      src="/models/product.glb"
      poster="/images/product.webp"
      alt="Product 3D model"
    />
  );
}
```

Provide the required JSX intrinsic-element declaration without shipping a React runtime dependency.

### 5.3 Attributes

| Attribute | Type | Default | Requirement |
| --- | --- | --- | --- |
| `src` | string | none | GLB or hosted GLTF URL; changing it loads the new source |
| `poster` | string | none | Image displayed before the model is ready |
| `loading` | `lazy \| eager` | `lazy` | Loading strategy |
| `alt` | string | none | Accessible model description; required in examples |
| `aria-label` | string | none | Accepted as an accessibility fallback |

### 5.4 CSS contract

| Name | Default | Purpose |
| --- | --- | --- |
| `--cuviq-bg` | neutral light background | Viewport background |
| `--cuviq-radius` | implementation default | Corner radius |
| `--cuviq-border-color` | subtle neutral | Cube boundary treatment |

The host defaults to `display: block`, `width: 100%`, and `aspect-ratio: 1 / 1`. Consumers may override host dimensions with normal CSS. Do not expose additional theme variables without a demonstrated V1 need.

### 5.5 Method

```ts
type CuviqSource = string | File | Blob;

interface CuviqViewerElement extends HTMLElement {
  load(source: CuviqSource): Promise<void>;
}
```

Rules:

- String sources follow the same URL rules as `src`.
- Local `File` or `Blob` sources must be single-file binary GLB.
- Prefer `Blob.arrayBuffer()` plus `GLTFLoader.parseAsync()` for local GLB so no object URL is required.
- A new load supersedes every earlier load. Stale callbacks must dispose their result and must never change visible state.
- If an implementation fallback creates an object URL, revoke it when superseded and on disconnect.

### 5.6 Events

```ts
type CuviqReadyDetail = {
  source: string | File | Blob;
};

type CuviqErrorCode =
  | "UNSUPPORTED_SOURCE"
  | "LOAD_FAILED"
  | "RESOURCE_MISSING"
  | "CORS_ERROR"
  | "DECODER_REQUIRED"
  | "MODEL_EMPTY"
  | "WEBGL_UNAVAILABLE"
  | "WEBGL_CONTEXT_LOST";

type CuviqErrorDetail = {
  code: CuviqErrorCode;
  message: string;
  source?: string | File | Blob;
};
```

- Dispatch `cuviq-ready` after the first successful frame and controls are interactive.
- Dispatch `cuviq-error` with a stable `detail.code` and a useful human-readable message.
- Do not expose camera-change, progress, screenshot, fullscreen, or analytics events in V1.

## 6. Internal behavior

### 6.1 State model

```text
idle -> waiting -> initializing -> loading -> ready
                              \-> error <-/
ready -> context-lost -> ready | error
```

- `waiting`: a lazy element has not entered the preload threshold.
- `initializing`: renderer, scene, controls, and environment are being created.
- `loading`: a source is being parsed and GPU resources may be created.
- `ready`: the model has produced its first successful frame and is interactive.
- `context-lost`: the canvas emitted `webglcontextlost`; prevent the default restoration policy, suspend rendering, and show a recoverable status.
- `error`: a later valid `src` or `load()` call may retry.

### 6.2 Source loading

- URL GLB/GLTF: use `GLTFLoader.loadAsync(url)` so hosted GLTF dependencies resolve relative to the model URL.
- Local GLB: validate extension/MIME when available, read an `ArrayBuffer`, and call `GLTFLoader.parseAsync(buffer, "")`.
- Local `.gltf` is rejected because associated `.bin` and texture files cannot be discovered from one `File` argument.
- Maintain an incrementing load generation. Every async completion compares its generation before committing.
- A stale successful load is immediately disposed.
- Normalize loader/network/parser failures to the public error codes without exposing stack traces to end users.

### 6.3 Scene and product lighting

- Use one `Scene`, one `PerspectiveCamera`, and one `WebGLRenderer` per connected viewer instance.
- Use an internally generated neutral studio environment, such as `RoomEnvironment` processed through `PMREMGenerator`; do not make a hidden HDR network request.
- Keep shadows, ground planes, post-processing, and animation mixers disabled in V1.
- Configure output color space and tone mapping explicitly and cover the visual baseline with representative metallic, painted, and dark products.
- Use a transparent canvas over the CuViq CSS background unless the implementation records a tested reason not to.

### 6.4 Camera fitting

After model transforms are current:

1. Compute `Box3.setFromObject(root)`.
2. Reject empty, non-finite, or near-zero bounds with `MODEL_EMPTY`.
3. Derive a bounding `Sphere` from the box. A sphere is intentionally conservative so the complete product remains visible through a horizontal orbit.
4. Set `controls.target` to the sphere center.
5. Calculate fit distance from the smaller of vertical and horizontal camera field of view, sphere radius, and a documented margin.
6. Place the camera on a consistent normalized product-view direction unless a later approved API introduces author cameras.
7. Derive `near`, `far`, `minDistance`, and `maxDistance` from radius and fit distance; never use fixed world-unit limits.
8. Update projection and render once.

All constants must live in `camera-fitter.ts`, be named, and have tests covering tiny, huge, flat, tall, offset, and rotated models.

### 6.5 Controls and mobile gestures

The effective controls policy is:

```ts
controls.enablePan = false;
controls.enableRotate = true;
controls.enableZoom = true;
controls.autoRotate = false;
```

- Permit continuous azimuth rotation.
- Start with an internal polar range of approximately 15–165 degrees and tune it against the reference products without making it public API.
- Map one touch to rotate and two touches to dolly/rotate, never dolly/pan.
- Disable keyboard pan paths and modifier-key pan paths.
- Adopt and document one mobile page-scroll policy during Phase 1. The acceptance gate is no accidental pan and no blocking defect when scrolling past the component.
- Do not ship visible controls. A short first-use gesture hint may disappear after the first interaction.

### 6.6 Demand-driven rendering

- Do not run a permanent `requestAnimationFrame` loop while the model is idle.
- Request a frame after initialization, source commit, resize, visibility restore, controls change, and context restore.
- If damping is enabled, the scheduler may run only until the controls settle, then stop.
- Suspend scheduled work when the element is off-screen or `document.hidden` is true.
- Keep a single pending frame per instance and cancel it during teardown.

### 6.7 Resize, DPR, and visibility

- Use `ResizeObserver` on the render host rather than relying only on `window.resize`.
- Update canvas drawing-buffer size and camera aspect only when dimensions actually change.
- Cap effective DPR; begin with 1.5 on mobile-class devices and 2 on desktop, then validate quality and heat on reference devices.
- Use `IntersectionObserver` with a small preload margin for `loading="lazy"`.
- Lazy loading delays runtime/model initialization; the poster may render immediately.
- A resize should preserve the user's current orbit and zoom unless the old framing becomes invalid.

### 6.8 Context loss and cleanup

On model replacement or element teardown:

- Remove the old model root from the scene.
- Traverse loaded objects and dispose each unique `BufferGeometry`.
- Dispose each unique material and every referenced texture, including material properties and shader uniforms.
- Close owned `ImageBitmap` objects when safe and not shared.
- Dispose skeletons owned by the loaded model when present.
- Dispose controls, generated environment textures, `PMREMGenerator`, and renderer.
- Remove DOM listeners, observer subscriptions, queued frames, and stale async references.
- Revoke any internally created object URLs.
- Use `renderer.info.memory` as diagnostic evidence in repeated-load tests, not as a promise that all internal caches reach zero.

Handle `webglcontextlost` and `webglcontextrestored`. After restoration, rebuild or reload the current source and dispatch `cuviq-ready` only after a successful frame.

## 7. Performance and model budgets

| Metric | Target | Action |
| --- | --- | --- |
| CuViq-authored JS | Target at most 35 KB gzip | Excludes Three.js; reject UI-framework or utility-library creep |
| Total viewer JS | Establish measured D1 baseline; aim below 250 KB gzip | Includes Three.js and selected addons; block unexplained regression above 10% |
| Decoder payloads | 0 in default V1 entry | Add only through an approved separate entry or version decision |
| GLB size | Recommended 3–8 MB | Above 20 MB: development warning and optimisation request |
| Triangle count | Recommended at most 300k | Above 800k: high-risk mobile model |
| Individual texture | Recommended at most 2048 × 2048 | 4K requires demonstrated visual benefit |
| Effective DPR | Mobile 1.5; desktop 2 initial caps | Tune from visual quality, heat, and frame-time evidence |
| Active visible viewers | Prefer 1 | Off-screen instances perform no continuous work |

These are engineering budgets, not marketing guarantees. Record model size, cache state, network, device, and browser whenever reporting load time or frame performance.

## 8. Security and integration rules

- Accept model sources only through the public `src` and `load()` paths.
- Do not execute scripts or inject model metadata as HTML.
- Render human-readable errors with `textContent`, never unsanitized `innerHTML`.
- Respect the host page's Content Security Policy; document required `script-src`, `worker-src`, `img-src`, and model-origin rules only when used by the final build.
- Cross-origin hosted GLTF resources must provide suitable CORS headers.
- Package import must be SSR-safe: importing the non-auto entry must not access `window`, `document`, or `customElements` until a browser-only function runs.
- Register the element idempotently: never call `customElements.define()` twice for the same name.

## 9. Acceptance criteria

### AC-001: No Google viewer dependency

Given the production dependency graph and built outputs, no Google `<model-viewer>` package, custom element, runtime request, or copied viewer code is present.

### AC-002: Plain HTML integration

Given a page that loads the browser build, when `<cuviq-viewer src="valid.glb" alt="Example product">` is added, the model becomes visible and interactive without React.

### AC-003: React integration

Given a React application, when the custom element is used, it renders without bundling a React runtime inside CuViq.

### AC-004: URL sources

Given valid GLB and hosted GLTF URLs, when each is assigned to `src`, each model loads, centers, and fits completely inside the viewport.

### AC-005: Local GLB

Given a valid local GLB `File`, when passed to `load(file)`, it loads through binary parsing and leaves no object URL or stale resource after replacement.

### AC-006: Rotation

Given a ready model, when the user drags with a mouse or one finger, the product rotates around its center through a full horizontal orbit without panning.

### AC-007: Zoom

Given a ready model, when the user uses a wheel, trackpad zoom, or two-finger pinch, the camera zooms only within safe model-relative limits and never passes through the product.

### AC-008: No extra controls

Given the default V1 component, no toolbar, pan, auto-rotate, reset, fullscreen, screenshot, hotspot, measurement, or AR control is present.

### AC-009: Responsive cube viewport

Given host widths from 280 px to 720 px, when layout changes, the default viewport remains square, the product remains usable, and the cube treatment does not obscure it.

### AC-010: Lazy loading and poster

Given `loading="lazy"` and a poster, while the element remains outside the configured preload margin, the poster may render but Three.js and model initialization do not begin.

### AC-011: Error recovery

Given a 404, malformed model, missing GLTF dependency, decoder-required asset, invalid bounds, CORS failure, or unavailable WebGL, CuViq displays a stable error state and dispatches `cuviq-error`; assigning a later valid source can recover where the platform allows it.

### AC-012: Latest source wins

Given rapid A → B → C source changes, only C may become visible or dispatch the final ready event; stale A/B results are disposed.

### AC-013: Cleanup

Given 20 source replacement and mount/unmount cycles, there is no sustained growth attributable to CuViq listeners, observers, frames, object URLs, geometries, materials, textures, image bitmaps, or controls.

### AC-014: Idle rendering

Given a ready, visible, untouched model with no damping in progress, CuViq schedules no continuous animation frames. Given an off-screen or hidden viewer, it performs no continuous rendering.

### AC-015: WebGL context recovery

Given a simulated context loss and restore on a supported browser, CuViq enters a recoverable state and either redraws/reloads the current source or dispatches a stable error without leaving a broken canvas.

### AC-016: Browser and device acceptance

Given the agreed reference models, iOS Safari, Android Chrome, and desktop Chrome, Edge, and Safari have no blocking defect in rotation, zoom, loading, resize, recovery, page scrolling, and repeated use.

## 10. Test requirements

### 10.1 Unit/component tests

- Attribute parsing and defaults.
- Idempotent custom-element registration and SSR-safe import.
- `src` replacement, generation tokens, and latest-load-wins behavior.
- Local `File`/`Blob` validation and `parseAsync` path.
- Bounds validation and camera fit across tiny, huge, flat, tall, offset, and rotated fixtures.
- Model-relative near/far, minimum distance, and maximum distance.
- Ready/error event detail.
- Render scheduler coalescing, settling, suspension, and cancellation.
- Observer/listener setup and cleanup.
- Resource traversal with shared materials/textures and repeated disposal.

### 10.2 Browser E2E tests

- GLB URL and local GLB success.
- Hosted GLTF URL with external dependencies.
- 404, malformed file, missing dependency, decoder-required fixture, empty model, and CORS-like failure.
- Mouse rotation and wheel zoom.
- Pointer/touch-equivalent rotation and pinch coverage where automation supports it.
- Pan remains disabled across right mouse, modifiers, keyboard, and two-finger movement.
- Lazy/eager loading, poster transition, responsive resize, and multiple instances.
- Rapid source replacement and disconnect during load.
- No idle render loop after controls settle.
- Simulated WebGL context loss and restoration.

### 10.3 Visual regression fixtures

Use at least:

1. A metallic hardware product.
2. A painted or plastic product.
3. A dark product with fine edges.
4. A tall or strongly elongated model.
5. A model with an offset origin and nested transforms.

Capture the initial view at agreed viewport sizes and compare with reviewed baselines after dependency upgrades.

### 10.4 Manual device record

Record device model, OS, browser version, model filename/size, result, heat symptoms, and notes for one iPhone and one Android phone. Verify page scrolling, portrait/landscape resize, rotation, pinch zoom, 10 repeated loads, and at least five minutes of interaction.

## 11. Implementation phases and estimate

The estimate assumes one senior frontend engineer using Codex, three prepared reference models, no repository migration, and no decoder requirement.

| Phase | Work | Exit condition | Estimate |
| --- | --- | --- | --- |
| 0 | Repository audit, API confirmation, Three.js spike, bundle baseline | Representative GLB works on desktop and one phone | 0.5–1 day |
| 1 | Web Component, Shadow DOM, scene, renderer, neutral environment | Stable first frame and clean reconnect | 1–1.5 days |
| 2 | URL/local loading, state, errors, latest-source-wins | Success/failure fixtures pass | 1–1.5 days |
| 3 | Bounds, camera fitting, zoom limits, resize | Reference shapes always remain usable | 1–1.5 days |
| 4 | Orbit controls, mobile gesture policy, demand scheduler | Rotation/zoom-only behavior passes phone checks | 1–1.5 days |
| 5 | Visibility, context recovery, complete disposal | Repeat-cycle and idle-render tests pass | 1–1.5 days |
| 6 | Packaging, declarations, HTML/React examples, README | Five-minute integration test passes | 1 day |
| 7 | Cross-browser/device QA, visual baseline, release | AC-001 through AC-016 pass | 1–1.5 days |

Expected delivery: **8–10 working days**, including normal integration fixes. Keep **2 additional days of contingency** for difficult real models, mobile browser differences, CORS, or material appearance. Decoder support, a new visual configurator, or backend work requires a separate estimate.

## 12. Definition of Done

- [ ] AC-001 through AC-016 pass with automated or recorded manual evidence.
- [ ] TypeScript, unit tests, E2E tests, production build, examples, and bundle report pass.
- [ ] Plain HTML and React examples run without a Google viewer or a bundled React runtime.
- [ ] Public API matches this specification or an approved decision record explains the difference.
- [ ] Visual baselines are approved for the reference product models.
- [ ] Repeated load/unload and context-loss checks show no CuViq-owned leak or broken recovery path.
- [ ] No debug logging, temporary assets, unexplained TODOs, hidden network calls, or out-of-scope controls remain.
- [ ] Three.js is version-locked and its MIT notice is included.
- [ ] README explains supported inputs, local GLB limitation, hosted GLTF/CORS requirements, optional decoder limitation, performance budgets, and browser support.

## 13. Official references

- Three.js repository and MIT licence: <https://github.com/mrdoob/three.js/>
- GLTFLoader: <https://threejs.org/docs/pages/GLTFLoader.html>
- OrbitControls: <https://threejs.org/docs/pages/OrbitControls.html>
- WebGLRenderer: <https://threejs.org/docs/pages/WebGLRenderer.html>
- Three.js resource disposal guide: <https://threejs.org/manual/en/how-to-dispose-of-objects.html>
- ResizeObserver: <https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver>
- IntersectionObserver: <https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver>

## 14. Codex starter prompt

```text
Implement CuViq V1 using CuViq_IMPLEMENTATION_SPEC.md version 2.0 as the binding source of truth.

First:
1. Read this specification completely and read every applicable AGENTS.md.
2. Inspect the repository, package manager, lockfile, TypeScript/build/test configuration, current dependencies, and existing conventions.
3. Verify that no Google <model-viewer> dependency or copied runtime exists. Do not add one.
4. Produce a short plan mapped to AC-001 through AC-016 and identify the exact checks for Phase 0.
5. Record assumptions only where the repository does not answer them.

Then implement Phase 0 only using direct Three.js imports. Do not add anything listed under Won't. Run the relevant type checks, tests, build, example, and bundle measurement, and report changed files, evidence, assumptions, and remaining risks before proceeding.
```
