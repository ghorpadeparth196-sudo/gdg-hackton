(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia("(hover: none)").matches;

  var layer = document.createElement("div");
  layer.id = "jetfx-layer";
  layer.setAttribute("aria-hidden", "true");

  layer.innerHTML = [
    '<canvas id="jetfx-canvas"></canvas>',

    '<div class="jetfx-reticle" id="jetfx-reticle">',
    '  <svg viewBox="0 0 120 120" fill="none">',
    '    <circle cx="60" cy="60" r="46" stroke="#FF6E4E" stroke-width="1.2" stroke-dasharray="10 12" opacity="0.9"/>',
    '    <circle cx="60" cy="60" r="30" stroke="#FFD23F" stroke-width="0.9" stroke-dasharray="3 7" opacity="0.7"/>',
    '    <path d="M60 6v18M60 96v18M6 60h18M96 60h18" stroke="#FF6E4E" stroke-width="1.6"/>',
    '    <path d="M22 22h14M22 22v14M98 22H84M98 22v14M22 98h14M22 98V84M98 98H84M98 98V84" stroke="#FFD23F" stroke-width="1.6"/>',
    '    <circle cx="60" cy="60" r="2.4" fill="#FF6E4E"/>',
    "  </svg>",
    '  <div class="jetfx-reticle-label" id="jetfx-label">TARGET LOCKED</div>',
    "</div>",

    '<div class="jetfx-jet" id="jetfx-jet">',
    '  <img class="jetfx-sprite" src="jet-sprite.png" alt="">',
    '  <span class="jetfx-flame jetfx-thrust jetfx-thrust-l"></span>',
    '  <span class="jetfx-flame jetfx-thrust jetfx-thrust-r"></span>',
    "</div>",

    '<div class="jetfx-hud">',
    '  <div class="jetfx-count" id="jetfx-count">TARGETS DOWN 0</div>',
    '  <button type="button" class="jetfx-btn is-armed" id="jetfx-arm"><span class="jetfx-led"></span><span id="jetfx-arm-text">Weapons armed</span></button>',
    '  <button type="button" class="jetfx-btn" id="jetfx-reset">Rebuild page</button>',
    "</div>",
  ].join("");

  document.body.appendChild(layer);

  var canvas = document.getElementById("jetfx-canvas");
  var ctx = canvas.getContext("2d");
  var jetEl = document.getElementById("jetfx-jet");
  var reticle = document.getElementById("jetfx-reticle");
  var label = document.getElementById("jetfx-label");
  var armBtn = document.getElementById("jetfx-arm");
  var armText = document.getElementById("jetfx-arm-text");
  var resetBtn = document.getElementById("jetfx-reset");
  var countEl = document.getElementById("jetfx-count");

  var W = 0, H = 0, DPR = 1;
  var pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.45,
    active: false
  };

  var jet = {
    x: pointer.x - 220,
    y: pointer.y - 180,
    vx: 0,
    vy: 0,
    angle: 0,
    bank: 0
  };

  var particles = [];
  var beams = [];
  var flashes = [];
  var armed = true;
  var target = null;
  var destroyed = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  var DESTROYABLE =
    "a,img,h1,h2,h3,h4,p,li,span,button,label,input,textarea,footer,section,header,nav,form," +
    ".shape,.section-block,.track-card,.meta-item,.ticker,.spots-badge,.success-card,.confirm-details,.next-steps,.step-item,.hero-left,.art-panel";

  function pickTarget(x, y) {
    var el = document.elementFromPoint(x, y);

    if (!el) return null;
    if (layer.contains(el)) return null;

    var node = el;

    while (node && node !== document.body) {
      if (
        !node.classList.contains("jetfx-gone") &&
        !node.classList.contains("jetfx-destroying") &&
        node.matches(DESTROYABLE)
      ) {
        var r = node.getBoundingClientRect();

        if (r.width > 8 && r.height > 8 && r.height < H * 1.6) {
          return node;
        }
      }

      node = node.parentElement;
    }

    return null;
  }

  function setTarget(el) {
    if (target === el) return;

    if (target) {
      target.classList.remove("jetfx-locked");
    }

    target = el;

    if (target) {
      target.classList.add("jetfx-locked");
      label.textContent = "LOCK · " + target.tagName;
    } else {
      label.textContent = "SCANNING";
    }
  }

  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;

    reticle.classList.add("is-on");
    setTarget(pickTarget(pointer.x, pointer.y));
  }

  window.addEventListener("pointermove", onMove, {
    passive: true
  });

  window.addEventListener("pointerdown", function (e) {
    if (!armed) return;
    if (layer.contains(e.target)) return;

    pointer.x = e.clientX;
    pointer.y = e.clientY;

    var hit = pickTarget(e.clientX, e.clientY);

    if (!hit) return;

    e.preventDefault();
    e.stopPropagation();

    setTarget(hit);
    fire(hit, e.clientX, e.clientY);
  }, true);

  window.addEventListener("click", function (e) {
    if (
      armed &&
      !layer.contains(e.target) &&
      pickTarget(e.clientX, e.clientY)
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  function nose() {
    var len = 78;

    return {
      x: jet.x + Math.cos(jet.angle - Math.PI / 2) * len,
      y: jet.y + Math.sin(jet.angle - Math.PI / 2) * len
    };
  }

  function fire(el, x, y) {
    var n = nose();

    beams.push({
      x1: n.x,
      y1: n.y,
      x2: x,
      y2: y,
      life: 1
    });

    flashes.push({
      x: x,
      y: y,
      r: 6,
      life: 1
    });

    var rect = el.getBoundingClientRect();

    burst(x, y, rect);

    if (!REDUCED) {
      document.documentElement.classList.remove("jetfx-quake");
      void document.documentElement.offsetWidth;
      document.documentElement.classList.add("jetfx-quake");

      setTimeout(function () {
        document.documentElement.classList.remove("jetfx-quake");
      }, 380);
    }

    el.classList.remove("jetfx-locked");
    el.classList.add("jetfx-shake");
    target = null;

    setTimeout(function () {
      el.classList.remove("jetfx-shake");
      el.classList.add("jetfx-destroying");

      setTimeout(function () {
        el.classList.remove("jetfx-destroying");
        el.classList.add("jetfx-gone");
      }, REDUCED ? 300 : 700);
    }, REDUCED ? 0 : 260);

    if (destroyed.indexOf(el) === -1) {
      destroyed.push(el);
    }

    countEl.textContent = "TARGETS DOWN " + destroyed.length;
  }

  function burst(x, y, rect) {
    var i, a, s;

    var sparks = REDUCED ? 14 : 70;

    for (i = 0; i < sparks; i++) {
      a = Math.random() * Math.PI * 2;
      s = 2 + Math.random() * 11;

      particles.push({
        t: "spark",
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: 0.014 + Math.random() * 0.03,
        size: 1 + Math.random() * 2.4
      });
    }

    var debris = REDUCED ? 6 : 26;

    for (i = 0; i < debris; i++) {
      a = Math.random() * Math.PI * 2;
      s = 1 + Math.random() * 6;

      particles.push({
        t: "debris",
        x: x + (Math.random() - 0.5) * Math.min(rect.width, 260),
        y: y + (Math.random() - 0.5) * Math.min(rect.height, 200),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
        size: 3 + Math.random() * 9
      });
    }

    var smoke = REDUCED ? 4 : 22;

    for (i = 0; i < smoke; i++) {
      particles.push({
        t: "smoke",
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -0.6 - Math.random() * 1.6,
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
        size: 18 + Math.random() * 40
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    var tx = pointer.x - 170;
    var ty = pointer.y - 140;

    var ease = REDUCED ? 0.2 : 0.085;

    jet.vx = (tx - jet.x) * ease;
    jet.vy = (ty - jet.y) * ease;

    jet.x += jet.vx;
    jet.y += jet.vy;

    var aim =
      Math.atan2(pointer.y - jet.y, pointer.x - jet.x) +
      Math.PI / 2;

    var d =
      ((aim - jet.angle + Math.PI) % (Math.PI * 2)) -
      Math.PI;

    jet.angle += d * 0.07;

    jet.bank +=
      (Math.max(-16, Math.min(16, jet.vx * 0.9)) - jet.bank) *
      0.07;

    jetEl.style.transform =
      "translate3d(" +
      jet.x +
      "px," +
      jet.y +
      "px,0) rotate(" +
      jet.angle +
      "rad) rotateY(" +
      jet.bank +
      "deg)";

    reticle.style.transform =
      "translate3d(" +
      pointer.x +
      "px," +
      pointer.y +
      "px,0)";

    var n = nose();

    if (pointer.active) {
      var grd = ctx.createLinearGradient(
        n.x,
        n.y,
        pointer.x,
        pointer.y
      );

      grd.addColorStop(
        0,
        "rgba(255,210,63,0.9)"
      );

      grd.addColorStop(
        1,
        "rgba(255,110,78,0.15)"
      );

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([12, 10]);
      ctx.lineDashOffset =
        -(performance.now() / 22) % 22;

      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(pointer.x, pointer.y);
      ctx.stroke();
      ctx.restore();
    }

    for (var b = beams.length - 1; b >= 0; b--) {
      var bm = beams[b];

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = bm.life;
      ctx.strokeStyle = "#FF6E4E";
      ctx.lineWidth = 12 * bm.life;
      ctx.shadowColor = "#FF6E4E";
      ctx.shadowBlur = 40;

      ctx.beginPath();
      ctx.moveTo(bm.x1, bm.y1);
      ctx.lineTo(bm.x2, bm.y2);
      ctx.stroke();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4 * bm.life;
      ctx.stroke();

      ctx.restore();

      bm.life -= 0.06;

      if (bm.life <= 0) {
        beams.splice(b, 1);
      }
    }

    for (var f = flashes.length - 1; f >= 0; f--) {
      var fl = flashes[f];

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      var g = ctx.createRadialGradient(
        fl.x,
        fl.y,
        0,
        fl.x,
        fl.y,
        fl.r * 22
      );

      g.addColorStop(
        0,
        "rgba(255,255,255," + fl.life + ")"
      );

      g.addColorStop(
        0.3,
        "rgba(255,210,63," + fl.life * 0.7 + ")"
      );

      g.addColorStop(
        1,
        "rgba(255,110,78,0)"
      );

      ctx.fillStyle = g;

      ctx.beginPath();
      ctx.arc(
        fl.x,
        fl.y,
        fl.r * 22,
        0,
        6.2832
      );
      ctx.fill();

      ctx.restore();

      fl.r += 1.6;
      fl.life -= 0.055;

      if (fl.life <= 0) {
        flashes.splice(f, 1);
      }
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var o = particles[p];

      o.x += o.vx;
      o.y += o.vy;
      o.life -= o.decay;

      if (o.t === "spark") {
        o.vy += 0.22;
        o.vx *= 0.985;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(o.life, 0);
        ctx.strokeStyle =
          o.life > 0.6 ? "#fff" : "#FFD23F";
        ctx.lineWidth = o.size;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(
          o.x - o.vx * 2.2,
          o.y - o.vy * 2.2
        );
        ctx.stroke();

        ctx.restore();
      } else if (o.t === "debris") {
        o.vy += 0.34;
        o.rot += o.vr;

        ctx.save();
        ctx.globalAlpha = Math.max(o.life, 0);
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot);

        ctx.fillStyle =
          p % 3 === 0
            ? "#5B3EF5"
            : p % 3 === 1
            ? "#F4F2FF"
            : "#FF6E4E";

        ctx.fillRect(
          -o.size / 2,
          -o.size / 4,
          o.size,
          o.size / 2
        );

        ctx.restore();
      } else {
        o.vy -= 0.01;
        o.size += 0.9;

        ctx.save();
        ctx.globalAlpha =
          Math.max(o.life, 0) * 0.28;

        var sg = ctx.createRadialGradient(
          o.x,
          o.y,
          0,
          o.x,
          o.y,
          o.size
        );

        sg.addColorStop(
          0,
          "rgba(120,120,140,0.9)"
        );

        sg.addColorStop(
          1,
          "rgba(20,20,30,0)"
        );

        ctx.fillStyle = sg;

        ctx.beginPath();
        ctx.arc(
          o.x,
          o.y,
          o.size,
          0,
          6.2832
        );
        ctx.fill();

        ctx.restore();
      }

      if (o.life <= 0) {
        particles.splice(p, 1);
      }
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  armBtn.addEventListener("click", function () {
    armed = !armed;

    armBtn.classList.toggle(
      "is-armed",
      armed
    );

    armText.textContent =
      armed ? "Weapons armed" : "Weapons safe";

    if (!armed) {
      setTarget(null);
    }
  });

  resetBtn.addEventListener("click", function () {
    destroyed.forEach(function (el) {
      el.classList.remove(
        "jetfx-gone",
        "jetfx-destroying",
        "jetfx-shake",
        "jetfx-locked"
      );

      el.classList.add("jetfx-rebuild");

      setTimeout(function () {
        el.classList.remove("jetfx-rebuild");
      }, 520);
    });

    destroyed = [];
    countEl.textContent = "TARGETS DOWN 0";
  });

  if (TOUCH) {
    pointer.active = true;
    reticle.classList.add("is-on");
    armText.textContent = "Tap to strike";
  }
})();
