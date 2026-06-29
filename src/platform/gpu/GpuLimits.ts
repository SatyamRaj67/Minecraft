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
