// Palmetto Heat — the entry program (Node 22, standard library only).
// It copies the game and its screenshots into the output directory and
// writes the dossier the judge reads, using the kit's vendored library.
// The game's own files are also copied to the output root, so a browser
// test can open the output's index.html directly.
// Deterministic: no timestamps and no random data, so two runs write the
// same bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The browser test loads the output root's index.html, so the three files
// the page itself needs live at the root as well as under game/.
for (const f of ['index.html', 'game.js', 'style.css']) {
  writeFileSync(join(out, f), readFileSync(join(here, 'game', f)));
}

// The scorer's caps: text_max_bytes shapes the dossier text; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, or a
// path under game/ over 1000 bytes).
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
