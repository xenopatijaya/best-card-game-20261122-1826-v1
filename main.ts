// Ember Pact — entrypoint: hands the game in to make.fun.
// Copies game/ and screenshots/ from beside this file into the output
// directory (MAKEFUN_OUTPUT_DIR, default /output), then writes
// /output/dossier.json with buildDossier from the vendored library.
// Node standard library only; no network; deterministic output.

// SPDX-License-Identifier: MIT

import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const root = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

const MAX_DOSSIER_BYTES = 163840;
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 50331648;
const MAX_PATH_BYTES = 1000;

async function listTree(dir, base) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...(await listTree(full, rel)));
    } else if (entry.isFile()) {
      found.push({ full, rel });
    }
  }
  return found.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

async function copyTree(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const files = await listTree(srcDir, "");
  for (const file of files) {
    if (Buffer.byteLength(file.rel, "utf8") > MAX_PATH_BYTES) {
      throw new Error(`path too long: ${file.rel}`);
    }
    const dest = join(destDir, file.rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(file.full, dest);
  }
  return files.length;
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const gameOut = join(outputDir, "game");
  const shotsOut = join(outputDir, "screenshots");
  const gameCount = await copyTree(join(root, "game"), gameOut);
  const shotCount = await copyTree(join(root, "screenshots"), shotsOut);
  if (gameCount > MAX_GAME_FILES) throw new Error(`game has ${gameCount} files`);
  if (shotCount > MAX_SCREENSHOTS) throw new Error(`too many screenshots: ${shotCount}`);

  let gameBytes = 0;
  for (const file of await listTree(gameOut, "")) {
    gameBytes += (await stat(file.full)).size;
  }
  if (gameBytes > MAX_GAME_BYTES) throw new Error(`game too large: ${gameBytes} bytes`);
  for (const file of await listTree(shotsOut, "")) {
    if ((await stat(file.full)).size > MAX_SCREENSHOT_BYTES) {
      throw new Error(`screenshot too large: ${file.rel}`);
    }
  }

  const dossier = buildDossier(outputDir, {
    text_max_bytes: MAX_DOSSIER_BYTES,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    game_max_files: MAX_GAME_FILES,
    game_max_bytes: MAX_GAME_BYTES,
    game_path_max_bytes: MAX_PATH_BYTES,
  });
  await writeFile(join(outputDir, "dossier.json"), dossier, "utf8");
  console.log(`wrote ${outputDir}: ${gameCount} game files, ${shotCount} screenshots`);
}

await main();
