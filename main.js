(() => {
  // ===== DOM =====
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highEl  = document.getElementById("high");
  const timeEl  = document.getElementById("time");

  const btnPause = document.getElementById("btnPause");

  const overlay = document.getElementById("overlay");
  const overMsg = document.getElementById("overMsg");
  const btnRestart = document.getElementById("btnRestart");
  const btnQuit = document.getElementById("btnQuit");

  // ===== NEW: Start overlay DOM =====
  const startOverlay = document.getElementById("startOverlay");
  const btnStart = document.getElementById("btnStart");

  // ===== Helpers =====
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const rectsIntersect = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  // ===== NEW: Audio (starts only after user clicks Start) =====
  const SFX = {
    enabled: true, // set false if you don’t have audio files yet
    bgm: new Audio("assets/pirate-soundtrack.ogg"),
    shoot: new Audio("assets/shoot.ogg"),
    depth: new Audio("assets/depth_charge.ogg"),
    explode: new Audio("assets/explode.ogg"),
  };

  // safe defaults
  SFX.bgm.loop = true;
  SFX.bgm.volume = 0.45;
  SFX.shoot.volume = 0.55;
  SFX.depth.volume = 0.55;
  SFX.explode.volume = 0.6;

  function playSound(aud) {
    if (!SFX.enabled) return;
    if (!aud) return;
    try {
      // clone so fast taps don’t cut off sounds
      const s = aud.cloneNode();
      s.volume = aud.volume;
      s.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  function startAudio() {
    if (!SFX.enabled) return;
    SFX.bgm.play().catch(() => {});
  }

  // ===== SPEED SETTINGS (tweak these) =====
  const SPEED = {
    ship: 0.0014,
    planeMin: 0.0016,
    planeMax: 0.0038,
    subMin: 0.0009,
    subMax: 0.0021,
    missileVX: 0.010,
    missileVY: 0.030,
    depthVY: 0.010
  };

  // Draw image flipped horizontally (no flip files needed)
  function drawImageFlip(img, x, y, w, h, flipX) {
    if (!flipX) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  function canvasCSS() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  // ===== Settings =====
  const SETTINGS = {
    planeCount: 6,
    subCount: 3,
    subSpeed: 10,
    rapidDepth: false,
    rapidMissile: false,
    planeDir: "B",
    gameSeconds: 60
  };

  // ===== High Score =====
  const HS_KEY = "battleshipwar_highscore";
  let highScore = Number(localStorage.getItem(HS_KEY) || 0);
  highEl.textContent = String(highScore);

  // ===== Game State =====
  let score = 0;
  let timeLeft = SETTINGS.gameSeconds;
  let lastSecondAt = performance.now();
  let paused = false;
  let gameOver = false;

  // ===== NEW: Running state (false until Start click) =====
  let running = false;

  // ===== Assets =====
  const ASSETS = {
    ship: "assets/ship.png",
    water: "assets/water.png",
    depth: "assets/depthcharge.png",

    planeBig: "assets/airplane-big.png",
    planeMed: "assets/airplane-medium.png",
    planeSmall: "assets/airplane-small.png",

    subBig: "assets/submarine-big.png",
    subMed: "assets/submarine-medium.png",
    subSmall: "assets/submarine-small.png",

    expPlane: "assets/explosion_airplane.PNG",
    expSub: "assets/explosion.PNG",
  };

  let IMG = null;

  // ===== Canvas sizing (crisp on retina) =====
  function fitCanvas() {
    const maxW = 980;
    const cssW = Math.min(maxW, Math.max(320, window.innerWidth - 32));
    const cssH = Math.round(cssW * 0.62);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  }

  window.addEventListener("resize", () => {
    clearTimeout(window.__fitT);
    window.__fitT = setTimeout(fitCanvas, 120);
  });

  // ===== Entities =====
  class Sprite {
    constructor(x, y, w, h, vx = 0, vy = 0) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = vx; this.vy = vy;
      this.dead = false;
    }
    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    move() { this.x += this.vx; this.y += this.vy; }
    draw() {}
  }

  class Ship extends Sprite {
    constructor() {
      const { w, h } = canvasCSS();
      const size = w * 0.20;
      const x = (w - size) / 2;
      const y = (h - size) / 2;
      super(x, y, size, size, w * SPEED.ship, 0);
    }
    move() {
      super.move();
      const { w } = canvasCSS();
      if (this.x < 0) this.vx *= -1;
      if (this.x + this.w > w * 0.8) this.vx *= -1;
    }
    getLeftCannon() {
      const ox = 0.20;
      const oy = 0.66;
      return { x: this.x + this.w * ox, y: this.y + this.h * oy };
    }
    getRightCannon() {
      const ox = 0.80;
      const oy = 0.66;
      return { x: this.x + this.w * ox, y: this.y + this.h * oy };
    }
    getBottomCenter() {
      return { x: this.x + this.w * 0.50, y: this.y + this.h * 0.92 };
    }
    draw() { ctx.drawImage(IMG.ship, this.x, this.y, this.w, this.h); }
  }

  class Missile extends Sprite {
    constructor(x, y, dir) {
      super(x - 4, y - 8, 8, 16, 0, 0);
      this.dir = dir;

      // IMPORTANT: canvas.width is DPR pixels, but we draw in CSS pixels.
      // So use canvasCSS().w/h for speed scaling:
      const { w, h } = canvasCSS();
      this.vx = (dir === "L" ? -1 : 1) * (w * SPEED.missileVX);
      this.vy = -(h * SPEED.missileVY);
    }
    draw() {
      ctx.save();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 4;
      if (this.dir === "L") {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.h);
        ctx.lineTo(this.x + this.w, this.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  class DepthCharge extends Sprite {
    constructor(x, y) {
      const size = canvasCSS().w * 0.025;
      super(x - size/2, y - size/2, size, size, 0, 0);
      const { h } = canvasCSS();
      this.vy = h * SPEED.depthVY;
    }
    draw() { ctx.drawImage(IMG.depth, this.x, this.y, this.w, this.h); }
  }

  class Explosion extends Sprite {
    constructor(x, y, img) {
      const size = canvasCSS().w * 0.06;
      super(x - size/2, y - size/2, size, size, 0, 0);
      this.life = 10;
      this.img = img;
    }
    move() { this.life -= 1; if (this.life <= 0) this.dead = true; }
    draw() {
      ctx.save();
      ctx.globalAlpha = clamp(this.life / 10, 0, 1);
      ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
      ctx.restore();
    }
  }

  class Enemy extends Sprite {
    constructor(kind) {
      const { w, h } = canvasCSS();
      const isPlane = kind === "plane";

      const planeSizes = [
        { img: IMG.planeBig,   s: w * 0.07, pts: 15 },
        { img: IMG.planeMed,   s: w * 0.06, pts: 20 },
        { img: IMG.planeSmall, s: w * 0.03, pts: 75 },
      ];
      const subSizes = [
        { img: IMG.subBig,   s: w * 0.08, pts: 25 },
        { img: IMG.subMed,   s: w * 0.05, pts: 40 },
        { img: IMG.subSmall, s: w * 0.03, pts: 150 },
      ];

      const pick = (isPlane ? planeSizes : subSizes)[Math.floor(Math.random() * 3)];
      const size = pick.s;

      const bandTop = isPlane ? 10 : h * 0.70;
      const bandBot = isPlane ? h * 0.28 : h * 0.96;

      let dir;
      if (isPlane) {
        dir = SETTINGS.planeDir;
        if (dir === "B") dir = Math.random() < 0.5 ? "L" : "R";
      } else {
        dir = Math.random() < 0.5 ? "L" : "R";
      }

      const y = rand(bandTop, bandBot - size);

      const speed = isPlane
        ? rand(w * SPEED.planeMin, w * SPEED.planeMax)
        : rand(w * SPEED.subMin, w * SPEED.subMax);

      const vx = (dir === "L") ? -speed : speed;
      const x  = (dir === "L") ? (w + size) : (-size);

      super(x, y, size, size, vx, 0);

      this.kind = kind;
      this.img = pick.img;
      this.points = pick.pts;

      this.dir = dir;
      this.flipX = (dir === "L");

      this.bandTop = bandTop;
      this.bandBot = bandBot;

      this.exploding = false;
      this.explosionLife = 0;
    }

    explode() {
      this.exploding = true;
      this.explosionLife = 10;
      this.vx = 0;
      this.vy = 0;
    }

    move() {
      if (this.exploding) {
        this.explosionLife -= 1;
        if (this.explosionLife <= 0) this.reset();
        return;
      }

      super.move();

      if (this.kind === "plane") {
        if (Math.random() < 0.08) this.vy = rand(-1.8, 1.8);
        this.y += this.vy;
      } else {
        if (Math.random() < 0.08) this.vy = rand(-1.3, 1.3);
        this.y += this.vy;
      }

      if (this.y < this.bandTop) { this.y = this.bandTop; this.vy *= -1; }
      if (this.y + this.h > this.bandBot) { this.y = this.bandBot - this.h; this.vy *= -1; }

      const { w } = canvasCSS();
      if (this.x + this.w < -40 || this.x > w + 40) this.reset();
    }

    reset() {
      const fresh = new Enemy(this.kind);
      Object.assign(this, fresh);
    }

    draw() {
      if (this.exploding) return;
      drawImageFlip(this.img, this.x, this.y, this.w, this.h, this.flipX);
    }
  }

  // ===== Collections =====
  let ship;
  let missiles = [];
  let depths = [];
  let explosions = [];
  let airplanes = [];
  let submarines = [];

  function spawnInitial() {
    airplanes = [];
    submarines = [];
    for (let i = 0; i < SETTINGS.planeCount; i++) airplanes.push(new Enemy("plane"));
    for (let i = 0; i < SETTINGS.subCount; i++) submarines.push(new Enemy("sub"));
  }

  // ===== Input =====
  function handleTap(clientX, clientY) {
    if (!running) return;
    if (paused || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const topHalf = y <= rect.height / 2;

    if (!topHalf) {
      if (SETTINGS.rapidDepth || depths.length === 0) {
        const p = ship.getBottomCenter();
        depths.push(new DepthCharge(p.x, p.y));
        playSound(SFX.depth);
      }
    } else {
      if (SETTINGS.rapidMissile || missiles.length === 0) {
        const dir = x <= rect.width / 2 ? "L" : "R";
        const p = dir === "L" ? ship.getLeftCannon() : ship.getRightCannon();
        missiles.push(new Missile(p.x, p.y, dir));
        playSound(SFX.shoot);

        // ✅ muzzle flash removed already:
        // explosions.push(new Explosion(p.x, p.y, IMG.expPlane));
      }
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    handleTap(e.clientX, e.clientY);
  });

  // ===== Collisions =====
  function detectCollisions() {
    for (const m of missiles) {
      if (m.dead) continue;

      for (const a of airplanes) {
        if (a.exploding) continue;
        if (rectsIntersect(m.rect(), a.rect())) {
          score += a.points;
          a.explode();
          explosions.push(new Explosion(a.x + a.w/2, a.y + a.h/2, IMG.expPlane));
          playSound(SFX.explode);
          m.dead = true;
          break;
        }
      }

      if (m.y + m.h < -20 || m.x + m.w < -20 || m.x > canvasCSS().w + 20) m.dead = true;
    }

    for (const d of depths) {
      if (d.dead) continue;

      for (const s of submarines) {
        if (s.exploding) continue;
        if (rectsIntersect(d.rect(), s.rect())) {
          score += s.points;
          s.explode();
          explosions.push(new Explosion(s.x + s.w/2, s.y + s.h/2, IMG.expSub));
          playSound(SFX.explode);
          d.dead = true;
          break;
        }
      }

      if (d.y > canvasCSS().h + 20) d.dead = true;
    }

    missiles = missiles.filter(x => !x.dead);
    depths  = depths.filter(x => !x.dead);
  }

  // ===== Timer/GameOver =====
  function updateTimer(now) {
    if (now - lastSecondAt >= 1000) {
      timeLeft = Math.max(0, timeLeft - 1);
      lastSecondAt = now;

      timeEl.textContent = fmtTime(timeLeft);

      if (timeLeft <= 0 && !gameOver) endGame();
    }
  }

  function endGame() {
    gameOver = true;
    paused = true;

    const wasNewHigh = score > highScore;
    if (wasNewHigh) {
      highScore = score;
      localStorage.setItem(HS_KEY, String(highScore));
      highEl.textContent = String(highScore);
    }

    overMsg.textContent =
      `Final score: ${score}\n` +
      (wasNewHigh ? `New high score: ${highScore}\n` : `High score: ${highScore}\n`) +
      `Play again?`;

    overlay.classList.remove("hidden");
  }

  function resetGame() {
    score = 0;
    timeLeft = SETTINGS.gameSeconds;
    lastSecondAt = performance.now();
    paused = false;
    gameOver = false;

    missiles = [];
    depths = [];
    explosions = [];

    ship = new Ship();
    spawnInitial();

    overlay.classList.add("hidden");
    btnPause.textContent = "Pause";
    drawHUD();
  }

  // ===== Render =====
  function drawBackground() {
    const { w, h } = canvasCSS();
    const waterY = h * 0.62;

    // If you want pure white:
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    // optional very subtle bands (remove if you want plain white)
    // ctx.fillStyle = "rgba(0,0,0,0.02)";
    // ctx.fillRect(0, 0, w, waterY);

    // water tiles
    const tile = Math.max(18, w * 0.02);
    for (let x = 0; x < w + tile; x += tile) {
      ctx.drawImage(IMG.water, x, waterY - tile * 0.25, tile, tile);
    }
  }

  function drawHUD() {
    scoreEl.textContent = String(score);
    highEl.textContent = String(highScore);
    timeEl.textContent = fmtTime(timeLeft);
  }

  // ===== Main Loop =====
  function tick(now) {
    if (running && !paused) {
      ship.move();
      airplanes.forEach(a => a.move());
      submarines.forEach(s => s.move());
      missiles.forEach(m => m.move());
      depths.forEach(d => d.move());
      explosions.forEach(e => e.move());
      explosions = explosions.filter(e => !e.dead);

      detectCollisions();
      updateTimer(now);
      drawHUD();
    }

    const { w, h } = canvasCSS();
    ctx.clearRect(0, 0, w, h);

    drawBackground();

    ship.draw();
    airplanes.forEach(a => a.draw());
    submarines.forEach(s => s.draw());

    depths.forEach(d => d.draw());
    missiles.forEach(m => m.draw());
    explosions.forEach(e => e.draw());

    requestAnimationFrame(tick);
  }

  // ===== Buttons =====
  btnPause.addEventListener("click", () => {
    if (!running) return;
    if (gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? "Resume" : "Pause";
  });

  btnRestart.addEventListener("click", () => resetGame());
  btnQuit.addEventListener("click", () => {
    overlay.classList.add("hidden");
    paused = true;
    btnPause.textContent = "Resume";
  });

  // ===== NEW: Start button =====
  if (btnPause) btnPause.disabled = true;

  if (btnStart) {
    btnStart.addEventListener("click", () => {
      startAudio();

      running = true;
      paused = false;
      gameOver = false;

      if (startOverlay) startOverlay.classList.add("hidden");
      if (btnPause) {
        btnPause.disabled = false;
        btnPause.textContent = "Pause";
      }
    });
  }

  // ===== Start =====
  async function start() {
    try {
      const [
        shipImg, waterImg, depthImg,
        pBig, pMed, pSmall,
        sBig, sMed, sSmall,
        expPlane, expSub
      ] = await Promise.all([
        loadImage(ASSETS.ship),
        loadImage(ASSETS.water),
        loadImage(ASSETS.depth),

        loadImage(ASSETS.planeBig),
        loadImage(ASSETS.planeMed),
        loadImage(ASSETS.planeSmall),

        loadImage(ASSETS.subBig),
        loadImage(ASSETS.subMed),
        loadImage(ASSETS.subSmall),

        loadImage(ASSETS.expPlane),
        loadImage(ASSETS.expSub),
      ]);

      IMG = {
        ship: shipImg,
        water: waterImg,
        depth: depthImg,

        planeBig: pBig,
        planeMed: pMed,
        planeSmall: pSmall,

        subBig: sBig,
        subMed: sMed,
        subSmall: sSmall,

        expPlane,
        expSub
      };

      fitCanvas();
      resetGame();

      // Start is required to run
      running = false;
      paused = true;
      if (startOverlay) startOverlay.classList.remove("hidden");
      if (btnPause) btnPause.disabled = true;

      requestAnimationFrame(tick);

    } catch (err) {
      console.error(err);
      alert(
        "Image loading / startup error.\n\n" +
        err.message +
        "\n\nDouble-check:\n- file names match EXACT (including .PNG caps)\n- images are inside /assets\n- paths are correct"
      );
    }
  }

  start();
})();
