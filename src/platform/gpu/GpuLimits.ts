// === Bind Group Slots ===
export const enum BindGroup {
  FRAME = 0, // Camera, time, environment — once per frame
  MATERIAL = 1, // Textures + material params — once per draw type
  OBJECT = 2, // Per-object transform, LOD — once per draw call
  DEBUG = 3, // Debug overlays — DEV only
}

// === Frame Bind Group (group 0) Bindings
export const enum FrameBinding {
  CAMERA_UBO = 0, // mat4 view, proj, viewProj, invProj; vec3 pos; float time
  LIGHTING_UBO = 1, // Sun direction, color, ambient, fog params
  SHADOW_MAP = 2, // texture_depth_2d_array (CSM cascades)
  SHADOW_SAMPLER = 3, // comparison sampler for PCF
  SKY_LUT = 4, // Precomputed sky LUT texture
}

// === Material Bind Group (group 1) Bindings ===
export const enum MaterialBinding {
  ALBEDO_ATLAS = 0, // texture_2d<f32> — block texture atlas
  NORMAL_ATLAS = 1, // texture_2d<f32> — normal map atlas (optional)
  MATERIAL_UBO = 2, // Per-material scalar params (roughness, metallic, etc.)
  ATLAS_SAMPLER = 3, // Point sampler (pixel-art textures need no filtering)
}

// === Object Bind Group (group 2) Bindings ===
export const enum ObjectBinding {
  MODEL_UBO = 0, // mat4 model, mat4 normalMatrix
  INSTANCE_BUFFER = 1, // storage buffer for instanced rendering
}

// === Depth / Target Formats ===

export const GPU_DEPTH_FORMAT = "depth24plus" as const;
export const GPU_COLOR_FORMAT = "rgba16float" as const; // HDR G-buffer
export const GPU_NORMAL_FORMAT = "rgba8unorm" as const;
export const GPU_SHADOW_FORMAT = "depth24plus" as const;

// === Chunk Constants ===
export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 256;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

// === Terrain Vertex Format ===
/**
 * Terrain vertex stride: 28 bytes = 7 × float32
 *   [px, py, pz]     float32×3 = 12 bytes   (location 0)
 *   [u,  v ]         float32×2 =  8 bytes   (location 1)
 *   [textureLayer]   uint32×1  =  4 bytes   (location 2) — GPU texture array layer
 *   [packedNL]       uint32×1  =  4 bytes   (location 3) — normal idx | light
 */
export const TERRAIN_VERTEX_STRIDE_BYTES = 28;

// Attribute shader locations
export const TERRAIN_LOC_POSITION = 0;
export const TERRAIN_LOC_TEXCOORD = 1;
export const TERRAIN_LOC_TEXLAYER = 2;
export const TERRAIN_LOC_PACKED_NL = 3;

// Byte offsets within one vertex
export const TERRAIN_ATTR_POSITION = 0; // vec3f — 12 bytes
export const TERRAIN_ATTR_TEXCOORD = 12; // vec2f —  8 bytes
export const TERRAIN_ATTR_TEXLAYER = 20; // u32   —  4 bytes
export const TERRAIN_ATTR_PACKED_NL = 24; // u32   —  4 bytes

/** Number of frames the CPU can be ahead of the GPU. */
export const FRAMES_IN_FLIGHT = 3;

// === UBO Sizes ===
// ! Bytes must be multiples of 16 for std140 layout

// ! CHANGED FROM 256 IN ORIGINAL TO 288
export const CAMERA_UBO_SIZE = 288; // 2× mat4 + extras, padded to 256
export const OBJECT_UBO_SIZE = 128; // 2x mat4 (model + normal matrix)