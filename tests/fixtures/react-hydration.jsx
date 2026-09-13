import React, { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { ProductModel } from "../../examples/react/ProductModel";

hydrateRoot(document.getElementById("root"), <StrictMode><ProductModel /></StrictMode>, {
  onRecoverableError(error) {
    console.error("React hydration recovered from an error", error);
  },
});
