// Palmetto Heat — the hand-in program for make.fun gta6-01 (Node 22, stdlib only).
//
// The game is plain static files under game/ (game/index.html opens in a
// desktop browser and plays offline), and the screenshots live under
// screenshots/. This program copies both into the output directory and
// writes output/dossier.json with the vendored make.fun library, so the
// judge can read the entry. It also copies the game's three files to the
// output root, so the output's own index.html plays directly.
//
// Usage (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output):
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Nothing here carries a timestamp or any other run-varying byte: two runs
// over the same repository write the same bytes.

import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The browser test loads the output's index.html directly, so the game's
// own files sit at the output root as well as under game/.
for (const name of ['index.html', 'game.js', 'style.css']) {
  copyFileSync(join(here, 'game', name), join(out, name));
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in
// all; a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log('Palmetto Heat handed in to ' + out);
