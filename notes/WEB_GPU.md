# WebGPU workings

WebGPU is a new web standard that provides modern graphics and computation capabilities to web applications. It is designed to be a low-level API that allows developers to access the GPU directly from the browser, enabling high-performance graphics rendering and parallel computation.

# Table of Contents
- [WebGPU workings](#webgpu-workings)
- [Table of Contents](#table-of-contents)
    - [Command Encoder](#command-encoder)
      - [What is a Command Encoder?](#what-is-a-command-encoder)
    - [Render Pass](#render-pass)
      - [What is a Render Pass?](#what-is-a-render-pass)
    - [Data Pipeline](#data-pipeline)
      - [What is a Data Pipeline?](#what-is-a-data-pipeline)
      - [Depth Stencil](#depth-stencil)

> [!NOTE] WebGPU Operations
> WebGPU is still in development and is not yet widely supported across all browsers. 

Now, Coming back to our topic.

But if you want a procedurally generated world, the chunks positions should not be kept in smaller chunks of data as it will restrict the procedural nature of the world. Instead, it is better to use a larger data structure that can accommodate the entire world space.

> [!NOTE] As a developer note
> It is always safe to ensure padding and maintain a proper alignment of data and keep notes about bitwise operators and how much you want to use them.

### Command Encoder
#### What is a Command Encoder?
A Command Encoder is like TO-DO list but for the GPU to remember what to do. It is a way to record a sequence of commands to be done.

### Render Pass
#### What is a Render Pass?
Render Pass is a dedicated section of Encoder where you lock the GPU to a specific task. 

> [!NOTE] NO COMPUTE SHADERS
> You cannot run compute shaders in render pass, like come on, this should be obvious. DO YOUR HOMEWORK FIRST KIDS, BEFORE DRAWING IN THE TEST, is like a literal example of this.

### Data Pipeline
#### What is a Data Pipeline?
A Data Pipeline is a series of steps that data goes through to be processed and transformed. 

#### Depth Stencil
Depth Stencil is like acquiring distance of all the points and then using that information to determine which points are visible and which are hidden behind other points. It is a technique used in 3D graphics to handle occlusion and ensure that only the visible parts of objects are rendered.