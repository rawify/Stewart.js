# Stewart Platform

[![NPM Package](https://img.shields.io/npm/v/stewart.svg?style=flat)](https://npmjs.org/package/stewart "View this project on npm")
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)


[Stewart Platforms](https://raw.org/research/inverse-kinematics-of-a-stewart-platform/) are used for motion platforms with six dimensions of freedom. With this library you can simulate Stewart Platforms as well as use the calculated angles to drive a real platform.

## Visualization

![Stewart-Platform](https://github.com/rawify/Stewart.js/blob/main/res/stewart-platform.png?raw=true "Stewart Platform Visualization")

The code can run headless, but to set up all parameters properly, a visualization of the platform can help a lot. To do so, we use p5.js and quaternion.js

```js
<script src="p5.min.js"></script>
<script src="quaternion.min.js"></script>
<script src="stewart.min.js"></script>
<script>
var sketch = function(p) {

  p.setup = function() {
    p.createCanvas(600, 600, p.WEBGL);

    p.camera(100.0, -290.0, (p.height / 2.0) / Math.tan(Math.PI / 6),
            0.0, 0.0, 0.0,
            0.0, 1.0, 0.0);

    platform = new Stewart;
    platform.initHexagonal(/*{ options }*/);
  };

  p.draw = function() {

    p.background(255);

    p.push();

    p.translate(50, -70, 200);
    p.rotateX(Math.PI / 2); // Work in correct X-Y-Z plane

    // Set correct position where to drive to
    platform.update([0, 0, 0], Quaternion.ONE);

    // Draw the updated platform
    platform.draw(p);

    // Send to servos
    // platform.getServoAngles();

    p.pop();
  };
};
new p5(sketch, 'canvas');
</script>
```

## Examples

In the examples folder are use cases documented.

### Default

The default example can be controlled via key presses on letters from a-z on the keyboard. Not all letters have a function. 

![Stewart-Platform](https://github.com/rawify/Stewart.js/blob/main/res/stewart-platform-helix.png?raw=true "Stewart Platform Helix Plot")

Here is a list:

- q: Skewed square
- w: wobble
- e: eight
- r: rotate
- t: tilt
- y: lissajous
- m: mouse control
- g: Gamepad control, using Gamepad Web API
- b: Simulation of breath
- h: Helical animation

### SVG Plotter

SVG paths are parsed and used for motion commads. This way SVG images can be plotted with a Stewart platform by attaching a pen:

![Stewart-Platform](https://github.com/rawify/Stewart.js/blob/main/res/stewart-platform-github.png?raw=true "Stewart Platform Github Plot")



### LeapMotion

The hand tracking device LeapMotion can be read via JavaScript using the leapjs package. The example uses the LeapMotion to use the hand position and orienttion as input for the platform.

## Options

The platform visualization is meant to draw a platform in milimeter. When you work headless, the unit does not matter. The following options are available:

### rodLength

The length of the rod attached to the servo horn and the platform. Default=130

### hornLength

The length of the servo horn attached to the motor shaft and the rod. Default=50

### hornDirection

The horn direction indicates if the servo horn is rotated to the left or to the right. 0=right, 1=left, Default=0

### servoRange

A valid range for the servo motors to rotate. A typical low-cost servo has 180° working space. The value is an array [minAngle, maxAngle]. Default=[-pi/2, pi/2]

### servoRangeVisible

A boolean if the servo range should be visible in the drawing. Default=false

### baseRadius + baseRadiusOuter

When a hexagonal stewart platform is used, the `baseRadiusOuter` is used to draw the base plate in accordance to the [description](https://raw.org/research/inverse-kinematics-of-a-stewart-platform/).

### platformRadius + platformRadiusOuter

When a hexagonal stewart platform is used, the `platformRadiusOuter` is used to draw the platform plate in accordance to the [description](https://raw.org/research/inverse-kinematics-of-a-stewart-platform/).

### shaftDistance + ankerDistance

For a circular platform this indicates the radial distance of pairs of rod ankers between the shafts on the base plate and the platform plate. For hexagonal platforms this indicates the distance from the middle of a side to attach the rod ankers. Default=20

### platformTurn

A boolean for hexagonal platforms to indicate if the platform shall look into the same direction as the base plate. Default=true


## Installation

Installing Stewart.js is as easy as cloning this repo or use one of the following command:

```
npm install stewart
```

## Building the library

After cloning the Git repository run:

```
npm install
npm run build
```

## Copyright and licensing

Copyright (c) 2025, [Robert Eisele](https://raw.org/)
Licensed under the MIT license.
