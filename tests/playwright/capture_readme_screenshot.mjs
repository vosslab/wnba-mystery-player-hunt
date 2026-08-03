/**
 * Capture the README's static gameplay proof from the built GitHub Pages artifact.
 *
 * Rerun from the repository root:
 *   ./build_github_pages.sh && node tests/playwright/capture_readme_screenshot.mjs /tmp/wnba_pickle_feedback.png
 *
 * The harness intentionally serves only dist/ and fails if the page tries to reach
 * WNBA domains. It uses the bundled roster and captures one wrong,
 * accepted guess so the nine-clue comparison feedback is visible without spoiling
 * the daily answer.
 */

import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = path.resolve(process.argv[2] ?? "/tmp/wnba_pickle_feedback.png");
const port = 4400 + (process.pid % 1000);
const serverUrl = `http://127.0.0.1:${port}/`;

function startStaticServer() {
  const distDirectory = path.join(repositoryRoot, "dist");
  return http.createServer(async (request, response) => {
    const requestedPath = new URL(request.url ?? "/", serverUrl).pathname;
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
    const resolvedPath = path.resolve(distDirectory, relativePath);
    if (!resolvedPath.startsWith(`${distDirectory}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const body = await readFile(resolvedPath);
      const contentType = resolvedPath.endsWith(".js")
        ? "text/javascript"
        : resolvedPath.endsWith(".css")
          ? "text/css"
          : "text/html";
      response.writeHead(200, { "content-type": contentType }).end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function close(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

const roster = JSON.parse(
  await readFile(path.join(repositoryRoot, "src/data/roster.json"), "utf8"),
);
const players = roster.players;
if (!Array.isArray(players) || players.length < 2) {
  throw new Error("The bundled roster needs at least two players for a feedback capture.");
}

const server = startStaticServer();
await listen(server);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  colorScheme: "light",
});
const diagnostics = [];
page.on("pageerror", (error) => diagnostics.push(`Page error: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") diagnostics.push(`Console error: ${message.text()}`);
});
page.on("request", (request) => {
  if (request.url().includes("wnba.com"))
    diagnostics.push(`Unexpected WNBA request: ${request.url()}`);
});

try {
  await page.goto(serverUrl, { waitUntil: "networkidle" });

  const search = page.getByLabel("Search by player or team");
  let accepted = false;
  for (const player of players) {
    // Each candidate must begin a new active round. A winning candidate writes
    // to local storage, so merely reloading after it would leave a completed
    // round and could make a stale row look like fresh comparison feedback.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    const comparisonRows = page.locator('[data-grid="comparison"] tbody tr');
    if ((await comparisonRows.count()) !== 0)
      throw new Error("A fresh screenshot attempt unexpectedly has saved guesses.");
    if (await page.getByRole("dialog").isVisible())
      throw new Error("A fresh screenshot attempt unexpectedly has a result dialog.");

    await search.fill(player.displayName);
    await page.getByRole("button", { name: "Guess" }).click();
    if ((await comparisonRows.count()) === 1 && !(await page.getByRole("dialog").isVisible())) {
      accepted = true;
      break;
    }
  }
  if (!accepted)
    throw new Error(
      "Every development-fixture player solved today's puzzle; no feedback state is available.",
    );

  const comparisonRows = page.locator('[data-grid="comparison"] tbody tr');
  if ((await comparisonRows.count()) !== 1)
    throw new Error("The capture must contain exactly one newly accepted guess.");
  const feedback = comparisonRows.first().locator("[data-feedback]");
  if ((await feedback.count()) !== 9)
    throw new Error("The captured round did not render all nine clue feedback cells.");
  if (await page.getByRole("dialog").isVisible())
    throw new Error("The capture must show feedback, not a completed result dialog.");
  if (diagnostics.length) throw new Error(diagnostics.join("\n"));

  await page.screenshot({ path: outputPath });
  console.log(`Captured ${outputPath} from ${serverUrl}`);
} finally {
  await browser.close();
  await close(server);
}
