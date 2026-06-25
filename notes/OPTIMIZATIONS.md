## OPTIMIZATIONS

Major optimizations found in Voxel Games primarily

## Table of Contents
- [OPTIMIZATIONS](#optimizations)
- [Table of Contents](#table-of-contents)
- [Ways to optimize our Voxel Game](#ways-to-optimize-our-voxel-game)
  - [Index Buffer](#index-buffer)
  - [Bitwise Masking](#bitwise-masking)
  - [Z-Order Curve (Morton Order)](#z-order-curve-morton-order)
    - [Why is that Z structure important?](#why-is-that-z-structure-important)

## Ways to optimize our Voxel Game
### Index Buffer

Index Buffers are a type of `Memory` Optimization. Basically, we do need to store all the vertices of a mesh in a single buffer, but rather make an algorithm that packs everything very efficiently and sequentially.

### Bitwise Masking
Basically putting more than one value in a single byte, or a group of bytes like in a Float32Array or an Uint32Array. This is also a type of `Memory` Optimization. It is a very useful technique to reduce the amount of memory used by our game, and also to reduce the amount of data that needs to be sent to the GPU.

### Z-Order Curve (Morton Order)
It is a very unique way to store 3D data in a 1D array. It is a type of `Memory` Optimization and more specifically Memory Addressing. What is does is, basically make Z patterns around the grid, and it helps in faster loading and rendering of chunks. It also enables in GPU Cache Optimizations,

#### Why is that Z structure important?
Z structure is important because of L1 Cache. When CPU asks for a specific memory addres like INDEX 0, the motherboard doesn't fetch just one byte, but it fetches a "Cache Line" of 64 contiguoud bytes, and puts it in the ultra fast L1 Cache like the kids doing 67, if one starts to do it, everyone else follows.