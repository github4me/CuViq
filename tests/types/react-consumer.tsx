import type {} from "../../src/react";

const viewer = (
  <cuviq-viewer
    src="/models/product.glb"
    poster="/images/product.webp"
    alt="Interactive 3D product model"
    width={640}
    height={480}
  />
);

void viewer;

// React 19 writes undefined when an existing property is omitted on rerender.
// Both reset forms must also compile with exactOptionalPropertyTypes enabled.
const resetDimensions = <cuviq-viewer width={undefined} height={null} />;
const otherResetDimensions = <cuviq-viewer width={null} height={undefined} />;
void resetDimensions;
void otherResetDimensions;
