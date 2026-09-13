import { MOUSE, PerspectiveCamera, TOUCH } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAX_POLAR_ANGLE, MIN_POLAR_ANGLE } from "./camera-fitter.js";

export class InteractionController {
  readonly controls: OrbitControls;
  private readonly onChange: () => void;

  constructor(camera: PerspectiveCamera, element: HTMLElement, requestRender: () => void) {
    this.controls = new OrbitControls(camera, element);
    this.controls.enablePan = false;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = MIN_POLAR_ANGLE;
    this.controls.maxPolarAngle = MAX_POLAR_ANGLE;
    this.controls.mouseButtons.LEFT = MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = MOUSE.ROTATE;
    this.controls.touches.ONE = TOUCH.ROTATE;
    this.controls.touches.TWO = TOUCH.DOLLY_ROTATE;
    // OrbitControls sets an inline `touch-action: none`; restore CuViq's policy so
    // vertical one-finger gestures can scroll the page while horizontal gestures rotate.
    element.style.touchAction = "pan-y";
    this.onChange = requestRender;
    this.controls.addEventListener("change", this.onChange);
  }

  update(): boolean {
    return this.controls.update();
  }

  dispose(): void {
    this.controls.removeEventListener("change", this.onChange);
    this.controls.dispose();
  }
}
