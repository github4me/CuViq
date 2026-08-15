import { describe, expect, it, vi } from "vitest";
import { RenderScheduler } from "../../src/runtime/render-scheduler";

describe("RenderScheduler", () => {
  it("coalesces requests and stops when settled", () => {
    const frames: FrameRequestCallback[] = [];
    const render = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const scheduler = new RenderScheduler(render, (callback) => (frames.push(callback), frames.length), vi.fn());
    scheduler.request();
    scheduler.request();
    expect(frames).toHaveLength(1);
    frames.shift()?.(0);
    expect(frames).toHaveLength(1);
    frames.shift()?.(1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(scheduler.hasPendingFrame).toBe(false);
  });

  it("cancels and suppresses work while suspended", () => {
    const cancel = vi.fn();
    const render = vi.fn().mockReturnValue(false);
    const scheduler = new RenderScheduler(render, () => 42, cancel);
    scheduler.request();
    scheduler.setSuspended(true);
    expect(cancel).toHaveBeenCalledWith(42);
    scheduler.request();
    expect(render).not.toHaveBeenCalled();
  });

  it("runs first-frame callbacks once", () => {
    const frames: FrameRequestCallback[] = [];
    const after = vi.fn();
    const scheduler = new RenderScheduler(() => false, (callback) => (frames.push(callback), 1), vi.fn());
    scheduler.request(after);
    scheduler.request(after);
    frames[0]?.(0);
    expect(after).toHaveBeenCalledTimes(1);
  });
});
