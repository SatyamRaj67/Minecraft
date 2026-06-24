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

