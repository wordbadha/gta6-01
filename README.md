# Palmetto Heat

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/wordbadha/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/wordbadha/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun. It runs
entirely offline in a desktop browser from its own static files — no
network, no libraries, no build step for the game itself.

## The game

Palmetto City is a sun-soaked original city: a beach and a port, a stadium
and a mall, a park, a hospital, a bank, a gun shop, a Pay 'n Spray, a
pawn shop, a garage, a motel and a safehouse, all on a road grid full of
traffic and pedestrians. You are Jax "Reef" Carter, back in town with one
job from Lena "Nova" Diaz: six story missions, from stealing your first
car to holding up Palmetto Bank and escaping to the safehouse.

What is in the game:

- **An open city to explore** on foot and by car, with traffic that drives
  the roads, pedestrians on the sidewalks, and a day/night cycle.
- **Cars to steal** — parked and from traffic — with driving, steering,
  braking and reversing, in several original models (Palmetto GT, Vice
  Sedan, Suncoast Taxi, Harbor Van, Beach Cruiser, Palmetto Truck).
- **A 5-star wanted level** with Palmetto PD patrol cars that chase and
  ram, foot cops that chase and punch (and shoot at high heat), and heat
  that fades when you stay out of sight or gets washed off at the
  Pay 'n Spray.
- **Six story missions** with payouts, plus taxi fares, ten hidden
  packages worth $100 each, a gun shop, and a safehouse that saves.
- **Combat** on foot and from vehicles: fists and a pistol with aimed
  mouse fire, destructible police cars and cops.
- **A HUD** with health, cash, wanted stars, weapon, clock, speed and a
  live circular minimap showing the player, the mission marker and
  police blips — plus a menu, pause and wasted screens.
- **Synthesised sound and music** via WebAudio (no audio files): engine
  hum, gunshots, pickups, mission jingles and a bass-led music loop.
- **Save and continue** via localStorage.

Everything — the city, characters, vehicles, story, art and music — is
original. Nothing is taken from Rockstar Games or any other commercial
game.

## How to play

Open `game/index.html` in a desktop browser (or serve the folder with any
static server). Click **NEW GAME** to start fresh, or **CONTINUE** to pick
up a save.

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot; drive (W accelerate, S brake/reverse, A/D steer) |
| Shift | Run |
| E | Enter or exit a car; interact at the gun shop |
| Space | Punch |
| Mouse + click | Aim and shoot the pistol (hold to keep firing) |
| 1 / 2 | Fists / pistol |
| T | Pick up a taxi fare while driving near a waiting fare |
| M | Toggle music |
| P / Esc | Pause |

Follow the mission text at the top left. The yellow beacon and the
minimap show where the current objective is. Wanted stars bring the PD:
lose them at the Pay 'n Spray ($100) or stay out of sight.

## Files

- `game/index.html` — the page (canvas, HUD, menu overlays).
- `game/style.css` — the page styling.
- `game/game.js` — the whole game in one plain script file.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` with the kit's
  vendored `vendor/makefun-game.ts` library.
- `serve.ts` — serves `game/` locally for play-testing.
- `screenshots/` — screenshots of the game itself, taken in a browser.

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/dossier.json` plus `out/game/` and `out/screenshots/`
(and the game's files at the output root, so `out/index.html` opens
directly). It needs only Node 22 and the standard library, and writes
the same bytes on every run.

## License

MIT — see `LICENSE`.
