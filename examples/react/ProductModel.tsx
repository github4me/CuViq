import { useEffect, useRef } from "react";
import "cuviq-viewer/auto";
import type {} from "cuviq-viewer/react";
import type { CuviqReadyDetail, CuviqViewerElement } from "cuviq-viewer";

export function ProductModel() {
  const viewer = useRef<CuviqViewerElement>(null);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;

    const handleReady = (event: Event) => {
      const { source } = (event as CustomEvent<CuviqReadyDetail>).detail;
      console.log(`Loaded ${String(source)}`);
    };

    element.addEventListener("cuviq-ready", handleReady);
    return () => element.removeEventListener("cuviq-ready", handleReady);
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
