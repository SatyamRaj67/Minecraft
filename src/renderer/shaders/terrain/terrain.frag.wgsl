// terrain.frag.wgsl  (v2 — texture_2d_array sampling)

@group(1) @binding(0) var albedoArray: texture_2d_array<f32>;
@group(1) @binding(3) var atlasSampler: sampler;

struct FragIn {
    @location(0) texcoord: vec2<f32>,
    @location(1) worldNorm: vec3<f32>,
    @location(2) worldPos: vec3<f32>,
    @location(3) lightLevel: f32,
    @location(4) @interpolate(flat) texLayer: u32,
};

struct FragOut {
    @location(0) albedo: vec4<f32>,
    @location(1) normal: vec4<f32>,
};

fn encodeNormal(n: vec3<f32>) -> vec3<f32> {
    return n * 0.5 + 0.5;
}

@fragment
fn fs_main(in: FragIn) -> FragOut {
    // Sample the texture array at the given layer
    let texColor = textureSample(albedoArray, atlasSampler, in.texcoord, in.texLayer);

    // Alpha test: discard fully transparent pixels
    if texColor.a < 0.5 {
        discard;
    }

    // Apply vertex light level (baked ambient / sky light)
    let lit = texColor.rgb * max(in.lightLevel, 0.05);

    var out: FragOut;
    out.albedo = vec4<f32>(lit, texColor.a);
    out.normal = vec4<f32>(encodeNormal(normalize(in.worldNorm)), 1.0);
    return out;
}
