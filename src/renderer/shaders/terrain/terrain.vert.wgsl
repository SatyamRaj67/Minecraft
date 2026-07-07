//Must match GpuLimits.ts exactly:
//group(0) binding(0) = CameraUBO      (FrameBinding.CAMERA_UBO)
//group(1) binding(0) = albedo atlas   (MaterialBinding.ALBEDO_ATLAS)
//group(1) binding(3) = atlas sampler  (MaterialBinding.ATLAS_SAMPLER)
//group(2) binding(0) = ObjectUBO      (ObjectBinding.MODEL_UBO)

//=== Shared Structs ===

struct CameraUBO {
    view : mat4x4 < f32>,
    proj : mat4x4 < f32>,
    viewProj : mat4x4 < f32>,
    invProj : mat4x4 < f32>,
    position : vec3 < f32>,
    time : f32,
    nearPlane : f32,
    farPlane : f32,
    _pad0 : vec2 < f32>,
}

struct ObjectUBO {
    model : mat4x4 < f32>,
    normalMat : mat4x4 < f32>, // transpose(inverse(model)) — for normal transform
}

//=== Bind Groups ===
@group(0) @binding(0) var<uniform > camera : CameraUBO;
@group(2) @binding(0) var<uniform > object : ObjectUBO;

//=== Vertex Input ===
//Again, It must match the GpuLimits.ts
//TERRAIN_VERTEX_STRIDE_BYTES = 24 layout in GpuLimits.ts:
//location 0: position   (vec3f, offset 0)
//location 1: texcoord   (vec2f, offset 12)
//location 2: packedNL   (u32,   offset 20)  normal

struct VertexIn {
    @location(0) position : vec3 < f32>,
    @location(1) texcoord : vec2 < f32>,
    @location(2) packedNL : u32,
}

//=== Vertex Output ===
struct VertexOut {
    @builtin(position) clipPos : vec4 < f32>,
    @location(0) texcoord : vec2 < f32>,
    @location(1) worldNorm : vec3 < f32>,
    @location(2) worldPos : vec3 < f32>,
    @location(3) lightLevel : f32,
}

//=== Normal LUT ===

fn unpackNormal(idx: u32) -> vec3<f32> {
    switch idx {
        case 0u: { return vec3<f32>( 0.0,  1.0,  0.0); }  // +Y (top)
        case 1u: { return vec3<f32>( 0.0, -1.0,  0.0); }  // -Y (bottom)
        case 2u: { return vec3<f32>( 0.0,  0.0,  1.0); }  // +Z (south)
        case 3u: { return vec3<f32>( 0.0,  0.0, -1.0); }  // -Z (north)
        case 4u: { return vec3<f32>( 1.0,  0.0,  0.0); }  // +X (east)
        case 5u: { return vec3<f32>(-1.0,  0.0,  0.0); }  // -X (west)
        default: { return vec3<f32>( 0.0,  1.0,  0.0); }
    }
}

// === Vertex Shader Entry Point ===
@vertex
fn vs_main(in: VertexIn) -> VertexOut {
    let worldPos4 = object.model * vec4<f32>(in.position, 1.0);

    let normalIdx = in.packedNL & 0x7u; // 3 bits for normal index
    let lightPacked = (in.packedNL >> 3u) & 0x1Fu; // 5 bits for light level
    let lightLevel = f32(lightPacked) / 31.0; // Normalize to [0, 1]

    let localNorm = unpackNormal(normalIdx);
    let worldNorm  = normalize((object.normalMat * vec4<f32>(localNorm, 0.0)).xyz);

    var out: VertexOut;
    out.clipPos = camera.viewProj * worldPos4;
    out.texcoord = in.texcoord;
    out.worldNorm = worldNorm;
    out.worldPos = worldPos4.xyz;
    out.lightLevel = lightLevel;

    return out;
}