import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type {} from "./src/react";
import type { CuviqErrorDetail, CuviqReadyDetail, CuviqViewerElement } from "./src/index";

const SAMPLE_MODEL_URL = "/examples/models/brass-ferrule-block.glb";

await customElements.whenDefined("cuviq-viewer");

type ViewerStatus = {
  detail: string;
  kind: "loading" | "ready" | "error";
  label: string;
};

function ReactPreview() {
  const viewer = useRef<CuviqViewerElement>(null);
  const [status, setStatus] = useState<ViewerStatus>({
    kind: "loading",
    label: "Loading sample",
    detail: "Waiting for the custom element to render its first frame.",
  });

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;

    const onReady = (event: Event) => {
      const { source } = (event as CustomEvent<CuviqReadyDetail>).detail;
      setStatus({ kind: "ready", label: "Ready", detail: `Loaded ${String(source)}` });
    };
    const onError = (event: Event) => {
      const { code, message } = (event as CustomEvent<CuviqErrorDetail>).detail;
      setStatus({ kind: "error", label: code, detail: message });
    };

    element.addEventListener("cuviq-ready", onReady);
    element.addEventListener("cuviq-error", onError);
    return () => {
      element.removeEventListener("cuviq-ready", onReady);
      element.removeEventListener("cuviq-error", onError);
    };
  }, []);

  const reloadModel = () => {
    if (!viewer.current) return;
    setStatus({ kind: "loading", label: "Reloading", detail: "React requested a fresh source URL." });
    viewer.current.src = `${SAMPLE_MODEL_URL}?reload=${Date.now()}`;
  };

  return (
    <main className="bench">
      <section>
        <p className="eyebrow">React 19 integration bench</p>
        <h1>One component.<br />Native control.</h1>
        <p className="lede">The React tree owns the page while CuViq owns the 3D canvas. Drag the ferrule to inspect it, then reload the model to exercise React-to-custom-element updates.</p>
        <div className="viewer-frame">
          <cuviq-viewer
            ref={viewer}
            src={SAMPLE_MODEL_URL}
            alt="Brass ferrule block, 10.8 millimetres"
            loading="eager"
          />
        </div>
      </section>

      <aside className="panel" aria-label="React integration status">
        <h2>Integration readout</h2>
        <p className="label">Runtime</p>
        <p className="value">React 19 + npm package</p>
        <div className="rule" />
        <p className="label">Element state</p>
        <p className="status" data-kind={status.kind} aria-live="polite">{status.label}</p>
        <p className="value">{status.detail}</p>
        <div className="rule" />
        <p className="label">Model</p>
        <p className="value">cuviq-viewer@0.1.0</p>
        <button type="button" onClick={reloadModel}>Reload model</button>
      </aside>
    </main>
  );
}

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <ReactPreview />
  </StrictMode>,
);
