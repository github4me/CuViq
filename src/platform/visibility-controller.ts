export class VisibilityController {
  private readonly intersectionObserver: IntersectionObserver | undefined;
  private intersecting = true;
  private readonly onVisibilityChange: () => void;

  constructor(
    element: Element,
    private readonly callback: (visible: boolean) => void,
    lazy: boolean,
  ) {
    this.intersecting = !lazy;
    if (typeof IntersectionObserver === "function") {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          this.intersecting = entry.isIntersecting;
          this.report();
        },
        { rootMargin: "240px 0px" },
      );
      this.intersectionObserver.observe(element);
    } else {
      this.intersecting = true;
    }
    this.onVisibilityChange = () => this.report();
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.report();
  }

  private report(): void {
    this.callback(this.intersecting && !document.hidden);
  }

  dispose(): void {
    this.intersectionObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }
}
