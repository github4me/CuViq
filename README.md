# CuViq

CuViq is a framework-independent Web Component for inspecting a product model in a compact square viewport. It renders GLB and hosted GLTF assets directly with Three.js and intentionally exposes only orbit rotation and bounded zoom.

## Install

```sh
npm install cuviq-viewer
```

### Bundlers and React

Import the self-registering entry once, then use the custom element. CuViq does not include or require a React runtime.

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

Use `import { CuviqViewerElement, defineCuviqViewer } from "cuviq-viewer"` when registration needs to be explicit. This non-auto entry is safe to import during server-side rendering.

### Plain HTML

Serve the standalone browser entry from your own origin or package CDN. It contains the validated Three.js runtime, so no additional Three.js script is needed.

```html
<script type="module" src="/cuviq.js"></script>
<cuviq-viewer
  src="/models/product.glb"
  poster="/images/product.webp"
  alt="Product 3D model"
></cuviq-viewer>
```

## Supported inputs

- `src`: an HTTP(S) or same-origin relative URL to a GLB or hosted GLTF.
- `load(fileOrBlob)`: a local, single-file binary GLB. Local multi-file GLTF is not supported.
- Hosted GLTF `.bin` and texture references resolve relative to the GLTF URL. Every cross-origin resource must return suitable CORS headers.

The default V1 entry does not ship Draco, KTX2/Basis, or Meshopt decoders. Assets that require them produce `DECODER_REQUIRED`. See [MODEL_DELIVERY.md](MODEL_DELIVERY.md) for delivery budgets and server requirements.

## Interaction and rendering

- Drag or one-finger horizontal movement rotates. Horizontal orbit is continuous; vertical orbit is constrained.
- Wheel, trackpad, or two-finger pinch zooms within model-relative limits.
- Panning, keyboard camera movement, auto-rotate, animation controls, fullscreen, screenshots, hotspots, and AR are disabled.
- `touch-action: pan-y` lets a vertical one-finger gesture continue page scrolling. Product rotation remains available from a deliberate horizontal drag; two-finger input is mapped to dolly/rotate, never pan.
- Rendering is demand-driven and suspends while off-screen or when the document is hidden.

## Styling

The host is `display: block`, `width: 100%`, and square by default. Normal CSS can override its dimensions.

```css
cuviq-viewer {
  --cuviq-bg: #f4f6f7;
  --cuviq-radius: 18px;
  --cuviq-border-color: #d8dee2;
  max-width: 32rem;
}
```

## Events and recovery

`cuviq-ready` fires after the first successful frame. `cuviq-error` contains a stable `detail.code` and a user-readable message. Assigning a later valid `src` or calling `load()` retries after load and model errors. Context restoration reloads the current source.

See [API.md](API.md) for the complete public contract.

## Content Security Policy

Allow the origin serving CuViq in `script-src`, model origins in `connect-src`, and poster/texture origins in `img-src`. CuViq V1 creates no workers and makes no implicit HDR, decoder, analytics, or telemetry requests.

## Browser support and validation status

The implementation targets current Chrome, Edge, Safari, iOS Safari, and Android Chrome with WebGL. Automated Chromium checks cover loading, local files, lazy loading, error recovery, source races, interaction smoke tests, idle rendering, and simulated WebGL context events. Physical iPhone/Android and desktop Edge/Safari acceptance remain release gates; desktop emulation is not recorded as mobile acceptance. Use [docs/MANUAL_DEVICE_QA.md](docs/MANUAL_DEVICE_QA.md) to record them.

## Development

```sh
npm install
npx playwright install chromium
npm run check
```

`npm run check` runs TypeScript, unit tests, production/library/browser builds, bundle budgets, SSR import validation, and browser E2E tests.
