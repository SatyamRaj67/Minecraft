import shaderCode from "./shader.wgsl?raw";

export
async function 
init() {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No GPU adapter found.");

  const device = await adapter.requestDevice();

  const shaderModule = device.createShaderModule({
    label: "Simple Shader",
    code: shaderCode
  })

  const pipeline = device.createRenderPipeline({
    label: "Simple Pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: []
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{
        format: navigator.gpu.getPreferredCanvasFormat()
      }]
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back"
    }
  })
}