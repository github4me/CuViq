import type { CuviqViewerElement } from "./cuviq-viewer";

type CuviqJsxAttributes = {
  src?: string;
  poster?: string;
  loading?: "lazy" | "eager";
  alt?: string;
  width?: number;
  height?: number;
  "aria-label"?: string;
  class?: string;
  className?: string;
  style?: string | Record<string, string | number>;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "cuviq-viewer": CuviqJsxAttributes;
    }
  }

  interface HTMLElementTagNameMap {
    "cuviq-viewer": CuviqViewerElement;
  }
}

export {};
