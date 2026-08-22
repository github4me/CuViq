import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "cuviq-viewer/auto";
import type { CuviqErrorDetail, CuviqReadyDetail } from "cuviq-viewer";

@Component({
  selector: "app-product-model",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cuviq-viewer
      src="/models/product.glb"
      poster="/images/product.webp"
      alt="Interactive 3D product model"
      [width]="640"
      [height]="480"
      (cuviq-ready)="onReady($event)"
      (cuviq-error)="onError($event)"
    ></cuviq-viewer>
  `,
})
export class ProductModelComponent {
  onReady(event: Event): void {
    const { source } = (event as CustomEvent<CuviqReadyDetail>).detail;
    console.log(`Loaded ${String(source)}`);
  }

  onError(event: Event): void {
    const { code, message } = (event as CustomEvent<CuviqErrorDetail>).detail;
    console.error(code, message);
  }
}
