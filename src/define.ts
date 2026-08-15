import { CuviqViewerElement } from "./cuviq-viewer";

export const CUVIQ_VIEWER_TAG = "cuviq-viewer";

export function defineCuviqViewer(registry?: CustomElementRegistry): typeof CuviqViewerElement {
  const target = registry ?? (typeof customElements === "undefined" ? undefined : customElements);
  if (!target) return CuviqViewerElement;
  if (!target.get(CUVIQ_VIEWER_TAG)) target.define(CUVIQ_VIEWER_TAG, CuviqViewerElement);
  return CuviqViewerElement;
}
