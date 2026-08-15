import {
  ACESFilmicToneMapping,
  Color,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CuviqError } from "../errors";

export interface SceneControllerCallbacks {
  onContextLost(): void;
  onContextRestored(): void;
}

export class SceneController {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(35, 1, 0.01, 1000);
  readonly renderer: WebGLRenderer;
  private readonly pmrem: PMREMGenerator;
  private readonly environment: Texture;
  private readonly callbacks: SceneControllerCallbacks;
  private readonly handleContextLost: (event: Event) => void;
  private readonly handleContextRestored: () => void;
  private disposed = false;
  private width = 1;
  private height = 1;

  constructor(host: HTMLElement, callbacks: SceneControllerCallbacks) {
    this.callbacks = callbacks;
    try {
      this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      throw new CuviqError("WEBGL_UNAVAILABLE", "WebGL is unavailable in this browser or device.");
    }

    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.tabIndex = -1;
    host.append(this.renderer.domElement);

    this.pmrem = new PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    this.environment = this.pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    this.scene.environment = this.environment;

    this.handleContextLost = (event) => {
      event.preventDefault();
      this.callbacks.onContextLost();
    };
    this.handleContextRestored = () => this.callbacks.onContextRestored();
    this.renderer.domElement.addEventListener("webglcontextlost", this.handleContextLost);
    this.renderer.domElement.addEventListener("webglcontextrestored", this.handleContextRestored);
  }

  resize(width: number, height: number, pixelRatio: number): boolean {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    const changed = nextWidth !== this.width || nextHeight !== this.height;
    if (!changed) return false;
    this.width = nextWidth;
    this.height = nextHeight;
    this.camera.aspect = nextWidth / nextHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(nextWidth, nextHeight, false);
    return true;
  }

  render(): void {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.scene.environment = null;
    this.environment.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}
