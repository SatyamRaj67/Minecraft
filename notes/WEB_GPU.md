# WebGPU workings

WebGPU is a new web standard that provides modern graphics and computation capabilities to web applications. It is designed to be a low-level API that allows developers to access the GPU directly from the browser, enabling high-performance graphics rendering and parallel computation.

> [!NOTE] WebGPU Operations
> WebGPU is still in development and is not yet widely supported across all browsers. 

Now, Coming back to our topic.

#### WebGPU uses an 80 byte command buffer
But the closest we have come to such a data structure is the Float32Array, which is a 64 bytes long array. This means we need to be extra careful when working with WebGPU to ensure that we are not exceeding the command buffer size limit.

> [!NOTE] As a developer note
> It is always safe to ensure padding and maintain a proper alignment of data and keep notes about bitwise operators and how much you want to use them.

For a world, which has 32x32x32 chunk, it might be useful to have only limit x,y,z to 5 bits each which means we can use 15 bits for chunk positions. 

But if you want a procedurally generated world, the chunks positions should not be kept in smaller chunks of data as it will restrict the procedural nature of the world. Instead, it is better to use a larger data structure that can accommodate the entire world space.

