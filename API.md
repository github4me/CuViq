# CuViq V1 API

## Element

`<cuviq-viewer>` is implemented by `CuviqViewerElement`.

| Attribute/property | Values | Default | Meaning |
| --- | --- | --- | --- |
| `src` | string | none | GLB or hosted GLTF URL. A new value supersedes every pending load. |
| `poster` | string | none | Image shown before the first ready frame. |
| `loading` | `lazy`, `eager` | `lazy` | Whether initialization waits until the viewer approaches the viewport. |
| `alt` | string | none | Accessible model description and fallback accessible name. |
| `aria-label` | string | none | Explicit accessible name; takes precedence over `alt`. |
| `width` | positive number | responsive | Viewport width in CSS pixels. |
| `height` | positive number | automatic square | Viewport height in CSS pixels. |

When `width` and `height` are omitted, the host remains responsive at `width: 100%` with a `1 / 1` aspect ratio. Supplying both creates an explicit rectangular viewport. Supplying only `width` retains the default square aspect ratio. Normal page CSS can still override host dimensions.

## Method

```ts
type CuviqSource = string | File | Blob;

load(source: CuviqSource): Promise<void>;
```

String sources follow `src` URL rules. A `File` or `Blob` must contain one binary GLB. Local files are read with `arrayBuffer()` and parsed without object URLs. The promise resolves after the first successful frame or rejects with `CuviqError`; the matching `cuviq-error` event is also dispatched.

## Events

```ts
type CuviqReadyDetail = { source: string | File | Blob };

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

- `cuviq-ready`: bubbles and crosses the Shadow DOM boundary after the first successful frame.
- `cuviq-error`: bubbles and crosses the Shadow DOM boundary when a stable public error is available.

No camera-change, progress, screenshot, fullscreen, or analytics event is exposed in V1.
