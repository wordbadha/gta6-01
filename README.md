# Palmetto Heat

An original 2D top-down open-world crime game, built for the make.fun
gta6-01 bounty ("Make GTA 6"). It runs entirely offline from its own
static files — no network, no CDN, no build step.

## The game

Palmetto City is a sun-soaked fictional city of roads, traffic,
pedestrians, a beach, a port, a park, an airfield, a hospital, a police
station, a bank, docks, a motel, a garage, a safehouse, a gun shop, a
Pay 'n Spray, a pawn shop, a mall and a stadium. You are Jax "Reef"
Carter, back in town, running jobs for Lena "Nova" Diaz while the
Palmetto PD gives chase. Every character, place, vehicle, story beat,
sound and piece of art is original — nothing is taken from Rockstar
Games or any other commercial game.

What is in the game:

- **Explore on foot and by car** — a 2400×2400 city with a road grid,
  traffic that drives the roads, and pedestrians who wander them.
- **Steal and drive cars** — parked cars and traffic cars, eight
  original models (Palmetto GT, Coral Sedan, Bay Taxi, Gator Truck…).
- **A 5-star wanted level** — Palmetto PD patrol cars chase your car
  and foot cops chase you down; wanted fades when you stay out of
  sight, and a Pay 'n Spray clears it for $100.
- **Six story missions** — meet Lena, steal a car, run the docks,
  steal the Palmetto GT, lay low, and rob the First Palmetto Bank.
- **Activities** — taxi fares (pick up a waiting fare while driving),
  10 hidden packages worth $100 each, a gun shop selling ammo.
- **Combat** — fists and a pistol, mouse aim, shooting from the
  street or from a car; wrecked police cars and cops raise the heat.
- **HUD and minimap** — health, cash, wanted stars, weapon, clock,
  speed, and a live circular minimap with mission markers and police
  blips, plus a day/night cycle.
- **Sound and music** — synthesised WebAudio effects and a music
  loop; nothing is loaded from a file.
- **Save and continue** — progress saves to localStorage at the
  safehouse (or with the Continue button); dying sends you to
  Palmetto General Hospital to recover.

## How to play

Serve the `game/` folder with any static server, or just open
`game/index.html` in desktop Chrome:

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive a car |
| Shift | Run |
| E | Enter / exit a car, interact at shops |
| Space | Punch |
| Mouse + click | Aim and shoot (pistol) |
| 1 / 2 | Fists / pistol |
| T | Pick up a taxi fare while driving |
| M | Toggle music |
| Esc / P | Pause |

Start cash is $250. Finishing all six jobs pays out over $5,000 —
plus fares and hidden packages along the way.

## Build

There is no build step for the game itself: `game/index.html`,
`game/style.css` and `game/game.js` (one plain script) are the game.

The entry program is `main.ts` (Node 22, standard library only). It
copies `game/` and `screenshots/` into the output directory and writes
`dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
