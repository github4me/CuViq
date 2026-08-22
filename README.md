# CuViq

CuViq is a framework-independent Web Component for inspecting a product model in a compact square viewport. It renders GLB and hosted GLTF assets directly with Three.js and intentionally exposes only orbit rotation and bounded zoom.

The npm package and its custom element are both named `cuviq-viewer`.

## Install

```sh
npm install cuviq-viewer
```

The published package includes a small sample model at `cuviq-viewer/examples/models/brass-ferrule-block.glb` for local experimentation.

## Framework integrations

CuViq is a native custom element rather than a framework wrapper. Import `cuviq-viewer/auto` once in browser code to register `<cuviq-viewer>`. It has no React, Angular, or Vue runtime dependency.

### React 19+

Import the optional type-only entry so React's scoped JSX namespace recognizes the element. A ref is the most portable way to subscribe to typed custom events.

```tsx
import { useEffect, useRef } from "react";
import "cuviq-viewer/auto";
import type {} from "cuviq-viewer/react";
import type { CuviqReadyDetail, CuviqViewerElement } from "cuviq-viewer";

export function ProductModel() {
  const viewer = useRef<CuviqViewerElement>(null);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;

    const onReady = (event: Event) => {
      const detail = (event as CustomEvent<CuviqReadyDetail>).detail;
      console.log("Loaded", detail.source);
    };

    element.addEventListener("cuviq-ready", onReady);
    return () => element.removeEventListener("cuviq-ready", onReady);
  }, []);

  return (
    <cuviq-viewer
      ref={viewer}
      src="/models/product.glb"
      poster="/images/product.webp"
      alt="Interactive 3D product model"
      width={640}
      height={480}
    />
  );
}
```

Complete sample: [`examples/react/ProductModel.tsx`](examples/react/ProductModel.tsx).

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component or NgModule that uses CuViq. Angular bindings and event listeners then work normally with the custom element.

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "cuviq-viewer/auto";

@Component({
  selector: "app-product-model",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cuviq-viewer
      src="/models/product.glb"
      alt="Interactive 3D product model"
      [width]="640"
      [height]="480"
      (cuviq-ready)="onReady($event)"
    ></cuviq-viewer>
  `,
})
export class ProductModelComponent {
  onReady(event: Event): void {
    console.log((event as CustomEvent).detail);
  }
}
```

Complete sample: [`examples/angular/product-model.component.ts`](examples/angular/product-model.component.ts).

### Vue 3 with Vite

Tell Vue's template compiler that `cuviq-viewer` is a custom element:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "cuviq-viewer",
        },
      },
    }),
  ],
});
```

Then use it in a component:

```vue
<script setup lang="ts">
import "cuviq-viewer/auto";

function onReady(event: Event): void {
  console.log((event as CustomEvent).detail);
}
</script>

<template>
  <cuviq-viewer
    src="/models/product.glb"
    alt="Interactive 3D product model"
    :width="640"
    :height="480"
    @cuviq-ready="onReady"
  />
</template>
```

Complete samples: [`examples/vue/ProductModel.vue`](examples/vue/ProductModel.vue) and [`examples/vue/vite.config.ts`](examples/vue/vite.config.ts).

### Explicit registration and SSR

Use `import { CuviqViewerElement, defineCuviqViewer } from "cuviq-viewer"` when registration must be explicit. The root entry does not register the element and is safe to import during server-side rendering. Register it only in browser code.

### Plain HTML

Serve the standalone browser entry from your own origin or package CDN. It contains the validated Three.js runtime, so no additional Three.js script is needed.

```html
<script type="module" src="/cuviq.js"></script>
<cuviq-viewer
  src="/models/product.glb"
  poster="/images/product.webp"
  alt="Product 3D model"
  width="640"
  height="480"
></cuviq-viewer>
```

## Package entries

| Import | Purpose |
| --- | --- |
| `cuviq-viewer` | Classes, types, and explicit registration; SSR-safe |
| `cuviq-viewer/auto` | Registers `<cuviq-viewer>` as an import side effect |
| `cuviq-viewer/react` | Optional React 19 scoped JSX types |
| `cuviq-viewer/browser` | Standalone browser bundle with Three.js included |

## Supported inputs

- `src`: an HTTP(S) or same-origin relative URL to a GLB or hosted GLTF.
- `load(fileOrBlob)`: a local, single-file binary GLB. Local multi-file GLTF is not supported.
- Hosted GLTF `.bin` and texture references resolve relative to the GLTF URL. Every cross-origin resource must return suitable CORS headers.

The default V1 entry does not ship Draco, KTX2/Basis, or Meshopt decoders. Assets that require them produce `DECODER_REQUIRED`. See [MODEL_DELIVERY.md](MODEL_DELIVERY.md) for delivery budgets and server requirements.

### Loading from a URL

Set `src` to either an absolute HTTP(S) URL or a URL relative to the current page:

```html
<cuviq-viewer
  src="https://cdn.example.com/models/product.glb"
  alt="Interactive 3D product model"
></cuviq-viewer>
```

The model host must allow the page's origin with CORS response headers. Hosted GLTF buffer and texture URLs are resolved relative to the GLTF document URL.

## Interaction and rendering

- Drag or one-finger horizontal movement rotates. Horizontal orbit is continuous; vertical orbit is constrained.
- Wheel, trackpad, or two-finger pinch zooms within model-relative limits.
- Panning, keyboard camera movement, auto-rotate, animation controls, fullscreen, screenshots, hotspots, and AR are disabled.
- `touch-action: pan-y` lets a vertical one-finger gesture continue page scrolling. Product rotation remains available from a deliberate horizontal drag; two-finger input is mapped to dolly/rotate, never pan.
- Rendering is demand-driven and suspends while off-screen or when the document is hidden.

## Styling

The host is `display: block`, `width: 100%`, and square by default. Normal CSS can override its dimensions.

Optional numeric `width` and `height` attributes set explicit CSS-pixel dimensions. If both are omitted, the responsive square default remains unchanged.

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

To manually test the published browser bundle against the included sample model, run `npm run preview` and open `/preview-npm.html`. This page loads `cuviq-viewer@0.1.0` from npm through unpkg rather than from the local `dist` folder.
