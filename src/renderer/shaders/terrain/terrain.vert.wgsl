// terrain.vert.wgsl  (v2 — texture array + layer ID)
//
// Binding contract (must match GpuLimits.ts):
//   group(0) binding(0) = CameraUBO
//   group(1) binding(0) = albedoArray (texture_2d_array)
//   group(1) binding(3) = atlasSampler
//   group(2) binding(0) = ObjectUBO

struct CameraUBO {
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    viewProj: mat4x4<f32>,
    invProj: mat4x4<f32>,
    position: vec3<f32>,
    time: f32,
    nearPlane: f32,
    farPlane: f32,
    _pad: vec2<f32>,
};

struct ObjectUBO {
    model: mat4x4<f32>,
    normalMat: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUBO;
@group(2) @binding(0) var<uniform> object: ObjectUBO;

// Vertex layout: 7 floats = 28 bytes
//   location 0: position     (vec3f)
//   location 1: texcoord     (vec2f)
//   location 2: textureLayer (u32) — index into texture_2d_array
//   location 3: packedNL     (u32) — normal (3 bits) | light (5 bits)

struct VertexIn {
    @location(0) position: vec3<f32>,
    @location(1) texcoord: vec2<f32>,
    @location(2) texLayer: u32,
    @location(3) packedNL: u32,
};

struct VertexOut {
    @builtin(position) clipPos: vec4<f32>,
    @location(0)       texcoord: vec2<f32>,
    @location(1)       worldNorm: vec3<f32>,
    @location(2)       worldPos: vec3<f32>,
    @location(3)       lightLevel: f32,
    @location(4) @interpolate(flat) texLayer: u32,
};

fn unpackNormal(idx: u32) -> vec3<f32> {
    switch idx {
        case 0u: { return vec3<f32>(0.0, 1.0, 0.0); } // +Y top
        case 1u: { return vec3<f32>(0.0, -1.0, 0.0); } // -Y bottom
        case 2u: { return vec3<f32>(0.0, 0.0, 1.0); } // +Z south
        case 3u: { return vec3<f32>(0.0, 0.0, -1.0); } // -Z north
        case 4u: { return vec3<f32>(1.0, 0.0, 0.0); } // +X east
        case 5u: { return vec3<f32>(-1.0, 0.0, 0.0); } // -X west
        default: { return vec3<f32>(0.0, 1.0, 0.0); }
    }
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
    let worldPos4 = object.model * vec4<f32>(in.position, 1.0);
    let normalIdx = in.packedNL & 0x7u;
    let lightPacked = (in.packedNL >> 3u) & 0x1Fu;
    let localNorm = unpackNormal(normalIdx);
    let worldNorm = normalize((object.normalMat * vec4<f32>(localNorm, 0.0)).xyz);

    var out: VertexOut;
    out.clipPos = camera.viewProj * worldPos4;
    out.texcoord = in.texcoord;
    out.worldNorm = worldNorm;
    out.worldPos = worldPos4.xyz;
    out.lightLevel = f32(lightPacked) / 31.0;
    out.texLayer = in.texLayer;
    return out;
}
