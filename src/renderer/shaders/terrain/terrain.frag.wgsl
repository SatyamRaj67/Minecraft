// According to out defined GeometryPass.ts, we have two G-buffer targets:
//   target 0: albedo  (rgba8unorm  — GPU_COLOR_FORMAT)
//   target 1: normals (rgba8unorm  — GPU_NORMAL_FORMAT, encoded [0,1])

@group(1) @binding(0) var albedoAtlas  : texture_2d<f32>;
@group(1) @binding(3) var atlasSampler : sampler;

struct FragIn {
    @location(0) texcoord   : vec2<f32>,
    @location(1) worldNorm  : vec3<f32>,
    @location(2) worldPos   : vec3<f32>,
    @location(3) lightLevel : f32,
}

struct FragOut {
    @location(0) albedo  : vec4<f32>,
    @location(1) normal  : vec4<f32>,
}

// === Helper Fuctions ===

gn encodeNormal(n: vec3<f32>) -> vec3<f32> {
    return n * 0.5 + 0.5;
}

// == Fragment Shader Main ===
@fragment
fn fs_main(in: FragIn) -> FragOut {
    let texColor = textureSample(albedoAtlas, atlasSampler, in.texcoord);

    if texColor.a < 0.5 {
        discard;
    }

    let lit = texColor.rgb * max(in.lightLevel, 0.05);

    var out : FragOut;
    out.albedo = vec4<f32>(lit, 1.0);

    let n = normalize(in.worldNorm);
    out.normal = vec4<f32>(encodeNormal(n), 1.0);

    return out;
}