'use strict';
const Quaternion = require('quaternion');
const Bezier = require('bezier-js');


/* !simple-compilation */

function getHexPlate(r_i, r_o, rot) {
  var ret = [];
  var a_2 = (2 * r_i - r_o) / Math.sqrt(3);
  for (var i = 0; i < 6; i++) {
    var phi = (i - i % 2) / 3 * Math.PI + rot;
    var ap = a_2 * Math.pow(-1, i);

    ret.push({
      x: r_o * Math.cos(phi) + ap * Math.sin(phi),
      y: r_o * Math.sin(phi) - ap * Math.cos(phi)
    });
  }
  return ret;
}

function parseSVGPath(str) {

  var p = str.match(/[a-z]|[-+]?([0-9]*\.[0-9]+|[0-9]+)/ig);

  var COMMANDS = "MmZzLlHhVvCcSsQqTtAa";
  var UPPERCASE = "MZLHVCSQTA";

  var segments = [];

  var cur = { x: 0, y: 0 };
  var start = null;
  var cmd = null;
  var prevCmd = null;
  var isRelative = false;

  while (p.length > 0) {

    if (COMMANDS.indexOf(p[0]) !== -1) {
      prevCmd = cmd;
      cmd = p.shift();
      isRelative = UPPERCASE.indexOf(cmd) === -1;
      cmd = cmd.toUpperCase();
    } else {
      if (cmd === null) {
        throw new Error("Invalid implicit command");
      }
      prevCmd = cmd; // For S and T
    }

    switch (cmd) {

      case 'M':
        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          cur.x += x;
          cur.y += y;
        } else {
          cur.x = x;
          cur.y = y;
        }

        segments.push({ cmd: "move", x: cur.x, y: cur.y });

        // Reset start position
        start = { x: cur.x, y: cur.y };

        // Implicitely treat move as lineTo
        cmd = 'L';
        break;

      case 'L':
        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          x += cur.x;
          y += cur.y;
        }

        segments.push({ cmd: "line", x1: cur.x, y1: cur.y, x2: x, y2: y });

        cur.x = x;
        cur.y = y;
        break;

      case 'H':
        var x = +p.shift();

        if (isRelative) {
          x += cur.x;
        }

        segments.push({ cmd: "line", x1: cur.x, y1: cur.y, x2: x, y2: cur.y });

        cur.x = x;
        break;

      case 'V':
        var y = +p.shift();

        if (isRelative) {
          y += cur.y;
        }

        segments.push({ cmd: "line", x1: cur.x, y1: cur.y, x2: cur.x, y2: y });

        cur.y = y;
        break;

      case 'Z':
        if (start) {
          segments.push({ cmd: "line", x1: cur.x, y1: cur.y, x2: start.x, y2: start.y });
          cur.x = start.x;
          cur.y = start.y;
        }
        start = null;
        cmd = null; // No implicit commands after path close
        break;

      case 'C':

        var x1 = +p.shift();
        var y1 = +p.shift();

        var x2 = +p.shift();
        var y2 = +p.shift();

        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          x1 += cur.x;
          y1 += cur.y;

          x2 += cur.x;
          y2 += cur.y;

          x += cur.x;
          y += cur.y;
        }

        segments.push({
          cmd: "cubic",
          x0: cur.x, y0: cur.y, // Start
          x1: x1, y1: y1, // Control 1
          x2: x2, y2: y2, // Control 2
          x3: x, y3: y, // End
          bezier: new Bezier(cur.x, cur.y, x1, y1, x2, y2, x, y)
        });

        cur.x = x;
        cur.y = y;
        break;

      case 'S':

        // First control point is the reflection of the previous command.

        if (prevCmd !== 'C' && prevCmd !== 'S') {
          // If prev command was not C or S, assume first control point is coincident with current point
          var x1 = cur.x;
          var y1 = cur.y;
        } else {
          // The first control point is assumed to be the reflection of the second control point of the previous command relative to current point
          var x1 = cur.x + cur.x - segments[segments.length - 1].x2;
          var y1 = cur.y + cur.y - segments[segments.length - 1].y2;
        }

        var x2 = +p.shift();
        var y2 = +p.shift();

        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          x2 += cur.x;
          y2 += cur.y;

          x += cur.x;
          y += cur.y;
        }

        segments.push({
          cmd: "cubic",
          x0: cur.x, y0: cur.y, // Start
          x1: x1, y1: y1, // Control 1
          x2: x2, y2: y2, // Control 2
          x3: x, y3: y, // End
          bezier: new Bezier(cur.x, cur.y, x1, y1, x2, y2, x, y)
        });

        cur.x = x;
        cur.y = y;
        break;

      case 'Q':

        var x1 = +p.shift();
        var y1 = +p.shift();

        var x = +p.shift();
        var y = +p.shift();


        if (isRelative) {
          x1 += cur.x;
          y1 += cur.y;

          x += cur.x;
          y += cur.y;
        }

        // Quadratic Bezier
        segments.push({
          cmd: "quadratic",
          x0: cur.x, y0: cur.y, // Start
          x1: x1, y1: y1, // Control 1
          x2: x, y2: y, // End
          bezier: new Bezier(cur.x, cur.y, x1, y1, x, y)
        });

        cur.x = x;
        cur.y = y;
        break;

      case 'T':

        // Control point is the reflection of the previous command.

        if (prevCmd !== 'Q' && prevCmd !== 'T') {
          // If prev command was not C or S, assume first control point is coincident with current point
          var x1 = cur.x;
          var y1 = cur.y;
        } else {
          // The first control point is assumed to be the reflection of the second control point of the previous command relative to current point
          var x1 = cur.x + cur.x - segments[segments.length - 1].x1;
          var y1 = cur.y + cur.y - segments[segments.length - 1].y1;
        }

        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          x += cur.x;
          y += cur.y;
        }

        segments.push({
          cmd: "quadratic",
          x0: cur.x, y0: cur.y, // Start
          x1: x1, y1: y1, // Control 1
          x2: x, y2: y, // End
          bezier: new Bezier(cur.x, cur.y, x1, y1, x, y)
        });

        cur.x = x;
        cur.y = y;
        break;


      case 'A':

        var rx = +p.shift();
        var ry = +p.shift();

        var axisRotation = +p.shift();
        var largeArcFlag = +p.shift();
        var sweepFlag = +p.shift();

        var x = +p.shift();
        var y = +p.shift();

        if (isRelative) {
          x += cur.x;
          y += cur.y;
        }

        segments.push({
          cmd: "arc",

          rx: rx, ry: ry, // Radius

          axisRotation: axisRotation,
          largeArcFlag: largeArcFlag,
          sweepFlag: sweepFlag,

          x: x, y: y // End
        });

        cur.x = x;
        cur.y = y;
        break;

      default:
        throw new Error('Invalid SVG command ' + cmd);
    }
  }
  return segments;
}

function Animation(platform) {
  this.platform = platform;
  this.orientation = Quaternion.ONE;
  this.translation = [0, 0, 0];

  this.start('wobble');
}

Animation.SVG = function (svg, box) {

  var PERSEC = 0.05; // 5units per sec
  var L = 0;
  var H = 0 - 10;

  var SCREEN_SIZE = 80; // 80x80

  var cur = { x: box.width / 2, y: box.height / 2, z: L };
  var ret = [];

  function move(x, y, z) {

    var relX = (x - box.x) / box.width * SCREEN_SIZE - SCREEN_SIZE / 2;
    var relY = (y - box.y) / box.height * SCREEN_SIZE - SCREEN_SIZE / 2;

    var relCurX = (cur.x - box.x) / box.width * SCREEN_SIZE - SCREEN_SIZE / 2;
    var relCurY = (cur.y - box.y) / box.height * SCREEN_SIZE - SCREEN_SIZE / 2;

    ret.push({ orig: s.cmd, x: relX, y: relY, z: z, t: Math.hypot(relX - relCurX, relY - relCurY, z - cur.z) / PERSEC });

    cur.x = x;
    cur.y = y;
    cur.z = z;
  }

  var seg = parseSVGPath(svg);

  for (var i = 0; i < seg.length; i++) {

    var s = seg[i];

    switch (s.cmd) {
      case 'move':
        move(cur.x, cur.y, H);
        move(s.x, s.y, H);
        move(s.x, s.y, L);
        break;
      case 'line':
        move(s.x2, s.y2, L);
        break;
      case 'quadratic':
      case 'cubic':
        var b = s.bezier.getLUT();

        for (var j = 0; j < b.length; j++) {
          move(b[j].x, b[j].y, L);
        }
        break;
      case 'arc':

        // https://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
        var x1 = cur.x;
        var y1 = cur.y;

        var x2 = s.x;
        var y2 = s.y;

        var axisRotation = s.axisRotation;
        var largeArcFlag = s.largeArcFlag;
        var sweepFlag = s.sweepFlag;

        var rx = s.rx;
        var ry = s.ry;

        // Step 1: x1', y1'
        var x1_ = Math.cos(axisRotation) * (x1 - x2) / 2.0 + Math.sin(axisRotation) * (y1 - y2) / 2.0;
        var y1_ = -Math.sin(axisRotation) * (x1 - x2) / 2.0 + Math.cos(axisRotation) * (y1 - y2) / 2.0;

        // Step 2: cx', cy'
        var s_ = (largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt((rx * rx * ry * ry - rx * rx * y1_ * y1_ - ry * ry * x1_ * x1_) / (rx * rx * y1_ * y1_ + ry * ry * x1_ * x1_));

        var cx_ = s_ * rx * y1_ / ry;
        var cy_ = s_ * -ry * x1_ / rx;

        // Step 3: cx, cy
        var cx = (x1 + x2) / 2.0 + Math.cos(axisRotation) * cx_ - Math.sin(axisRotation) * cy_;
        var cy = (y1 + y2) / 2.0 + Math.sin(axisRotation) * cx_ + Math.cos(axisRotation) * cy_;


        // Step 4:

        var angleBetween = function (ux, uy, vx, vy) {

          var cosPhi = (ux * vx + uy * vy) / Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));

          return (ux * vy < uy * vx ? -1 : 1) * Math.acos(cosPhi);
        };

        // initial angle
        var theta1 = angleBetween(
          1, 0,
          (x1_ - cx_) / rx, (y1_ - cy_) / ry);

        // angle delta
        var thetad = angleBetween(
          (x1_ - cx_) / rx, (y1_ - cy_) / ry,
          (-x1_ - cx_) / rx, (-y1_ - cy_) / ry);

        if (sweepFlag === 0 && thetad > 0) {
          thetad -= 2 * Math.PI;
        } else if (sweepFlag === 1 && thetad < 0) {
          thetad += 2 * Math.PI;
        }

        var steps = Math.ceil(Math.abs(thetad * Math.max(rx, ry)) / 2); // every two degree
        for (var j = 0; j <= steps; j++) {
          var phi = theta1 + thetad * (j / steps);

          var x = rx * Math.cos(phi);
          var y = ry * Math.sin(phi);

          var x_ = x * Math.cos(axisRotation) - y * Math.sin(axisRotation);
          var y_ = x * Math.sin(axisRotation) + y * Math.cos(axisRotation);

          move(cx + x_, cy + y_, L);
        }
    }
  }
  return Animation.Interpolate(ret);
};

Animation.Interpolate = function (data) {

  var duration = 0;
  for (var i = 1; i < data.length; i++) {
    duration += data[i].t;
  }

  return {
    duration: duration,
    pathVisible: true,
    next: null,
    fn: function (pct) {

      this.orientation = Quaternion.ONE;

      var pctStart = 0;

      for (var i = 1; i < data.length; i++) {

        var p = data[i];

        var pctEnd = pctStart + p.t / duration;

        if (pctStart <= pct && pct < pctEnd) {

          var scale = (pct - pctStart) / (pctEnd - pctStart);

          var prev = i === 0 ? data[0] : data[i - 1];

          this.translation[0] = prev.x + (p.x - prev.x) * scale;
          this.translation[1] = prev.y + (p.y - prev.y) * scale;
          this.translation[2] = prev.z + (p.z - prev.z) * scale;

          return;
        }
        pctStart = pctEnd;
      }

      // Set to last element in chain
      this.translation[0] = data[data.length - 1].x;
      this.translation[1] = data[data.length - 1].y;
      this.translation[2] = data[data.length - 1].z;
    },

  };
};

Animation.prototype = {
  cur: null,
  next: null,
  startTime: 0,
  platform: null,
  translation: null,
  orientation: null,
  pathVisible: true,
  toggleVisiblePath: function () {
    this.pathVisible = !this.pathVisible;
  },
  drawPath: function (p) {

    if (!this.pathVisible || !this.cur.pathVisible)
      return;

    p.beginShape();
    p.noFill();
    p.stroke(255, 0, 0);
    var steps = 100;
    for (var i = 0; i <= steps; i++) {
      this.cur.fn.call(this, i / steps, p);
      p.vertex(this.translation[0], this.translation[1], this.translation[2] + this.platform.T0[2]);
    }
    p.endShape();
  },
  start: function (t) {

    if (this.map[t]) {
      t = this.map[t];
    }

    if (!this.fn[t]) {
      console.log("Failed ", t);
      return;
    } else {
      this._start(this.fn[t], this.fn[t].next);
    }
  },

  _start: function (play, next) {
    if (play.start) {
      play.start.call(this);
    }
    this.cur = play;
    this.next = next; // Loop
    this.startTime = Date.now();
  },

  moveTo: function (nt, no, time, next) {

    var ot = this.translation.slice();
    var oo = this.orientation.clone();
    var tw = oo.slerp(no);

    this.cur = {
      duration: time,
      pathVisible: false,
      fn: function (pct) {
        this.orientation = tw(pct);
        this.translation = [
          ot[0] + pct * (nt[0] - ot[0]),
          ot[1] + pct * (nt[1] - ot[1]),
          ot[2] + pct * (nt[2] - ot[2])
        ];
      }
    };
    this.startTime = Date.now();
    this.next = next;
  },

  update: function (p) {

    var now = Date.now();

    var elapsed = (now - this.startTime) / this.cur.duration;

    if (elapsed > 1)
      elapsed = 1;

    // Update actual orientation + position
    this.cur.fn.call(this, elapsed, p);

    if (elapsed === 1 && this.cur.duration !== 0 && this.next !== null) {
      this.start(this.next);
    }

    this.platform.update(this.translation, this.orientation);
  },
  fn: {
    rotate: {
      duration: 4000,
      pathVisible: false,
      next: 'rotate',
      fn: function (pct) {
        var b = Math.pow(Math.sin(pct * Math.PI * 2 - Math.PI * 8), 5) / 2;

        this.translation[0] = 0;
        this.translation[1] = 0;
        this.translation[2] = 0;
        this.orientation = Quaternion.fromAxisAngle([0, 0, 1], b);
      }
    },
    tilt: {
      duration: 7000,
      pathVisible: false,
      next: 'tilt',
      fn: function (pct) {

        var a = 0;
        var z = 0;

        if (pct < 1 / 4) {
          pct = pct * 4;
          a = 0;
        } else if (pct < 1 / 2) {
          pct = (pct - 1 / 4) * 4;
          a = 1 * Math.PI / 3;
        } else if (pct < 3 / 4) {
          pct = (pct - 1 / 2) * 4;
          a = 2 * Math.PI / 3;
        } else {
          pct = (pct - 3 / 4) * 4;
          z = 1;
        }

        var x = 0;
        var y = 0;

        if (z === 0) {
          x = Math.sin(a);
          y = -Math.cos(a);
        }

        var b = Math.pow(Math.sin(pct * Math.PI * 2 - Math.PI * 8), 5) / 3;

        this.translation[0] = 0;
        this.translation[1] = 0;
        this.translation[2] = 0;
        this.orientation = Quaternion.fromAxisAngle([x, y, z], b);
      }
    },
    square: (function () {
      var tmp = Animation.Interpolate([
        { x: -30, y: -30, z: 0 + 10, t: 0 },
        { x: -30, y: 30, z: 0, t: 1000 },
        { x: 30, y: 30, z: +10, t: 1000 },
        { x: 30, y: -30, z: 0, t: 1000 },
        { x: -30, y: -30, z: 0 + 10, t: 1000 },
      ]);
      tmp.next = "square";
      return tmp;
    })(),
    wobble: {
      duration: 3000,
      pathVisible: false,
      next: 'wobble',
      fn: function (pct) {

        var b = pct * 2 * Math.PI;

        this.translation[0] = Math.cos(-b) * 13;
        this.translation[1] = Math.sin(-b) * 13;
        this.translation[2] = 0;
        this.orientation = new Quaternion(-13, -Math.cos(b), Math.sin(b), 0).normalize();
      }
    },
    breathe: {
      duration: 5000,
      pathVisible: false,
      next: 'breathe',
      fn: function (pct) {

        var y = (Math.exp(Math.sin(2 * Math.PI * pct) - 1)) / (Math.E * Math.E - 1);

        this.translation = [0, 0, y * 50];
        this.orientation = Quaternion.ONE;
      }
    },
    eight: {
      duration: 3500,
      pathVisible: true,
      next: 'eight',
      fn: function (pct) {
        var t = (-0.5 + 2.0 * pct) * Math.PI;
        this.translation = [Math.cos(t) * 30, Math.sin(t) * Math.cos(t) * 30, 0];
        this.orientation = Quaternion.ONE;
      }
    },
    lissajous: {
      duration: 10000,
      pathVisible: true,
      next: 'lissajous',
      fn: function (pct) {
        this.translation = [(Math.sin(3 * pct * 2 * Math.PI) * 30), (Math.sin(pct * 2 * 2 * Math.PI) * 30), 0];
        this.orientation = Quaternion.ONE;
      }
    },
    helical: {
      duration: 5000,
      pathVisible: true,
      next: null,
      fn: function (pct) {
        pct = 1 - pct;
        this.translation = [(Math.cos(pct * Math.PI * 8) * 20), (Math.sin(pct * Math.PI * 8) * 20), pct * 20];
        this.orientation = Quaternion.ONE;
      }
    },
    mouse: {
      duration: 0,
      pathVisible: false,
      next: null,
      fn: function (pct, p) {
        this.translation = [(p.mouseX - 512) / 10, (p.mouseY - 382) / 10, 0];
        this.orientation = Quaternion.ONE;
      }
    }, /*
       perlin: (function() {
       
       var xoff = 0;
       var yoff = 0;
       
       
       return {
       duration: 0,
       fn: function(none, p) {
       
       var b = p.noise(xoff, xoff) * 2 * Math.PI;
       
       this.translation[0] = Math.cos(-b) * 13;
       this.translation[1] = Math.sin(-b) * 13;
       this.translation[2] = 0;
       this.orientation = new Quaternion(-13, -Math.cos(b), Math.sin(b), 0).normalize();
       
       
       xoff += 0.0001;
       yoff += 0.0001;
       }
       }
       })(),*/
    gamepad: (function () {

      var gamepadActive = false;
      if (window.addEventListener) {
        window.addEventListener("gamepadconnected", function (e) {
          gamepadActive = true;
        });

        window.addEventListener("gamepaddisconnected", function (e) {
          gamepadActive = false;
        });
      }

      return {
        duration: 0,
        pathVisible: false,
        next: null,
        start: function () {
          this.orientation = Quaternion.ONE;
          this.translation = [0, 0, 0];
          if (gamepadActive) {
            alert("Use the joysticks and L1 button");
          } else {
            alert("Plug in a Playstation or Xbox controller and use the joysticks");
          }
        },
        fn: function () {

          if (!gamepadActive) {
            return;
          }

          var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
          var buttons = gamepads[0].buttons;
          var axes = gamepads[0].axes;

          if (buttons[6].value) { // Is L1 pressed?
            // Rotate around Z axis with joystick 2 left-right
            this.orientation = Quaternion.fromAxisAngle([0, 0, 1], -axes[3] * Math.PI / 6);
            this.translation = [0, 0, 0];
          } else {
            // Control with both joysticks
            var b = Math.atan2(-axes[3], -axes[2]);
            this.translation = [axes[1] * 30, axes[0] * 30, 0];
            this.orientation = new Quaternion(-13, -Math.cos(b), Math.sin(b), 0).normalize();
          }
        }
      };
    })()
  },
  map: {
    q: "square",
    w: "wobble",
    e: "eight",
    r: "rotate",
    t: "tilt",
    y: "lissajous",

    m: "mouse",
    g: "gamepad",
    b: "breathe",
    h: "helical",
    p: "perlin"
  }
};

function Stewart() { }

Stewart.prototype = {
  translation: null,
  orientation: null,

  drawBasePlate: null,
  drawPlatformPlate: null,

  rodLength: 0,
  hornLength: 0,
  hornDirection: 0,
  servoRange: null,
  servoRangeVisible: false,

  sinBeta: [], // Sin of Pan angle of motors in base plate
  cosBeta: [], // Cos of Pan angle of motors in base plate
  B: [], // base joints in base frame
  P: [], // platform joints in platform frame

  q: [], // vector from base origin to Pk
  l: [], // vector from B to P
  H: [], // servo horn end to mount the rod

  T0: [], // Initial offset

  init: function (opts) {

    this.rodLength = opts.rodLength;
    this.hornLength = opts.hornLength;
    this.hornDirection = opts.hornDirection;
    this.drawBasePlate = opts.drawBasePlate;
    this.drawPlatformPlate = opts.drawPlatformPlate;
    this.servoRange = opts.servoRange;
    this.servoRangeVisible = opts.servoRangeVisible;

    this.B = [];
    this.P = [];
    this.q = [];
    this.l = [];
    this.H = [];
    this.sinBeta = [];
    this.cosBeta = [];

    var legs = opts.getLegs.call(this);

    for (var i = 0; i < legs.length; i++) {
      this.B.push(legs[i].baseJoint);
      this.P.push(legs[i].platformJoint);
      this.sinBeta.push(Math.sin(legs[i].motorRotation));
      this.cosBeta.push(Math.cos(legs[i].motorRotation));
      this.q.push([0, 0, 0]);
      this.l.push([0, 0, 0]);
      this.H.push([0, 0, 0]);
    }

    if (opts.absoluteHeight) {
      this.T0 = [0, 0, 0];
    } else {
      this.T0 = [0, 0, Math.sqrt(this.rodLength * this.rodLength + this.hornLength * this.hornLength
        - Math.pow(this.P[0][0] - this.B[0][0], 2)
        - Math.pow(this.P[0][1] - this.B[0][1], 2))];
    }

  },
  initCircular: function (opts) {

    if (!opts)
      opts = {};

    var baseRadius = opts.baseRadius || 80; // 8cm
    var platformRadius = opts.platformRadius || 50; // 5cm

    // Circle segment s = alpha_deg / 180 * pi * R <=> alpha_deg = s / R / pi * 180 <=> alpha_rad = s / R
    var shaftDistance = (opts.shaftDistance || 20) / baseRadius;
    var anchorDistance = (opts.anchorDistance || 20) / baseRadius;

    var rodLength = opts.rodLength || 130;

    var hornLength = opts.hornLength || 50;
    var hornDirection = opts.hornDirection || 0;

    var servoRange = opts.servoRange || [-Math.PI / 2, Math.PI / 2];
    var servoRangeVisible = opts.servoRangeVisible === undefined ? false : opts.servoRangeVisible;

    this.init({
      rodLength: rodLength,
      hornLength: hornLength,
      hornDirection: hornDirection,
      servoRange: servoRange,
      servoRangeVisible: servoRangeVisible,
      getLegs: function () {

        var legs = [];
        for (var i = 0; i < 6; i++) {

          var pm = Math.pow(-1, i);
          var phiCut = (1 + i - i % 2) * Math.PI / 3;

          var phiB = (i + i % 2) * Math.PI / 3 + pm * shaftDistance / 2;
          var phiP = phiCut - pm * anchorDistance / 2;

          legs.push({
            baseJoint: [Math.cos(phiB) * baseRadius, Math.sin(phiB) * baseRadius, 0],
            platformJoint: [Math.cos(phiP) * platformRadius, Math.sin(phiP) * platformRadius, 0],
            motorRotation: phiB + ((i + hornDirection) % 2) * Math.PI + Math.PI / 2
          });
        }
        return legs;
      },
      drawBasePlate: function (p) {
        p.stroke(0);
        p.fill(0xFE, 0xF1, 0x35);
        p.ellipse(0, 0, 2 * baseRadius, 2 * baseRadius);
      },
      drawPlatformPlate: function (p) {
        p.stroke(0);
        p.fill(0x2A, 0xEC, 0xFD);
        p.ellipse(0, 0, 2 * platformRadius, 2 * platformRadius);
      }
    });
  },

  initHexagonal: function (opts) {

    if (!opts)
      opts = {};

    var baseRadius = opts.baseRadius || 80; // 8cm
    var baseRadiusOuter = opts.baseRadiusOuter || 110; // 11cm

    var platformRadius = opts.platformRadius || 50; // 5cm
    var platformRadiusOuter = opts.platformRadiusOuter || 80; // 8cm
    var platformTurn = opts.platformTurn === undefined ? true : opts.platformTurn;

    var rodLength = opts.rodLength || 130;

    var hornLength = opts.hornLength || 50;
    var hornDirection = opts.hornDirection || 0;

    var shaftDistance = opts.shaftDistance || 20;
    var anchorDistance = opts.anchorDistance || 20;

    var baseInts = getHexPlate(baseRadius, baseRadiusOuter, 0);
    var platformInts = getHexPlate(platformRadius, platformRadiusOuter, platformTurn ? Math.PI : 0);

    var servoRange = opts.servoRange || [-Math.PI / 2, Math.PI / 2];
    var servoRangeVisible = opts.servoRangeVisible === undefined ? false : opts.servoRangeVisible;

    this.init({
      rodLength: rodLength,
      hornLength: hornLength,
      hornDirection: hornDirection,
      servoRange: servoRange,
      servoRangeVisible: servoRangeVisible,
      getLegs: function () { // Called once at setup
        var legs = [];
        var basePoints = [];
        var platPoints = [];
        var motorAngle = [];

        for (var i = 0; i < 6; i++) {

          var midK = i | 1;
          var baseCx = baseInts[midK].x;
          var baseCy = baseInts[midK].y;
          var baseNx = baseInts[(midK + 1) % 6].x;
          var baseNY = baseInts[(midK + 1) % 6].y;

          var platCx = platformInts[midK].x;
          var platCy = platformInts[midK].y;
          var platNx = platformInts[(midK + 1) % 6].x;
          var platNY = platformInts[(midK + 1) % 6].y;

          var baseDX = baseNx - baseCx;
          var baseDY = baseNY - baseCy;
          var lenBaseSide = Math.hypot(baseDX, baseDY);

          var pm = Math.pow(-1, i);

          var baseMidX = (baseCx + baseNx) / 2;
          var baseMidY = (baseCy + baseNY) / 2;

          var platMidX = (platCx + platNx) / 2;
          var platMidY = (platCy + platNY) / 2;

          baseDX /= lenBaseSide;
          baseDY /= lenBaseSide;

          basePoints.push([baseMidX + baseDX * shaftDistance * pm, baseMidY + baseDY * shaftDistance * pm, 0]);
          platPoints.push([platMidX + baseDX * anchorDistance * pm, platMidY + baseDY * anchorDistance * pm, 0]);
          motorAngle.push(Math.atan2(baseDY, baseDX) + ((i + hornDirection) % 2) * Math.PI);
        }

        var platformIndex = [0, 1, 2, 3, 4, 5];

        if (platformTurn) {
          platformIndex = [4, 3, 0, 5, 2, 1];
        }

        for (var i = 0; i < basePoints.length; i++) {
          legs.push({
            baseJoint: basePoints[i],
            platformJoint: platPoints[platformIndex[i]],
            motorRotation: motorAngle[i]
          });
        }

        return legs;
      },
      drawBasePlate: function (p) { // Called periodically
        p.stroke(0);
        p.fill(0xFE, 0xF1, 0x35);

        p.beginShape();
        for (var i = 0; i < baseInts.length; i++) {
          p.vertex(baseInts[i].x, baseInts[i].y);
        }
        p.endShape(p.CLOSE);
      },
      drawPlatformPlate: function (p) { // Called periodically
        p.stroke(0);
        p.fill(0x2A, 0xEC, 0xFD);

        p.beginShape();
        for (var i = 0; i < platformInts.length; i++) {
          p.vertex(platformInts[i].x, platformInts[i].y);
        }
        p.endShape(p.CLOSE);
      }
    });
  },

  draw: (function () {

    function drawCone(p, radius, h) {

      var sides = 12;
      var angle = 0;
      var angleIncrement = 2 * Math.PI / sides;
      p.beginShape(p.TRIANGLE_STRIP);
      for (var i = 0; i <= sides; i++) {
        p.vertex(0, 0, 0);
        p.vertex(radius * Math.cos(angle), h, radius * Math.sin(angle));
        angle += angleIncrement;
      }
      p.endShape();

      angle = 0;
      p.beginShape(p.TRIANGLE_FAN);

      p.vertex(0, h, 0);
      for (var i = 0; i < sides + 1; i++) {
        p.vertex(radius * Math.cos(angle), h, radius * Math.sin(angle));
        angle += angleIncrement;
      }
      p.endShape();
    }

    function drawFrame(p) {

      var w = 40;
      var ch = 10; // cone head

      // Draw 3 lines
      p.push();
      p.strokeWeight(2);
      p.stroke(255, 0, 0); // rot=x
      p.line(0, 0, 0, w, 0, 0);
      p.stroke(0, 255, 0); // grün=y
      p.line(0, 0, 0, 0, w, 0);
      p.stroke(0, 0, 255); // blau=z
      p.line(0, 0, 0, 0, 0, w);
      p.pop();

      // Red Cone
      p.push();
      p.noStroke();
      p.fill(255, 0, 0);
      p.rotateZ(Math.PI / 2);
      p.translate(0, -w - ch, 0);
      drawCone(p, 3, ch);
      p.pop();

      // Green Cone
      p.push();
      p.noStroke();
      p.fill(0, 255, 0);
      p.rotateX(-Math.PI);
      p.translate(0, -w - ch, 0);
      drawCone(p, 3, ch);
      p.pop();

      // Blue Cone
      p.push();
      p.noStroke();
      p.fill(0, 0, 255);
      p.rotateX(-Math.PI / 2);
      p.translate(0, -w - ch, 0);
      drawCone(p, 3, ch);
      p.pop();
    }

    return function (p) {

      // Base Frame
      drawFrame(p);

      // Base plate
      p.push();
      this.drawBasePlate.call(this, p);

      // Platform plate
      p.translate(this.translation[0], this.translation[1], this.translation[2] + this.T0[2]);

      p.applyMatrix.apply(p, this.orientation.conjugate().toMatrix4());

      this.drawPlatformPlate.call(this, p);

      // Platform Frame
      drawFrame(p);
      p.pop();

      for (var i = 0; i < this.B.length; i++) {
        // Base Joints
        p.push();
        p.translate(this.B[i][0], this.B[i][1], this.B[i][2]);
        p.noStroke();
        p.fill(0);
        p.sphere(3);
        p.pop();

        // Platform Joints
        p.push();
        p.translate(this.q[i][0], this.q[i][1], this.q[i][2]);
        p.noStroke();
        p.fill(255, 0, 0);
        p.sphere(3);
        p.pop();

        // A -> q rods
        p.push();
        p.stroke(255, 0, 0);
        p.strokeWeight(1);
        p.line(this.H[i][0], this.H[i][1], this.H[i][2], this.q[i][0], this.q[i][1], this.q[i][2]);
        //p.pop();

        // Base -> A rods
        //p.push();
        p.stroke(0);
        // p.strokeWeight(1);
        p.line(this.B[i][0], this.B[i][1], this.B[i][2], this.H[i][0], this.H[i][1], this.H[i][2]);
        p.pop();

        if (this.servoRangeVisible) {
          p.push();
          p.translate(this.B[i][0], this.B[i][1], this.B[i][2]);
          p.rotateX(Math.PI / 2);
          p.rotateY(Math.atan2(this.H[i][1] - this.B[i][1], this.H[i][0] - this.B[i][0]));
          p.fill('rgba(255,0,0,0.1)');
          p.noStroke();
          p.arc(0, 0, 2 * this.hornLength, 2 * this.hornLength, this.servoRange[0], this.servoRange[1], p.PIE);
          p.pop();
        }
      }
    };

  })(),

  update: function (translation, orientation) {

    var hornLength = this.hornLength;
    var rodLength = this.rodLength;

    var q = this.q;
    var l = this.l;
    var B = this.B;
    var P = this.P;
    var H = this.H;
    var z = this.T0[2];

    this.translation = translation;
    this.orientation = orientation;

    // Calculate H, q and l
    for (var i = 0; i < B.length; i++) {

      var o = orientation.rotateVector(P[i]);

      var li = l[i];
      var qi = q[i];
      var Hi = H[i];
      var Bi = B[i];

      qi[0] = translation[0] + o[0];
      qi[1] = translation[1] + o[1];
      qi[2] = translation[2] + o[2] + z;

      li[0] = qi[0] - Bi[0];
      li[1] = qi[1] - Bi[1];
      li[2] = qi[2] - Bi[2];

      var gk = li[0] * li[0] + li[1] * li[1] + li[2] * li[2] - rodLength * rodLength + hornLength * hornLength;
      var ek = 2 * hornLength * li[2];
      var fk = 2 * hornLength * (this.cosBeta[i] * li[0] + this.sinBeta[i] * li[1]);

      var sqSum = ek * ek + fk * fk;
      var sqrt1 = Math.sqrt(1 - gk * gk / sqSum);
      var sqrt2 = Math.sqrt(sqSum);
      var sinAlpha = (gk * ek) / sqSum - (fk * sqrt1) / sqrt2;
      var cosAlpha = (gk * fk) / sqSum + (ek * sqrt1) / sqrt2;

      Hi[0] = Bi[0] + hornLength * cosAlpha * this.cosBeta[i];
      Hi[1] = Bi[1] + hornLength * cosAlpha * this.sinBeta[i];
      Hi[2] = Bi[2] + hornLength * sinAlpha;
    }
  },

  getServoAngles: function () {

    var ret = [];
    for (var i = 0; i < this.B.length; i++) {
      ret[i] = Math.asin((this.H[i][2] - this.B[i][2]) / this.hornLength);
      if (isNaN(ret[i])) {
        // Rod too short
        ret[i] = null;
      } else if (!(this.servoRange[0] <= ret[i] && ret[i] <= this.servoRange[1])) {
        // Out of range
        ret[i] = null;
      }

    }
    return ret;
  }

};

Stewart.Animation = Animation;

Object.defineProperty(Stewart, "__esModule", { 'value': true });
Stewart['default'] = Stewart;
Stewart['Stewart'] = Stewart;
module['exports'] = Stewart;
