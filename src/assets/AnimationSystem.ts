import { Logger } from "@/debug/Logger";
import { TextureLayerInfo } from "./TextureAtlasPacker";

interface AnimSlot {
  name: string;
  baseLayer: number;
  frameCount: number;
  frameTime: number; // ticks per frame (at 20 ticks/s = 50ms/tick)
  interpolate: boolean;
  slotIndex: number;
}

/**
 * Each animated texture contains 2 consecutive u32s in the buffer
 * [0]: currentFrame
 * [1]: nextFrame (only used if interpolate is true)
 */
const UINTS_PER_SLOT = 2;

export class AnimationSystem {
  private slots: AnimSlot[] = [];
  private frameBuffer!: GPUBuffer;
  private frameData: Uint32Array<ArrayBuffer> = new Uint32Array(0);
  private device!: GPUDevice;

  init(device: GPUDevice, layerMap: Map<string, TextureLayerInfo>): void {
    this.device = device;
    this.slots = [];

    for (const [name, info] of layerMap) {
      if (info.frameCount > 1) {
        this.slots.push({
          name,
          baseLayer: info.baseLayer,
          frameCount: info.frameCount,
          frameTime: info.frameTime,
          interpolate: info.interpolate,
          slotIndex: this.slots.length,
        });
      }
    }

    const totalU32s = this.slots.length * UINTS_PER_SLOT;
    this.frameData = new Uint32Array(Math.max(totalU32s, 1)); // Ensure at least 1 u32 to avoid zero-sized buffer

    const bufferSize = Math.ceil((totalU32s * 4) / 16) * 16; // Align to 16 bytes

    this.frameBuffer = device.createBuffer({
      label: "AnimFrameBuffer",
      size: Math.max(bufferSize, 16), // Ensure at least 16 bytes to avoid zero-sized buffer
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    Logger.info(
      `AnimationSystem: tracking ${this.slots.length} animated textures with baseLayers: ${this.slots.map((s) => s.baseLayer).join(", ")}`,
    );
    for (const s of this.slots) {
      Logger.verbose(
        "AnimationSystem",
        `  ${s.name}: ${s.frameCount} frames @ ${s.frameTime} ticks/frame`,
      );
    }
  }

  update(elapsedSeconds: number) : void {
    if (this.slots.length === 0) return;

    const TICKS_PER_SECOND = 20;

    for (const slot of this.slots) {
        const totalTicks = elapsedSeconds * TICKS_PER_SECOND;
        const ticksPerCycle = slot.frameCount * slot.frameTime;
        const cycleTick = totalTicks % ticksPerCycle;
        const currentFrame = Math.floor(cycleTick / slot.frameTime) % slot.frameCount;
        const nextFrame = (currentFrame + 1) % slot.frameCount;

        const base = slot.slotIndex * UINTS_PER_SLOT;
        this.frameData[base] = slot.baseLayer + currentFrame;
        this.frameData[base + 1] = slot.baseLayer + nextFrame;
    }

    this.device.queue.writeBuffer(this.frameBuffer, 0, this.frameData);
  }

  destroy(): void {
    this.frameBuffer?.destroy();
  }
}
