export const keys: Record<string, boolean> = {};
export const justPressed: Record<string, boolean> = {};
export const mouse = { x: 0, y: 0, down: false, justClicked: false };

const listeners: Array<(key: string) => void> = [];

export function onKey(handler: (key: string) => void) {
  listeners.push(handler);
}

export function initInput(canvas: HTMLCanvasElement) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;
    listeners.forEach((fn) => fn(k));
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.down = true;
      mouse.justClicked = true;
    }
  });
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    mouse.down = false;
  });
}

export function endFrame() {
  for (const k of Object.keys(justPressed)) delete justPressed[k];
  mouse.justClicked = false;
}
