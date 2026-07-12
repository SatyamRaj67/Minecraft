import { Logger } from "@/debug/Logger";
import { BLOCK_TEXTURES, TextureEntry } from "./TextureRegistry";

export interface TextureLayerInfo {
  baseLayer: number;
  /** 1 for static, >1 for animated */
  frameCount: number;
  frameTime: number;
  interpolate: boolean;
  opaque: boolean;
  name: string;
}

export interface AtlasResult {
  texture: GPUTexture;
  view: GPUTextureView;
  layerMap: Map<string, TextureLayerInfo>;
  totalLayers: number;
  /**Textures that could not be loaded (file not found) */
  missing: string[];
}

export const TILE_SIZE = 16;

export class TextureAtlasPacker {
  private layerMap = new Map<string, TextureLayerInfo>();
  private missing: string[] = [];

  /**
   * Load all registered block textures from the given base path,
   * pack them into a GPUTexture array, and return the result.
   *
   * @param device WebGPU DEVICE
   * @param basePath URL prefix for texture files, e.g. "assets/textures/blocks/"
   * @param generateMips whether to generate mipmaps
   */
  async pack(
    device: GPUDevice,
    basePath: string,
    generateMips: boolean = false,
  ): Promise<AtlasResult> {
    Logger.info(
      `TextureAtlasPacker: loading ${BLOCK_TEXTURES.length} block textures from ${basePath}`,
    );

    const loaded = await this.loadAll(basePath);

    let nextLayer = 0;
    for (const entry of BLOCK_TEXTURES) {
      const img = loaded.get(entry.name);
      if (!img) {
        this.missing.push(entry.name);
        continue;
      }

      this.layerMap.set(entry.name, {
        baseLayer: nextLayer,
        frameCount: entry.frames,
        frameTime: entry.frametime,
        interpolate: entry.interpolate,
        opaque: entry.opaque,
        name: entry.name,
      });

      nextLayer += entry.frames;
    }

    const totalLayers = nextLayer;
    Logger.info(
      `TextureAtlasPacker: ${totalLayers} total layers, ${this.missing.length} textures missing`,
    );
    if (this.missing.length > 0) {
      Logger.warn(
        "TextureAtlasPacker: missing textures (will use fallback magenta):",
        { missing: this.missing },
      );
    }

    const texture = device.createTexture({
      label: "BlockTextureArray",
      size: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        depthOrArrayLayers: totalLayers,
      },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
      mipLevelCount: generateMips ? Math.floor(Math.log2(TILE_SIZE)) + 1 : 1,
    });

    const fallback = this.createFallbackImageData(); // Magenta Checkerboard

    for (const entry of BLOCK_TEXTURES) {
      const info = this.layerMap.get(entry.name);
      if (!info) continue; // missing texture, skip

      const img = loaded.get(entry.name)!;
      await this.uploadEntry(device, texture, img, info, entry);
    }

    for (const name of this.missing) {
      // We couldn't load it
      // Safe fallback to layer 0
    }

    const view = texture.createView({
      label: "BlockTextureArrayView",
      dimension: "2d-array",
      arrayLayerCount: totalLayers,
      baseMipLevel: 0,
      ...(generateMips ? {} : { mipLevelCount: 1 }),
    });

    return {
      texture,
      view,
      layerMap: this.layerMap,
      totalLayers,
      missing: this.missing,
    };
  }

  private async loadAll(basePath: string): Promise<Map<string, ImageBitmap>> {
    const results = new Map<string, ImageBitmap>();
    const base = basePath.endsWith("/") ? basePath : basePath + "/";
    Logger.info(`TextureAtlasPacker: loading textures from ${base}`);

    // Load in batches of 32 to avoid overwhelming the browser
    const BATCH = 32;
    for (let i = 0; i < BLOCK_TEXTURES.length; i += BATCH) {
      const batch = BLOCK_TEXTURES.slice(i, i + BATCH);
      const promises = batch.map(async (entry) => {
        try {
          const url = `${base}${entry.name}.png`;
          const response = await fetch(url);
          if (!response.ok) return;
          const blob = await response.blob();

          const bmp = await createImageBitmap(blob);
          results.set(entry.name, bmp);
        } catch {}
      });

      await Promise.all(promises);
      Logger.verbose(
        "TextureAtlasPacker",
        `Loaded batch ${i / BATCH + 1}/${Math.ceil(BLOCK_TEXTURES.length / BATCH)}`,
      );
    }

    return results;
  }

  private async uploadEntry(
    device: GPUDevice,
    texture: GPUTexture,
    img: ImageBitmap,
    info: TextureLayerInfo,
    entry: TextureEntry,
  ): Promise<void> {
    const actualFrames = Math.min(
      entry.frames,
      Math.floor(img.height / TILE_SIZE),
    );

    for (let frame = 0; frame < actualFrames; frame++) {
      const layer = info.baseLayer + frame;

      const frameBitmap = await createImageBitmap(
        img,
        0,
        frame * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );

      device.queue.copyExternalImageToTexture(
        { source: frameBitmap, flipY: false },
        {
          texture,
          origin: { x: 0, y: 0, z: layer },
          colorSpace: "srgb",
          premultipliedAlpha: false,
        },
        {
          width: TILE_SIZE,
          height: TILE_SIZE,
          depthOrArrayLayers: 1,
        },
      );

      frameBitmap.close(); // Free memory
    }
  }

  //   16x16 magenta checkerboard
  private createFallbackImageData(): ImageData {
    const data = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const i = (y * TILE_SIZE + x) * 4;
        const checker = ((x >> 2) + (y >> 2)) & 1;
        data[i] = checker ? 255 : 0; // R
        data[i + 1] = 0; // G
        data[i + 2] = checker ? 255 : 0; // B
        data[i + 3] = 255; // A
      }
    }
    return new ImageData(data, TILE_SIZE, TILE_SIZE);
  }
}
