/* ============================================================================
   PALMETTO HEAT — an original top-down open-world crime game.
   Set in the fictional Palmetto City. Jax "Reef" Carter runs six jobs for
   Lena "Nova" Diaz while the Palmetto PD gives chase. Every character,
   place, vehicle, story beat, sound and line of art here is original.
   One plain script, no modules, no network, no external files.
   ============================================================================ */

(function () {
"use strict";

/* ---------------- small helpers ---------------- */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function turnToward(a, target, maxStep) {
  var d = target - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (d > maxStep) d = maxStep;
  if (d < -maxStep) d = -maxStep;
  return a + d;
}
function mulberry32(seed) {
  var a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rng = mulberry32(20261118);
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function irnd(lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

/* ---------------- world constants ---------------- */
var WORLD_W = 2400, WORLD_H = 2400;
var VIEW_W = 1280, VIEW_H = 720;
var ROADS_X = [290, 550, 810, 1070, 1330, 1590, 1850, 2110];
var ROADS_Y = [420, 680, 900, 1200, 1460, 1750, 1980];
var ROAD_HALF = 45;
var BLOCKS_X = [[0, 245], [335, 505], [595, 765], [855, 1025], [1115, 1285], [1375, 1545], [1635, 1805], [1895, 2065], [2155, 2400]];
var BLOCKS_Y = [[0, 375], [465, 635], [725, 855], [945, 1155], [1245, 1415], [1505, 1705], [1795, 1935], [2025, 2400]];

var PLACES = {
  motel:     { x: 290,  y: 420,  label: "Sunset Motel" },
  garage:    { x: 550,  y: 420,  label: "Reef Garage" },
  gunshop:   { x: 1070, y: 420,  label: "Ironclad Guns" },
  spray:     { x: 1590, y: 420,  label: "Pay 'n Spray" },
  docks:     { x: 290,  y: 1980, label: "Palmetto Docks" },
  pawn:      { x: 550,  y: 1200, label: "Golden Palm Pawn" },
  stadium:   { x: 2100, y: 1750, label: "Palmetto Bowl" },
  safehouse: { x: 2110, y: 680,  label: "Safehouse" },
  bank:      { x: 1330, y: 1200, label: "First Palmetto Bank" },
  park:      { x: 1070, y: 810,  label: "Hibiscus Park" },
  mall:      { x: 1590, y: 1980, label: "Palmetto Mall" },
  hospital:  { x: 300,  y: 900,  label: "Palmetto General" }
};
var HOSPITAL = { x: 300, y: 900 };
var SPAWN = { x: 160, y: 420 };

var MODELS = [
  { name: "Coral Sedan",       color: "#e8546a", top: 300 },
  { name: "Bay Taxi",          color: "#f2c230", top: 300 },
  { name: "Palm Van",          color: "#7fb069", top: 260 },
  { name: "Gator Truck",       color: "#5b7fa6", top: 260 },
  { name: "Sunset Coupe",      color: "#ff7a3c", top: 330 },
  { name: "Hibiscus Hatchback",color: "#c77dff", top: 300 },
  { name: "Marlin Pickup",     color: "#3fa7a0", top: 280 },
  { name: "Palmetto GT",       color: "#ff2e4d", top: 350 }
];
function modelByName(name) {
  for (var i = 0; i < MODELS.length; i++) if (MODELS[i].name === name) return MODELS[i];
  return MODELS[0];
}

var MISSIONS = [
  { id: "m1", title: "Welcome to Palmetto", desc: "Meet Lena at the Sunset Motel, steal a parked car, bring it to Reef Garage.", payout: 300 },
  { id: "m2", title: "Dockside Run", desc: "Walk to the docks, then drive to the Golden Palm Pawn.", payout: 500 },
  { id: "m3", title: "The Palmetto GT", desc: "Go to the Palmetto Bowl, steal the GT, drive it to Reef Garage.", payout: 700 },
  { id: "m4", title: "Lay Low", desc: "Lose the heat, then walk to the safehouse.", payout: 500 },
  { id: "m5", title: "Park and Mall", desc: "Walk through Hibiscus Park, then drive to the Palmetto Mall.", payout: 1000 },
  { id: "m6", title: "First Palmetto Bank", desc: "Walk into the bank, hold the lobby, then escape to the safehouse.", payout: 2500 }
];

/* ---------------- state ---------------- */
var G = {
  mode: "menu",
  time: 0,
  clock: 10.5,
  player: { x: SPAWN.x, y: SPAWN.y, onFoot: true, car: null, heading: 0 },
  cars: [],
  peds: [],
  cops: [],
  copCars: [],
  packages: [],
  particles: [],
  tracers: [],
  buildings: [],
  landmarks: [],
  missionIdx: 0,
  missionStep: 0,
  cash: 250,
  wanted: 0,
  health: 100,
  ammo: 24,
  weapon: 2,
  carsStolen: 0,
  packagesGot: 0,
  taxi: null,
  keys: {},
  mouseDown: false,
  aimX: VIEW_W / 2 + 200,
  aimY: VIEW_H / 2 - 100,
  cam: { x: SPAWN.x, y: SPAWN.y },
  spawnT: 0,
  hideT: 0,
  clearT: 0,
  shootCd: 0,
  punchCd: 0,
  holdT: 0,
  holdHeatT: 0,
  msg: "",
  msgT: 0,
  musicOn: true,
  engineNote: 0
};

var canvas = null, ctx = null;
try { canvas = document.getElementById("game"); } catch (e) { canvas = null; }
if (canvas) { try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; } }

/* ---------------- audio (all guarded: the game runs with no AudioContext) ---------------- */
var AC = null;
function audioCtx() {
  if (AC) return AC;
  try {
    var Ctor = (typeof window !== "undefined") ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!Ctor) return null;
    AC = new Ctor();
  } catch (e) { AC = null; }
  return AC;
}
function tone(freq, dur, type, vol, slideTo) {
  try {
    var ac = audioCtx();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  } catch (e) {}
}
function noiseBurst(dur, vol) {
  try {
    var ac = audioCtx();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    var len = Math.floor(ac.sampleRate * dur);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.connect(g); g.connect(ac.destination);
    src.start();
  } catch (e) {}
}
var MUSIC_NOTES = [110, 0, 130.8, 0, 98, 0, 146.8, 0, 110, 0, 164.8, 0, 98, 0, 123.5, 0];
var musicStep = 0;
function musicTick() {
  if (!G.musicOn || G.mode !== "play") return;
  try {
    var n = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
    musicStep++;
    if (n) tone(n, 0.22, "triangle", 0.035);
    if (musicStep % 4 === 0) noiseBurst(0.03, 0.015);
  } catch (e) {}
}
try { setInterval(musicTick, 210); } catch (e) {}
var sirenPhase = 0;
function sirenTick() {
  if (G.mode !== "play" || G.wanted <= 0) return;
  sirenPhase = 1 - sirenPhase;
  tone(sirenPhase ? 660 : 520, 0.5, "sine", 0.018);
}
try { setInterval(sirenTick, 520); } catch (e) {}

/* ---------------- world generation ---------------- */
function rectHits(r, pts, pad) {
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad) return true;
  }
  return false;
}
function buildWorld() {
  G.buildings = [];
  G.landmarks = [];
  var i, j;
  /* landmark buildings (hand-placed, labelled on the map) */
  var lm = [
    { x: 340, y: 330, w: 160, h: 40, color: "#e8a87c", label: "Sunset Motel" },
    { x: 600, y: 330, w: 150, h: 40, color: "#9db3c8", label: "Reef Garage" },
    { x: 1120, y: 330, w: 140, h: 40, color: "#8a7f8d", label: "Ironclad Guns" },
    { x: 1640, y: 330, w: 140, h: 40, color: "#5da9a0", label: "Pay 'n Spray" },
    { x: 600, y: 1110, w: 140, h: 40, color: "#d9b36c", label: "Golden Palm Pawn" },
    { x: 1380, y: 1110, w: 180, h: 40, color: "#c8c2b4", label: "First Palmetto Bank" },
    { x: 1640, y: 1880, w: 260, h: 50, color: "#b388c9", label: "Palmetto Mall" },
    { x: 1900, y: 1560, w: 180, h: 180, color: "#7d8aa0", label: "Palmetto Bowl" },
    { x: 340, y: 950, w: 160, h: 200, color: "#e8e4da", label: "Palmetto General" },
    { x: 2160, y: 590, w: 120, h: 40, color: "#f2c9a0", label: "Safehouse" }
  ];
  for (i = 0; i < lm.length; i++) { G.landmarks.push(lm[i]); G.buildings.push(lm[i]); }

  /* protected points: nothing built on top of these */
  var keep = [];
  var k;
  for (k in PLACES) keep.push({ x: PLACES[k].x, y: PLACES[k].y });
  keep.push({ x: SPAWN.x, y: SPAWN.y });
  var pkgPts = [[300, 1460], [180, 700], [2200, 1300], [600, 1900], [1200, 1600], [900, 2050], [2000, 500], [400, 100], [1500, 1000], [2250, 2100]];
  for (i = 0; i < pkgPts.length; i++) keep.push({ x: pkgPts[i][0], y: pkgPts[i][1] });
  var parkSpots = [[300, 700], [900, 440], [1200, 700], [1700, 1220], [400, 1480], [2100, 1760], [600, 2000], [1900, 440]];
  for (i = 0; i < parkSpots.length; i++) keep.push({ x: parkSpots[i][0], y: parkSpots[i][1] });
  keep.push({ x: 950, y: 440 });

  var palette = ["#e8a87c", "#d9b36c", "#a8c686", "#8fb8c9", "#e0aaff", "#f2c9a0", "#9db3c8", "#c9ada7", "#b5c9a3", "#e6b8a2"];
  var noBuild = [
    { x: 900, y: 660, w: 330, h: 290 },    /* Hibiscus Park */
    { x: 1880, y: 1540, w: 380, h: 380 },  /* stadium grounds */
    { x: 2155, y: 0, w: 245, h: 2400 },    /* beach strip */
    { x: 1200, y: 0, w: 1150, h: 130 },    /* airfield */
    { x: 0, y: 2025, w: 2400, h: 375 }     /* port */
  ];
  function overlapsZone(r) {
    for (var z = 0; z < noBuild.length; z++) {
      var q = noBuild[z];
      if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) return true;
    }
    return false;
  }
  for (i = 0; i < BLOCKS_X.length; i++) {
    for (j = 0; j < BLOCKS_Y.length; j++) {
      var bx0 = BLOCKS_X[i][0], bx1 = BLOCKS_X[i][1];
      var by0 = BLOCKS_Y[j][0], by1 = BLOCKS_Y[j][1];
      var bw = bx1 - bx0, bh = by1 - by0;
      if (bw < 90 || bh < 90) continue;
      var count = irnd(1, 2);
      for (var n = 0; n < count; n++) {
        var w = irnd(60, Math.min(150, bw - 24));
        var h = irnd(50, Math.min(120, bh - 24));
        var x = bx0 + 12 + Math.floor(rng() * Math.max(1, bw - w - 24));
        var y = by0 + 12 + Math.floor(rng() * Math.max(1, bh - h - 24));
        var r = { x: x, y: y, w: w, h: h, color: pick(palette), label: "" };
        if (overlapsZone(r)) continue;
        if (rectHits(r, keep, 60)) continue;
        var clash = false;
        for (var b = 0; b < G.buildings.length; b++) {
          var o = G.buildings[b];
          if (r.x < o.x + o.w + 8 && r.x + r.w + 8 > o.x && r.y < o.y + o.h + 8 && r.y + r.h + 8 > o.y) { clash = true; break; }
        }
        if (clash) continue;
        G.buildings.push(r);
      }
    }
  }
  /* hidden packages */
  G.packages = [];
  for (i = 0; i < pkgPts.length; i++) {
    G.packages.push({ x: pkgPts[i][0], y: pkgPts[i][1], got: false, bob: rng() * 6 });
  }
}

/* ---------------- spawning ---------------- */
function makeCar(x, y, heading, model, parked, police) {
  return {
    x: x, y: y, heading: heading, speed: 0,
    model: model, parked: !!parked, dead: false, police: !!police,
    hp: 100, color: model.color, top: model.top,
    axis: null, road: 0, dir: 1, lane: 12, aiT: 0
  };
}
function spawnTraffic() {
  G.cars = [];
  /* parked cars first: the first parked car is the one the player steals first */
  var parked = [
    { x: 300, y: 700, h: 0, m: "Coral Sedan" },
    { x: 900, y: 440, h: 0, m: "Bay Taxi" },
    { x: 1200, y: 700, h: 0, m: "Palm Van" },
    { x: 1700, y: 1220, h: 0, m: "Gator Truck" },
    { x: 400, y: 1480, h: 0, m: "Sunset Coupe" },
    { x: 2100, y: 1760, h: -Math.PI / 2, m: "Palmetto GT" },
    { x: 600, y: 2000, h: 0, m: "Hibiscus Hatchback" },
    { x: 1900, y: 440, h: 0, m: "Marlin Pickup" }
  ];
  for (var i = 0; i < parked.length; i++) {
    var p = parked[i];
    G.cars.push(makeCar(p.x, p.y, p.h, modelByName(p.m), true, false));
  }
  /* traffic on the roads */
  for (var n = 0; n < 26; n++) {
    var horiz = rng() < 0.5;
    var c;
    if (horiz) {
      var ry = pick(ROADS_Y);
      c = makeCar(irnd(80, WORLD_W - 80), ry + (rng() < 0.5 ? -14 : 14), rng() < 0.5 ? 0 : Math.PI, pick(MODELS), false, false);
      c.axis = "x"; c.road = ry; c.dir = c.heading === 0 ? 1 : -1; c.lane = c.y - ry;
    } else {
      var rx = pick(ROADS_X);
      c = makeCar(rx + (rng() < 0.5 ? -14 : 14), irnd(80, WORLD_H - 80), rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pick(MODELS), false, false);
      c.axis = "y"; c.road = rx; c.dir = c.heading === Math.PI / 2 ? 1 : -1; c.lane = c.x - rx;
    }
    c.speed = irnd(90, 140);
    c.aiT = rng() * 2;
    G.cars.push(c);
  }
}
function spawnPeds() {
  G.peds = [];
  var names = ["Mara", "Dee", "Oscar", "Priya", "Tomas", "Ivy", "Rene", "Kofi", "Ana", "Jules", "Nia", "Marco", "Sofia", "Ben", "Luz", "Kai", "Rosa", "Eli", "Mia", "Theo", "Zoe", "Sam", "Ida", "Leo"];
  var cols = ["#ff8fa3", "#ffd166", "#8ecae6", "#b5e48c", "#f28482", "#c77dff", "#90be6d", "#f9c74f"];
  for (var i = 0; i < 24; i++) {
    var horiz = rng() < 0.5;
    var x, y;
    if (horiz) { x = irnd(60, WORLD_W - 60); y = pick(ROADS_Y) + irnd(-30, 30); }
    else { x = pick(ROADS_X) + irnd(-30, 30); y = irnd(60, WORLD_H - 60); }
    G.peds.push({
      x: x, y: y, tx: x, ty: y, speed: irnd(35, 55),
      name: names[i % names.length], color: pick(cols),
      taxi: false, waitT: 0, down: false, downT: 0
    });
  }
  /* one fare ped waiting at the taxi stand on the motel road */
  var fare = G.peds[0];
  fare.x = 950; fare.y = 440; fare.tx = 950; fare.ty = 440;
  fare.taxi = true; fare.speed = 0;
}
function spawnCopCar() {
  var spot = pickSpawnSpot(350, 650);
  var c = makeCar(spot.x, spot.y, angTo(spot.x, spot.y, G.player.x, G.player.y), modelByName("Coral Sedan"), false, true);
  c.color = "#20242c"; c.top = 300; c.hp = 120; c.speed = 60;
  G.copCars.push(c);
  tone(520, 0.2, "sine", 0.03);
}
function spawnFootCop() {
  var spot = pickSpawnSpot(250, 350);
  G.cops.push({ x: spot.x, y: spot.y, a: 0, speed: 150, hp: 60, shootT: 2, punchT: 0 });
}
function pickSpawnSpot(minD, maxD) {
  var pts = [];
  for (var i = 0; i < ROADS_X.length; i++) {
    for (var j = 0; j < ROADS_Y.length; j++) {
      var x = ROADS_X[i], y = ROADS_Y[j];
      var d = dist(x, y, G.player.x, G.player.y);
      if (d >= minD && d <= maxD) pts.push({ x: x, y: y });
    }
  }
  if (pts.length === 0) {
    var x2 = clamp(G.player.x + (rng() < 0.5 ? -1 : 1) * minD, 60, WORLD_W - 60);
    var y2 = clamp(G.player.y + (rng() < 0.5 ? -1 : 1) * minD, 60, WORLD_H - 60);
    return { x: x2, y: y2 };
  }
  return pick(pts);
}

/* ---------------- messages ---------------- */
function say(text) { G.msg = text; G.msgT = 4; }

/* ---------------- start / save / load ---------------- */
function startGame(fromSave) {
  buildWorld();
  spawnTraffic();
  spawnPeds();
  G.cops = [];
  G.copCars = [];
  G.particles = [];
  G.tracers = [];
  G.missionIdx = 0;
  G.missionStep = 0;
  G.cash = 250;
  G.wanted = 0;
  G.health = 100;
  G.ammo = 24;
  G.weapon = 2;
  G.carsStolen = 0;
  G.packagesGot = 0;
  G.taxi = null;
  G.clock = 10.5;
  G.spawnT = 0; G.hideT = 0; G.clearT = 0;
  G.shootCd = 0; G.punchCd = 0;
  G.holdT = 0; G.holdHeatT = 0;
  G.player.x = SPAWN.x; G.player.y = SPAWN.y;
  G.player.onFoot = true; G.player.car = null; G.player.heading = 0;
  G.cam.x = SPAWN.x; G.cam.y = SPAWN.y;
  G.mode = "play";
  if (fromSave) {
    var s = loadSave();
    if (s) {
      if (typeof s.cash === "number") G.cash = s.cash;
      if (typeof s.missionIdx === "number") G.missionIdx = s.missionIdx;
      if (typeof s.missionStep === "number") G.missionStep = s.missionStep;
      if (typeof s.health === "number") G.health = s.health;
      if (typeof s.ammo === "number") G.ammo = s.ammo;
      if (typeof s.carsStolen === "number") G.carsStolen = s.carsStolen;
      if (typeof s.packagesGot === "number") G.packagesGot = s.packagesGot;
      if (s.player && typeof s.player.x === "number") { G.player.x = s.player.x; G.player.y = s.player.y; }
      say("Welcome back to Palmetto City.");
    }
  } else {
    say("Meet Lena at the Sunset Motel.");
  }
  syncOverlays();
  tone(440, 0.15, "triangle", 0.05);
  tone(660, 0.25, "triangle", 0.05);
}

var SAVE_KEY = "palmetto-heat-save-v1";
function saveGame() {
  try {
    var data = {
      cash: G.cash, missionIdx: G.missionIdx, missionStep: G.missionStep,
      health: G.health, ammo: G.ammo, weapon: G.weapon,
      carsStolen: G.carsStolen, packagesGot: G.packagesGot,
      wanted: G.wanted, clock: G.clock,
      player: { x: Math.round(G.player.x), y: Math.round(G.player.y), onFoot: G.player.onFoot }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}
function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || typeof data.cash !== "number" || typeof data.missionIdx !== "number") return null;
    return data;
  } catch (e) { return null; }
}
function addHeat(n) {
  G.wanted = clamp(G.wanted + n, 0, 5);
  if (G.wanted > 0) { G.hideT = 0; tone(700, 0.2, "sawtooth", 0.03); }
}

/* ---------------- collision ---------------- */
function blockedAt(x, y, pad) {
  if (x < 20 + pad || x > WORLD_W - 20 - pad || y < 20 + pad || y > WORLD_H - 20 - pad) return true;
  for (var i = 0; i < G.buildings.length; i++) {
    var b = G.buildings[i];
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true;
  }
  return false;
}
function moveWithSlide(o, nx, ny, pad) {
  if (!blockedAt(nx, ny, pad)) { o.x = nx; o.y = ny; return; }
  if (!blockedAt(nx, o.y, pad)) { o.x = nx; return; }
  if (!blockedAt(o.x, ny, pad)) { o.y = ny; return; }
}

/* ---------------- interaction ---------------- */
function nearestCar(maxD) {
  var best = null, bd = maxD;
  for (var i = 0; i < G.cars.length; i++) {
    var c = G.cars[i];
    if (c.dead || c.police) continue;
    var d = dist(G.player.x, G.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function enterCar(car) {
  G.player.onFoot = false;
  G.player.car = car;
  if (car.parked) {
    car.parked = false;
    G.carsStolen++;
    say("Car stolen — the " + car.model.name + " is yours now.");
    tone(330, 0.12, "square", 0.04);
    if (G.missionIdx === 2 && G.missionStep === 0 && car.model.name === "Palmetto GT" &&
        dist(car.x, car.y, 2100, 1760) < 150) {
      G.missionStep = 1;
      say("That's the GT. Get it to Reef Garage.");
    }
  } else {
    say("You took the " + car.model.name + ".");
  }
  if (G.missionIdx === 0 && G.missionStep === 1 && G.carsStolen >= 1) G.missionStep = 2;
}
function exitCar() {
  var car = G.player.car;
  if (!car) return;
  G.player.onFoot = true;
  G.player.car = null;
  car.speed = 0;
  var a = car.heading + Math.PI / 2;
  var nx = car.x + Math.cos(a) * 26, ny = car.y + Math.sin(a) * 26;
  if (!blockedAt(nx, ny, 10)) { G.player.x = nx; G.player.y = ny; }
  else { G.player.x = car.x - Math.cos(a) * 26; G.player.y = car.y - Math.sin(a) * 26; }
}
function interact() {
  if (G.mode !== "play") return;
  if (!G.player.onFoot) { exitCar(); return; }
  var car = nearestCar(60);
  if (car) { enterCar(car); return; }
  if (dist(G.player.x, G.player.y, PLACES.gunshop.x, PLACES.gunshop.y) < 70) {
    if (G.cash >= 50) {
      G.cash -= 50; G.ammo += 24;
      say("Bought 24 rounds for $50. Ammo: " + G.ammo + ".");
      tone(880, 0.1, "triangle", 0.05);
    } else say("Not enough cash for ammo — $50 a box.");
    return;
  }
  if (dist(G.player.x, G.player.y, PLACES.safehouse.x, PLACES.safehouse.y) < 70) {
    saveGame();
    say("Progress saved at the safehouse.");
    tone(523, 0.12, "triangle", 0.05);
    tone(784, 0.2, "triangle", 0.05);
    return;
  }
  if (dist(G.player.x, G.player.y, PLACES.motel.x, PLACES.motel.y) < 70) {
    say("Lena: \"Reef. About time. We got work.\"");
    return;
  }
}
function hailTaxi() {
  if (G.mode !== "play" || G.player.onFoot || G.taxi) return;
  for (var i = 0; i < G.peds.length; i++) {
    var p = G.peds[i];
    if (!p.taxi || p.down) continue;
    if (dist(G.player.x, G.player.y, p.x, p.y) < 80) {
      var dest = pickDestination(p.x, p.y);
      G.taxi = { fare: irnd(40, 90), dx: dest.x, dy: dest.y };
      p.taxi = false;
      say("Fare picked up — $" + G.taxi.fare + " to the marked stop.");
      tone(990, 0.1, "triangle", 0.05);
      return;
    }
  }
}
function pickDestination(fx, fy) {
  var pts = [];
  for (var i = 0; i < ROADS_X.length; i++) {
    for (var j = 0; j < ROADS_Y.length; j++) {
      var x = ROADS_X[i], y = ROADS_Y[j];
      if (dist(x, y, fx, fy) > 400) pts.push({ x: x, y: y });
    }
  }
  if (pts.length === 0) return { x: 1590, y: 1980 };
  return pick(pts);
}

/* ---------------- combat ---------------- */
function aimWorld() {
  var cx = G.cam.x, cy = G.cam.y;
  return { x: cx + (G.aimX - VIEW_W / 2), y: cy + (G.aimY - VIEW_H / 2) };
}
function tryShoot() {
  if (G.mode !== "play") return;
  if (G.weapon !== 2) return;
  if (G.shootCd > 0) return;
  if (G.ammo <= 0) { tone(180, 0.08, "square", 0.04); G.shootCd = 0.25; return; }
  G.ammo--;
  G.shootCd = 0.06;
  var sx = G.player.x, sy = G.player.y;
  var aim = aimWorld();
  var a = angTo(sx, sy, aim.x, aim.y);
  noiseBurst(0.09, 0.14);
  tone(160, 0.08, "square", 0.06, 60);
  var hitX = sx + Math.cos(a) * 520, hitY = sy + Math.sin(a) * 520;
  var best = null, bd = 520;
  function scan(list, radius, kind) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.dead) continue;
      if (o.taxi) continue; /* a waiting fare is never a target */
      var d = dist(sx, sy, o.x, o.y);
      if (d > 520 || d < 12) continue;
      var oa = angTo(sx, sy, o.x, o.y);
      var da = oa - a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > 0.12) continue;
      if (d < bd) { bd = d; best = { o: o, kind: kind }; }
    }
  }
  scan(G.cops, 26, "cop");
  scan(G.copCars, 26, "copcar");
  scan(G.peds, 22, "ped");
  scan(G.cars, 26, "car");
  if (best) {
    hitX = best.o.x; hitY = best.o.y;
    damageTarget(best.o, best.kind, 34);
  }
  G.tracers.push({ x1: sx, y1: sy, x2: hitX, y2: hitY, t: 0.09 });
  burst(hitX, hitY, 4, "#ffd166");
}
function damageTarget(o, kind, dmg) {
  if (kind === "cop") {
    o.hp -= dmg;
    if (o.hp <= 0) {
      var idx = G.cops.indexOf(o);
      if (idx >= 0) G.cops.splice(idx, 1);
      addHeat(1);
      say("Cop down. The heat rises.");
      burst(o.x, o.y, 14, "#ff5a3c");
      tone(220, 0.2, "sawtooth", 0.05, 60);
    }
  } else if (kind === "copcar") {
    o.hp -= dmg;
    if (o.hp <= 0 && !o.dead) {
      o.dead = true; o.speed = 0;
      addHeat(1);
      say("PD cruiser wrecked. The heat rises.");
      burst(o.x, o.y, 26, "#ff7a3c");
      noiseBurst(0.4, 0.2);
    }
  } else if (kind === "ped") {
    o.down = true; o.downT = 6;
    burst(o.x, o.y, 8, "#ff8fa3");
  } else if (kind === "car") {
    o.hp -= dmg;
    if (o.hp <= 0 && !o.dead) {
      o.dead = true; o.speed = 0;
      burst(o.x, o.y, 22, "#ff7a3c");
      noiseBurst(0.35, 0.18);
      if (G.player.car === o) { G.player.car = null; G.player.onFoot = true; }
    }
  }
}
function punch() {
  if (G.mode !== "play") return;
  if (G.punchCd > 0) return;
  G.punchCd = 0.45;
  tone(140, 0.08, "square", 0.05, 70);
  var best = null, bd = 55;
  for (var i = 0; i < G.cops.length; i++) {
    var d = dist(G.player.x, G.player.y, G.cops[i].x, G.cops[i].y);
    if (d < bd) { bd = d; best = G.cops[i]; }
  }
  if (best) { damageTarget(best, "cop", 20); burst(best.x, best.y, 6, "#ffffff"); return; }
  for (var j = 0; j < G.peds.length; j++) {
    var p = G.peds[j];
    if (p.down || p.taxi) continue;
    var dp = dist(G.player.x, G.player.y, p.x, p.y);
    if (dp < 55) { p.down = true; p.downT = 5; burst(p.x, p.y, 6, "#ffffff"); return; }
  }
}
function burst(x, y, n, color) {
  for (var i = 0; i < n; i++) {
    var a = rng() * Math.PI * 2, s = 40 + rng() * 160;
    G.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5 + rng() * 0.4, color: color });
  }
}
function hurtPlayer(dmg) {
  if (G.mode !== "play") return;
  G.health -= dmg;
  if (G.health <= 0) { G.health = 0; die(); }
}
function die() {
  if (G.mode !== "play") return;
  G.mode = "wasted";
  G.mouseDown = false;
  noiseBurst(0.5, 0.2);
  tone(110, 0.8, "sawtooth", 0.06, 40);
  syncOverlays();
  setTimeout(function () { respawn(); }, 3000);
}
function respawn() {
  G.player.x = HOSPITAL.x; G.player.y = HOSPITAL.y;
  G.player.onFoot = true; G.player.car = null; G.player.heading = 0;
  G.health = 100;
  G.wanted = 0;
  G.taxi = null;
  G.cops.length = 0;
  G.copCars.length = 0;
  G.cam.x = HOSPITAL.x; G.cam.y = HOSPITAL.y;
  G.mode = "play";
  say("Patched up at Palmetto General. The city is still yours.");
  syncOverlays();
}

/* ---------------- update: player ---------------- */
function updatePlayer(dt) {
  var k = G.keys;
  var mx = 0, my = 0;
  if (k["a"] || k["arrowleft"]) mx -= 1;
  if (k["d"] || k["arrowright"]) mx += 1;
  if (k["w"] || k["arrowup"]) my -= 1;
  if (k["s"] || k["arrowdown"]) my += 1;
  if (G.player.onFoot) {
    if (mx !== 0 || my !== 0) {
      var len = Math.sqrt(mx * mx + my * my);
      var run = (k["shift"]) ? 235 : 150;
      var nx = G.player.x + (mx / len) * run * dt;
      var ny = G.player.y + (my / len) * run * dt;
      moveWithSlide(G.player, nx, ny, 10);
      G.player.heading = Math.atan2(my, mx);
    }
  } else {
    var car = G.player.car;
    if (car) {
      if (k["w"] || k["arrowup"]) car.speed = Math.min(car.top, car.speed + 280 * dt);
      else if (k["s"] || k["arrowdown"]) car.speed = Math.max(-90, car.speed - 320 * dt);
      else {
        if (car.speed > 0) car.speed = Math.max(0, car.speed - 260 * dt);
        else if (car.speed < 0) car.speed = Math.min(0, car.speed + 260 * dt);
      }
      var steer = 0;
      if (k["a"] || k["arrowleft"]) steer -= 1;
      if (k["d"] || k["arrowright"]) steer += 1;
      var grip = clamp(Math.abs(car.speed) / 60, 0, 1);
      car.heading += steer * 2.4 * grip * dt * (car.speed < 0 ? -1 : 1);
      var nx2 = car.x + Math.cos(car.heading) * car.speed * dt;
      var ny2 = car.y + Math.sin(car.heading) * car.speed * dt;
      moveWithSlide(car, nx2, ny2, 14);
      G.player.x = car.x; G.player.y = car.y;
      G.player.heading = car.heading;
      if (Math.abs(car.speed) > 40 && Math.random() < 0.3) {
        G.particles.push({ x: car.x - Math.cos(car.heading) * 16, y: car.y - Math.sin(car.heading) * 16, vx: 0, vy: 0, t: 0.4, color: "#5a5f6a" });
      }
    }
  }
  /* camera follows the player */
  G.cam.x = clamp(G.player.x, VIEW_W / 2, WORLD_W - VIEW_W / 2);
  G.cam.y = clamp(G.player.y, VIEW_H / 2, WORLD_H - VIEW_H / 2);
}

/* ---------------- update: traffic & peds ---------------- */
function updateTraffic(dt) {
  for (var i = 0; i < G.cars.length; i++) {
    var c = G.cars[i];
    if (c.dead || c.police || c.parked) continue;
    if (c === G.player.car) continue;
    c.aiT -= dt;
    if (c.axis === "x") {
      var ahead = null, ad = 70;
      for (var j = 0; j < G.cars.length; j++) {
        var o = G.cars[j];
        if (o === c || o.dead) continue;
        if (Math.abs(o.y - c.y) < 24 && (o.x - c.x) * c.dir > 0 && (o.x - c.x) * c.dir < ad) { ad = (o.x - c.x) * c.dir; ahead = o; }
      }
      var sp = ahead ? Math.min(c.speed, ahead.speed || 60) : 120;
      c.speed += (sp - c.speed) * Math.min(1, dt * 2);
      var nx = c.x + c.dir * c.speed * dt;
      if (nx < 60 || nx > WORLD_W - 60) { c.dir *= -1; c.heading = c.dir > 0 ? 0 : Math.PI; c.lane *= -1; }
      else {
        c.x = nx;
        c.y = c.road + c.lane;
        var nearX = null;
        for (var r = 0; r < ROADS_X.length; r++) {
          if (Math.abs(c.x - ROADS_X[r]) < 14) { nearX = ROADS_X[r]; break; }
        }
        if (nearX !== null && c.aiT <= 0 && rng() < 0.3) {
          c.aiT = 1 + rng() * 2;
          c.axis = "y"; c.road = nearX; c.dir = rng() < 0.5 ? 1 : -1;
          c.lane = rng() < 0.5 ? -14 : 14;
          c.heading = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          c.x = nearX + c.lane;
        }
      }
    } else if (c.axis === "y") {
      var ahead2 = null, ad2 = 70;
      for (var j2 = 0; j2 < G.cars.length; j2++) {
        var o2 = G.cars[j2];
        if (o2 === c || o2.dead) continue;
        if (Math.abs(o2.x - c.x) < 24 && (o2.y - c.y) * c.dir > 0 && (o2.y - c.y) * c.dir < ad2) { ad2 = (o2.y - c.y) * c.dir; ahead2 = o2; }
      }
      var sp2 = ahead2 ? Math.min(c.speed, ahead2.speed || 60) : 120;
      c.speed += (sp2 - c.speed) * Math.min(1, dt * 2);
      var ny = c.y + c.dir * c.speed * dt;
      if (ny < 60 || ny > WORLD_H - 60) { c.dir *= -1; c.heading = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; c.lane *= -1; }
      else {
        c.y = ny;
        c.x = c.road + c.lane;
        var nearY = null;
        for (var r2 = 0; r2 < ROADS_Y.length; r2++) {
          if (Math.abs(c.y - ROADS_Y[r2]) < 14) { nearY = ROADS_Y[r2]; break; }
        }
        if (nearY !== null && c.aiT <= 0 && rng() < 0.3) {
          c.aiT = 1 + rng() * 2;
          c.axis = "x"; c.road = nearY; c.dir = rng() < 0.5 ? 1 : -1;
          c.lane = rng() < 0.5 ? -14 : 14;
          c.heading = c.dir > 0 ? 0 : Math.PI;
          c.y = nearY + c.lane;
        }
      }
    }
  }
}
function updatePeds(dt) {
  for (var i = 0; i < G.peds.length; i++) {
    var p = G.peds[i];
    if (p.down) { p.downT -= dt; if (p.downT <= 0) p.down = false; continue; }
    if (p.taxi) continue; /* the fare ped waits at the stand */
    if (p.waitT > 0) { p.waitT -= dt; continue; }
    var d = dist(p.x, p.y, p.tx, p.ty);
    if (d < 12) {
      var horiz = rng() < 0.5;
      if (horiz) { p.tx = clamp(p.x + irnd(-350, 350), 60, WORLD_W - 60); p.ty = pick(ROADS_Y) + irnd(-28, 28); }
      else { p.tx = pick(ROADS_X) + irnd(-28, 28); p.ty = clamp(p.y + irnd(-350, 350), 60, WORLD_H - 60); }
      p.waitT = rng() * 2;
      continue;
    }
    var a = angTo(p.x, p.y, p.tx, p.ty);
    var nx = p.x + Math.cos(a) * p.speed * dt;
    var ny = p.y + Math.sin(a) * p.speed * dt;
    if (!blockedAt(nx, ny, 8)) { p.x = nx; p.y = ny; }
    else { p.tx = p.x; p.ty = p.y; }
    /* a fast car ploughing through knocks a ped down (no heat — accidents happen) */
    if (!G.player.onFoot && G.player.car && Math.abs(G.player.car.speed) > 60) {
      if (dist(p.x, p.y, G.player.x, G.player.y) < 24) {
        p.down = true; p.downT = 5;
        burst(p.x, p.y, 8, "#ff8fa3");
        tone(200, 0.15, "square", 0.05, 90);
      }
    }
  }
  /* a fresh fare ped appears now and then when none is waiting */
  var anyFare = false;
  for (var j = 0; j < G.peds.length; j++) if (G.peds[j].taxi) anyFare = true;
  if (!anyFare && !G.taxi && rng() < dt * 0.05) {
    var cands = [];
    for (var k2 = 0; k2 < G.peds.length; k2++) if (!G.peds[k2].down) cands.push(G.peds[k2]);
    if (cands.length) { var f = pick(cands); f.taxi = true; f.tx = f.x; f.ty = f.y; }
  }
}

/* ---------------- update: police ---------------- */
function updateCops(dt) {
  for (var i = G.cops.length - 1; i >= 0; i--) {
    var c = G.cops[i];
    c.punchT = (c.punchT || 0) - dt;
    c.shootT = (c.shootT || 0) - dt;
    var d = dist(c.x, c.y, G.player.x, G.player.y);
    if (d > 30) {
      var a = angTo(c.x, c.y, G.player.x, G.player.y);
      c.a = a;
      var sp = c.speed || 150;
      var nx = c.x + Math.cos(a) * sp * dt;
      var ny = c.y + Math.sin(a) * sp * dt;
      moveWithSlide(c, nx, ny, 10);
      d = dist(c.x, c.y, G.player.x, G.player.y);
    }
    if (d < 40) {
      if (c.punchT <= 0) {
        c.punchT = 0.9;
        hurtPlayer(2);
        tone(120, 0.08, "square", 0.05, 70);
        burst(G.player.x, G.player.y, 3, "#ffffff");
      }
    } else if (d < 220) {
      if (c.shootT <= 0) {
        c.shootT = 3;
        hurtPlayer(1);
        G.tracers.push({ x1: c.x, y1: c.y, x2: G.player.x, y2: G.player.y, t: 0.08 });
        noiseBurst(0.06, 0.06);
      }
    }
  }
}
function updateCopCars(dt) {
  for (var i = 0; i < G.copCars.length; i++) {
    var c = G.copCars[i];
    if (c.dead) continue;
    var d = dist(c.x, c.y, G.player.x, G.player.y);
    var want = angTo(c.x, c.y, G.player.x, G.player.y);
    c.heading = turnToward(c.heading, want, 3 * dt);
    var target = d > 110 ? 280 : 0;
    c.speed += (target - c.speed) * Math.min(1, dt * 1.5);
    var nx = c.x + Math.cos(c.heading) * c.speed * dt;
    var ny = c.y + Math.sin(c.heading) * c.speed * dt;
    moveWithSlide(c, nx, ny, 14);
  }
}
function updatePolice(dt) {
  if (G.wanted > 0) {
    G.spawnT -= dt;
    var wantCars = Math.min(G.wanted, 4);
    var wantCops = Math.min(G.wanted, 4);
    if (G.spawnT <= 0) {
      G.spawnT = 0.35;
      if (G.copCars.length < wantCars) spawnCopCar();
      else if (G.cops.length < wantCops) spawnFootCop();
    }
    /* wanted fades only while no police can see the player */
    var seen = false;
    for (var i = 0; i < G.cops.length; i++) if (dist(G.cops[i].x, G.cops[i].y, G.player.x, G.player.y) < 350) seen = true;
    for (var j = 0; j < G.copCars.length; j++) if (dist(G.copCars[j].x, G.copCars[j].y, G.player.x, G.player.y) < 350) seen = true;
    if (seen) G.hideT = 0;
    else {
      G.hideT += dt;
      if (G.hideT > 15) { G.wanted = Math.max(0, G.wanted - 1); G.hideT = 0; say("The heat is cooling off…"); }
    }
  } else if (G.cops.length > 0 || G.copCars.length > 0) {
    G.clearT += dt;
    if (G.clearT > 1) {
      G.clearT = 0;
      if (G.cops.length > 0) G.cops.pop();
      if (G.copCars.length > 0) G.copCars.pop();
    }
  }
}

/* ---------------- update: missions, taxi, pickups ---------------- */
function nearPlace(key, r) { return dist(G.player.x, G.player.y, PLACES[key].x, PLACES[key].y) < r; }
function completeMission() {
  var m = MISSIONS[G.missionIdx];
  G.cash += m.payout;
  say("Job done: " + m.title + "  +$" + m.payout);
  tone(523, 0.12, "triangle", 0.06);
  tone(659, 0.12, "triangle", 0.06);
  tone(784, 0.25, "triangle", 0.06);
  burst(G.player.x, G.player.y, 20, "#ffd166");
  G.missionIdx++;
  G.missionStep = 0;
  G.holdT = 0; G.holdHeatT = 0;
  if (G.missionIdx >= MISSIONS.length) say("All six jobs done. Palmetto City is yours, Reef.");
  else say("Next job: " + MISSIONS[G.missionIdx].title);
}
function updateMissions(dt) {
  var idx = G.missionIdx;
  if (idx >= MISSIONS.length) return;
  if (idx === 0) {
    if (G.missionStep === 0 && G.player.onFoot && nearPlace("motel", 70)) {
      G.missionStep = 1;
      say("Lena: \"Steal a parked car, then bring it to my garage.\"");
    } else if (G.missionStep === 1 && G.carsStolen >= 1) {
      G.missionStep = 2;
    } else if (G.missionStep === 2 && !G.player.onFoot && nearPlace("garage", 70)) {
      completeMission();
    }
  } else if (idx === 1) {
    if (G.missionStep === 0 && G.player.onFoot && nearPlace("docks", 70)) {
      G.missionStep = 1;
      say("The docks. Now drive to the Golden Palm Pawn.");
    } else if (G.missionStep === 1 && !G.player.onFoot && nearPlace("pawn", 70)) {
      completeMission();
    }
  } else if (idx === 2) {
    if (G.missionStep === 1 && !G.player.onFoot && nearPlace("garage", 70)) {
      completeMission();
    }
  } else if (idx === 3) {
    if (G.missionStep === 0 && G.wanted === 0 && G.player.onFoot && nearPlace("safehouse", 70)) {
      completeMission();
    }
  } else if (idx === 4) {
    if (G.missionStep === 0 && G.player.onFoot && nearPlace("park", 70)) {
      G.missionStep = 1;
      say("Through the park. Now drive to the Palmetto Mall.");
    } else if (G.missionStep === 1 && !G.player.onFoot && nearPlace("mall", 70)) {
      completeMission();
    }
  } else if (idx === 5) {
    if (G.missionStep === 0 && G.player.onFoot && nearPlace("bank", 70)) {
      G.missionStep = 1;
      G.holdT = 0; G.holdHeatT = 0;
      say("Hold the lobby. The PD is coming — stay on your feet.");
    } else if (G.missionStep === 1) {
      if (G.player.onFoot && nearPlace("bank", 80)) {
        G.holdT += dt;
        G.holdHeatT += dt;
        if (G.holdHeatT >= 2.5 && G.wanted < 3) { G.holdHeatT = 0; addHeat(1); say("Sirens closing in — hold on!"); }
        if (G.holdT >= 8) {
          G.missionStep = 2;
          say("The vault's open. Get to the safehouse — in a car, fast.");
        }
      } else if (G.holdT > 0) {
        G.holdT = Math.max(0, G.holdT - dt);
      }
    } else if (G.missionStep === 2 && !G.player.onFoot && nearPlace("safehouse", 70)) {
      completeMission();
    }
  }
}
function updateTaxi(dt) {
  if (!G.taxi) return;
  if (!G.player.onFoot && dist(G.player.x, G.player.y, G.taxi.dx, G.taxi.dy) < 70) {
    G.cash += G.taxi.fare;
    say("Fare delivered — +$" + G.taxi.fare + ".");
    tone(880, 0.12, "triangle", 0.05);
    tone(1174, 0.2, "triangle", 0.05);
    G.taxi = null;
  }
}
function updatePackages() {
  for (var i = 0; i < G.packages.length; i++) {
    var p = G.packages[i];
    if (p.got) continue;
    if (dist(G.player.x, G.player.y, p.x, p.y) < 40) {
      p.got = true;
      G.packagesGot++;
      G.cash += 100;
      say("Hidden package found — +$100. (" + G.packagesGot + "/10)");
      tone(1046, 0.12, "triangle", 0.06);
      tone(1318, 0.2, "triangle", 0.06);
      burst(p.x, p.y, 16, "#ffd166");
    }
  }
}
function updateSpray() {
  if (!G.player.onFoot && G.player.car && G.wanted > 0 && nearPlace("spray", 75)) {
    G.wanted = 0;
    G.cash = Math.max(0, G.cash - 100);
    G.cops.length = 0;
    G.copCars.length = 0;
    say("Pay 'n Spray — fresh paint, clean slate. -$100.");
    tone(392, 0.12, "triangle", 0.05);
    tone(523, 0.2, "triangle", 0.05);
    burst(G.player.x, G.player.y, 12, "#7fb069");
  }
}
function updateFx(dt) {
  for (var i = G.particles.length - 1; i >= 0; i--) {
    var p = G.particles[i];
    p.t -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    if (p.t <= 0) G.particles.splice(i, 1);
  }
  for (var j = G.tracers.length - 1; j >= 0; j--) {
    G.tracers[j].t -= dt;
    if (G.tracers[j].t <= 0) G.tracers.splice(j, 1);
  }
  if (G.shootCd > 0) G.shootCd -= dt;
  if (G.punchCd > 0) G.punchCd -= dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.mouseDown && G.weapon === 2) tryShoot();
}

/* ---------------- the main update ---------------- */
function update(dt) {
  if (G.mode === "menu") {
    G.time += dt;
    G.clock += dt * (24 / 360);
    if (G.clock >= 24) G.clock -= 24;
    G.cam.x = 1200 + Math.sin(G.time * 0.05) * 500;
    G.cam.y = 1200 + Math.cos(G.time * 0.04) * 400;
    return;
  }
  if (G.mode !== "play") return;
  dt = Math.min(dt, 0.05);
  if (dt <= 0) dt = 0.016;
  G.time += dt;
  G.clock += dt * (24 / 360);
  if (G.clock >= 24) G.clock -= 24;
  updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updateCops(dt);
  updateCopCars(dt);
  updatePolice(dt);
  updateMissions(dt);
  updateTaxi(dt);
  updatePackages();
  updateSpray();
  updateFx(dt);
  if (G.player.car) {
    var sp = Math.abs(G.player.car.speed);
    var note = 50 + sp * 0.5;
    if (Math.abs(note - G.engineNote) > 12) { G.engineNote = note; }
  }
}

/* ---------------- overlays ---------------- */
function syncOverlays() {
  try {
    var menu = document.getElementById("menu");
    var pause = document.getElementById("pause");
    var wasted = document.getElementById("wasted");
    var cont = document.getElementById("btn-continue");
    if (menu) menu.style.display = G.mode === "menu" ? "flex" : "none";
    if (pause) pause.style.display = G.mode === "paused" ? "flex" : "none";
    if (wasted) wasted.style.display = G.mode === "wasted" ? "flex" : "none";
    if (cont) {
      if (G.mode === "menu") cont.disabled = !loadSave();
      else cont.disabled = false;
    }
  } catch (e) {}
}
function togglePause() {
  if (G.mode === "play") { G.mode = "paused"; say(""); }
  else if (G.mode === "paused") { G.mode = "play"; }
  syncOverlays();
}

/* ---------------- render ---------------- */
function dayFactor() {
  var h = G.clock;
  if (h < 6 || h > 18) return 0;
  return Math.sin((h - 6) / 12 * Math.PI);
}
function drawCar(c, isPlayer) {
  var x = c.x, y = c.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(c.heading);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-20, -10, 42, 22);
  ctx.fillStyle = c.dead ? "#3a3a3a" : c.color;
  ctx.fillRect(-19, -11, 38, 22);
  ctx.fillStyle = "#1c2733";
  ctx.fillRect(-6, -9, 12, 18);
  ctx.fillStyle = c.dead ? "#555" : "#cfe8ff";
  ctx.fillRect(8, -8, 7, 16);
  if (c.police) {
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(-19, -11, 10, 22);
    ctx.fillStyle = (Math.floor(G.time * 4) % 2 === 0) ? "#ff2e4d" : "#2e7bff";
    ctx.fillRect(-2, -11, 6, 5);
    ctx.fillStyle = (Math.floor(G.time * 4) % 2 === 0) ? "#2e7bff" : "#ff2e4d";
    ctx.fillRect(-2, 6, 6, 5);
  }
  if (isPlayer) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.strokeRect(-22, -14, 44, 28);
  }
  ctx.restore();
  if (c.dead) {
    ctx.fillStyle = "rgba(40,40,40,0.5)";
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
  }
}
function render() {
  if (!ctx || !canvas) return;
  var W = canvas.width || VIEW_W, H = canvas.height || VIEW_H;
  var camX = G.cam.x - W / 2, camY = G.cam.y - H / 2;
  /* ground */
  ctx.fillStyle = "#7fae62";
  ctx.fillRect(0, 0, W, H);
  /* beach + water on the east edge */
  ctx.fillStyle = "#e8d49a";
  ctx.fillRect(2290 - camX, 0, 110, H);
  ctx.fillStyle = "#2e7fa8";
  ctx.fillRect(2360 - camX, 0, 60, H);
  /* port concrete at the south edge */
  ctx.fillStyle = "#8d9299";
  ctx.fillRect(0, 2025 - camY, W, H - (2025 - camY));
  /* park */
  ctx.fillStyle = "#5da24a";
  ctx.fillRect(900 - camX, 660 - camY, 330, 290);
  ctx.fillStyle = "#8fce6e";
  ctx.beginPath(); ctx.arc(980 - camX, 730 - camY, 26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1150 - camX, 880 - camY, 30, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1010 - camX, 900 - camY, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6db3e8";
  ctx.beginPath(); ctx.arc(1120 - camX, 740 - camY, 20, 0, Math.PI * 2); ctx.fill();
  /* airfield runway */
  ctx.fillStyle = "#5a5f6a";
  ctx.fillRect(1300 - camX, 40 - camY, 1000, 60);
  ctx.fillStyle = "#f2f2f2";
  for (var rx = 1340; rx < 2280; rx += 80) ctx.fillRect(rx - camX, 66 - camY, 40, 6);
  /* roads */
  ctx.fillStyle = "#3a3f47";
  var i, j;
  for (i = 0; i < ROADS_X.length; i++) ctx.fillRect(ROADS_X[i] - ROAD_HALF - camX, 0, ROAD_HALF * 2, H);
  for (j = 0; j < ROADS_Y.length; j++) ctx.fillRect(0, ROADS_Y[j] - ROAD_HALF - camY, W, ROAD_HALF * 2);
  /* road centre dashes */
  ctx.fillStyle = "#d8c25a";
  for (i = 0; i < ROADS_X.length; i++) {
    for (var dy = 20; dy < WORLD_H; dy += 70) ctx.fillRect(ROADS_X[i] - 2 - camX, dy - camY, 4, 30);
  }
  for (j = 0; j < ROADS_Y.length; j++) {
    for (var dx = 20; dx < WORLD_W; dx += 70) ctx.fillRect(dx - camX, ROADS_Y[j] - 2 - camY, 30, 4);
  }
  /* docks containers */
  var contCols = ["#c96f4a", "#4a7fc9", "#7fae62", "#c9a44a"];
  for (var ci = 0; ci < 8; ci++) {
    ctx.fillStyle = contCols[ci % 4];
    ctx.fillRect(120 + ci * 90 - camX, 2100 - camY, 70, 34);
  }
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(900 - camX, 2080 - camY, 300, 20);
  /* stadium field */
  ctx.fillStyle = "#4d8f3f";
  ctx.fillRect(2100 - camX, 1760 - camY, 160, 120);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(2176 - camX, 1760 - camY, 4, 120);
  /* buildings */
  for (i = 0; i < G.buildings.length; i++) {
    var b = G.buildings[i];
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(b.x + 4 - camX, b.y + 4 - camY, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(b.x - camX, b.y - camY, b.w, 6);
    ctx.fillStyle = "rgba(20,30,50,0.55)";
    var wx, wy;
    for (wx = b.x + 10; wx < b.x + b.w - 12; wx += 24) {
      for (wy = b.y + 12; wy < b.y + b.h - 12; wy += 24) {
        ctx.fillRect(wx - camX, wy - camY, 10, 12);
      }
    }
    if (b.label) {
      ctx.fillStyle = "#20242c";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.label, b.x + b.w / 2 - camX, b.y + b.h / 2 + 5 - camY);
      ctx.textAlign = "left";
    }
  }
  /* place signs */
  ctx.fillStyle = "#20242c";
  ctx.font = "bold 12px sans-serif";
  var signs = [["Sunset Motel", 290, 400], ["Reef Garage", 550, 400], ["Ironclad Guns", 1070, 400], ["Pay 'n Spray", 1590, 400], ["Palmetto Docks", 290, 1960], ["Golden Palm Pawn", 550, 1180], ["First Palmetto Bank", 1330, 1180], ["Hibiscus Park", 1070, 790], ["Palmetto Mall", 1590, 1960], ["Palmetto Bowl", 1990, 1740], ["Safehouse", 2110, 660]];
  for (i = 0; i < signs.length; i++) ctx.fillText(signs[i][0], signs[i][1] - camX - 40, signs[i][2] - camY);
  /* hidden packages */
  for (i = 0; i < G.packages.length; i++) {
    var p = G.packages[i];
    if (p.got) continue;
    var bob = Math.sin(G.time * 3 + p.bob) * 3;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(p.x - 9 - camX, p.y - 9 + bob - camY, 18, 18);
    ctx.fillStyle = "#ff5a3c";
    ctx.fillRect(p.x - 9 - camX, p.y - 3 + bob - camY, 18, 5);
  }
  /* peds */
  for (i = 0; i < G.peds.length; i++) {
    var pd = G.peds[i];
    var px = pd.x - camX, py = pd.y - camY;
    if (pd.down) {
      ctx.fillStyle = "#8a6d3b";
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.fillStyle = pd.color;
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2c9a0";
    ctx.beginPath(); ctx.arc(px, py - 2, 4, 0, Math.PI * 2); ctx.fill();
    if (pd.taxi) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("TAXI $", px - 16, py - 14);
    }
  }
  /* cars */
  for (i = 0; i < G.cars.length; i++) drawCar(G.cars[i], G.player.car === G.cars[i]);
  for (i = 0; i < G.copCars.length; i++) drawCar(G.copCars[i], false);
  /* foot cops */
  for (i = 0; i < G.cops.length; i++) {
    var cp = G.cops[i];
    ctx.fillStyle = "#20242c";
    ctx.beginPath(); ctx.arc(cp.x - camX, cp.y - camY, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2e7bff";
    ctx.beginPath(); ctx.arc(cp.x - camX, cp.y - camY - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  /* player on foot */
  if (G.player.onFoot) {
    var ux = G.player.x - camX, uy = G.player.y - camY;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.arc(ux, uy + 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#14b8a6";
    ctx.beginPath(); ctx.arc(ux, uy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2c9a0";
    ctx.beginPath(); ctx.arc(ux, uy - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux + Math.cos(G.player.heading) * 16, uy + Math.sin(G.player.heading) * 16);
    ctx.stroke();
  }
  /* tracers + particles */
  for (i = 0; i < G.tracers.length; i++) {
    var t = G.tracers[i];
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x1 - camX, t.y1 - camY);
    ctx.lineTo(t.x2 - camX, t.y2 - camY);
    ctx.stroke();
  }
  for (i = 0; i < G.particles.length; i++) {
    var pt = G.particles[i];
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 3 - camX, pt.y - 3 - camY, 6, 6);
  }
  /* mission marker */
  if (G.missionIdx < MISSIONS.length) {
    var target = missionTarget();
    if (target) {
      var tx = target.x - camX, ty = target.y - camY;
      var pulse = 14 + Math.sin(G.time * 5) * 4;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  /* day / night tint */
  var df = dayFactor();
  if (df < 1) {
    ctx.fillStyle = "rgba(12,22,64," + ((1 - df) * 0.28).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  if (G.mode === "play" || G.mode === "paused" || G.mode === "wasted") drawHud(W, H);
  syncOverlays();
}
function missionTarget() {
  var idx = G.missionIdx, s = G.missionStep;
  if (idx === 0) {
    if (s === 0) return PLACES.motel;
    if (s === 1) {
      for (var i = 0; i < G.cars.length; i++) if (G.cars[i].parked) return { x: G.cars[i].x, y: G.cars[i].y };
      return PLACES.garage;
    }
    return PLACES.garage;
  }
  if (idx === 1) return s === 0 ? PLACES.docks : PLACES.pawn;
  if (idx === 2) return s === 0 ? { x: 2100, y: 1760 } : PLACES.garage;
  if (idx === 3) return PLACES.safehouse;
  if (idx === 4) return s === 0 ? PLACES.park : PLACES.mall;
  if (idx === 5) {
    if (s === 0) return PLACES.bank;
    if (s === 1) return PLACES.bank;
    return PLACES.safehouse;
  }
  return null;
}
function drawHud(W, H) {
  ctx.textAlign = "left";
  /* top-left status panel */
  ctx.fillStyle = "rgba(8,12,20,0.72)";
  ctx.fillRect(12, 12, 250, 96);
  ctx.fillStyle = "#f2ede3";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("PALMETTO HEAT", 24, 34);
  ctx.font = "14px sans-serif";
  ctx.fillText("Cash  $" + G.cash, 24, 56);
  /* health bar */
  ctx.fillStyle = "#3a0d0d";
  ctx.fillRect(24, 64, 150, 12);
  ctx.fillStyle = G.health > 30 ? "#37c978" : "#ff2e4d";
  ctx.fillRect(24, 64, 150 * clamp(G.health / 100, 0, 1), 12);
  ctx.fillStyle = "#f2ede3";
  ctx.fillText(Math.round(G.health) + "", 182, 75);
  /* wanted stars */
  var stars = "";
  for (var s = 0; s < 5; s++) stars += s < G.wanted ? "★" : "☆";
  ctx.fillStyle = "#ffb042";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(stars, 24, 98);
  /* weapon + clock */
  ctx.fillStyle = "#f2ede3";
  ctx.font = "14px sans-serif";
  ctx.fillText((G.weapon === 2 ? "PISTOL " + G.ammo : "FISTS"), 24, 122 - 14);
  var hh = Math.floor(G.clock), mm = Math.floor((G.clock - hh) * 60);
  ctx.fillText((hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm, 200, 108);
  /* mission line */
  if (G.missionIdx < MISSIONS.length) {
    var m = MISSIONS[G.missionIdx];
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(12, H - 62, 560, 50);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("JOB " + (G.missionIdx + 1) + "/6 — " + m.title + "  ($" + m.payout + ")", 24, H - 40);
    ctx.fillStyle = "#f2ede3";
    ctx.font = "13px sans-serif";
    ctx.fillText(m.desc, 24, H - 20);
  } else {
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(12, H - 62, 560, 50);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("ALL JOBS DONE — Palmetto City is yours.", 24, H - 30);
  }
  /* speed + car */
  if (!G.player.onFoot && G.player.car) {
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(W - 232, H - 62, 220, 50);
    ctx.fillStyle = "#f2ede3";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(Math.round(Math.abs(G.player.car.speed) * 0.55) + " mph", W - 220, H - 40);
    ctx.font = "13px sans-serif";
    ctx.fillText(G.player.car.model.name, W - 220, H - 20);
  }
  /* taxi line */
  if (G.taxi) {
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(W / 2 - 130, 12, 260, 30);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("TAXI FARE $" + G.taxi.fare + " — follow the marker", W / 2 - 118, 32);
  }
  /* transient message */
  if (G.msgT > 0 && G.msg) {
    ctx.fillStyle = "rgba(8,12,20,0.78)";
    var mw = 20 + G.msg.length * 7.5;
    ctx.fillRect(W / 2 - mw / 2, 52, mw, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(G.msg, W / 2, 72);
    ctx.textAlign = "left";
  }
  drawMinimap(W, H);
}
function drawMinimap(W, H) {
  var cx = W - 92, cy = 92, r = 72, scale = (r * 2) / WORLD_W;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(10,16,26,0.85)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.strokeStyle = "#5a6472";
  ctx.lineWidth = 2;
  var i;
  for (i = 0; i < ROADS_X.length; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - r + ROADS_X[i] * scale, cy - r);
    ctx.lineTo(cx - r + ROADS_X[i] * scale, cy + r);
    ctx.stroke();
  }
  for (i = 0; i < ROADS_Y.length; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r + ROADS_Y[i] * scale);
    ctx.lineTo(cx + r, cy - r + ROADS_Y[i] * scale);
    ctx.stroke();
  }
  function dot(wx, wy, color, rad) {
    var mx = cx - r + wx * scale, my = cy - r + wy * scale;
    var ddx = mx - cx, ddy = my - cy;
    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dd > r - 4) { mx = cx + ddx / dd * (r - 4); my = cy + ddy / dd * (r - 4); }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx, my, rad, 0, Math.PI * 2); ctx.fill();
  }
  for (i = 0; i < G.packages.length; i++) if (!G.packages[i].got) dot(G.packages[i].x, G.packages[i].y, "#ffd166", 2);
  for (i = 0; i < G.copCars.length; i++) dot(G.copCars[i].x, G.copCars[i].y, "#2e7bff", 4);
  for (i = 0; i < G.cops.length; i++) dot(G.cops[i].x, G.cops[i].y, "#ff2e4d", 3);
  var tgt = G.taxi ? { x: G.taxi.dx, y: G.taxi.dy } : missionTarget();
  if (tgt) dot(tgt.x, tgt.y, "#ffd166", 5);
  dot(G.player.x, G.player.y, "#ffffff", 4);
  ctx.restore();
  ctx.strokeStyle = "#ffb042";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

/* ---------------- input ---------------- */
function bindInput() {
  try {
    window.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      G.keys[k] = true;
      if (e.repeat) return;
      if (k === "e") interact();
      else if (k === " ") { punch(); if (e.preventDefault) e.preventDefault(); }
      else if (k === "1") G.weapon = 1;
      else if (k === "2") G.weapon = 2;
      else if (k === "t") hailTaxi();
      else if (k === "m") { G.musicOn = !G.musicOn; say(G.musicOn ? "Music on." : "Music off."); }
      else if (k === "escape" || k === "p") togglePause();
      else if (k === "enter" && G.mode === "menu") startGame(false);
    });
    window.addEventListener("keyup", function (e) {
      G.keys[(e.key || "").toLowerCase()] = false;
    });
    window.addEventListener("mousemove", function (e) {
      G.aimX = (typeof e.clientX === "number") ? e.clientX : VIEW_W / 2;
      G.aimY = (typeof e.clientY === "number") ? e.clientY : VIEW_H / 2;
    });
    window.addEventListener("mousedown", function (e) {
      if (e.target && e.target.id === "game") {
        G.mouseDown = true;
        tryShoot();
      }
    });
    window.addEventListener("mouseup", function () { G.mouseDown = false; });
  } catch (e) {}
  try {
    var nb = document.getElementById("btn-new");
    var cb = document.getElementById("btn-continue");
    if (nb) nb.addEventListener("click", function () { startGame(false); });
    if (cb) cb.addEventListener("click", function () { startGame(true); });
  } catch (e) {}
}

/* ---------------- boot ---------------- */
buildWorld();
spawnTraffic();
spawnPeds();
bindInput();
syncOverlays();
var lastT = 0;
function loop(t) {
  try { requestAnimationFrame(loop); } catch (e) {}
  var now = (typeof t === "number") ? t : 0;
  if (!now && typeof performance !== "undefined" && performance.now) { try { now = performance.now(); } catch (e) { now = 0; } }
  var dt = lastT ? (now - lastT) / 1000 : 0.016;
  lastT = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) dt = 0.016;
  try { update(dt); } catch (e) {}
  try { render(); } catch (e) {}
}
try { requestAnimationFrame(loop); } catch (e) {}

/* ---------------- debug hook (used by the acceptance tests) ---------------- */
window.__PALMETTO = {
  G: G,
  MISSIONS: MISSIONS,
  startGame: startGame,
  update: update,
  render: render,
  addHeat: addHeat,
  saveGame: saveGame,
  loadSave: loadSave
};

})();
