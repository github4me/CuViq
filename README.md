# CuViq

[![npm version](https://img.shields.io/npm/v/cuviq-viewer.svg)](https://www.npmjs.com/package/cuviq-viewer)
[![license](https://img.shields.io/npm/l/cuviq-viewer.svg)](LICENSE)
[![TypeScript types](https://img.shields.io/badge/TypeScript-types%20included-3178c6.svg)](API.md)

**A focused, framework-independent 3D product viewer for the web.**

CuViq provides a native `<cuviq-viewer>` Web Component for displaying GLB and
hosted glTF models. It handles loading, product lighting, camera fitting,
rotation, bounded zoom, responsive sizing, lazy activation, and cleanup without
requiring an iframe or a framework-specific wrapper.

[npm package](https://www.npmjs.com/package/cuviq-viewer) ·
[API reference](API.md) ·
[model delivery guide](MODEL_DELIVERY.md) ·
[release notes](CHANGELOG.md)

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Loading models](#loading-models)
- [How it works](#how-it-works)
- [Interaction](#interaction)
- [API](#api)
- [Framework integrations](#framework-integrations)
- [Sizing and styling](#sizing-and-styling)
- [Accessibility](#accessibility)
- [Performance and model preparation](#performance-and-model-preparation)
- [CORS and security](#cors-and-security)
- [Browser support](#browser-support)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## What it does

CuViq is designed for one job: letting someone inspect a product model in a
clean, responsive viewport. It provides:

- URL loading for binary `.glb` files and hosted `.gltf` files with external
  buffers and textures.
- Programmatic loading of an HTTP(S) URL or a local single-file GLB through
  `load()`.
- Automatic centering and camera fitting based on the model's geometry.
- Mouse, trackpad, touch rotation, and model-relative bounded zoom.
- A responsive square layout by default, with optional rectangular dimensions.
- Lazy initialization, poster images, demand-driven rendering, and off-screen
  suspension.
- Stable ready/error events, source replacement, WebGL context recovery, and
  deterministic Three.js resource cleanup.
- An accessible host element with an alternative description and live loading
  or error status.
- Native use in plain HTML, React, Angular, Vue, or any environment that accepts
  Web Components.

CuViq intentionally has no toolbar, pan mode, auto-rotation, analytics,
fullscreen UI, AR, hotspots, or product configurator. Applications remain in
control of their own interface.

## Quick start

### Install from npm

```sh
npm install cuviq-viewer
```

Import the auto-registration entry once in browser code:

```js
import "cuviq-viewer/auto";
```

Then use the element in markup:

```html
<cuviq-viewer
  src="/models/product.glb"
  poster="/images/product.webp"
  alt="Interactive 3D view of the product"
  loading="eager"
></cuviq-viewer>
```

The model path is resolved against the document base URL. Put the file in a
directory served by your application—for example, `public/models` in a Vite
application. Models must be loaded over HTTP(S); double-clicking an HTML file
and opening it with a `file:` URL is not supported. A page-level `<base>`
element changes how relative model URLs resolve.

The npm tarball includes a small brass sample at
`node_modules/cuviq-viewer/examples/models/brass-ferrule-block.glb`. Copy it
into your application's public/static assets before referencing it from a page;
it is a sample file, not a JavaScript export.

### Use the standalone browser bundle

The standalone ESM bundle includes Three.js and registers the element
automatically:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CuViq example</title>
    <style>
      cuviq-viewer {
        width: min(100%, 640px);
        aspect-ratio: 4 / 3;
      }
    </style>
    <script
      type="module"
      src="https://unpkg.com/cuviq-viewer@0.1.0/dist/browser/cuviq.js"
    ></script>
  </head>
  <body>
    <cuviq-viewer
      src="/models/product.glb"
      alt="Interactive 3D view of the product"
    ></cuviq-viewer>
  </body>
</html>
```

Pin a package version in production, as shown above. Alternatively, copy
`dist/browser/cuviq.js` from the installed package and serve it from your own
origin.

## Loading models

### Supported sources

| Source | How to load it | Notes |
| --- | --- | --- |
| Hosted GLB | `src` or `load(url)` | Preferred: one binary file containing the model and its resources. |
| Hosted glTF | `src` or `load(url)` | External buffers and textures resolve relative to the `.gltf` URL. |
| Local GLB `File` | `load(file)` | The filename must end in `.glb` and use a supported binary MIME type. |
| Local GLB `Blob` | `load(blob)` | Use a supported binary MIME type. |

String sources may be absolute HTTP(S) URLs or relative URLs. `data:`, `blob:`,
and `file:` string URLs are rejected; use `load(File)` or `load(Blob)` for local
content. For both `File` and `Blob`, supported MIME types are
`model/gltf-binary`, `application/octet-stream`, or an empty value. Local
multi-file glTF is not supported.

### Load from a URL

```html
<cuviq-viewer
  src="https://cdn.example.com/products/chair.glb"
  alt="Walnut dining chair"
></cuviq-viewer>
```

You can also change `src` at any time. A newer source supersedes an older load,
so a slow earlier request cannot replace the most recently requested model.

```js
const viewer = document.querySelector("cuviq-viewer");
viewer.src = "/models/product-blue.glb";
```

### Load a local GLB

This example assumes the HTML is processed by Vite or another bundler that
resolves npm package imports:

```html
<input id="model-file" type="file" accept=".glb,model/gltf-binary" />
<cuviq-viewer id="viewer" alt="Selected local 3D model"></cuviq-viewer>

<script type="module">
  import "cuviq-viewer/auto";

  const input = document.querySelector("#model-file");
  const viewer = document.querySelector("#viewer");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      await viewer.load(file);
    } catch (error) {
      console.error("Could not display the model", error);
    }
  });
</script>
```

`load()` resolves after the first successful frame. On failure it rejects and
also dispatches `cuviq-error`.

## How it works

1. `cuviq-viewer/auto` defines one idempotent native custom element. Each
   element instance owns an open Shadow DOM containing its poster and status.
   When the viewer activates, it adds its WebGL canvas.
2. With the default `loading="lazy"`, an `IntersectionObserver` waits until the
   viewer is near the viewport. `loading="eager"` starts immediately.
3. Three.js `GLTFLoader` loads the GLB or hosted glTF and resolves any hosted
   dependencies relative to the glTF document.
4. CuViq calculates the model bounds, centers the orbit target, fits a
   perspective camera, and derives safe near, far, and zoom distances from the
   model size.
5. A generated room environment, sRGB output, and ACES filmic tone mapping
   provide neutral product lighting without downloading a hidden HDR image.
6. Orbit controls expose rotation and zoom only. Rendering runs while a load,
   interaction, resize, or settling animation needs frames, then stops.
7. Rendering suspends while the viewer or document is hidden. Replaced models
   and disconnected viewers dispose their geometry, materials, textures,
   controls, renderer, and observers.

If the WebGL context is lost, CuViq reports the condition. When the context is
restored, it reloads the current source.

## Interaction

| Input | Result |
| --- | --- |
| Mouse drag | Rotate the model. |
| Mouse wheel or trackpad | Zoom within model-relative limits. |
| One-finger horizontal drag | Rotate the model. |
| One-finger vertical gesture | Continue scrolling the page. |
| Two-finger gesture | Dolly/zoom and rotate. |

Horizontal orbit is continuous and vertical orbit is constrained to avoid
flipping over the poles. Panning is disabled, so the product remains centered.

## API

### Attributes and properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | none | HTTP(S) or relative GLB/hosted glTF URL. Empty removes the current model. |
| `poster` | `string` | none | Image displayed before the first ready frame. |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Load near the viewport or initialize immediately. |
| `alt` | `string` | none | Accessible model description and fallback accessible name. |
| `aria-label` | `string` | none | Explicit accessible name; takes precedence over `alt`. |
| `width` | positive number | responsive | Host width in CSS pixels. The property also accepts `null` to remove it. |
| `height` | positive number | automatic | Host height in CSS pixels. The property also accepts `null` to remove it. |

`src`, `poster`, `loading`, `alt`, `width`, and `height` have matching element
properties. Invalid numeric values in markup are ignored; assigning a non-finite
or non-positive `width` or `height` property throws `RangeError`.

### Method

```ts
type CuviqSource = string | File | Blob;

viewer.load(source: CuviqSource): Promise<void>;
```

Use this method for local GLB files, awaited loading, or programmatic URL loads.

### Events

Both events bubble and cross the Shadow DOM boundary.

| Event | Detail | When it fires |
| --- | --- | --- |
| `cuviq-ready` | `{ source: string \| File \| Blob }` | After the first successful frame. |
| `cuviq-error` | `{ code, message, source? }` | When a stable public error is available. |

```js
const viewer = document.querySelector("cuviq-viewer");

viewer.addEventListener("cuviq-ready", (event) => {
  console.log("Loaded", event.detail.source);
});

viewer.addEventListener("cuviq-error", (event) => {
  console.error(event.detail.code, event.detail.message);
});
```

Error codes are:

| Code | Meaning |
| --- | --- |
| `UNSUPPORTED_SOURCE` | The URL, local file, or MIME type is unsupported. |
| `LOAD_FAILED` | The source could not be fetched or parsed. |
| `RESOURCE_MISSING` | A model or one of its referenced resources is missing. |
| `CORS_ERROR` | A network or browser cross-origin policy prevented access. |
| `DECODER_REQUIRED` | The model needs a decoder not included in CuViq V1. |
| `MODEL_EMPTY` | The model has no usable finite geometry bounds. |
| `WEBGL_UNAVAILABLE` | WebGL could not be initialized. |
| `WEBGL_CONTEXT_LOST` | The active graphics context was lost. |

Assign a valid new `src` or call `load()` again to recover from a model-loading
error. See [API.md](API.md) for the complete TypeScript contract.

### Registration and package entries

| Import | Purpose |
| --- | --- |
| `cuviq-viewer` | Class, constants, types, and explicit registration. SSR-safe and does not auto-register. |
| `cuviq-viewer/auto` | Registers `<cuviq-viewer>` as an import side effect. Use this in most bundled browser applications. |
| `cuviq-viewer/react` | Optional React 19 scoped JSX declarations. This entry is type-only. |
| `cuviq-viewer/browser` | Standalone ESM browser bundle with Three.js included. |

For explicit registration:

```js
import { defineCuviqViewer } from "cuviq-viewer";

defineCuviqViewer();
```

Repeated registration is safe. The package is ESM-only.

## Framework integrations

CuViq is the same browser-native element in every framework. It does not add
React, Angular, or Vue as runtime dependencies.

### React 19+

Import the optional type entry so React's scoped JSX namespace recognizes the
element. A ref plus native event listeners provides typed custom events and
safe cleanup under Strict Mode.

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
      const { source } = (event as CustomEvent<CuviqReadyDetail>).detail;
      console.log("Loaded", source);
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

In an SSR framework such as Next.js, import `cuviq-viewer/auto` from a client
module (for example, a module beginning with `"use client"`). The root
`cuviq-viewer` entry itself is safe to import on the server.

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component or NgModule that uses the custom
element:

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
      (cuviq-error)="onError($event)"
    ></cuviq-viewer>
  `,
})
export class ProductModelComponent {
  onReady(event: Event): void {
    console.log((event as CustomEvent).detail);
  }

  onError(event: Event): void {
    console.error((event as CustomEvent).detail);
  }
}
```

Complete sample:
[`examples/angular/product-model.component.ts`](examples/angular/product-model.component.ts).

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

Then use it normally:

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

Complete samples: [`examples/vue/ProductModel.vue`](examples/vue/ProductModel.vue)
and [`examples/vue/vite.config.ts`](examples/vue/vite.config.ts).

## Sizing and styling

Without dimension attributes, the host uses the available width and a square
`1 / 1` aspect ratio. Common configurations are:

| Dimensions | Result |
| --- | --- |
| Neither supplied | Responsive square: `width: 100%`. |
| `width` only | Fixed-width square. |
| `height` only | Available width with a fixed height. |
| `width` and `height` | Explicit rectangular viewport. |

Normal page CSS can override host dimensions and is usually preferable for a
responsive layout:

```css
.product-viewer {
  width: min(100%, 42rem);
  aspect-ratio: 4 / 3;
}
```

```html
<cuviq-viewer
  class="product-viewer"
  src="/models/product.glb"
  alt="Interactive 3D product model"
></cuviq-viewer>
```

The visual shell exposes three CSS custom properties:

```css
cuviq-viewer {
  --cuviq-bg: #f4f6f7;
  --cuviq-radius: 18px;
  --cuviq-border-color: #d8dee2;
}
```

The internal scene, status, and canvas are isolated in Shadow DOM. V1 does not
expose Shadow Parts.

## Accessibility

- The connected host defaults to `role="img"`.
- `alt` supplies the accessible name when no explicit `aria-label` is present.
- `aria-label` takes precedence over `alt`.
- The internal WebGL canvas is hidden from assistive technology and removed
  from keyboard focus.
- Loading status is polite; error status uses an assertive live region.
- Reduced-motion preferences disable the poster fade and loading animation.
- A vertical one-finger gesture can scroll the containing page.

CuViq intentionally provides no keyboard camera controls. Always supply a useful
`alt` or `aria-label`, and provide essential product information outside the 3D
canvas as normal text.

## Performance and model preparation

A single GLB is the simplest and most reliable delivery format. Recommended
budgets are:

| Asset property | Recommendation | High-risk threshold |
| --- | --- | --- |
| Transfer size | 3–8 MB | Above 20 MB |
| Triangles | At most 300,000 | Above 800,000 |
| Individual texture | At most 2048 × 2048 | 4096 × 4096 without demonstrated benefit |

Additional guidance:

- Keep transforms finite and ensure the model contains visible geometry.
- Use `loading="lazy"` for below-the-fold viewers and `loading="eager"` for the
  primary immediately visible product.
- Prefer one active visible viewer when possible. Each activated instance owns
  a WebGL renderer and context.
- Device pixel ratio is capped to limit GPU cost: 1.5 on coarse-pointer devices
  and 2 on desktop-class pointers.
- Use long-lived immutable caching for versioned assets and normal HTTP
  compression where it helps.

See [MODEL_DELIVERY.md](MODEL_DELIVERY.md) for MIME types, caching, CORS, and
asset validation guidance.

## CORS and security

For a cross-origin model, the server must return an `Access-Control-Allow-Origin`
header that permits the page origin. A hosted glTF needs valid CORS headers not
only for the `.gltf` document, but also for every referenced buffer and texture.
Preserve their relative paths when deploying them.

For Content Security Policy deployments, account for:

- CuViq's script origin in `script-src`.
- Model, buffer, and texture origins in `connect-src`.
- Poster and texture origins in `img-src` for browser image-loading paths.
- The component's Shadow DOM `<style>` element under a strict `style-src`
  policy; test the exact policy in each target browser.

This is integration guidance rather than an exhaustive CSP. Test the final
policy with representative embedded and external textures. CuViq V1 creates no
workers and makes no background requests beyond the requested model and its
declared dependencies—there are no analytics, telemetry, decoder, or HDR
downloads.

## Browser support

CuViq targets current Chrome, Edge, Safari, iOS Safari, and Android Chrome on
devices with WebGL 2. Automated Chromium tests cover model loading, local files,
lazy activation, source races, recovery, dimensions, interaction smoke tests,
idle rendering, multiple instances, and simulated WebGL context events.

Physical iPhone/Android and desktop Edge/Safari acceptance is still tracked as
a release gate; desktop emulation is not treated as physical mobile validation.
See [docs/MANUAL_DEVICE_QA.md](docs/MANUAL_DEVICE_QA.md) and
[docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) for the current evidence.

## Limitations

CuViq V1 deliberately does not include:

- Draco, KTX2/Basis, or Meshopt decoder payloads. Models requiring them report
  `DECODER_REQUIRED`.
- Local multi-file glTF loading.
- Animation playback or authored-camera selection.
- Panning, auto-rotation, a reset button, or a visible toolbar.
- Fullscreen, screenshots, hotspots, measurements, annotations, or AR.
- Ground planes, shadows, post-processing, or downloadable HDR environments.
- Progress, camera-change, screenshot, fullscreen, or analytics events.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The element is unknown in React TypeScript | Add `import type {} from "cuviq-viewer/react"` in React 19 code. |
| The element never registers | Import `cuviq-viewer/auto` once from client/browser code, or call `defineCuviqViewer()`. |
| The viewer stays in `waiting` | It is using lazy loading and is not near the viewport. Try `loading="eager"` and confirm it has visible dimensions. |
| A model URL works locally but not after deployment | Check the deployed path, response status, MIME type, base URL, and CORS headers in browser developer tools. |
| Hosted glTF reports `RESOURCE_MISSING` | Check every referenced `.bin` and texture URL, including filename case and CORS. |
| A model reports `DECODER_REQUIRED` | Re-export it without Draco, Meshopt, or KTX2/Basis compression. |
| A local model reports `UNSUPPORTED_SOURCE` | Use a single `.glb` file with a supported binary MIME type and call `load(file)`. |
| The packaged sample returns 404 | Copy it from `node_modules/cuviq-viewer/examples/models` into your app's public/static directory. |
| The page was opened directly from disk | Serve it from a local HTTP development server; string sources accept only HTTP(S). |

Listen for `cuviq-error` and log its `code`, `message`, and `source` while
diagnosing a failed load.

## Development

Requirements: Node.js 18 or newer and a browser with WebGL 2.

```sh
git clone https://github.com/github4me/CuViq.git
cd CuViq
npm ci
npx playwright install chromium
npm run check
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run preview` | Build the package and start the local Vite preview. |
| `npm run typecheck` | Check the TypeScript sources and integration typings. |
| `npm test` | Run the unit test suite. |
| `npm run test:e2e` | Generate fixtures and run browser E2E tests. |
| `npm run build` | Build library ESM, standalone browser ESM, source maps, and declarations. |
| `npm run check` | Run type checking, unit tests, all builds, bundle budgets, SSR validation, and E2E tests. |

After `npm run preview`, use:

- `/preview.html` for the locally built bundle preview.
- `/preview-npm.html` for the published standalone npm bundle.
- `/preview-react.html` for the React integration preview.

### Project documentation

- [API reference](API.md)
- [Model delivery guide](MODEL_DELIVERY.md)
- [Release notes](CHANGELOG.md)
- [Implementation decisions](docs/DECISIONS.md)
- [Acceptance evidence](docs/ACCEPTANCE.md)
- [Manual device QA](docs/MANUAL_DEVICE_QA.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Issues and focused pull requests are welcome at the
[GitHub repository](https://github.com/github4me/CuViq).

## License

CuViq is available under the [MIT License](LICENSE). Three.js attribution is
included in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
