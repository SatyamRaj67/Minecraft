/** Number of frames the CPU can be ahead of the GPU. */
export const FRAMES_IN_FLIGHT = 3;

// === UBO Sizes ===
// ! Bytes must be multiples of 16 for std140 layout

export const CAMERA_UBO_SIZE = 256; // 2× mat4 + extras, padded to 256
