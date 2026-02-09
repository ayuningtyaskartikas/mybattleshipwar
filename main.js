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

  // ===== Settings (web version of your Prefs) =====
  const SETTINGS = {
    planeCount: 6,    // similar to your pref values
    subSpeed: 10,
    rapidDepth: false,
    rapidMissile: false,
    planeDir: "B",    // "L" "R" "B"
  };

  // ===== High Score (web version of HighScoreManager) =====
  const HS_KEY = "battleshipwar_highscore";
  let highScore = Number(localStorage.getItem(HS_KEY) || 0);
  highEl.textContent = String(highScore);

  // ===== Game State =====
  let score = 0;
  let timeLeft = 180;
  let lastSecondAt = performance.now();
  let paused = false;
  let gameOver = false;

  // ===== Entities =====
  class Sprite {
    constructor(x, y, w, h, vx = 0, vy = 0) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = vx; this.vy = vy;
      this.dead = false;
    }
    move() { this.x += this.vx; this.y += this.vy; }
    draw() {}
    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  }

  class Ship extends Sprite {
    constructor() {
      const w = canvas.width * 0.18;
      const h = w * 0.5;
      const x = (canvas.width - w) / 2;
      const y = canvas.height * 0.48;
      super(x, y, w, h, 2.6, 0);
    }
    move() {
      super.move();
      // bounce between edges like your Android ship
      if (this.x < 0) this.vx *= -1;
      if (this.x + this.w > canvas.width * 0.8) this.vx *= -1;
    }
    getLeftCannon() {
      return { x: this.x + this.w * 0.18, y: this.y + this.h * 0.05 };
    }
    getRightCannon() {
      return { x: this.x + this.w * 0.82, y: this.y + this.h * 0.05 };
    }
    getBottomCenter() {
      return { x: this.x + this.w * 0.5, y: this.y + this.h * 0.95 };
    }
    draw() {
      // Simple ship shape (replace with images later)
      ctx.save();
      ctx.fillStyle = "rgba(239,236,228,0.9)";
      ctx.strokeStyle = "rgba(167,150,124,0.8)";
      ctx.lineWidth = 2;

      // body
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 10);
      ctx.fill();
      ctx.stroke();

      // cannons
      ctx.fillStyle = "rgba(20,35,33,0.9)";
      const lc = this.getLeftCannon();
      const rc = this.getRightCannon();
      ctx.beginPath(); ctx.arc(lc.x, lc.y + 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rc.x, rc.y + 6, 4, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }
  }

  class Missile extends Sprite {
    constructor(x, y, dir) {
      super(x - 4, y - 8, 8, 16, dir === "L" ? -10 : 10, -18);
      this.dir = dir;
    }
    draw() {
      ctx.save();
      ctx.strokeStyle = "rgba(239,236,228,0.95)";
      ctx.lineWidth = 3;
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
      super(x - 8, y - 8, 16, 16, 0, 12);
    }
    draw() {
      ctx.save();
      ctx.fillStyle = "rgba(167,150,124,0.95)";
      ctx.beginPath();
      ctx.ellipse(this.x + this.w/2, this.y + this.h/2, this.w/2, this.h/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Explosion extends Sprite {
    constructor(x, y) {
      super(x - 18, y - 18, 36, 36, 0, 0);
      this.life = 10;
    }
    move() { this.life -= 1; if (this.life <= 0) this.dead = true; }
    draw() {
      ctx.save();
      ctx.globalAlpha = clamp(this.life / 10, 0, 1);
      ctx.strokeStyle = "rgba(239,236,228,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.w/2, this.y + this.h/2, 6 + (10 - this.life) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Enemy extends Sprite {
    constructor(x, y, w, h, vx, vy, points, band) {
      super(x, y, w, h, vx, vy);
      this.points = points;
      this.band = band; // "air" or "sea"
      this.exploding = false;
      this.explosionLife = 0;
      this.sizeType = "MED";
    }
    explode() {
      this.exploding = true;
      this.explosionLife = 10;
      this.vx = 0; this.vy = 0;
    }
    move() {
      if (this.exploding) {
        this.explosionLife -= 1;
        if (this.explosionLife <= 0) this.reset();
        return;
      }
      super.move();
      this.behavior();
    }
    behavior() {}
    reset() {}
    draw() {
      ctx.save();
      if (this.exploding) {
        ctx.fillStyle = "rgba(239,236,228,0.85)";
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // draw by band
      if (this.band === "air") {
        ctx.fillStyle = "rgba(127,147,141,0.9)";
        ctx.strokeStyle = "rgba(239,236,228,0.35)";
      } else {
        ctx.fillStyle = "rgba(167,150,124,0.75)";
        ctx.strokeStyle = "rgba(239,236,228,0.25)";
      }
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  class Airplane extends Enemy {
    constructor() {
      const sizePick = Math.floor(Math.random() * 3);
      const sizes = [
        { t: "BIG",   s: canvas.width * 0.065, pts: 15 },
        { t: "MED",   s: canvas.width * 0.052, pts: 20 },
        { t: "SMALL", s: canvas.width * 0.035, pts: 75 },
      ];
      const pick = sizes[sizePick];

      // direction based on SETTINGS.planeDir
      let dir = SETTINGS.planeDir;
      if (dir === "B") dir = Math.random() < 0.5 ? "L" : "R";

      const y = rand(16, canvas.height * 0.25);
      const w = pick.s;
      const h = pick.s * 0.55;

      let x, vx;
      if (dir === "L") { x = canvas.width + w; vx = -rand(4, 10); }
      else { x = -w; vx = rand(4, 10); }

      super(x, y, w, h, vx, 0, pick.pts, "air");
      this.dir = dir;
      this.sizeType = pick.t;
    }

    behavior() {
      // light random vertical drift like your Android version
      if (Math.random() < 0.08) this.vy = rand(-1.8, 1.8);
      this.y += this.vy;

      // stay in top quarter
      if (this.y < 6 || this.y + this.h > canvas.height * 0.28) this.vy *= -1;

      // offscreen reset
      if (this.dir === "L" && this.x + this.w < -20) this.reset();
      if (this.dir === "R" && this.x > canvas.width + 20) this.reset();
    }

    reset() {
      // re-init by replacing fields
      const fresh = new Airplane();
      Object.assign(this, fresh);
    }
  }

  class Submarine extends Enemy {
    constructor() {
      const sizePick = Math.floor(Math.random() * 3);
      const sizes = [
        { t: "BIG",   s: canvas.width * 0.070, pts: 25 },
        { t: "MED",   s: canvas.width * 0.050, pts: 40 },
        { t: "SMALL", s: canvas.width * 0.035, pts: 150 },
      ];
      const pick = sizes[sizePick];

      const dir = Math.random() < 0.5 ? "L" : "R";
      const y = rand(canvas.height * 0.70, canvas.height * 0.92);
      const w = pick.s;
      const h = pick.s * 0.55;

      let x, vx;
      // NOTE: in your Android code the directions were a bit flipped,
      // here we make it natural: L means move left, R means move right.
      if (dir === "R") { x = -w; vx = SETTINGS.subSpeed * 0.35; }
      else { x = canvas.width + w; vx = -SETTINGS.subSpeed * 0.35; }

      super(x, y, w, h, vx, 0, pick.pts, "sea");
      this.dir = dir;
      this.sizeType = pick.t;
    }

    behavior() {
      // occasional speed drift
      if (Math.random() < 0.08) {
        this.vx = (this.dir === "R" ? 1 : -1) * rand(2.2, 5.0);
        this.vy = rand(-1.3, 1.3);
      }
      this.y += this.vy;

      const minY = canvas.height * 0.70;
      const maxY = canvas.height - this.h - 6;
      if (this.y < minY) { this.y = minY; if (this.vy < 0) this.vy *= -1; }
      if (this.y > maxY) { this.y = maxY; if (this.vy > 0) this.vy *= -1; }

      // offscreen reset
      if (this.dir === "R" && this.x > canvas.width + 20) this.reset();
      if (this.dir === "L" && this.x + this.w < -20) this.reset();
    }

    reset() {
      const fresh = new Submarine();
      Object.assign(this, fresh);
    }
  }

  // ===== Collections =====
  const ship = new Ship();
  let missiles = [];
  let depths = [];
  let explosions = [];
  let airplanes = [];
  let submarines = [];

  function spawnInitial() {
    airplanes = [];
    submarines = [];
    for (let i = 0; i < SETTINGS.planeCount; i++) airplanes.push(new Airplane());
    for (let i = 0; i < 3; i++) submarines.push(new Submarine());
  }
  spawnInitial();

  // ===== Input (web version of onTouchEvent) =====
  function handleTap(clientX, clientY) {
    if (gameOver) return;

    // translate to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const topHalf = y <= canvas.height / 2;

    if (!topHalf) {
      // depth charge
      if (SETTINGS.rapidDepth || depths.length === 0) {
        const p = ship.getBottomCenter();
        depths.push(new DepthCharge(p.x, p.y));
      }
    } else {
      // missile left/right based on tap x
      if (SETTINGS.rapidMissile || missiles.length === 0) {
        const dir = x <= canvas.width / 2 ? "L" : "R";
        const p = dir === "L" ? ship.getLeftCannon() : ship.getRightCannon();
        missiles.push(new Missile(p.x, p.y, dir));
        explosions.push(new Explosion(p.x, p.y));
      }
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    handleTap(e.clientX, e.clientY);
  });

  // ===== Collisions (same logic you already have) =====
  function detectCollisions() {
    // missiles vs airplanes
    for (const m of missiles) {
      if (m.dead) continue;

      for (const a of airplanes) {
        if (a.exploding) continue;
        if (rectsIntersect(m.rect(), a.rect())) {
          score += a.points;
          a.explode();
          explosions.push(new Explosion(a.x + a.w/2, a.y + a.h/2));
          m.dead = true;
          break;
        }
      }

      // offscreen remove
      if (m.y + m.h < -20 || m.x + m.w < -20 || m.x > canvas.width + 20) {
        m.dead = true;
      }
    }

    // depth charges vs submarines
    for (const d of depths) {
      if (d.dead) continue;

      for (const s of submarines) {
        if (s.exploding) continue;
        if (rectsIntersect(d.rect(), s.rect())) {
          score += s.points;
          s.explode();
          explosions.push(new Explosion(s.x + s.w/2, s.y + s.h/2));
          d.dead = true;
          break;
        }
      }

      if (d.y > canvas.height + 20) d.dead = true;
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

      if (timeLeft <= 0 && !gameOver) {
        endGame();
      }
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
    timeLeft = 180;
    lastSecondAt = performance.now();
    paused = false;
    gameOver = false;
    missiles = [];
    depths = [];
    explosions = [];
    spawnInitial();
    overlay.classList.add("hidden");
  }

  // ===== Render =====
  function drawBackground() {
    // sky + sea split like your "water line"
    const waterY = canvas.height * 0.62;

    // sky
    ctx.fillStyle = "rgba(239,236,228,0.02)";
    ctx.fillRect(0, 0, canvas.width, waterY);

    // sea
    ctx.fillStyle = "rgba(127,147,141,0.08)";
    ctx.fillRect(0, waterY, canvas.width, canvas.height - waterY);

    // water line tiles
    ctx.strokeStyle = "rgba(239,236,228,0.12)";
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, waterY);
      ctx.lineTo(x + 10, waterY);
      ctx.stroke();
    }
  }

  function drawHUD() {
    scoreEl.textContent = String(score);
    highEl.textContent = String(highScore);
    timeEl.textContent = fmtTime(timeLeft);
  }

  // ===== Main Loop (web version of Fire Handler) =====
  function tick(now) {
    if (!paused) {
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

    // draw always (even when paused)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    ship.draw();
    airplanes.forEach(a => a.draw());
    submarines.forEach(s => s.draw());
    depths.forEach(d => d.draw());
    missiles.forEach(m => m.draw());
    explosions.forEach(e => e.draw());

    requestAnimationFrame(tick);
  }

  // ===== Resize canvas to look good on any screen =====
  function fitCanvas() {
    // keep a stable internal resolution (so physics feels consistent)
    // but also adapt a bit to device width
    const maxW = 980;
    const w = Math.min(maxW, Math.max(320, window.innerWidth - 32));
    const h = Math.round(w * 0.62);
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);

    // rebuild ship + enemies to match new scale
    // (keeps behavior consistent when rotating phone)
    resetGame();
  }

  window.addEventListener("resize", () => {
    clearTimeout(window.__fitT);
    window.__fitT = setTimeout(fitCanvas, 120);
  });

  // ===== Buttons =====
  btnPause.addEventListener("click", () => {
    if (gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? "Resume" : "Pause";
  });

  btnRestart.addEventListener("click", () => resetGame());
  btnQuit.addEventListener("click", () => {
    // simplest "quit" for web: just hide overlay and pause
    overlay.classList.add("hidden");
    paused = true;
  });

  // ===== Start =====
  fitCanvas();
  drawHUD();
  requestAnimationFrame(tick);
})();
