// === BIND GROUP SLOTS ===
export const enum BindGroup {
  /** Camera, time, environment — once per frame */
  FRAME = 0,
  /** Textures + material params — once per draw type */
  MATERIAL = 1,
  /** Per-object transform, LOD — once per draw call */
  OBJECT = 2,
  /** Debug overlays — DEV only */
  DEBUG = 3,
}

// === FRAME BIND GROUP (group 0) BINDINGS ===

export const enum FrameBinding {
  /** mat4 view, proj, viewProj, invProj; vec3 pos; float time */
  CAMERA_UBO = 0,
  /** Sun direction, color, ambient, fog params */
  LIGHTING_UBO = 1,
  /** texture_depth_2d_array (CSM cascades) */
  SHADOW_MAP = 2,
  /** comparison sampler for PCF */
  SHADOW_SAMPLER = 3,
  /** Precomputed sky LUT texture */
  SKY_LUT = 4,
}

// === MATERIAL BIND GROUP (group 1) BINDINGS ===

export const enum MaterialBinding {
  /** texture_2d<f32> — block texture atlas */
  ALBEDO_ATLAS = 0,
  /** texture_2d<f32> — normal map atlas (optional) */
  NORMAL_ATLAS = 1,
  /** Per-material scalar params (roughness, metallic, etc.) */
  MATERIAL_UBO = 2,
  /** Point sampler (pixel-art textures need no filtering) */
  ATLAS_SAMPLER = 3,
}

// === OBJECT BIND GROUP (group 2) BINDINGS ===

export const enum ObjectBinding {
  /** mat4 model, mat4 normalMatrix */
  MODEL_UBO = 0,
  /** storage buffer for instanced rendering */
  INSTANCE_BUFFER = 1,
}

// === DEPTH / TARGET FORMATS ===

export const GPU_DEPTH_FORMAT = "depth24plus" as const;
export const GPU_COLOR_FORMAT = "rgba16float" as const; // HDR G-buffer
export const GPU_NORMAL_FORMAT = "rgba8unorm" as const;
export const GPU_SHADOW_FORMAT = "depth24plus" as const;

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 256;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z; // 65,536 blocks

/**
 * * Terrain vertex stride in bytes:
 * Position (3 x f32) [12 bytes] +
 * Texcoord (2 x f32) [8 bytes] +
 * Normal (3 x u8 packed) [3 bytes] +
 * Light (1 x u8) [1 byte]
 */
export const TERRAIN_VERTEX_STRIDE_BYTES = 24;

export const TERRAIN_ATTR_POSITION = 0; // vec3f — 12 bytes
export const TERRAIN_ATTR_TEXCOORD = 12; // vec2f —  8 bytes
export const TERRAIN_ATTR_PACKED_NL = 20; // u32  —  4 bytes (normal + lightLevel)

/** Number of frames the CPU can be ahead of the GPU. */
export const FRAMES_IN_FLIGHT = 3;

// === UBO Sizes ===
/**
 * 2x mat4 = 128 bytes
 * + extras (position, yaw, pitch, fovY, near, far) = 256 bytes
 */
export const CAMERA_UBO_SIZE = 256;
