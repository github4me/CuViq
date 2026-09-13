import React, { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { ProductModel } from "../../examples/react/ProductModel";

export function render() {
  return renderToString(<StrictMode><ProductModel /></StrictMode>);
}
