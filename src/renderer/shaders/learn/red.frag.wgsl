struct FragIn {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

struct FragOut {
  @location(0) color: vec4<f32>,
}

@fragment
fn fs_main(input: FragIn) -> FragOut {
  var output: FragOut;

  let color = input.color;
  let grid = vec2u(input.position.xy) / 16;
  let checker = (grid.x + grid.y) % 2 == 1;

  if (checker) {
    output.color = color;
  } else {
    output.color = vec4<f32>(0.1, 0.1, 0.1, 1.0);
  }

  return output;
}