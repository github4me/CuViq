import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  CAMERA_FIT_MARGIN,
  calculateFitDistance,
  fitCameraToObject,
} from "../../src/runtime/camera-fitter";

function box(width: number, height: number, depth: number, offset = new Vector3()): Group {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(width, height, depth), new MeshBasicMaterial());
  mesh.position.copy(offset);
  root.add(mesh);
  return root;
}

describe("camera fitting", () => {
  it.each([
    ["tiny", 1e-4, 2e-4, 1e-4],
    ["huge", 1e6, 2e6, 5e5],
    ["flat", 10, 0.001, 7],
    ["tall", 1, 50, 2],
  ])("fits a %s finite model", (_name, width, height, depth) => {
    const camera = new PerspectiveCamera(35, 1, 0.01, 1000);
    const result = fitCameraToObject(box(width, height, depth), camera, new Vector3());
    expect(result.sphere.radius).toBeGreaterThan(0);
    expect(result.minDistance).toBeLessThan(result.fitDistance);
    expect(result.maxDistance).toBeGreaterThan(result.fitDistance);
    expect(camera.near).toBeGreaterThan(0);
    expect(camera.far).toBeGreaterThan(result.maxDistance);
  });

  it("targets offset and transformed geometry", () => {
    const root = box(2, 4, 6, new Vector3(12, -7, 3));
    root.rotation.y = Math.PI / 4;
    const target = new Vector3();
    const result = fitCameraToObject(root, new PerspectiveCamera(35, 1.5), target);
    expect(target.distanceTo(result.sphere.center)).toBeLessThan(1e-8);
    expect(target.length()).toBeGreaterThan(1);
  });

  it("uses the smaller horizontal FOV for narrow viewports", () => {
    const wide = new PerspectiveCamera(35, 2);
    const narrow = new PerspectiveCamera(35, 0.5);
    expect(calculateFitDistance(narrow, 2, CAMERA_FIT_MARGIN)).toBeGreaterThan(calculateFitDistance(wide, 2));
  });

  it("rejects an empty model", () => {
    expect(() => fitCameraToObject(new Group(), new PerspectiveCamera(), new Vector3())).toThrow(/usable geometry/i);
  });
});
