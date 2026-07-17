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

const SUN_DIR = vec3<f32>(0.4, 0.8, 0.35);
const SUN_COLOR = vec3<f32>(1.0, 0.98, 0.92);
const AMBIENT = 0.35;

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

    let n = normalize(in.worldNorm);
    let sunDir = normalize(SUN_DIR);
    let diffuse = max(dot(n, sunDir), 0.0);

    let skyFactor = max(in.lightLevel, 0.05);
    let shade = (AMBIENT + diffuse * (1.0 - AMBIENT)) * skyFactor;

    // Apply vertex light level (baked ambient / sky light)
    let lit = texColor.rgb * SUN_COLOR * shade;

    var out: FragOut;
    out.albedo = vec4<f32>(lit, texColor.a);
    out.normal = vec4<f32>(encodeNormal(normalize(in.worldNorm)), 1.0);
    return out;
}
