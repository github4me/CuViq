import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
// Vite's dependency scanner otherwise discovers its generated development JSX
// helper only on the first request and reloads other parallel test pages.
import "react/jsx-dev-runtime";
import type {} from "../../src/react";

// Use the package export, not a source alias, to exercise the built npm entry.
await import("cuviq-viewer/auto");

function Dimensions() {
  const [mode, setMode] = useState<"sized" | "undefined" | "null" | "omitted">("sized");
  const dimensions = mode === "omitted" ? {} : {
    width: mode === "sized" ? 480 : mode === "null" ? null : undefined,
    height: mode === "sized" ? 320 : mode === "null" ? null : undefined,
  };
  return (
    <>
      <cuviq-viewer src="/tests/fixtures/cube.glb" loading="eager" {...dimensions} />
      <button onClick={() => setMode("sized")}>Set dimensions</button>
      <button onClick={() => setMode("undefined")}>Reset to undefined</button>
      <button onClick={() => setMode("null")}>Reset to null</button>
      <button onClick={() => setMode("omitted")}>Omit dimensions</button>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Dimensions /></StrictMode>);
