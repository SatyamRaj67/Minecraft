@group(0) @binding(0) var albedoTexture: texture_2d<f32>;

struct VertexIn {
    @builtin(vertex_index) vi: u32,
};

struct VertexOut {
    @builtin(position) clipPos: vec4<f32>,
};

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );

    var out: VertexOut;
    out.clipPos = vec4<f32>(pos[in.vi], 0.0, 1.0);
    return out;
}

struct FragIn {
    @builtin(position) fragCoord: vec4<f32>,
}

struct FragOut {
    @location(0) color: vec4<f32>,
}

@fragment
fn fs_main(in: FragIn) -> FragOut {
    let tc = vec2<i32>(in.fragCoord.xy);

    var out: FragOut;
    out.color = textureLoad(albedoTexture, tc, 0);
    return out;
}