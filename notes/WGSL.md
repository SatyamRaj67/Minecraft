# WGSL

### How to write a shader in WGSL?
WGSL (WebGPU Shading Language) is a shading language designed for use with the WebGPU API.

It is just hard to find an extension that does coloring and autocomplete and all that on VSCODE, so please and please try out stuff, before riting anything.

### VERTEX
Vertex Shaders are shaders that process each vertex of a 3D Model. 

On most shaders, this will be the first line of defence, and then we will be using Fragment Shaders to color the models nicely, or add textures and all.

Here is an example for a WGSL Vertex Shader

```wgsl
@vertex
fn vertexMain() -> vec4f {
    return vec4f(0.0, 0.0, 0.0, 1.0);
}
```

`@vertex` is a decorator that tells WEBGPU that this is a vertex shader, and do your VERTEX SHADER Tricks here..

`vec4f` - Well why did we use this?
vec4f is really really efficient for GPUs to do maths on.. And specially a lot of fast maths. Even Colours are written in vec4f, as it is a 4D Vector, and RGBA is a 4D Vector too.

### FRAGMENT
Fragment Shaders are shaders that process each pixel of a 3D Model.

Here is an example for a WGSL Fragment Shader
```wgsl
@fragment
fn fragmentMain() -> vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
}
```

`@fragment` is just like vertex, a decorator, to say to GPU, please please please, DO YOUR FRAGMENT MAGIC, and make this work.

As you can see, this fragment shader, will be return red color, as the vec4f is (1.0, 0.0, 0.0, 1.0) which is RGBA for Red.