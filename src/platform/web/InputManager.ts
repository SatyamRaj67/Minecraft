// === KEY STATE ===

import { EngineEvent, globalBus } from "@/core/ecs/events/EventBus";

const KEY_UP = 0;
const KEY_DOWN = 1;
const KEY_JUST_PRESSED = 2;
const KEY_JUST_RELEASED = 3;

export class InputManager {
  private keys = new Uint8Array(256);
  private mouseButtons = new Uint8Array(8);
  private mouseDX = 0;
  private mouseDY = 0;
  private pointerLocked = false;
  private canvas: HTMLCanvasElement;

  private pendingKeyDown: Array<{ code: string; key: string }> = [];
  private pendingKeyUp: Array<{ code: string; key: string }> = [];
  private pendingMouseMove: Array<{ dx: number; dy: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.attach();
  }

  update(): void {
    // Reset just pressed/ just-released states from previous frame
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i] === KEY_JUST_PRESSED) this.keys[i] = KEY_DOWN;
      if (this.keys[i] === KEY_JUST_RELEASED) this.keys[i] = KEY_UP;
    }
    for (let i = 0; i < this.mouseButtons.length; i++) {
      if (this.mouseButtons[i] === KEY_JUST_PRESSED)
        this.mouseButtons[i] = KEY_DOWN;
      if (this.mouseButtons[i] === KEY_JUST_RELEASED)
        this.mouseButtons[i] = KEY_UP;
    }

    // Accumulate mouse delta for this frame
    this.mouseDX = 0;
    this.mouseDY = 0;

    for (const e of this.pendingMouseMove) {
      this.mouseDX += e.dx;
      this.mouseDY += e.dy;
    }
    this.pendingMouseMove.length = 0;

    // Dispatch queued key events
    for (const e of this.pendingKeyDown) {
      const code = this.keyCode(e.code);
      this.keys[code] = KEY_JUST_PRESSED;
      globalBus.emit(EngineEvent.KEY_DOWN, { code: e.code, repeat: false });
    }
  }

  //   === Query API ===
  isKeyDown(code: string): boolean {
    const k = this.keyCode(code);
    return this.keys[k] === KEY_DOWN || this.keys[k] === KEY_JUST_PRESSED;
  }

  isKeyJustPressed(code: string): boolean {
    return this.keys[this.keyCode(code)] === KEY_JUST_PRESSED;
  }

  isKeyJustReleased(code: string): boolean {
    return this.keys[this.keyCode(code)] === KEY_JUST_RELEASED;
  }

  get mouseDelta(): { dx: number; dy: number } {
    return { dx: this.mouseDX, dy: this.mouseDY };
  }

  get isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  //   === Pointer Lock ===
  async requestPointerLock(): Promise<void> {
    try {
      await this.canvas.requestPointerLock();
    } catch (e) {
      // requestPointerLock may throw in certain browser states — ignore
    }
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  //   === Lifecycle ===
  destroy(): void {
    this.detach();
  }

  //   === Private: DOM event handlers
  private boundKeyDown!: (e: KeyboardEvent) => void;
  private boundKeyUp!: (e: KeyboardEvent) => void;
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundMouseDown!: (e: MouseEvent) => void;
  private boundMouseUp!: (e: MouseEvent) => void;
  private boundLockChange!: () => void;
  private boundContextMenu!: (e: Event) => void;

  private attach(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      this.pendingKeyDown.push({ code: e.code, key: e.key });
    };
    this.boundKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      this.pendingKeyUp.push({ code: e.code, key: e.key });
    };
    this.boundMouseMove = (e: MouseEvent) => {
      if (this.pointerLocked) {
        this.pendingMouseMove.push({ dx: e.movementX, dy: e.movementY });
      }
    };
    this.boundMouseDown = (e: MouseEvent) => {
      this.mouseButtons[e.button] = KEY_JUST_PRESSED;
        globalBus.emit(EngineEvent.MOUSE_BUTTON, {
          button: e.button,
          pressed: true,
        });
    };
    this.boundMouseUp = (e: MouseEvent) => {
      this.mouseButtons[e.button] = KEY_JUST_RELEASED;
        globalBus.emit(EngineEvent.MOUSE_BUTTON, {
          button: e.button,
          pressed: false,
        });
    };
    this.boundLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };
    this.boundContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", this.boundKeyDown);
    document.addEventListener("keyup", this.boundKeyUp);
    document.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("contextmenu", this.boundContextMenu);
    document.addEventListener("pointerlockchange", this.boundLockChange);
  }

  private detach(): void {
    document.removeEventListener("keydown", this.boundKeyDown);
    document.removeEventListener("keyup", this.boundKeyUp);
    document.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
    document.removeEventListener("pointerlockchange", this.boundLockChange);
  }

  private keyCode(code: string): number {
    // Simple djb2 hash reduced to 0-255
    let h = 5381;
    for (let i = 0; i < code.length; i++)
      h = ((h << 5) + h) ^ code.charCodeAt(i);
    return (h >>> 0) % 256;
  }
}
