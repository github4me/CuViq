import { Box3, MathUtils, Object3D, PerspectiveCamera, Sphere, Vector3 } from "three";
import { CuviqError } from "../errors";

export const CAMERA_FIT_MARGIN = 1.18;
export const MIN_POLAR_ANGLE = MathUtils.degToRad(15);
export const MAX_POLAR_ANGLE = MathUtils.degToRad(165);
export const MIN_BOUND_SIZE = 1e-9;
export const CAMERA_DIRECTION = new Vector3(1, 0.55, 1).normalize();
export const MIN_DISTANCE_RADIUS_FACTOR = 1.08;
export const MAX_DISTANCE_FIT_FACTOR = 4;
export const NEAR_RADIUS_FACTOR = 0.01;
export const FAR_DISTANCE_FACTOR = 8;

export interface CameraFitResult {
  bounds: Box3;
  sphere: Sphere;
  fitDistance: number;
  minDistance: number;
  maxDistance: number;
}

function finiteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

export function calculateFitDistance(camera: PerspectiveCamera, radius: number, margin = CAMERA_FIT_MARGIN): number {
  const verticalFov = MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  return (radius * margin) / Math.sin(limitingFov / 2);
}

export function fitCameraToObject(
  root: Object3D,
  camera: PerspectiveCamera,
  target: Vector3,
  direction = CAMERA_DIRECTION,
): CameraFitResult {
  root.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(root);
  if (bounds.isEmpty() || !finiteVector(bounds.min) || !finiteVector(bounds.max)) {
    throw new CuviqError("MODEL_EMPTY", "The model does not contain usable geometry bounds.");
  }

  const size = bounds.getSize(new Vector3());
  if (!finiteVector(size) || Math.max(size.x, size.y, size.z) < MIN_BOUND_SIZE) {
    throw new CuviqError("MODEL_EMPTY", "The model bounds are empty or too small to display.");
  }

  const sphere = bounds.getBoundingSphere(new Sphere());
  if (!finiteVector(sphere.center) || !Number.isFinite(sphere.radius) || sphere.radius < MIN_BOUND_SIZE) {
    throw new CuviqError("MODEL_EMPTY", "The model does not contain finite displayable bounds.");
  }

  const fitDistance = calculateFitDistance(camera, sphere.radius);
  target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction.clone().normalize(), fitDistance);
  camera.near = Math.max(sphere.radius * NEAR_RADIUS_FACTOR, Number.EPSILON);
  camera.far = Math.max(fitDistance * FAR_DISTANCE_FACTOR, camera.near * 100);
  camera.updateProjectionMatrix();

  return {
    bounds,
    sphere,
    fitDistance,
    minDistance: sphere.radius * MIN_DISTANCE_RADIUS_FACTOR,
    maxDistance: fitDistance * MAX_DISTANCE_FIT_FACTOR,
  };
}
