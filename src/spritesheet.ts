export class SpriteSheet {
  readonly image = new Image();
  readonly cols: number;
  readonly rows: number;
  ready = false;

  constructor(src: string, cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.image.onload = () => {
      this.ready = true;
    };
    this.image.src = src;
  }

  get frameWidth() {
    return this.image.width / this.cols;
  }
  get frameHeight() {
    return this.image.height / this.rows;
  }

  drawFrame(
    target: CanvasRenderingContext2D,
    frameIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    flip = false,
    alpha = 1,
  ): boolean {
    if (!this.ready) return false;
    const frame = Math.max(0, Math.floor(frameIndex));
    const col = frame % this.cols;
    const row = Math.floor(frame / this.cols);
    const sx = col * this.frameWidth;
    const sy = row * this.frameHeight;
    target.save();
    target.globalAlpha = alpha;
    if (flip) {
      target.translate(x + width, y);
      target.scale(-1, 1);
      target.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, 0, 0, width, height);
    } else {
      target.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, x, y, width, height);
    }
    target.restore();
    return true;
  }
}

export function frameFromCycle(start: number, count: number, time: number, fps: number) {
  return start + (Math.floor(time * fps) % count);
}

export function loadImage(src: string): { image: HTMLImageElement; isReady: () => boolean } {
  const image = new Image();
  let ready = false;
  image.onload = () => {
    ready = true;
  };
  image.src = src;
  return { image, isReady: () => ready };
}
