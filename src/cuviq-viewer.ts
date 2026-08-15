import { SizeController } from "./platform/size-controller";
import { VisibilityController } from "./platform/visibility-controller";
import { ViewerRuntime } from "./runtime/viewer-runtime";
import { VIEWER_STYLES } from "./styles";
import type {
  CuviqErrorDetail,
  CuviqLoading,
  CuviqSource,
  CuviqViewerState,
} from "./types";

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === "undefined"
  ? (class {} as unknown as typeof HTMLElement)
  : HTMLElement;

export class CuviqViewerElement extends HTMLElementBase {
  static readonly observedAttributes = ["src", "poster", "loading", "alt", "aria-label", "width", "height"];

  private readonly canvasHost: HTMLDivElement;
  private readonly posterElement: HTMLImageElement;
  private readonly statusElement: HTMLDivElement;
  private readonly statusText: HTMLDivElement;
  private runtime: ViewerRuntime | undefined;
  private visibility: VisibilityController | undefined;
  private size: SizeController | undefined;
  private connected = false;
  private active = false;
  private visible = true;
  private pendingSource: CuviqSource | undefined;
  private generatedAriaLabel: string | undefined;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = VIEWER_STYLES;
    const stage = document.createElement("div");
    stage.className = "stage";
    this.posterElement = document.createElement("img");
    this.posterElement.className = "poster";
    this.posterElement.alt = "";
    this.posterElement.hidden = true;
    this.canvasHost = document.createElement("div");
    this.canvasHost.className = "canvas-host";
    this.statusElement = document.createElement("div");
    this.statusElement.className = "status";
    this.statusElement.hidden = true;
    this.statusText = document.createElement("div");
    this.statusText.className = "status-card";
    this.statusElement.append(this.statusText);
    stage.append(this.posterElement, this.canvasHost, this.statusElement);
    shadow.append(style, stage);
  }

  get src(): string {
    return this.getAttribute("src") ?? "";
  }

  set src(value: string) {
    if (value) this.setAttribute("src", value);
    else this.removeAttribute("src");
  }

  get poster(): string {
    return this.getAttribute("poster") ?? "";
  }

  set poster(value: string) {
    if (value) this.setAttribute("poster", value);
    else this.removeAttribute("poster");
  }

  get loading(): CuviqLoading {
    return this.getAttribute("loading") === "eager" ? "eager" : "lazy";
  }

  set loading(value: CuviqLoading) {
    this.setAttribute("loading", value === "eager" ? "eager" : "lazy");
  }

  get alt(): string {
    return this.getAttribute("alt") ?? "";
  }

  set alt(value: string) {
    if (value) this.setAttribute("alt", value);
    else this.removeAttribute("alt");
  }

  get width(): number | null {
    return this.parseDimension(this.getAttribute("width"));
  }

  set width(value: number | null) {
    this.setDimensionAttribute("width", value);
  }

  get height(): number | null {
    return this.parseDimension(this.getAttribute("height"));
  }

  set height(value: number | null) {
    this.setDimensionAttribute("height", value);
  }

  connectedCallback(): void {
    if (this.connected) return;
    this.connected = true;
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    this.syncPoster();
    this.syncAccessibleName();
    this.setupVisibility();
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.active = false;
    this.visibility?.dispose();
    this.visibility = undefined;
    this.size?.dispose();
    this.size = undefined;
    this.runtime?.dispose();
    this.runtime = undefined;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (name === "poster") {
      this.syncPoster();
      return;
    }
    if (name === "alt" || name === "aria-label") {
      this.syncAccessibleName();
      return;
    }
    if (name === "width" || name === "height") {
      this.syncDimension(name);
      return;
    }
    if (name === "loading" && this.connected) {
      this.setupVisibility();
      return;
    }
    if (name === "src" && this.connected) {
      if (!newValue) {
        this.pendingSource = undefined;
        this.runtime?.clear();
        this.setState("idle");
      } else {
        this.pendingSource = newValue;
        if (this.active) void this.startLoad(newValue, false);
        else this.setState("waiting", "Model will load when it is near the viewport.");
      }
    }
  }

  async load(source: CuviqSource): Promise<void> {
    this.pendingSource = source;
    this.activate();
    if (!this.runtime) throw new Error("CuViq could not initialize its viewer runtime.");
    await this.startLoad(source, true);
  }

  private setupVisibility(): void {
    this.visibility?.dispose();
    this.visibility = new VisibilityController(this, (visible) => {
      this.visible = visible;
      this.runtime?.setVisible(visible);
      if (visible) this.activate();
      else if (!this.active && (this.pendingSource !== undefined || this.src)) {
        this.setState("waiting", "Model will load when it is near the viewport.");
      }
    }, this.loading === "lazy");
    if (this.loading === "eager") this.activate();
  }

  private activate(): void {
    if (!this.connected || this.active) return;
    this.active = true;
    try {
      this.runtime = new ViewerRuntime(this.canvasHost, {
        onStateChange: (state, message) => this.setState(state, message),
        onReady: (detail) => {
          this.dispatchEvent(new CustomEvent("cuviq-ready", { detail, bubbles: true, composed: true }));
        },
        onError: (detail) => this.dispatchError(detail),
      });
      this.runtime.setVisible(this.visible);
      this.size = new SizeController(this, (size) => this.runtime?.resize(size));
      const source = this.pendingSource ?? this.src;
      if (source) void this.startLoad(source, false);
    } catch (error) {
      const detail: CuviqErrorDetail = {
        code: "WEBGL_UNAVAILABLE",
        message: error instanceof Error ? error.message : "WebGL is unavailable.",
      };
      this.setState("error", detail.message);
      this.dispatchError(detail);
    }
  }

  private async startLoad(source: CuviqSource, rethrow: boolean): Promise<void> {
    if (!this.runtime) return;
    try {
      await this.runtime.load(source);
    } catch (error) {
      if (rethrow) throw error;
    }
  }

  private setState(state: CuviqViewerState, message?: string): void {
    this.dataset.state = state;
    const loading = state === "waiting" || state === "initializing" || state === "loading";
    const error = state === "error" || state === "context-lost";
    this.statusElement.hidden = !loading && !error;
    this.statusElement.dataset.kind = error ? "error" : "loading";
    this.statusElement.setAttribute("role", error ? "alert" : "status");
    this.statusElement.setAttribute("aria-live", error ? "assertive" : "polite");
    this.statusText.textContent = message ?? "";
    if (state === "ready" && this.posterElement.src) {
      window.setTimeout(() => {
        if (this.dataset.state === "ready") this.posterElement.hidden = true;
      }, 200);
    } else if (this.poster) {
      this.posterElement.hidden = false;
    }
  }

  private syncPoster(): void {
    const poster = this.poster;
    if (poster) {
      this.posterElement.src = poster;
      this.posterElement.hidden = this.dataset.state === "ready";
    } else {
      this.posterElement.removeAttribute("src");
      this.posterElement.hidden = true;
    }
  }

  private syncAccessibleName(): void {
    const current = this.getAttribute("aria-label");
    const alt = this.alt.trim();
    if ((!current || current === this.generatedAriaLabel) && alt) {
      this.generatedAriaLabel = alt;
      if (current !== alt) this.setAttribute("aria-label", alt);
    } else if (current === this.generatedAriaLabel && !alt) {
      this.generatedAriaLabel = undefined;
      this.removeAttribute("aria-label");
    }
  }

  private parseDimension(value: string | null): number | null {
    if (value === null || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private setDimensionAttribute(name: "width" | "height", value: number | null): void {
    if (value === null) {
      this.removeAttribute(name);
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`CuViq ${name} must be a positive finite number.`);
    }
    this.setAttribute(name, String(value));
  }

  private syncDimension(name: "width" | "height"): void {
    const value = this.parseDimension(this.getAttribute(name));
    const property = `--cuviq-attribute-${name}`;
    if (value === null) this.style.removeProperty(property);
    else this.style.setProperty(property, `${value}px`);
  }

  private dispatchError(detail: CuviqErrorDetail): void {
    this.dispatchEvent(new CustomEvent("cuviq-error", { detail, bubbles: true, composed: true }));
  }
}
