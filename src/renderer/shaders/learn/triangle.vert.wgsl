struct VertIn{
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>,
}

struct VertOut{
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn vs_main(input: VertIn) -> VertOut {
    var output: VertOut;
    output.position = input.position;
    output.color = input.color;
    return output;
}