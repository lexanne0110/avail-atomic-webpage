(function () {
  var GRAD3 = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ]);
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;

  function SimplexNoise(seed) {
    seed = seed === undefined ? Math.random() * 10000 : seed;
    var p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    var i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      var n = seed % (i + 1);
      var q = p[i];
      p[i] = p[n];
      p[n] = q;
    }
    for (i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  SimplexNoise.prototype.noise2D = function (x, y) {
    var perm = this.perm;
    var permMod12 = this.permMod12;
    var s = (x + y) * F2;
    var i = Math.floor(x + s);
    var j = Math.floor(y + s);
    var t = (i + j) * G2;
    var x0 = x - (i - t);
    var y0 = y - (j - t);
    var i1 = x0 > y0 ? 1 : 0;
    var j1 = x0 > y0 ? 0 : 1;
    var x1 = x0 - i1 + G2;
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2;
    var y2 = y0 - 1 + 2 * G2;
    var ii = i & 255;
    var jj = j & 255;
    var n0 = 0;
    var n1 = 0;
    var n2 = 0;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    var t1;
    var t2;
    var gi0;
    var gi1;
    var gi2;

    if (t0 >= 0) {
      t0 *= t0;
      gi0 = permMod12[ii + perm[jj]] * 3;
      n0 = t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0);
    }

    t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      n1 = t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1);
    }

    t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      n2 = t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  };

  SimplexNoise.prototype.fbm = function (x, y, octaves, lacunarity, persistence) {
    octaves = octaves === undefined ? 4 : octaves;
    lacunarity = lacunarity === undefined ? 2 : lacunarity;
    persistence = persistence === undefined ? 0.5 : persistence;
    var value = 0;
    var amplitude = 1;
    var frequency = 1;
    var maxValue = 0;
    var i;

    for (i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash2(x, y) {
    var h = (x * 374761393 + y * 668265263) >>> 0;
    h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
    return h / 4294967296;
  }

  function buildGrid(width, height, cellSize) {
    var positions = [];
    var x;
    var y;

    for (y = cellSize / 2; y < height; y += cellSize) {
      for (x = cellSize / 2; x < width; x += cellSize) {
        positions.push({ x: x, y: y });
      }
    }

    return positions;
  }

  function renderFlow(ctx, c, time, p) {
    var i;
    var pos;
    var n1;
    var n2;
    var combined;
    var intensity;
    var alpha;
    var vivid;
    var vividChance = p.vividChance || 0;

    for (i = 0; i < c.gridPositions.length; i++) {
      pos = c.gridPositions[i];
      n1 = c.noise.fbm(
        pos.x * p.scale + time * 0.5,
        pos.y * p.scale + time * 0.3,
        p.octaves,
        p.lacunarity,
        0.5
      );
      n2 = c.noise.fbm(
        pos.x * p.scale * 1.5 - time * 0.4,
        pos.y * p.scale * 1.5 + time * 0.2,
        Math.max(1, p.octaves - 1),
        p.lacunarity,
        0.5
      );
      combined = (n1 + n2 * 0.5) / 1.5;

      if (combined > p.threshold) {
        intensity = Math.min(1, (combined - p.threshold) / (1 - p.threshold));
        vivid = hash2(Math.round(pos.x), Math.round(pos.y)) < vividChance;
        alpha = vivid ? 1 : 0.3 + intensity * 0.7;
        ctx.fillStyle = c.getColor(vivid ? 1 : intensity, alpha);
        ctx.fillRect(
          Math.round(pos.x - c.pixelSize / 2),
          Math.round(pos.y - c.pixelSize / 2),
          c.pixelSize,
          c.pixelSize
        );
      }
    }
  }

  var BASE_PIXEL_SIZE = 4;
  var BASE_GAP = 6;
  var VIVID_CHANCE = 0.18;
  var REFERENCE_WIDTH = 1440;
  var NOISE_SEED = 42;
  var FLOW_PARAMS = {
    scale: 0.008,
    speed: 0.001,
    threshold: 0.1,
    octaves: 5,
    lacunarity: 2
  };
  var PALETTE = {
    bg: '#fffffe',
    start: { r: 219, g: 229, b: 255 },
    end: { r: 168, g: 193, b: 255 }
  };
  var FRAME_INTERVAL = 1000 / 15;

  function initHalftoneBackground(container) {
    var canvas = container.querySelector('canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var noise = new SimplexNoise(NOISE_SEED);
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gridPositions = [];
    var width = 0;
    var height = 0;
    var currentPixelSize = BASE_PIXEL_SIZE;
    var currentNoiseScale = FLOW_PARAMS.scale;
    var rafId;
    var time = 0;
    var lastTime;
    var accumulator = 0;
    var paused = false;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var shell = container.closest('.page-shell');
      var w = Math.round(shell ? shell.clientWidth : window.innerWidth);
      var h = Math.round(window.innerHeight);
      if (w < 1 || h < 1) return;
      if (w === width && h === height) return;

      width = w;
      height = h;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var scaleFactor = Math.min(1, width / REFERENCE_WIDTH);
      currentPixelSize = Math.max(BASE_PIXEL_SIZE, Math.round(BASE_PIXEL_SIZE * scaleFactor));
      var gap = Math.max(BASE_GAP, Math.round(BASE_GAP * scaleFactor));
      var cellSize = currentPixelSize + gap;
      currentNoiseScale = FLOW_PARAMS.scale * (REFERENCE_WIDTH / width);
      gridPositions = buildGrid(width, height, cellSize);
      renderFrame();
    }

    function renderFrame() {
      var start = PALETTE.start;
      var end = PALETTE.end;
      var renderContext = {
        noise: noise,
        gridPositions: gridPositions,
        pixelSize: currentPixelSize,
        width: width,
        height: height,
        getColor: function (intensity, alpha) {
          var r = Math.round(lerp(end.r, start.r, intensity));
          var g = Math.round(lerp(end.g, start.g, intensity));
          var b = Math.round(lerp(end.b, start.b, intensity));
          return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }
      };

      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, width, height);
      renderFlow(ctx, renderContext, time, {
        scale: currentNoiseScale,
        speed: FLOW_PARAMS.speed,
        threshold: FLOW_PARAMS.threshold,
        octaves: FLOW_PARAMS.octaves,
        lacunarity: FLOW_PARAMS.lacunarity,
        vividChance: VIVID_CHANCE
      });
    }

    function animate(now) {
      if (paused) return;
      var dt = lastTime !== undefined ? now - lastTime : 16.67;
      lastTime = now;
      accumulator += dt;

      if (accumulator >= FRAME_INTERVAL) {
        time += FLOW_PARAMS.speed * accumulator;
        accumulator = 0;
        renderFrame();
      }

      rafId = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (prefersReducedMotion || paused || rafId) return;
      lastTime = undefined;
      accumulator = 0;
      rafId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    resize();

    window.addEventListener('resize', resize, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        paused = true;
        stopAnimation();
      } else {
        paused = false;
        startAnimation();
      }
    });

    if (prefersReducedMotion) {
      renderFrame();
    } else {
      startAnimation();
    }

    return function destroy() {
      stopAnimation();
      window.removeEventListener('resize', resize);
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.page-bg');
    if (el) initHalftoneBackground(el);
  });
})();
