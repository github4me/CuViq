import type { DetailedHTMLProps, HTMLAttributes } from "react";
export type {} from "react/jsx-dev-runtime";
export type {} from "react/jsx-runtime";
import type { CuviqViewerElement } from "./cuviq-viewer.js";

/** React 19 JSX attributes for the CuViq custom element. */
export type CuviqReactProps = Omit<
  DetailedHTMLProps<HTMLAttributes<CuviqViewerElement>, CuviqViewerElement>,
  "width" | "height"
> & {
  src?: string;
  poster?: string;
  loading?: "lazy" | "eager";
  alt?: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cuviq-viewer": CuviqReactProps;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "cuviq-viewer": CuviqReactProps;
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "cuviq-viewer": CuviqReactProps;
    }
  }
}
