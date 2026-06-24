# What is MATRIX doing in a 3D World?

## Core 3x3 Basics

<div style="grid-template-columns: 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em; color: white;">
  <div>Right<sub>x</sub></div>
  <div>Up<sub>x</sub></div>
  <div>Forward<sub>x</sub></div>
  <div>Right<sub>y</sub></div>
  <div>Up<sub>y</sub></div>
  <div>Forward<sub>y</sub></div>
  <div>Right<sub>z</sub></div>
  <div>Up<sub>z</sub></div>
  <div>Forward<sub>z</sub></div>
</div>

### But if you can see

We have not yet worked with rotation? Rotation is quite independent of the translation and scaling. But it is important to note that Applying Rotation over Translation is not the same as applying Translation over Rotation. The order of operations matters.

### How to cheat the system?

Basically, What I expected was to have a 3D World, which movement, in the three vector directions and a rotation variables. But remember, GPUs are not programmed for well.. Additing or Subtraction.

We need to trick the system into thinking that the matrix being matrix, and yet does the addition and subtraction type of shit.

## Why a 4x4 Matrix, isn't it enough?

So, Good Question, if you are reading it this far.

Well, we all know, we will need a separate column for rotation and then just to make it a square, we make it a 4x4 matrix. Which results in matrix which looks something like this

<div style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em; color: white">
  <div>Right<sub>x</sub></div>
  <div>Up<sub>x</sub></div>
  <div>Forward<sub>x</sub></div>
  <div>Pos<sub>x</sub></div>
  <div>Right<sub>y</sub></div>
  <div>Up<sub>y</sub></div>
  <div>Forward<sub>y</sub></div>
  <div>Pos<sub>y</sub></div>
  <div>Right<sub>z</sub></div>
  <div>Up<sub>z</sub></div>
  <div>Forward<sub>z</sub></div>
  <div>Pos<sub>z</sub></div>
</div>

### I am sorry, but why did we need 3x3 matrix, like cannot we make something like only to show our front, why do we need the right and up?

These local variables allow us to find the dots and crosses and are a crucial part of matrix multiplication. They guide the GPU to turn a 3D Matrix into a 2D World. The right, up and forward vectors are used to determine the orientation of the object in 3D space. They help in defining how the object is rotated and positioned relative to the camera or other objects in the scene.

These simple stuff, allow for some crucial optimization of literally stupidly low level operations which can be done on GPUs. And well, do you wanna see what it looks like?

<div style="display: flex; justify-content: center; align-items: center; gap: 1em; color: white;">
<div style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em">
  <div>Right<sub>x</sub></div>
  <div>Up<sub>x</sub></div>
  <div>Forward<sub>x</sub></div>
  <div>Pos<sub>x</sub></div>
  <div>Right<sub>y</sub></div>
  <div>Up<sub>y</sub></div>
  <div>Forward<sub>y</sub></div>
  <div>Pos<sub>y</sub></div>
  <div>Right<sub>z</sub></div>
  <div>Up<sub>z</sub></div>
  <div>Forward<sub>z</sub></div>
  <div>Pos<sub>z</sub></div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>1</div>
</div>
<div>⨯</div>
<div style="grid-template-columns: 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em;">
<div>x</div>
<div>y</div>
<div>z</div>
<div>1</div>
</div>
</div>

### Now let's convert it into a simple matrix we all know and love

<div style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em; color: white;">
  <div>1</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>1</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>1</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>0</div>
  <div>1</div>
</div>

#### What happens when you turn the 1 at top left corner or Right<sub>x</sub> for 1 to 3?

What happens is that, every single object in the 3D world, will be scaled by 3 times.

#### BUT BUT BUT, What will happen if you change the Up<sub>x</sub> from 0 to 1?

Now, this is a good question and this shows, you are learning, because YOU ARE STILL A DUMB PIECE OF SHIT, but CURIOUS SHIT..

This might sound a bit silly, but trust me, it is not.. We have always defined the Up to be [0, 1, 0], so this means, our up is 1j, but when we did [1, 1, 0], it just means, not our up is actually 1i + 1j, and this is where we learn about SKEWING.. This matrix will now bend in such a way that it makes the cuboid in to a skew.

### CLEVER HACK: DEPTH but IN DEPTH

So, there is quite a clever hack, we can do in here, which is well.. Remember from start, we made it a 4x4 matrix but the last row was always untouched as [0, 0, 0, 1] and life was all sunshine and rainbows.

BUT SOME RANDOM ABOMINATION OF A SON OF A ... SOMETHING.. THOUGHT, IT WOULD BE GOOD IDEA TO NOT PLAY WITH HIS TOYS BUT TO TOUCH THE FOUNDATION AND QUESTION, BUT WHAT IF WE TURNED THAT LAST ROW

from [0, 0, 0, 1] to [0, 0, 1, 0].

Now when we multiply our [x, y, z, 1] matrix into this, what we get is actually.. DEPTH.. DISTANCE FROM THE PLAYER.. Isn't that just.. Stupid.. Why??

Well, IT'S VERY VERY COMPLICATED and it is

W<sub>new</sub> = (0 x X) + (0 x Y) + (1 x Z) + (0 x 1) = Z

I mean BRUH.. NO NO, I MEAN BRUHHHHHH

So, Literally W<sub>new</sub> is Z just copied in there.. You might be asking. BUT WHY??

Well, this is a very very clever hack, because now we can use this W<sub>new</sub> to divide the X, Y and Z values and get a perspective projection. This is how we can create a 3D effect on a 2D screen. By dividing the X and Y coordinates by the Z coordinate, we can simulate the effect of objects appearing smaller as they get further away from the camera. This is a fundamental concept in computer graphics and is used in many 3D rendering techniques.

TruthEntities Editor Note:- Damn, I just wrote till "<//sub>" and it autocompleted the rest, Guys we are so doomed..

X<sub>screen</sub> = X / Z or X / W<sub>new</sub>
Y <sub>screen</sub> = Y / Z or Y / W<sub>new</sub>

### Why is this necessary?

Bro, Do you have a life?? If you have, then you might know about Parallax, and all, and that far objects appear smaller, and near objects should appear larger.

### OK, But That didn't answer why did we use Z?

This is where, I asked Gemini Pro, and it said, Z has nothing unique in it to make it a fair choice over others. But why did people use it, because of convention and convenience. The Z-axis is typically used to represent depth in a 3D space. X and Y always have been denoted by the screen width and height respectively as can be proven in HTML, so Z axis often shows the depth of an object in the scene.

It's also a sort of like Paradigm shift, like

1. **Right Hand Rule-**
   Poinint your right thumb is the +X axis, and your index finger is the +Y axis, then your middle finger will point in the +Z axis direction. This is a common convention used in 3D graphics and physics to define the orientation of a coordinate system.

   Example: WebGL

2. **Left Hand Rule-**
   Pointing your left thumb is the +X axis, and your index finger is the +Y axis, then your middle finger will point in the +Z axis direction. This is another convention used in some 3D graphics and physics applications.

   Example: DirectX, WebGPU

### But why are we using [X, Y, Z, 1] instead of [X, Y, Z]?

Well, the extra 1 in the matrix, is first of all used to first make matrix multiplication even possible. Go learn Matrix Multiplication, you 7 second attention span sucker.

### HEY, DON'T CALL ME THAT, I WANTED TO ASK, INSTEAD OF [X, Y, Z, 0]?

Now, you have grow a bit better with your questions.

Lets again take help of Math, and check what we are getting as an output after multiplication.

<div style="display: flex; justify-content: center; align-items: center; gap: 1em; color: white;">
  <div style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em">
    <div>Right<sub>x</sub></div>
    <div>Up<sub>x</sub></div>
    <div>Forward<sub>x</sub></div>
    <div>Pos<sub>x</sub></div>
    <div>Right<sub>y</sub></div>
    <div>Up<sub>y</sub></div>
    <div>Forward<sub>y</sub></div>
    <div>Pos<sub>y</sub></div>
    <div>Right<sub>z</sub></div>
    <div>Up<sub>z</sub></div>
    <div>Forward<sub>z</sub></div>
    <div>Pos<sub>z</sub></div>
    <div>0</div>
    <div>0</div>
    <div>0</div>
    <div>1</div>
  </div>
<div>⨯</div>
<div style="grid-template-columns: 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em;">
<div>x</div>
<div>y</div>
<div>z</div>
<div>1</div>
</div>
</div>

<div style="text-align: center; color: white;">
  =
</div>

<div style="color: white;">
  X<sub>new</sub> = (Right<sub>x</sub> x X) + (Up<sub>x</sub> x Y) + (Forward<sub>x</sub> x Z) + (Pos<sub>x</sub> x 1)

Y<sub>new</sub> = (Right<sub>y</sub> x X) + (Up<sub>y</sub> x Y) + (Forward<sub>y</sub> x Z) + (Pos<sub>y</sub> x 1)

Z<sub>new</sub> = (Right<sub>z</sub> x X) + (Up<sub>z</sub> x Y) + (Forward<sub>z</sub> x Z) + (Pos<sub>z</sub> x 1)

W<sub>new</sub> = (0 x X) + (0 x Y) + (0 x Z) + (1 x 1) = 1

</div>

#### That didn't answer my question, why not [X, Y, Z, 0]?

Well, let's write it again, but with 0

<div style="display: flex; justify-content: center; align-items: center; gap: 1em; color: white;">
  <div style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em">
    <div>Right<sub>x</sub></div>
    <div>Up<sub>x</sub></div>
    <div>Forward<sub>x</sub></div>
    <div>Pos<sub>x</sub></div>
    <div>Right<sub>y</sub></div>
    <div>Up<sub>y</sub></div>
    <div>Forward<sub>y</sub></div>
    <div>Pos<sub>y</sub></div>
    <div>Right<sub>z</sub></div>
    <div>Up<sub>z</sub></div>
    <div>Forward<sub>z</sub></div>
    <div>Pos<sub>z</sub></div>
    <div>0</div>
    <div>0</div>
    <div>0</div>
    <div>0</div>
  </div>
<div>⨯</div>
<div style="grid-template-columns: 1fr; display: grid; gap: 1em; border-left: 1px solid white; border-right: 1px solid white; padding: 0.5em;">
<div>x</div>
<div>y</div>
<div>z</div>
<div>1</div>
</div>
</div>

<div style="text-align: center; color: white;">
  =
</div>

<div style="color: white;">
<div style="color: white;">
  X<sub>new</sub> = (Right<sub>x</sub> x X) + (Up<sub>x</sub> x Y) + (Forward<sub>x</sub> x Z) + (Pos<sub>x</sub> x 0)

Y<sub>new</sub> = (Right<sub>y</sub> x X) + (Up<sub>y</sub> x Y) + (Forward<sub>y</sub> x Z) + (Pos<sub>y</sub> x 0)

Z<sub>new</sub> = (Right<sub>z</sub> x X) + (Up<sub>z</sub> x Y) + (Forward<sub>z</sub> x Z) + (Pos<sub>z</sub> x 0)

W<sub>new</sub> = (0 x X) + (0 x Y) + (0 x Z) + (1 x 0) = 0

</div>
</div>

If you didn't get it by now, basically, we eliminated the Pos<sub>x</sub>, Pos<sub>y</sub> and Pos<sub>z</sub> from the equation, which means we cannot translate the object in 3D space. The W<sub>new</sub> being 0 means that we cannot perform perspective division, which is necessary for creating a 3D effect on a 2D screen. This is why we use [X, Y, Z, 1] instead of [X, Y, Z, 0].

Basically, what it became is a Direction, with X, Y, and Z co-ordinates.


### Why would someone in the right mind, even try to do that?

Actually, a lot people with the right mind do that. Why?? Well, because remember, we got a direction. And a direction of well.. calculating Sunlight, which doesn't need a position, as it is everywhere.

So, W = 0 makes sure, we get rid of any Movement or translation, and just gives us the raw direction of the vector.

