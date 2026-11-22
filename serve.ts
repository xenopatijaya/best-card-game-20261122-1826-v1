// Ember Pact — a tiny static file server for local play-testing.
// Serves game/ on localhost port 8080. Node standard library only.

// SPDX-License-Identifier: MIT

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const gameDir = join(root, "game");
const PORT = 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = normalize(join(gameDir, decodeURIComponent(url.pathname)));
    if (!path.startsWith(gameDir)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (path.endsWith("/")) path = join(path, "index.html");
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`Ember Pact served at http://localhost:${PORT}/`);
});
