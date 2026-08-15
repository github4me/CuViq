import { Object3D } from "three";
import { CuviqError, normalizeLoadError } from "../errors";
import type { CuviqSource, ViewerRuntimeCallbacks } from "../types";
import type { ViewerSize } from "../platform/size-controller";
import { fitCameraToObject } from "./camera-fitter";
import { InteractionController } from "./interaction-controller";
import { RenderScheduler } from "./render-scheduler";
import { disposeObjectResources } from "./resource-disposer";
import { SceneController } from "./scene-controller";
import { SourceLoader } from "./source-loader";

export class ViewerRuntime {
  private readonly scene: SceneController;
  private readonly interaction: InteractionController;
  private readonly scheduler: RenderScheduler;
  private readonly loader = new SourceLoader();
  private generation = 0;
  private model: Object3D | undefined;
  private currentSource: CuviqSource | undefined;
  private disposed = false;
  private visible = true;
  private size: ViewerSize | undefined;
  private lastFitAspect = 1;

  constructor(canvasHost: HTMLElement, private readonly callbacks: ViewerRuntimeCallbacks) {
    callbacks.onStateChange("initializing", "Preparing 3D viewer…");
    this.scene = new SceneController(canvasHost, {
      onContextLost: () => this.handleContextLost(),
      onContextRestored: () => this.handleContextRestored(),
    });
    this.scheduler = new RenderScheduler(() => {
      const settling = this.interaction.update();
      this.scene.render();
      return settling;
    });
    this.interaction = new InteractionController(
      this.scene.camera,
      this.scene.renderer.domElement,
      () => this.scheduler.request(),
    );
    callbacks.onStateChange("idle");
    this.scheduler.request();
  }

  async load(source: CuviqSource): Promise<void> {
    if (this.disposed) throw new CuviqError("LOAD_FAILED", "The viewer is disconnected.", source);
    const generation = ++this.generation;
    this.currentSource = source;
    this.removeModel();
    this.callbacks.onStateChange("loading", "Loading model…");

    try {
      const loaded = await this.loader.load(source);
      if (this.disposed || generation !== this.generation) {
        disposeObjectResources(loaded.root);
        return;
      }
      const fit = fitCameraToObject(loaded.root, this.scene.camera, this.interaction.controls.target);
      this.interaction.controls.minDistance = fit.minDistance;
      this.interaction.controls.maxDistance = fit.maxDistance;
      this.interaction.controls.update();
      this.lastFitAspect = this.scene.camera.aspect;
      this.scene.scene.add(loaded.root);
      this.model = loaded.root;

      await new Promise<void>((resolve) => {
        this.scheduler.request(() => {
          if (this.disposed || generation !== this.generation) return resolve();
          this.callbacks.onStateChange("ready");
          this.callbacks.onReady({ source });
          resolve();
        });
      });
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      const normalized = normalizeLoadError(error, source);
      this.callbacks.onStateChange("error", normalized.message);
      this.callbacks.onError(normalized.toDetail());
      throw normalized;
    }
  }

  clear(): void {
    this.generation += 1;
    this.currentSource = undefined;
    this.removeModel();
    this.callbacks.onStateChange("idle");
    this.scheduler.request();
  }

  resize(size: ViewerSize): void {
    const oldAspect = this.scene.camera.aspect;
    this.size = size;
    if (!this.scene.resize(size.width, size.height, size.pixelRatio)) return;
    const nextAspect = this.scene.camera.aspect;
    const meaningfulAspectChange = Math.abs(nextAspect - this.lastFitAspect) / Math.max(this.lastFitAspect, 0.01) > 0.2;
    if (this.model && meaningfulAspectChange) {
      const direction = this.scene.camera.position.clone().sub(this.interaction.controls.target).normalize();
      const fit = fitCameraToObject(this.model, this.scene.camera, this.interaction.controls.target, direction);
      this.interaction.controls.minDistance = fit.minDistance;
      this.interaction.controls.maxDistance = fit.maxDistance;
      this.lastFitAspect = nextAspect;
      this.interaction.controls.update();
    } else if (oldAspect !== nextAspect) {
      this.scene.camera.updateProjectionMatrix();
    }
    this.scheduler.request();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.scheduler.setSuspended(!visible);
    if (visible) this.scheduler.request();
  }

  private removeModel(): void {
    if (!this.model) return;
    this.scene.scene.remove(this.model);
    disposeObjectResources(this.model);
    this.model = undefined;
  }

  private handleContextLost(): void {
    if (this.disposed) return;
    this.scheduler.setSuspended(true);
    const error = new CuviqError(
      "WEBGL_CONTEXT_LOST",
      "The 3D graphics context was lost. CuViq will retry when it is restored.",
      this.currentSource,
    );
    this.callbacks.onStateChange("context-lost", error.message);
    this.callbacks.onError(error.toDetail());
  }

  private handleContextRestored(): void {
    if (this.disposed) return;
    this.scheduler.setSuspended(!this.visible);
    if (this.size) this.scene.resize(this.size.width, this.size.height, this.size.pixelRatio);
    const source = this.currentSource;
    if (source !== undefined) void this.load(source).catch(() => undefined);
    else this.scheduler.request();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.removeModel();
    this.scheduler.dispose();
    this.interaction.dispose();
    this.scene.dispose();
  }
}
