import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";

export interface GpuContextOptions {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
  /** Enable GPU validation — always true in DEV, never in PROD */
  validation: boolean;
}

export interface GpuContextResult {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  adapterInfo: GPUAdapterInfo;
  limits: GPUSupportedLimits;
  features: GPUSupportedFeatures;
}

const REQUIRED_FEATURES: GPUFeatureName[] = [
  // 'timestamp-query',  // For GpuTimestamps — request optionally
];

const OPTIONAL_FEATURES: GPUFeatureName[] = [
  "timestamp-query",
  "depth-clip-control",
  "texture-compression-bc", // Desktop DXT textures
  "texture-compression-etc2", // Mobile textures
  "indirect-first-instance", // For GPU-driven rendering (Phase 2+)
];

export class GpuContext {
  static adapterInfo: GPUAdapterInfo | null = null;
  static hasTimestampQuery: boolean = false;

  static async create(opts: GpuContextOptions): Promise<GpuContextResult> {
    if (!navigator.gpu) {
      Logger.fatal(
        "WebGPU is not supported in this browser. " +
          "Please use Chrome 113+, Edge 113+, or Firefow Nightly with webgpu.enable=true.",
        {
          userAgent: navigator.userAgent,
        },
      );
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: opts.powerPreference,
    });

    if (!adapter) {
      Logger.fatal(
        "WebGPU: no suitable GPU adapter found. " +
          "This may indicate the GPU is blacklisted or the broswer flag is not set.",
      );
    }

    const adapterInfo = adapter.info
    this.adapterInfo = adapterInfo;
    Logger.info(
      `GPU Adapter: ${this.adapterInfo.vendor} / ${this.adapterInfo.device}`,
    );

    // === Features ===
    const enabledFeatures: GPUFeatureName[] = [...REQUIRED_FEATURES];
    for (const feature of OPTIONAL_FEATURES) {
      if (adapter.features.has(feature)) {
        enabledFeatures.push(feature);
        Logger.verbose("GpuContext", `Optional feature enabled: ${feature}`);
      }
    }
    this.hasTimestampQuery = enabledFeatures.includes("timestamp-query");

    // === Device ===
    const device = await adapter.requestDevice({
      requiredFeatures: enabledFeatures,
      requiredLimits: {
        maxTextureDimension2D: 4096,
        maxBufferSize: 256 * 1024 * 1024, // 256 MB
        maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128 MB
        maxComputeWorkgroupsPerDimension: 65535,
      },
      label: __DEV__
        ? "Minecraft TruthEntity Developer Device"
        : "Minecraft Device",
    });

    // === Canvas Context ===
    const context = opts.canvas.getContext("webgpu");
    assert(context !== null, "Failed to acquire WebGPU canvas context");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "opaque",
      colorSpace: "srgb",
    });

    Logger.info(`GpuContext initialized. Format: ${format}`, {
      limits: {
        maxTextureDim: device.limits.maxTextureDimension2D,
        maxBufferSize: device.limits.maxBufferSize,
      },
    });

    return {
      device,
      context,
      format,
      adapterInfo,
      limits: device.limits,
      features: device.features,
    };
  }

  static destroy(device: GPUDevice) {
    Logger.info("GpuContext: Destroying GPU Device");
    device.destroy();
  }
}
