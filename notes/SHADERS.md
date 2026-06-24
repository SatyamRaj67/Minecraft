# SHADERS

## What are Shaders?
Shaders are small programs that run on the GPU (Graphics Processing Unit) to control the rendering of graphics. They are used to determine how vertices and pixels are processed and displayed on the screen. Shaders can be used to create various visual effects, such as lighting, shadows, textures, and more.

There are many types of shaders:
1. **Vertex Shaders**: These shaders process each vertex's data, such as position
2. **Geometry Shaders**: These shaders can generate new geometry from existing vertices, allowing for more complex shapes and effects.
3. **Fragment Shaders**: These shaders process each pixel's data, determining its color and other attributes.
4. **Tessellation Shaders**: These shaders are used to subdivide geometry into smaller pieces, allowing for more detailed surfaces and smoother curves.
5. **Primitive and Mesh Shaders**: These shaders are used to process and render complex 3D models, allowing for more efficient rendering of large scenes.
6. **Ray Tracing Shaders**: These shaders are used for simulating the behavior of light in a scene, allowing for realistic reflections, refractions, and shadows.
7. **Compute Shaders**: These shaders are used for general-purpose computing tasks on the GPU, such as physics simulations or image processing.
8. **Tensor Shaders**: These shaders are used for machine learning and deep learning tasks, allowing for efficient processing of large datasets on the GPU.

### Now let's try to understand everything in detail

#### Vertex Shaders
A cube is made of 12 triangles.
Those 12 trinagles have 3 points each, reaching to have 36 points in total, for just a cube.

A 3D world, can literally have millions of cubes, which means we can have millions of triangles and billions of points.

The role of Vertex Shaders is to process each of those points and determine their position in 3D space, as well as their color, texture coordinates, and other attributes.

> [!NOTE] Rasterization
> Rasterization is the process of converting the 3D representation of a scene into a 2D image that can be displayed on the screen. This involves determining which pixels on the screen correspond to which points in the 3D scene, and then calculating the color and other attributes of those pixels based on the data provided by the vertex shaders.

#### Fragment Shaders
This type of shader runs for every single pixel on the example. For example, if you are poor like me, and have a 760p monitor, then the fragment shader will run for 1366x768 = 1,049,088 pixels. THOSE ARE SOME CRAZY NUMBERS IF YOU DIDN'T ALREADY REALISE.

And that is only one frame, and that so on one of the lowest quality settings.

Imagine a 4k monitor, and the number of pixels will be 3840x2160 = 8,294,400 pixels. And that is only one frame, and that so on one of the lowest quality settings.

#### Compute Shaders
As the name stands, it is mainly used for compute, or Physics based stuff, like dropping a baby from the plane. The physics engine has to understand gravity, air resistance, calculate mass change when the baby poops, acceleration and so so on..

> [!NOTE] What about other shaders?
> Rest shaders are useless and mostly legacy apart from Mesh Shaders which is a modern way to write shaders, but are only supported in Vulkan and DirectX12 and no current graphics API for the Web supports it, so we will not be using them.