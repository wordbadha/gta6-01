// Palmetto Heat — a 2D top-down open-world crime game set in Palmetto City.
// Original city, characters, vehicles and story. No network, no libraries:
// one plain script, canvas rendering, WebAudio synthesis, localStorage saves.

(function () {
  "use strict";

  // ---------- world constants ----------
  var WORLD_W = 2400, WORLD_H = 2400;
  var ROAD_XS = [160, 420, 680, 940, 1200, 1460, 1720, 1980, 2240];
  var ROAD_YS = [160, 420, 680, 940, 1200, 1460, 1720, 1980, 2240];
  var ROAD_HALF = 45;
  var SAVE_KEY = "palmetto-heat-save-v1";
  var HOSPITAL = { x: 300, y: 900 };
  var WALK_SPEED = 170, RUN_SPEED = 265;
  var CAR_TOP = 340, CAR_ACCEL = 250, CAR_BRAKE = 340;

  // ---------- small helpers ----------
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function mulberry(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- places ----------
  var PLACES = {
    motel:     { x: 290,  y: 420,  label: "Seaside Motel" },
    garage:    { x: 550,  y: 420,  label: "Reef's Garage" },
    docks:     { x: 290,  y: 1980, label: "Port Palmetto" },
    pawn:      { x: 550,  y: 1200, label: "Lucky Pawn" },
    stadium:   { x: 2100, y: 1750, label: "Palmetto Stadium" },
    safehouse: { x: 2110, y: 680,  label: "Safehouse" },
    bank:      { x: 1330, y: 1200, label: "Palmetto Bank" },
    park:      { x: 1070, y: 810,  label: "Palmetto Park" },
    mall:      { x: 1590, y: 1980, label: "Palmetto Mall" },
    spray:     { x: 1590, y: 420,  label: "Pay 'n Spray" },
    gunshop:   { x: 1070, y: 420,  label: "Ammo Barn" },
    hospital:  { x: 300,  y: 900,  label: "Palmetto General" },
    airport:   { x: 2100, y: 2200, label: "Palmetto Airfield" },
    pdhq:      { x: 680,  y: 1200, label: "PPD Headquarters" },
    beach:     { x: 1200, y: 2320, label: "Palmetto Beach" }
  };
  var TAXI_DESTS = [PLACES.airport, PLACES.hospital, PLACES.mall, PLACES.stadium, PLACES.docks, PLACES.bank];

  // ---------- buildings (block interiors only; roads, park and hospital stay clear) ----------
  var BUILDINGS = [];
  function buildCity() {
    BUILDINGS = [];
    var rng = mulberry(19970704);
    var palette = ["#8d7d6b", "#7a6a8f", "#6b7f8d", "#96705a", "#5f7a5e", "#8f7a4d", "#74605a"];
    var bx, by, i, j, x0, y0, w, h;
    for (i = 0; i < ROAD_XS.length - 1; i++) {
      for (j = 0; j < ROAD_YS.length - 1; j++) {
        x0 = ROAD_XS[i] + ROAD_HALF + 14;
        y0 = ROAD_YS[j] + ROAD_HALF + 14;
        w = ROAD_XS[i + 1] - ROAD_XS[i] - 2 * ROAD_HALF - 28;
        h = ROAD_YS[j + 1] - ROAD_YS[j] - 2 * ROAD_HALF - 28;
        // Park block and hospital block stay open.
        if (x0 > 980 && x0 < 1160 && y0 > 720 && y0 < 900) continue;
        if (x0 > 200 && x0 < 380 && y0 > 720 && y0 < 900) continue;
        // The stadium block holds the stadium bowl, not offices.
        if (x0 > 2020 && x0 < 2200 && y0 > 1760 && y0 < 1940) continue;
        if (rng() < 0.22) continue; // a few empty lots keep the city breathing
        var split = rng() < 0.45;
        if (split) {
          BUILDINGS.push({ x: x0, y: y0, w: w * 0.46, h: h, color: palette[Math.floor(rng() * palette.length)] });
          BUILDINGS.push({ x: x0 + w * 0.54, y: y0, w: w * 0.46, h: h, color: palette[Math.floor(rng() * palette.length)] });
        } else {
          BUILDINGS.push({ x: x0, y: y0, w: w, h: h, color: palette[Math.floor(rng() * palette.length)] });
        }
      }
    }
    // Landmark blocks: bank, hospital, stadium bowl, PD HQ.
    BUILDINGS.push({ x: 1290, y: 1160, w: 120, h: 80, color: "#b8a05a", label: "BANK" });
    BUILDINGS.push({ x: 240, y: 830, w: 130, h: 90, color: "#dfe8ee", label: "HOSPITAL" });
    BUILDINGS.push({ x: 2040, y: 1790, w: 180, h: 120, color: "#4d6b8a", label: "STADIUM" });
    BUILDINGS.push({ x: 640, y: 1160, w: 110, h: 80, color: "#3d5a80", label: "PD HQ" });
  }

  // ---------- missions ----------
  var MISSIONS = [
    { id: "m1", title: "1 — First Wheels", text: "Meet Lena at the Seaside Motel, steal a parked car, then drive it to Reef's Garage." },
    { id: "m2", title: "2 — Dockside Run", text: "Walk to Port Palmetto, then drive to Lucky Pawn." },
    { id: "m3", title: "3 — The GT", text: "Go to Palmetto Stadium on foot and steal the parked Palmetto GT, then drive it to the garage." },
    { id: "m4", title: "4 — Lay Low", text: "Lose the heat, then walk to the safehouse." },
    { id: "m5", title: "5 — Park and Ride", text: "Walk to Palmetto Park, then drive to Palmetto Mall." },
    { id: "m6", title: "6 — The Big One", text: "Walk into Palmetto Bank and hold the lobby, then escape by car to the safehouse." }
  ];
  var PAYOUTS = [300, 500, 700, 500, 1000, 2500];

  // ---------- game state ----------
  var G = null;
  var keys = {};
  var mouse = { x: 640, y: 360, down: false };
  var cam = { x: 160, y: 420 };
  var timeMin = 480; // 08:00
  var bullets = [];
  var parts = [];
  var floaters = [];
  var packages = [];
  var wantedT = 0, policeT = 0, holdT = 0, holdSpawnT = 0;
  var punchCd = 0, shootCd = 0, fireHeld = false;
  var musicOn = true, musicTimer = null, musicStep = 0;
  var respawnTimer = null;
  var msgText = "";
  var engineOsc = null, engineGain = null;
  var audioCtx = null;

  function freshState() {
    return {
      mode: "menu",
      player: { x: 160, y: 420, a: 0, onFoot: true, car: null, hp: 100 },
      cars: [], peds: [], cops: [], copCars: [],
      missionIdx: 0, missionStep: 0,
      cash: 250, wanted: 0, health: 100, ammo: 24,
      carsStolen: 0, packagesGot: 0, taxi: null,
      weapon: 2
    };
  }

  var CAR_MODELS = [
    { name: "Vice Sedan", color: "#c94f4f", w: 46, h: 22 },
    { name: "Suncoast Taxi", color: "#e8c33a", w: 46, h: 22 },
    { name: "Harbor Van", color: "#7a8a99", w: 52, h: 24 },
    { name: "Beach Cruiser", color: "#4fa8c9", w: 48, h: 22 },
    { name: "Palmetto Truck", color: "#6b8e5a", w: 56, h: 26 }
  ];
  var GT_MODEL = { name: "Palmetto GT", color: "#e86a1c", w: 48, h: 22 };

  function makeCar(x, y, a, model, parked) {
    return {
      x: x, y: y, a: a, speed: 0, parked: !!parked, dead: false, police: false,
      model: model, hp: 100, ai: !parked, cruise: rand(120, 180), turnT: rand(1, 4),
      stolen: false, ramCd: 0
    };
  }
  function makeCopCar(x, y) {
    return {
      x: x, y: y, a: 0, speed: 0, parked: false, dead: false, police: true,
      model: { name: "PPD Interceptor", color: "#20242c", w: 48, h: 22 },
      hp: 100, ai: true, cruise: 310, ramCd: 0, deployT: 4
    };
  }
  function makePed(x, y, taxi) {
    return { x: x, y: y, a: rand(0, Math.PI * 2), taxi: !!taxi, speed: taxi ? 0 : rand(28, 55), hp: 30, dead: false, walkT: rand(0, 3), hue: pick(["#e8b04b", "#4b7de8", "#c94f9b", "#7bc94f", "#e8e4da", "#8a5fc9"]) };
  }
  function makeCop(x, y) {
    return { x: x, y: y, a: 0, speed: 150, hp: 60, shootT: rand(1, 2.5), punchT: 0 };
  }

  function spawnWorld() {
    G.cars = [];
    // Parked cars first: the first one is the cdp-play car on the motel road.
    G.cars.push(makeCar(220, 420, 0, CAR_MODELS[0], true));
    G.cars.push(makeCar(2100, 1760, Math.PI / 2, GT_MODEL, true));
    G.cars.push(makeCar(480, 420, 0, CAR_MODELS[1], true));
    G.cars.push(makeCar(1590, 470, Math.PI / 2, CAR_MODELS[2], true));
    G.cars.push(makeCar(1070, 470, Math.PI / 2, CAR_MODELS[3], true));
    G.cars.push(makeCar(1330, 1150, Math.PI, CAR_MODELS[0], true));
    G.cars.push(makeCar(290, 1930, Math.PI / 2, CAR_MODELS[4], true));
    G.cars.push(makeCar(2110, 730, 0, CAR_MODELS[1], true));
    // Traffic on the roads.
    var i, rx, ry, horiz;
    for (i = 0; i < 18; i++) {
      horiz = Math.random() < 0.5;
      if (horiz) { rx = rand(200, 2200); ry = pick(ROAD_YS) + (Math.random() < 0.5 ? -18 : 18); }
      else { rx = pick(ROAD_XS) + (Math.random() < 0.5 ? -18 : 18); ry = rand(200, 2200); }
      var c = makeCar(rx, ry, horiz ? (ry % 36 < 18 ? 0 : Math.PI) : (rx % 36 < 18 ? Math.PI / 2 : -Math.PI / 2), pick(CAR_MODELS), false);
      c.speed = c.cruise;
      G.cars.push(c);
    }
    // Pedestrians: wanderers plus three waiting fare peds.
    G.peds = [];
    for (i = 0; i < 23; i++) {
      var px = pick(ROAD_XS) + rand(-30, 30), py = pick(ROAD_YS) + rand(-30, 30);
      G.peds.push(makePed(clamp(px, 80, 2320), clamp(py, 80, 2320), false));
    }
    G.peds.push(makePed(420, 940, true));
    G.peds.push(makePed(1720, 680, true));
    G.peds.push(makePed(940, 1460, true));
    // Hidden packages: ten, all on roads.
    var spots = [[300, 1460], [420, 680], [940, 1980], [1460, 420], [1980, 940], [680, 1720], [1720, 1460], [2240, 680], [1200, 2240], [160, 1720]];
    packages = spots.map(function (s) { return { x: s[0], y: s[1], got: false }; });
    G.cops = []; G.copCars = [];
    bullets = []; parts = []; floaters = [];
    wantedT = 0; policeT = 0; holdT = 0; holdSpawnT = 0;
    punchCd = 0; shootCd = 0; fireHeld = false;
  }

  buildCity();
  G = freshState();

  // ---------- DOM helpers (guarded: the page may not have every id) ----------
  function el(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }
  function show(id, on) {
    var n = el(id);
    if (!n || !n.classList) return;
    if (on) n.classList.remove("hidden"); else n.classList.add("hidden");
  }
  function setText(id, txt) {
    var n = el(id);
    if (n) n.textContent = txt;
  }

  // ---------- audio (fully guarded: runs fine with no AudioContext) ----------
  function audioInit() {
    if (audioCtx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  function tone(freq, dur, type, vol, slide) {
    if (!audioCtx || !musicOn && type === "music") return;
    try {
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), audioCtx.currentTime + dur);
      g.gain.value = vol || 0.08;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  function noiseBurst(dur, vol) {
    if (!audioCtx) return;
    try {
      var len = Math.floor(audioCtx.sampleRate * dur);
      var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var d = buf.getChannelData(0), i;
      for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = audioCtx.createBufferSource(); src.buffer = buf;
      var g = audioCtx.createGain(); g.gain.value = vol || 0.2;
      src.connect(g); g.connect(audioCtx.destination); src.start();
    } catch (e) {}
  }
  function sfx(name) {
    if (!audioCtx) return;
    if (name === "shot") noiseBurst(0.12, 0.25);
    else if (name === "punch") tone(140, 0.1, "sine", 0.2, 60);
    else if (name === "pickup") { tone(660, 0.1, "sine", 0.1); setTimeout(function () { tone(880, 0.14, "sine", 0.1); }, 90); }
    else if (name === "cash") { tone(990, 0.08, "sine", 0.1); setTimeout(function () { tone(1320, 0.12, "sine", 0.1); }, 80); }
    else if (name === "mission") { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, "triangle", 0.12); }, i * 110); }); }
    else if (name === "siren") tone(700, 0.3, "sawtooth", 0.03, 950);
    else if (name === "enter") tone(220, 0.12, "triangle", 0.1, 330);
    else if (name === "boom") noiseBurst(0.5, 0.35);
  }
  function musicTick() {
    if (!audioCtx || !musicOn || G.mode !== "play") return;
    var bass = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
    var lead = [220, 0, 261.6, 0, 329.6, 0, 293.7, 246.9];
    var b = bass[musicStep % 8], l = lead[musicStep % 8];
    try {
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "triangle"; o.frequency.value = b;
      g.gain.value = 0.05; g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.24);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.24);
      if (l) {
        var o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
        o2.type = "sine"; o2.frequency.value = l;
        g2.gain.value = 0.03; g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        o2.connect(g2); g2.connect(audioCtx.destination); o2.start(); o2.stop(audioCtx.currentTime + 0.22);
      }
    } catch (e) {}
    musicStep++;
  }

  // ---------- collisions ----------
  function hitBuilding(x, y, r) {
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  function moveWithCollision(ent, nx, ny, r) {
    var b;
    if (!hitBuilding(nx, ent.y, r)) ent.x = nx;
    if (!hitBuilding(ent.x, ny, r)) ent.y = ny;
    b = hitBuilding(ent.x, ent.y, r);
    if (b) { // pushed out along the smallest overlap
      var dxl = ent.x + r - b.x, dxr = b.x + b.w - (ent.x - r);
      var dyt = ent.y + r - b.y, dyb = b.y + b.h - (ent.y - r);
      var m = Math.min(dxl, dxr, dyt, dyb);
      if (m === dxl) ent.x = b.x - r; else if (m === dxr) ent.x = b.x + b.w + r;
      else if (m === dyt) ent.y = b.y - r; else ent.y = b.y + b.h + r;
    }
    ent.x = clamp(ent.x, 30, WORLD_W - 30);
    ent.y = clamp(ent.y, 30, WORLD_H - 30);
  }

  // ---------- police ----------
  function addHeat(n) {
    if (G.mode !== "play") return;
    G.wanted = clamp(G.wanted + n, 0, 5);
    if (G.wanted > 0) {
      spawnCopCar(); spawnCop();
      sfx("siren");
    }
  }
  function spawnNearPlayer(minD, maxD) {
    var a = rand(0, Math.PI * 2), d = rand(minD, maxD);
    return { x: clamp(G.player.x + Math.cos(a) * d, 90, WORLD_W - 90), y: clamp(G.player.y + Math.sin(a) * d, 90, WORLD_H - 90) };
  }
  function spawnCopCar() {
    if (G.copCars.length >= 6) return;
    var p = spawnNearPlayer(320, 480);
    var c = makeCopCar(p.x, p.y);
    G.copCars.push(c);
  }
  function spawnCop() {
    if (G.cops.length >= 8) return;
    var p = spawnNearPlayer(200, 380);
    G.cops.push(makeCop(p.x, p.y));
  }

  // ---------- combat ----------
  function fireBullet() {
    if (G.weapon !== 2 || G.ammo <= 0 || G.mode !== "play") return;
    G.ammo--;
    var p = G.player;
    var sx = p.onFoot ? p.x : p.car.x, sy = p.onFoot ? p.y : p.car.y;
    var a = Math.atan2(mouse.y - 360, mouse.x - 640); // screen-aim fallback
    var wx = cam.x - 640 + mouse.x, wy = cam.y - 360 + mouse.y;
    a = Math.atan2(wy - sy, wx - sx);
    bullets.push({ x: sx + Math.cos(a) * 26, y: sy + Math.sin(a) * 26, a: a, speed: 900, life: 1.1, dmg: 20 });
    p.a = a;
    sfx("shot");
    parts.push({ x: sx + Math.cos(a) * 30, y: sy + Math.sin(a) * 30, vx: 0, vy: 0, life: 0.08, max: 0.08, color: "#ffd166", r: 7 });
  }
  function doPunch() {
    if (G.mode !== "play" || punchCd > 0) return;
    punchCd = 0.45;
    var p = G.player, hit = null, best = 60;
    var i, d;
    for (i = 0; i < G.cops.length; i++) { d = dist(p.x, p.y, G.cops[i].x, G.cops[i].y); if (d < best) { best = d; hit = G.cops[i]; } }
    for (i = 0; i < G.peds.length; i++) { if (G.peds[i].dead) continue; d = dist(p.x, p.y, G.peds[i].x, G.peds[i].y); if (d < best) { best = d; hit = G.peds[i]; } }
    sfx("punch");
    if (hit) {
      hit.hp -= 10;
      hit.x += Math.cos(p.a) * 14; hit.y += Math.sin(p.a) * 14;
      if (hit.hp <= 0) killPedOrCop(hit);
    }
  }
  function killPedOrCop(v) {
    if (v.hp > 0) return;
    if (G.cops.indexOf(v) >= 0) {
      G.cops.splice(G.cops.indexOf(v), 1);
      addHeat(1);
    } else if (G.peds.indexOf(v) >= 0) {
      v.dead = true;
      addHeat(1);
    }
    burst(v.x, v.y, "#ff5d5d", 10);
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), s = rand(40, 180);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, color: color, r: rand(2, 5) });
    }
  }
  function damagePlayer(n) {
    if (G.mode !== "play") return;
    G.health -= n;
    if (G.health <= 0) {
      G.health = 0;
      G.mode = "wasted";
      show("wasted", true); show("hud", false);
      if (respawnTimer) clearTimeout(respawnTimer);
      respawnTimer = setTimeout(respawn, 3000);
    }
  }
  function respawn() {
    var p = G.player;
    p.x = HOSPITAL.x; p.y = HOSPITAL.y; p.onFoot = true; p.car = null; p.a = 0;
    G.health = 100; G.wanted = 0; G.cops = []; G.copCars = [];
    G.mode = "play";
    show("wasted", false); show("hud", true);
    setMsg("Patched up at Palmetto General. Back to work, Reef.");
    syncHud();
  }

  // ---------- car enter / exit ----------
  function nearestCar(maxD) {
    var best = null, bd = maxD, i, d;
    for (i = 0; i < G.cars.length; i++) {
      var c = G.cars[i];
      if (c.dead || c.police) continue;
      d = dist(G.player.x, G.player.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function enterCar(c) {
    var p = G.player;
    p.onFoot = false; p.car = c;
    if (c.parked && !c.stolen) { c.stolen = true; G.carsStolen++; }
    c.parked = false; c.ai = false; c.speed = 0;
    sfx("enter");
    if (G.missionIdx === 2 && G.missionStep === 0 && c.model.name === "Palmetto GT" && dist(p.x, p.y, PLACES.stadium.x, PLACES.stadium.y) < 220) {
      G.missionStep = 1;
      setMsg("The GT is yours. Get it to Reef's Garage — quiet, no heat.");
    }
  }
  function exitCar() {
    var p = G.player;
    if (!p.car) return;
    var c = p.car;
    p.x = c.x + Math.cos(c.a + Math.PI / 2) * 34;
    p.y = c.y + Math.sin(c.a + Math.PI / 2) * 34;
    p.onFoot = true; p.car = null;
    c.parked = true; c.speed = 0;
  }
  function pressE() {
    if (G.mode !== "play") return;
    var p = G.player;
    if (!p.onFoot) { exitCar(); return; }
    var c = nearestCar(70);
    if (c) { enterCar(c); return; }
    if (dist(p.x, p.y, PLACES.gunshop.x, PLACES.gunshop.y) < 60) {
      if (G.cash >= 50) {
        G.cash -= 50; G.ammo += 24;
        setMsg("Ammo Barn: +24 pistol rounds for $50.");
        sfx("cash");
      } else setMsg("Ammo Barn: you need $50 for a box of rounds.");
    }
  }
  function pressT() {
    if (G.mode !== "play" || G.player.onFoot || G.taxi) return;
    var p = G.player, i, f = null, bd = 70, d;
    for (i = 0; i < G.peds.length; i++) {
      if (!G.peds[i].taxi || G.peds[i].dead) continue;
      d = dist(p.x, p.y, G.peds[i].x, G.peds[i].y);
      if (d < bd) { bd = d; f = G.peds[i]; }
    }
    if (!f) return;
    f.taxi = false;
    var dest = pick(TAXI_DESTS);
    G.taxi = { fare: 40 + Math.floor(Math.random() * 51), dx: dest.x, dy: dest.y, label: dest.label };
    setMsg("Fare picked up — take them to " + dest.label + " ($" + G.taxi.fare + ").");
    sfx("pickup");
  }

  // ---------- save / load ----------
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: G.cash, missionIdx: G.missionIdx, missionStep: G.missionStep,
        health: G.health, ammo: G.ammo, carsStolen: G.carsStolen,
        packagesGot: G.packagesGot, x: G.player.x, y: G.player.y,
        wanted: G.wanted, timeMin: timeMin
      }));
    } catch (e) {}
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s.cash !== "number" || typeof s.missionIdx !== "number") return null;
      return s;
    } catch (e) { return null; }
  }
  function applySave(s) {
    G.cash = s.cash; G.missionIdx = s.missionIdx; G.missionStep = s.missionStep || 0;
    G.health = s.health != null ? s.health : 100;
    G.ammo = s.ammo != null ? s.ammo : 24;
    G.carsStolen = s.carsStolen || 0; G.packagesGot = s.packagesGot || 0;
    G.wanted = 0;
    G.player.x = s.x != null ? s.x : 160; G.player.y = s.y != null ? s.y : 420;
    if (s.timeMin != null) timeMin = s.timeMin;
  }

  // ---------- game start ----------
  function startGame(fromSave) {
    var saved = fromSave ? loadSave() : null;
    if (respawnTimer) { clearTimeout(respawnTimer); respawnTimer = null; }
    audioInit();
    if (audioCtx && audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
    // Reset the SAME state object (never reassign G): window.__PALMETTO.G
    // must keep pointing at the live state after every start.
    var ns = freshState();
    for (var k in ns) G[k] = ns[k];
    spawnWorld();
    timeMin = 480;
    G.mode = "play";
    if (saved) {
      applySave(saved);
      setMsg("Welcome back, Reef. " + (MISSIONS[G.missionIdx] ? MISSIONS[G.missionIdx].text : "Palmetto City is yours."));
    } else {
      setMsg(MISSIONS[0].text);
    }
    show("menu", false); show("pause", false); show("wasted", false); show("hud", true);
    syncHud();
    if (!musicTimer) musicTimer = setInterval(musicTick, 250);
  }
  function togglePause() {
    if (G.mode === "play") { G.mode = "paused"; show("pause", true); }
    else if (G.mode === "paused") { G.mode = "play"; show("pause", false); }
  }
  function setMsg(t) { msgText = t; setText("msg", t); }

  // ---------- input ----------
  function keyDown(k) { return !!keys[k]; }
  function anyKey(list) { for (var i = 0; i < list.length; i++) if (keys[list[i]]) return true; return false; }
  function onKey(e, down) {
    var k = (e.key || "").toLowerCase();
    keys[k] = down;
    if (down && (k === " " || k.indexOf("arrow") === 0)) { if (e.preventDefault) e.preventDefault(); }
    if (!down) return;
    if (k === "e") pressE();
    else if (k === "t") pressT();
    else if (k === "1") { G.weapon = 1; syncHud(); }
    else if (k === "2") { G.weapon = 2; syncHud(); }
    else if (k === " ") doPunch();
    else if (k === "m") { musicOn = !musicOn; setMsg(musicOn ? "Music on." : "Music off."); }
    else if (k === "p" || k === "escape") togglePause();
  }
  function onMouseMove(e) {
    var c = el("game");
    if (!c || !c.getBoundingClientRect) return;
    var r = c.getBoundingClientRect();
    var sx = (e.clientX - r.left) * (c.width / (r.width || 1280));
    var sy = (e.clientY - r.top) * (c.height / (r.height || 720));
    mouse.x = sx; mouse.y = sy;
  }
  function onMouseDown(e) {
    if (G.mode !== "play") return;
    fireHeld = true;
    fireBullet();
  }
  function onMouseUp() { fireHeld = false; }
  try {
    window.addEventListener("keydown", function (e) { onKey(e, true); });
    window.addEventListener("keyup", function (e) { onKey(e, false); });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
  } catch (e) {}

  // ---------- missions ----------
  function nearPt(x, y, r) { return dist(G.player.x, G.player.y, x, y) < r; }
  function completeMission(i) {
    G.cash += PAYOUTS[i];
    G.missionIdx = i + 1;
    G.missionStep = 0;
    holdT = 0;
    sfx("mission");
    if (G.missionIdx >= 6) setMsg("ALL MISSIONS COMPLETE — Palmetto City is yours, Reef. $5,000+ in the pocket.");
    else setMsg(MISSIONS[G.missionIdx].text);
    syncHud();
  }
  function updateMission(dt) {
    var idx = G.missionIdx, p = G.player;
    if (idx >= 6) return;
    if (idx === 0) {
      if (G.missionStep === 0 && p.onFoot && nearPt(PLACES.motel.x, PLACES.motel.y, 60)) {
        G.missionStep = 1;
        setMsg("Lena: good, you're here. Steal a parked car — any one. Make it quick.");
      } else if (G.missionStep === 1 && G.carsStolen >= 1) {
        G.missionStep = 2;
        setMsg("Nice wheels. Now drive it to Reef's Garage.");
      } else if (G.missionStep === 2 && !p.onFoot && nearPt(PLACES.garage.x, PLACES.garage.y, 60)) completeMission(0);
    } else if (idx === 1) {
      if (G.missionStep === 0 && p.onFoot && nearPt(PLACES.docks.x, PLACES.docks.y, 60)) {
        G.missionStep = 1;
        setMsg("Dockside done. Now drive to Lucky Pawn.");
      } else if (G.missionStep === 1 && !p.onFoot && nearPt(PLACES.pawn.x, PLACES.pawn.y, 60)) completeMission(1);
    } else if (idx === 2) {
      if (G.missionStep === 1 && !p.onFoot && nearPt(PLACES.garage.x, PLACES.garage.y, 60)) completeMission(2);
    } else if (idx === 3) {
      if (G.missionStep === 0 && G.wanted === 0 && p.onFoot && nearPt(PLACES.safehouse.x, PLACES.safehouse.y, 60)) completeMission(3);
    } else if (idx === 4) {
      if (G.missionStep === 0 && p.onFoot && nearPt(PLACES.park.x, PLACES.park.y, 60)) {
        G.missionStep = 1;
        setMsg("Park's clear. Now drive to Palmetto Mall.");
      } else if (G.missionStep === 1 && !p.onFoot && nearPt(PLACES.mall.x, PLACES.mall.y, 60)) completeMission(4);
    } else if (idx === 5) {
      if (G.missionStep === 0 && p.onFoot && nearPt(PLACES.bank.x, PLACES.bank.y, 60)) {
        G.missionStep = 1; holdT = 0; holdSpawnT = 0;
        setMsg("Hold the lobby... 8 seconds. The PD is coming.");
      } else if (G.missionStep === 1) {
        if (nearPt(PLACES.bank.x, PLACES.bank.y, 80)) {
          holdT += dt;
          holdSpawnT -= dt;
          if (holdSpawnT <= 0) {
            holdSpawnT = 2;
            if (G.cops.length < 3) spawnCop();
            G.wanted = Math.min(3, Math.max(G.wanted, 2));
          }
          if (holdT >= 8) {
            G.missionStep = 2;
            setMsg("Got it! Now escape by car to the safehouse!");
            sfx("mission");
          }
        } else if (dist(G.player.x, G.player.y, PLACES.bank.x, PLACES.bank.y) > 150) holdT = 0;
      } else if (G.missionStep === 2 && !p.onFoot && nearPt(PLACES.safehouse.x, PLACES.safehouse.y, 60)) completeMission(5);
    }
  }

  // ---------- traffic helpers ----------
  function nearestLine(v, lines) {
    var best = lines[0], bd = Math.abs(v - lines[0]), i;
    for (i = 1; i < lines.length; i++) { var d = Math.abs(v - lines[i]); if (d < bd) { bd = d; best = lines[i]; } }
    return best;
  }
  function onRoad(x, y) {
    var i;
    for (i = 0; i < ROAD_XS.length; i++) if (Math.abs(x - ROAD_XS[i]) < 62) return true;
    for (i = 0; i < ROAD_YS.length; i++) if (Math.abs(y - ROAD_YS[i]) < 62) return true;
    return false;
  }

  // ---------- main update ----------
  function update(dt) {
    if (!G || G.mode !== "play") return;
    if (!(dt > 0)) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    var p = G.player, i, j;
    timeMin = (timeMin + dt * 6) % 1440;
    if (punchCd > 0) punchCd -= dt;
    if (shootCd > 0) shootCd -= dt;
    if (fireHeld && G.weapon === 2 && shootCd <= 0) fireBullet();

    // --- player on foot ---
    if (p.onFoot) {
      var mx = 0, my = 0;
      if (anyKey(["a", "arrowleft"])) mx -= 1;
      if (anyKey(["d", "arrowright"])) mx += 1;
      if (anyKey(["w", "arrowup"])) my -= 1;
      if (anyKey(["s", "arrowdown"])) my += 1;
      if (mx || my) {
        var len = Math.sqrt(mx * mx + my * my); mx /= len; my /= len;
        var sp = keys["shift"] ? RUN_SPEED : WALK_SPEED;
        moveWithCollision(p, p.x + mx * sp * dt, p.y + my * sp * dt, 14);
        p.a = Math.atan2(my, mx);
      }
    } else if (p.car) {
      // --- driving ---
      var c = p.car;
      if (anyKey(["w", "arrowup"])) c.speed += CAR_ACCEL * dt;
      else if (anyKey(["s", "arrowdown"])) {
        if (c.speed > 5) c.speed -= CAR_BRAKE * dt; else c.speed -= CAR_ACCEL * 0.5 * dt;
      } else c.speed -= c.speed * 0.5 * dt;
      c.speed = clamp(c.speed, -70, CAR_TOP);
      var steer = 0;
      if (anyKey(["a", "arrowleft"])) steer -= 1;
      if (anyKey(["d", "arrowright"])) steer += 1;
      var sf = clamp(c.speed / 120, -1, 1);
      c.a += steer * 1.9 * sf * dt;
      moveWithCollision(c, c.x + Math.cos(c.a) * c.speed * dt, c.y + Math.sin(c.a) * c.speed * dt, 24);
      p.x = c.x; p.y = c.y; p.a = c.a;
      if (c.hp <= 0 && !c.dead) { c.dead = true; burst(c.x, c.y, "#ff5d5d", 24); sfx("boom"); exitCar(); }
    }

    // --- camera follows the player ---
    cam.x = clamp(p.x, 640, WORLD_W - 640);
    cam.y = clamp(p.y, 360, WORLD_H - 360);

    // --- traffic ---
    for (i = 0; i < G.cars.length; i++) {
      var tc = G.cars[i];
      if (!tc.ai || tc.parked || tc.dead) continue;
      tc.turnT -= dt;
      if (tc.turnT <= 0) {
        var nxr = nearestLine(tc.x, ROAD_XS), nyr = nearestLine(tc.y, ROAD_YS);
        if (Math.abs(tc.x - nxr) < 42 && Math.abs(tc.y - nyr) < 42) {
          if (Math.random() < 0.4) tc.a += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
          tc.turnT = rand(2, 5);
        } else tc.turnT = 0.5;
      }
      var tx2 = tc.x + Math.cos(tc.a) * tc.speed * dt;
      var ty2 = tc.y + Math.sin(tc.a) * tc.speed * dt;
      if (!onRoad(tx2, ty2) || tx2 < 80 || tx2 > WORLD_W - 80 || ty2 < 80 || ty2 > WORLD_H - 80) {
        tc.a += Math.PI; tc.turnT = 2;
      } else { tc.x = tx2; tc.y = ty2; }
    }

    // --- pedestrians ---
    for (i = 0; i < G.peds.length; i++) {
      var pd = G.peds[i];
      if (pd.dead || pd.taxi) continue;
      pd.walkT -= dt;
      if (pd.walkT <= 0) { pd.a = rand(0, Math.PI * 2); pd.walkT = rand(2, 5); }
      var px2 = pd.x + Math.cos(pd.a) * pd.speed * dt;
      var py2 = pd.y + Math.sin(pd.a) * pd.speed * dt;
      if (hitBuilding(px2, py2, 10)) pd.a += Math.PI;
      else { pd.x = px2; pd.y = py2; }
      pd.x = clamp(pd.x, 60, WORLD_W - 60); pd.y = clamp(pd.y, 60, WORLD_H - 60);
    }

    // --- wanted decay and police spawner ---
    if (G.wanted > 0) {
      var nearestCop = 1e9, d;
      for (i = 0; i < G.cops.length; i++) { d = dist(p.x, p.y, G.cops[i].x, G.cops[i].y); if (d < nearestCop) nearestCop = d; }
      for (i = 0; i < G.copCars.length; i++) { d = dist(p.x, p.y, G.copCars[i].x, G.copCars[i].y); if (d < nearestCop) nearestCop = d; }
      if (nearestCop > 250) {
        wantedT += dt;
        if (wantedT > 25) { wantedT = 0; G.wanted--; if (G.wanted <= 0) { G.wanted = 0; G.cops = []; G.copCars = []; } }
      } else wantedT = 0;
      policeT -= dt;
      if (policeT <= 0) {
        policeT = 0.5;
        if (G.copCars.length < G.wanted) spawnCopCar();
        if (G.cops.length < G.wanted + 1) spawnCop();
      }
    }

    // --- cop cars chase ---
    for (i = G.copCars.length - 1; i >= 0; i--) {
      var cc = G.copCars[i];
      if (cc.dead) { G.copCars.splice(i, 1); continue; }
      cc.ramCd -= dt; cc.deployT -= dt;
      var want = Math.atan2(p.y - cc.y, p.x - cc.x);
      var diff = want - cc.a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cc.a += clamp(diff, -2.4 * dt, 2.4 * dt);
      cc.speed = Math.min(cc.cruise, cc.speed + 260 * dt);
      var dc = dist(cc.x, cc.y, p.x, p.y);
      if (!p.onFoot && dc < 55) {
        if (cc.ramCd <= 0) {
          cc.ramCd = 1;
          if (p.car) {
            p.car.hp -= 6;
            burst(p.car.x, p.car.y, "#ffd166", 6);
            if (p.car.hp <= 0) { p.car.dead = true; burst(p.car.x, p.car.y, "#ff5d5d", 24); sfx("boom"); exitCar(); addHeat(1); }
          }
        }
        cc.speed *= 0.6;
      } else if (p.onFoot && dc < 110) {
        cc.speed = Math.max(0, cc.speed - 300 * dt);
        if (cc.deployT <= 0) {
          cc.deployT = 4;
          if (G.cops.length < 2) G.cops.push(makeCop(cc.x + 24, cc.y));
        }
      }
      var ox = cc.x, oy = cc.y;
      moveWithCollision(cc, cc.x + Math.cos(cc.a) * cc.speed * dt, cc.y + Math.sin(cc.a) * cc.speed * dt, 24);
      if (Math.abs(cc.x - ox) + Math.abs(cc.y - oy) < 0.5 && cc.speed > 40) cc.a += Math.PI / 2;
    }

    // --- foot cops chase and punch ---
    for (i = G.cops.length - 1; i >= 0; i--) {
      var cp = G.cops[i];
      if (cp.hp <= 0) { G.cops.splice(i, 1); continue; }
      var dc2 = dist(cp.x, cp.y, p.x, p.y);
      cp.a = Math.atan2(p.y - cp.y, p.x - cp.x);
      if (dc2 > 40) {
        moveWithCollision(cp, cp.x + Math.cos(cp.a) * cp.speed * dt, cp.y + Math.sin(cp.a) * cp.speed * dt, 12);
      } else {
        cp.punchT -= dt;
        if (cp.punchT <= 0) {
          cp.punchT = 0.7;
          damagePlayer(1.5);
          burst(p.x, p.y, "#ff5d5d", 4);
        }
      }
      if (dc2 >= 40 && dc2 < 320 && G.wanted >= 4) {
        cp.shootT -= dt;
        if (cp.shootT <= 0) {
          cp.shootT = 2.5;
          damagePlayer(2);
          parts.push({ x: cp.x, y: cp.y, vx: 0, vy: 0, life: 0.1, max: 0.1, color: "#ffd166", r: 3 });
        }
      } else cp.shootT -= dt;
      if (G.mode !== "play") return; // died mid-update
    }

    // --- bullets ---
    for (i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += Math.cos(b.a) * b.speed * dt;
      b.y += Math.sin(b.a) * b.speed * dt;
      b.life -= dt;
      var gone = b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
      if (!gone) {
        for (j = 0; j < G.cops.length && !gone; j++) {
          if (dist(b.x, b.y, G.cops[j].x, G.cops[j].y) < 18) {
            G.cops[j].hp -= b.dmg; gone = true;
            if (G.cops[j].hp <= 0) killPedOrCop(G.cops[j]);
          }
        }
        for (j = 0; j < G.copCars.length && !gone; j++) {
          if (dist(b.x, b.y, G.copCars[j].x, G.copCars[j].y) < 26) {
            G.copCars[j].hp -= b.dmg; gone = true;
            if (G.copCars[j].hp <= 0) { G.copCars[j].dead = true; burst(G.copCars[j].x, G.copCars[j].y, "#ff5d5d", 24); sfx("boom"); addHeat(1); }
          }
        }
        for (j = 0; j < G.peds.length && !gone; j++) {
          var pd2 = G.peds[j];
          if (!pd2.dead && dist(b.x, b.y, pd2.x, pd2.y) < 14) {
            pd2.hp -= b.dmg; gone = true;
            if (pd2.hp <= 0) killPedOrCop(pd2);
          }
        }
        for (j = 0; j < G.cars.length && !gone; j++) {
          var car2 = G.cars[j];
          if (!car2.dead && !car2.police && dist(b.x, b.y, car2.x, car2.y) < 26) {
            car2.hp -= b.dmg; gone = true;
            if (car2.hp <= 0) { car2.dead = true; burst(car2.x, car2.y, "#ff5d5d", 20); sfx("boom"); }
          }
        }
      }
      if (gone) bullets.splice(i, 1);
    }

    // --- particles and floaters ---
    for (i = parts.length - 1; i >= 0; i--) {
      var pt = parts[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) parts.splice(i, 1);
    }
    for (i = floaters.length - 1; i >= 0; i--) {
      floaters[i].y -= 26 * dt; floaters[i].life -= dt;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }

    // --- packages (on foot only) ---
    if (p.onFoot) {
      for (i = 0; i < packages.length; i++) {
        var pk = packages[i];
        if (!pk.got && dist(p.x, p.y, pk.x, pk.y) < 40) {
          pk.got = true; G.packagesGot++; G.cash += 100;
          floaters.push({ x: pk.x, y: pk.y - 10, text: "+$100 PACKAGE", life: 1.6, color: "#7dff9b" });
          sfx("pickup");
        }
      }
    }

    // --- taxi delivery ---
    if (G.taxi && dist(p.x, p.y, G.taxi.dx, G.taxi.dy) < 60) {
      var fare = G.taxi.fare;
      G.cash += fare;
      floaters.push({ x: p.x, y: p.y - 30, text: "+$" + fare + " FARE", life: 1.6, color: "#7dff9b" });
      G.taxi = null;
      sfx("cash");
    }

    // --- Pay 'n Spray ---
    if (!p.onFoot && G.wanted > 0 && p.car && dist(p.car.x, p.car.y, PLACES.spray.x, PLACES.spray.y) < 70) {
      G.wanted = 0; G.cash -= 100; G.cops = []; G.copCars = [];
      setMsg("Pay 'n Spray: fresh paint, clean slate. -$100.");
      sfx("cash");
    }

    if (G.mode === "play") updateMission(dt);
    if (G.mode === "play") syncHud();
  }

  // ---------- HUD ----------
  function syncHud() {
    if (!G) return;
    var hf = el("health-fill");
    if (hf) hf.style.width = Math.max(0, Math.round(G.health)) + "%";
    setText("cash", String(G.cash));
    var stars = "";
    for (var i = 0; i < 5; i++) stars += i < G.wanted ? "\u2605" : "\u2606";
    setText("stars", stars);
    setText("weapon", G.weapon === 2 ? "PISTOL \u00b7 " + G.ammo + " RDS" : "FISTS");
    var hh = Math.floor(timeMin / 60), mm = Math.floor(timeMin % 60);
    setText("clock", (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm);
    setText("speed", (!G.player.onFoot && G.player.car) ? Math.round(Math.abs(G.player.car.speed) * 0.6) + " MPH" : "");
    setText("mission-title", G.missionIdx < 6 ? MISSIONS[G.missionIdx].title : "PALMETTO HEAT — COMPLETE");
    setText("msg", msgText);
  }

  // ---------- render ----------
  function missionTarget() {
    var idx = G.missionIdx, st = G.missionStep;
    if (idx === 0) return st === 0 ? PLACES.motel : (st === 1 ? null : PLACES.garage);
    if (idx === 1) return st === 0 ? PLACES.docks : PLACES.pawn;
    if (idx === 2) return st === 0 ? PLACES.stadium : PLACES.garage;
    if (idx === 3) return PLACES.safehouse;
    if (idx === 4) return st === 0 ? PLACES.park : PLACES.mall;
    if (idx === 5) return st === 2 ? PLACES.safehouse : PLACES.bank;
    return null;
  }
  function render() {
    var canvas = el("game");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var W = canvas.width || 1280, H = canvas.height || 720;
    var vx = cam.x - W / 2, vy = cam.y - H / 2;
    var i, j;
    // Ground: sun-soaked grass, beach and bay at the south edge.
    ctx.fillStyle = "#5d8a46"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e0c98f"; ctx.fillRect(0, 2240 - vy, W, 90);
    ctx.fillStyle = "#2f6f8f"; ctx.fillRect(0, 2330 - vy, W, 70);
    // City blocks.
    for (i = 0; i < ROAD_XS.length - 1; i++) {
      for (j = 0; j < ROAD_YS.length - 1; j++) {
        var bx = ROAD_XS[i] + ROAD_HALF, by = ROAD_YS[j] + ROAD_HALF;
        var bw = ROAD_XS[i + 1] - ROAD_XS[i] - 2 * ROAD_HALF;
        var bh = ROAD_YS[j + 1] - ROAD_YS[j] - 2 * ROAD_HALF;
        ctx.fillStyle = ((i + j) % 2 === 0) ? "#7d7468" : "#766d61";
        ctx.fillRect(bx - vx, by - vy, bw, bh);
      }
    }
    // Park stays green with trees.
    ctx.fillStyle = "#4c8a3f";
    ctx.fillRect(985 - vx, 725 - vy, 170, 170);
    ctx.fillStyle = "#2f6b2a";
    var treeSpots = [[1010, 750], [1080, 740], [1130, 800], [1020, 860], [1100, 870], [1060, 790]];
    for (i = 0; i < treeSpots.length; i++) { ctx.beginPath(); ctx.arc(treeSpots[i][0] - vx, treeSpots[i][1] - vy, 14, 0, Math.PI * 2); ctx.fill(); }
    // Roads.
    ctx.fillStyle = "#33363b";
    for (i = 0; i < ROAD_XS.length; i++) ctx.fillRect(ROAD_XS[i] - ROAD_HALF - vx, 0 - vy, ROAD_HALF * 2, WORLD_H);
    for (i = 0; i < ROAD_YS.length; i++) ctx.fillRect(0 - vx, ROAD_YS[i] - ROAD_HALF - vy, WORLD_W, ROAD_HALF * 2);
    // Lane dashes.
    ctx.fillStyle = "#d8c25a";
    for (i = 0; i < ROAD_XS.length; i++) {
      for (var y = 0; y < WORLD_H; y += 90) ctx.fillRect(ROAD_XS[i] - 2 - vx, y - vy, 4, 44);
    }
    for (i = 0; i < ROAD_YS.length; i++) {
      for (var x = 0; x < WORLD_W; x += 90) ctx.fillRect(x - vx, ROAD_YS[i] - 2 - vy, 44, 4);
    }
    // Buildings.
    for (i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - vx, b.y - vy, b.w, b.h);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(b.x - vx, b.y - vy, b.w, 8);
      ctx.fillRect(b.x - vx, b.y - vy, 8, b.h);
      if (b.label) {
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.w / 2 - vx, b.y + b.h / 2 - vy + 5);
      }
    }
    // Place markers.
    ctx.textAlign = "center";
    var placeKeys = Object.keys(PLACES);
    for (i = 0; i < placeKeys.length; i++) {
      var pl = PLACES[placeKeys[i]];
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath(); ctx.arc(pl.x - vx, pl.y - vy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1206"; ctx.font = "bold 11px sans-serif";
      ctx.fillText("\u2605", pl.x - vx, pl.y - vy + 4);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "12px sans-serif";
      ctx.fillText(pl.label, pl.x - vx, pl.y + 24 - vy);
    }
    // Hidden packages.
    for (i = 0; i < packages.length; i++) {
      var pk = packages[i];
      if (pk.got) continue;
      var pulse = 8 + 3 * Math.sin(timeMin * 2 + i);
      ctx.fillStyle = "#7dff9b";
      ctx.save(); ctx.translate(pk.x - vx, pk.y - vy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      ctx.restore();
    }
    // Pedestrians.
    for (i = 0; i < G.peds.length; i++) {
      var pd = G.peds[i];
      if (pd.dead) continue;
      ctx.fillStyle = pd.taxi ? "#ffd166" : pd.hue;
      ctx.beginPath(); ctx.arc(pd.x - vx, pd.y - vy, pd.taxi ? 9 : 7, 0, Math.PI * 2); ctx.fill();
      if (pd.taxi) {
        ctx.fillStyle = "#1a1206"; ctx.font = "bold 10px sans-serif";
        ctx.fillText("$", pd.x - vx, pd.y - vy + 3);
      }
    }
    // Traffic and parked cars.
    for (i = 0; i < G.cars.length; i++) drawCar(ctx, G.cars[i], vx, vy, false);
    for (i = 0; i < G.copCars.length; i++) drawCar(ctx, G.copCars[i], vx, vy, true);
    // Foot cops.
    for (i = 0; i < G.cops.length; i++) {
      var cp = G.cops[i];
      ctx.fillStyle = "#2b4fd8";
      ctx.beginPath(); ctx.arc(cp.x - vx, cp.y - vy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cp.x - vx, cp.y - vy, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Bullets and particles.
    ctx.fillStyle = "#ffd166";
    for (i = 0; i < bullets.length; i++) { ctx.beginPath(); ctx.arc(bullets[i].x - vx, bullets[i].y - vy, 3, 0, Math.PI * 2); ctx.fill(); }
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i];
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.beginPath(); ctx.arc(pt.x - vx, pt.y - vy, pt.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Player.
    var p = G.player;
    if (p.onFoot) {
      ctx.fillStyle = "#ff5d5d";
      ctx.beginPath(); ctx.arc(p.x - vx, p.y - vy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(p.x + Math.cos(p.a) * 7 - vx, p.y + Math.sin(p.a) * 7 - vy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x - vx, p.y - vy, 15, 0, Math.PI * 2); ctx.stroke();
    } else if (p.car) {
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.car.x - vx, p.car.y - vy, 34, 0, Math.PI * 2); ctx.stroke();
    }
    // Mission beacon.
    var tgt = missionTarget();
    if (tgt) {
      var bob = 6 * Math.sin(timeMin * 3);
      ctx.fillStyle = "rgba(255, 209, 102, 0.25)";
      ctx.fillRect(tgt.x - 3 - vx, tgt.y - 160 - vy, 6, 160);
      ctx.fillStyle = "#ffd166";
      ctx.save(); ctx.translate(tgt.x - vx, tgt.y - 30 + bob - vy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();
      ctx.fillStyle = "#1a1206"; ctx.font = "bold 13px sans-serif";
      ctx.fillText("!", tgt.x - vx, tgt.y - 24 + bob - vy);
    }
    // Floaters.
    ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
    for (i = 0; i < floaters.length; i++) {
      ctx.fillStyle = floaters[i].color;
      ctx.fillText(floaters[i].text, floaters[i].x - vx, floaters[i].y - vy);
    }
    // Day / night tint.
    var hour = timeMin / 60;
    var night = (hour >= 20 || hour < 5) ? 0.34 : (hour >= 18 || hour < 7 ? 0.16 : 0);
    if (night > 0) { ctx.fillStyle = "rgba(8,14,44," + night + ")"; ctx.fillRect(0, 0, W, H); }
    else if (hour >= 17 && hour < 19) { ctx.fillStyle = "rgba(255,120,40,0.10)"; ctx.fillRect(0, 0, W, H); }
    // Minimap.
    drawMinimap(ctx, W, H, tgt);
    // Wasted / paused tint is DOM; nothing more on canvas.
    if (G.mode === "menu") {
      ctx.fillStyle = "rgba(5,8,12,0.25)"; ctx.fillRect(0, 0, W, H);
    }
  }
  function drawCar(ctx, c, vx, vy, police) {
    var x = c.x - vx, y = c.y - vy;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(c.a);
    ctx.fillStyle = c.dead ? "#222222" : c.model.color;
    ctx.fillRect(-c.model.w / 2, -c.model.h / 2, c.model.w, c.model.h);
    ctx.fillStyle = "rgba(180,220,255,0.85)";
    ctx.fillRect(-c.model.w / 2 + 8, -c.model.h / 2 + 4, 12, c.model.h - 8);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(c.model.w / 2 - 10, -c.model.h / 2 + 3, 6, c.model.h - 6);
    if (police) {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-6, -c.model.h / 2, 12, c.model.h);
      ctx.fillStyle = "#ff2d2d"; ctx.fillRect(-14, -c.model.h / 2 - 3, 10, 6);
      ctx.fillStyle = "#2b6bff"; ctx.fillRect(4, -c.model.h / 2 - 3, 10, 6);
    }
    if (c.dead) {
      ctx.fillStyle = "rgba(120,120,120,0.6)";
      ctx.beginPath(); ctx.arc(0, -c.model.h, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (!c.parked && !c.dead && !police) {
      // headlights
      ctx.fillStyle = "rgba(255,240,180,0.5)";
      ctx.beginPath(); ctx.arc(x + Math.cos(c.a) * (c.model.w / 2 + 6), y + Math.sin(c.a) * (c.model.w / 2 + 6), 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawMinimap(ctx, W, H, tgt) {
    var cx = W - 112, cy = 112, r = 88, sc = (r * 2) / WORLD_W;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#16241a"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = "#3d4a3d"; ctx.lineWidth = 1;
    var i;
    for (i = 0; i < ROAD_XS.length; i++) { ctx.beginPath(); ctx.moveTo(cx - r + ROAD_XS[i] * sc, cy - r); ctx.lineTo(cx - r + ROAD_XS[i] * sc, cy + r); ctx.stroke(); }
    for (i = 0; i < ROAD_YS.length; i++) { ctx.beginPath(); ctx.moveTo(cx - r, cy - r + ROAD_YS[i] * sc); ctx.lineTo(cx + r, cy - r + ROAD_YS[i] * sc); ctx.stroke(); }
    ctx.fillStyle = "#7dff9b";
    for (i = 0; i < packages.length; i++) if (!packages[i].got) ctx.fillRect(cx - r + packages[i].x * sc - 2, cy - r + packages[i].y * sc - 2, 4, 4);
    if (tgt) {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath(); ctx.arc(cx - r + tgt.x * sc, cy - r + tgt.y * sc, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#ff5d5d";
    for (i = 0; i < G.cops.length; i++) { ctx.beginPath(); ctx.arc(cx - r + G.cops[i].x * sc, cy - r + G.cops[i].y * sc, 3, 0, Math.PI * 2); ctx.fill(); }
    for (i = 0; i < G.copCars.length; i++) { ctx.beginPath(); ctx.arc(cx - r + G.copCars[i].x * sc, cy - r + G.copCars[i].y * sc, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(cx - r + G.player.x * sc, cy - r + G.player.y * sc, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ---------- main loop ----------
  var lastT = 0;
  function loop(t) {
    try { requestAnimationFrame(loop); } catch (e) {}
    var now = 0;
    try { now = performance.now(); } catch (e) { now = lastT + 16; }
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.016;
    if (G.mode === "play") update(dt);
    try { render(); } catch (e) {}
  }

  // ---------- wiring ----------
  function wireButton(id, fn) {
    var b = el(id);
    if (b && b.addEventListener) b.addEventListener("click", fn);
  }
  wireButton("btn-new", function () { startGame(false); });
  wireButton("btn-continue", function () { startGame(true); });
  wireButton("btn-resume", function () { if (G.mode === "paused") togglePause(); });
  (function initContinue() {
    var b = el("btn-continue");
    if (b && !loadSave()) {
      try { b.disabled = true; b.style.opacity = "0.45"; } catch (e) {}
    }
  })();

  // ---------- debug hook for the acceptance tests ----------
  window.__PALMETTO = {
    G: G, MISSIONS: MISSIONS,
    startGame: startGame, update: update, render: render,
    addHeat: addHeat, saveGame: saveGame, loadSave: loadSave
  };

  spawnWorld();
  try { lastT = performance.now(); } catch (e) { lastT = 0; }
  try { requestAnimationFrame(loop); } catch (e) {}
  render();
})();
