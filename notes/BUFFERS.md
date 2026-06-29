# BUFFERS
Buffers are a way to store data in memory temporarily. They are commonly used in programming to hold data that is being transferred between different parts of a program or between different programs. Buffers can help improve performance by reducing the number of read and write operations, and they can also help manage data flow in situations where data is produced and consumed at different rates.

### Types of Buffers

1. [Index Buffer](#index-buffer)

### Index Buffer
As the name suggests, an index buffer stores all the vertices of a mesh in a single buffer. 

Suppose we want to render a cube. If we do it through triangles, we will need 6 faces * 2 triangles per face * 3 vertices per triangle = 36 vertices.

But, there is a very simple optimization we can use. We are storing so many duplicates in here..

If you didn't get me, GO ATTEND MATH CLASSES YOU STUPID POOPING DOGWATER PEOPLE.

A cube has necessarily only 8 vertices, so there is not need to be storing like 6 times more the amount of vertices.

We will just need to pack it through a very intelligent algorithm that packs everything very efficiently. 

Thus Index Buffer offers the first line of small but critical Optimization.

> [!NOTE]
> These only store the position of the vertices and not the actual vertices
>
> You can use `Uint32Array` for these rather than the typical `Float32Array` we are going to use with Vertex Buffers

### Vertex Buffer
As the name suggests, this stores every single vertex of a mesh. This is mostly static.

Rest everything is from the Index Buffer, now don't make me write all that..

#### Vertex Buffer Usages
- VERTEX: This is the most common usage, and it is used to store vertex data.
- INDEX: This is used to store index data
- COPY_SRC: This is used to copy data from one buffer to another.
- COPY_DST: This is used to copy data to a buffer from another buffer.

#### BRUH, BUT WHAT ABOUT MY MOVING DATA????

### Uniform Buffer
Uniform buffers are a special buffer, that still well.. store data, but what is unique about this is that.. IT CAN STORE DATA THAT IS MOVING, AND CHANGING CONSTANTLY, AND IT IS NOT STATIC.

### How to writeBuffer

```wgsl

device.queue.writeBuffer(buffer, 0, data);
```