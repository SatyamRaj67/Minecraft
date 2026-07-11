import { assertGpu } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";

// === Global Allocation Trackers ===
const allocations = new Map<string, number>();

export function getTotalGpuAllocationBytes(): number {
  let total = 0;
  for (const v of allocations.values()) total += v;
  return total;
}

export function getAllGpuAllocations(): Record<string, number> {
  return Object.fromEntries(allocations);
}

// === GPU Buffers ===

export class GpuBuffer {
  readonly buffer: GPUBuffer;
  readonly byteSize: number;
  readonly usage: GPUBufferUsageFlags;
  readonly label: string;
  private _destroyed = false;

  constructor(device: GPUDevice, desc: GPUBufferDescriptor) {
    this.buffer = device.createBuffer(desc);
    this.byteSize = desc.size;
    this.usage = desc.usage;
    this.label = desc.label ?? "unnamed";

    assertGpu(this.buffer, `GpuBuffer: failed to create '${this.label}'`);
    allocations.set(this.label, this.byteSize);

    Logger.verbose(
      "GpuBuffer",
      `Allocated '${this.label}' ${(this.byteSize / 1024).toFixed(1)}KB`,
    );
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  /**
   * Write data into the buffer via queue.writeBuffer
   */
  write(device: GPUDevice, data: ArrayBufferView<ArrayBuffer>, bufferOffset = 0): void {
    if (this._destroyed) {
      Logger.error(
        `GpuBuffer.write: buffer '${this.label}' is already destroyed`,
      );
      return;
    }
    device.queue.writeBuffer(this.buffer, bufferOffset, data);
  }

  /**
   * MapWrite for CPU Write into GPU
   */
  async mapWrite(callback: (mapped: ArrayBuffer) => void): Promise<void> {
    if (this._destroyed) return;
    await this.buffer.mapAsync(GPUMapMode.WRITE);
    const mapped = this.buffer.getMappedRange();
    callback(mapped);
    this.buffer.unmap();
  }

  /**
   * MapRead for CPU Readback from GPU
   */
  async mapRead(callback: (mapped: ArrayBuffer) => void): Promise<void> {
    if (this._destroyed) return;
    await this.buffer.mapAsync(GPUMapMode.READ);
    const mapped = this.buffer.getMappedRange();
    callback(mapped);
    this.buffer.unmap();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.buffer.destroy();
    allocations.delete(this.label);
    Logger.verbose("GpuBuffer", `Destroyed '${this.label}'`);
  }
}

// === COMMON BUFFER TYPES ===

export function createVertexBuffer(
  device: GPUDevice,
  byteSize: number,
  label: string,
): GpuBuffer {
  return new GpuBuffer(device, {
    size: byteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    label: `VB:${label}`,
  });
}

export function createIndexBuffer(
  device: GPUDevice,
  byteSize: number,
  label: string,
): GpuBuffer {
  return new GpuBuffer(device, {
    size: byteSize,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    label: `IB:${label}`,
  });
}

export function createUniformBuffer(
  device: GPUDevice,
  byteSize: number,
  label: string,
): GpuBuffer {
  return new GpuBuffer(device, {
    size: byteSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: `UB:${label}`,
  });
}

export function createStorageBuffer(
  device: GPUDevice,
  byteSize: number,
  label: string,
): GpuBuffer {
  return new GpuBuffer(device, {
    size: byteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: `SB:${label}`,
  });
}

export function createReadbackBuffer(
  device: GPUDevice,
  byteSize: number,
  label: string,
): GpuBuffer {
  return new GpuBuffer(device, {
    size: byteSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    label: `RB:${label}`,
  });
}
