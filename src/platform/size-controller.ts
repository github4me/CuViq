export interface ViewerSize {
  width: number;
  height: number;
  pixelRatio: number;
}

function effectivePixelRatio(): number {
  const deviceRatio = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  const mobileClass = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return Math.min(deviceRatio, mobileClass ? 1.5 : 2);
}

export class SizeController {
  private readonly observer: ResizeObserver | undefined;

  constructor(element: Element, callback: (size: ViewerSize) => void) {
    const report = (width: number, height: number) => callback({ width, height, pixelRatio: effectivePixelRatio() });
    if (typeof ResizeObserver === "function") {
      this.observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) report(entry.contentRect.width, entry.contentRect.height);
      });
      this.observer.observe(element);
    } else {
      const rect = element.getBoundingClientRect();
      report(rect.width, rect.height);
    }
  }

  dispose(): void {
    this.observer?.disconnect();
  }
}
