export type FrameCallback = () => void;

export class RenderScheduler {
  private frameId: number | undefined;
  private suspended = false;
  private disposed = false;
  private readonly afterFrame = new Set<FrameCallback>();

  constructor(
    private readonly render: () => boolean,
    private readonly requestAnimationFrameImpl: (callback: FrameRequestCallback) => number =
      (callback) => globalThis.requestAnimationFrame(callback),
    private readonly cancelAnimationFrameImpl: (id: number) => void =
      (id) => globalThis.cancelAnimationFrame(id),
  ) {}

  request(afterFrame?: FrameCallback): void {
    if (afterFrame) this.afterFrame.add(afterFrame);
    if (this.disposed || this.suspended || this.frameId !== undefined) return;
    this.frameId = this.requestAnimationFrameImpl(() => {
      this.frameId = undefined;
      if (this.disposed || this.suspended) return;
      const needsAnotherFrame = this.render();
      const callbacks = [...this.afterFrame];
      this.afterFrame.clear();
      for (const callback of callbacks) callback();
      if (needsAnotherFrame) this.request();
    });
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended && this.frameId !== undefined) {
      this.cancelAnimationFrameImpl(this.frameId);
      this.frameId = undefined;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.afterFrame.clear();
    if (this.frameId !== undefined) this.cancelAnimationFrameImpl(this.frameId);
    this.frameId = undefined;
  }

  get hasPendingFrame(): boolean {
    return this.frameId !== undefined;
  }
}
