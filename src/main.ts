import rosterJson from "./data/roster.json";
import { bootPlayableGame } from "./interaction";
import { parseRosterSnapshot } from "./types/player";

function initializeGame(): void {
  const gameShell = document.querySelector<HTMLElement>(".game-shell");
  if (gameShell === null) {
    return;
  }

  const parsedRoster = parseRosterSnapshot(rosterJson);
  if (!parsedRoster.ok) {
    gameShell.dataset.ready = "false";
    showSnapshotError(parsedRoster.issues);
    return;
  }
  bootPlayableGame({ snapshot: parsedRoster.snapshot });
}

function showSnapshotError(issues: readonly string[]): void {
  const status = document.querySelector<HTMLElement>("#game-status");
  if (status === null) {
    return;
  }
  const firstIssue = issues[0] ?? "The bundled player snapshot is invalid.";
  status.textContent = `Game data could not load: ${firstIssue} Refresh after replacing the bundled roster.`;
}

function boot(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGame, { once: true });
    return;
  }
  initializeGame();
}

boot();
