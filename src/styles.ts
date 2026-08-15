export const VIEWER_STYLES = `
:host {
  --cuviq-bg: #f4f6f7;
  --cuviq-radius: 18px;
  --cuviq-border-color: #d8dee2;
  display: block;
  position: relative;
  width: var(--cuviq-attribute-width, 100%);
  height: var(--cuviq-attribute-height, auto);
  aspect-ratio: 1 / 1;
  min-width: 0;
  contain: layout paint style;
  color: #263238;
  background: var(--cuviq-bg);
  border: 1px solid var(--cuviq-border-color);
  border-radius: var(--cuviq-radius);
  overflow: hidden;
  box-sizing: border-box;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

:host::before,
:host::after {
  content: "";
  position: absolute;
  z-index: 4;
  pointer-events: none;
  width: 22px;
  height: 22px;
  opacity: 0.65;
}

:host::before {
  inset: 11px auto auto 11px;
  border-top: 1px solid color-mix(in srgb, var(--cuviq-border-color), #263238 30%);
  border-left: 1px solid color-mix(in srgb, var(--cuviq-border-color), #263238 30%);
  border-radius: 4px 0 0;
}

:host::after {
  inset: auto 11px 11px auto;
  border-right: 1px solid color-mix(in srgb, var(--cuviq-border-color), #263238 30%);
  border-bottom: 1px solid color-mix(in srgb, var(--cuviq-border-color), #263238 30%);
  border-radius: 0 0 4px;
}

.stage,
.poster,
.canvas-host,
.status {
  position: absolute;
  inset: 0;
}

.stage { isolation: isolate; }
.canvas-host { z-index: 2; }
.canvas-host canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  cursor: grab;
  outline: none;
}
.canvas-host canvas:active { cursor: grabbing; }

.poster {
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 1;
  transition: opacity 180ms ease;
}
.poster[hidden] { display: none; }
:host([data-state="ready"]) .poster { opacity: 0; pointer-events: none; }

.status {
  z-index: 3;
  display: grid;
  place-items: center;
  padding: 15%;
  text-align: center;
  pointer-events: none;
}
.status[hidden] { display: none; }
.status-card {
  max-width: 28rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, #ffffff 86%, transparent);
  box-shadow: 0 8px 28px rgb(38 50 56 / 10%);
  backdrop-filter: blur(8px);
  font-size: 0.8125rem;
  line-height: 1.35;
}
.status[data-kind="loading"] .status-card::before {
  content: "";
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.5rem;
  border: 2px solid rgb(49 94 251 / 25%);
  border-top-color: #315efb;
  border-radius: 50%;
  animation: cuviq-spin 700ms linear infinite;
}
.status[data-kind="error"] .status-card { color: #b42318; }

@keyframes cuviq-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .poster { transition: none; }
  .status[data-kind="loading"] .status-card::before { animation: none; }
}
`;
