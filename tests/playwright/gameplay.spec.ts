import { expect, test, type Page } from "@playwright/test";
import rosterData from "../../src/data/roster.json" with { type: "json" };
import { evaluateGuess } from "../../src/clue_engine";
import { DEFAULT_GUESS_LIMIT } from "../../src/constants";
import { selectDailyPlayer } from "../../src/daily_puzzle";
import { CLUE_DEFINITIONS } from "../../src/types/puzzle";
import {
  parseRosterSnapshot,
  type PlayerRecord,
  type RosterSnapshotV1,
} from "../../src/types/player";

/*
 * Selector contract:
 * - src/index.html: mode controls, player-search, player-suggestions, guess-button,
 *   pick-player, and game-status.
 * - src/ui_grid.ts: [data-grid="comparison"] contains one row per guess slot; filled rows carry
 *   data-guess-state="filled" and one [data-feedback] cell for every configured clue.
 * - src/result_dialog.ts: the native dialog exposes its outcome heading, answer, and share control.
 * Tests import the deterministic selector and bundled roster only to choose a known target;
 * that is test control, never a player-facing shortcut.
 */

const parsedSnapshot = parseRosterSnapshot(rosterData);
if (!parsedSnapshot.ok) {
  throw new Error(`Bundled roster is invalid: ${parsedSnapshot.issues.join(" ")}`);
}
const snapshot: RosterSnapshotV1 = parsedSnapshot.snapshot;

test.use({ viewport: { width: 800, height: 1280 }, colorScheme: "light" });

const FIXED_CLOCK_UTC = "2026-08-02T12:00:00.000Z";
const PUZZLE_DATE_UTC = FIXED_CLOCK_UTC.slice(0, 10);

function targetForFixedPuzzleDate(): PlayerRecord {
  return selectDailyPlayer(snapshot, PUZZLE_DATE_UTC);
}

function nonTargetPlayers(target: PlayerRecord): readonly PlayerRecord[] {
  return snapshot.players.filter((player) => player.playerId !== target.playerId);
}

function attachDiagnostics(page: Page): () => void {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (requestUrl.includes("wnba.com")) {
      errors.push(`Unexpected WNBA network request: ${requestUrl}`);
    }
  });
  return () => expect(errors).toEqual([]);
}

async function openCleanGame(page: Page): Promise<() => void> {
  const assertNoDiagnostics = attachDiagnostics(page);
  await page.clock.install({ time: new Date(FIXED_CLOCK_UTC) });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("Search by player or team")).toBeEnabled();
  await expect(page.locator("#player-pool-summary")).toHaveText(
    `Player pool: ${snapshot.players.length}.`,
  );
  return assertNoDiagnostics;
}

async function submitVisibleGuess(page: Page, player: PlayerRecord): Promise<void> {
  const input = page.getByLabel("Search by player or team");
  await input.fill(player.displayName);
  await page.getByRole("button", { name: "Guess" }).click();
}

async function submitKeyboardGuess(page: Page, player: PlayerRecord): Promise<void> {
  const input = page.getByLabel("Search by player or team");
  await input.fill(player.displayName);
  await expect(
    page.getByRole("option", { name: new RegExp(player.displayName, "i") }),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectFreshClueGrid(page: Page): Promise<void> {
  const grid = page.locator('[data-grid="comparison"]');
  await expect(grid).toBeVisible();
  await expect(grid.locator("thead th")).toHaveText([
    "Player",
    ...CLUE_DEFINITIONS.map((definition) => definition.label),
  ]);
  await expect(grid.locator('tbody tr[data-guess-state="filled"]')).toHaveCount(0);
  await expect(grid.locator('tbody tr[data-guess-state="empty"]')).toHaveCount(DEFAULT_GUESS_LIMIT);
  await expect(grid.getByRole("rowheader", { name: "Guess 1, empty" })).toHaveCount(1);
}

test("gameplay: the visible grid, keyboard feedback, duplicate recovery, and Pick for me work as expected", async ({
  page,
}) => {
  const assertNoDiagnostics = await openCleanGame(page);
  await expectFreshClueGrid(page);
  const input = page.getByLabel("Search by player or team");
  const goldenStatePlayers = snapshot.players.filter((player) => player.teamCode === "GSV");
  expect(goldenStatePlayers.length).toBeGreaterThan(0);
  await input.fill("GSV");
  await expect(page.getByRole("option")).toHaveCount(goldenStatePlayers.length);
  const teamResults = await page.getByRole("option").allTextContents();
  expect(teamResults.every((result) => result.includes("GSV"))).toBe(true);
  await page.screenshot({
    path: "test-results/playable_walkthrough/06_team_roster_search.png",
    fullPage: true,
  });
  await input.fill("rae");
  await expect(page.getByRole("option", { name: /Rae Burrell/i })).toBeVisible();
  await input.fill("qxz");
  await expect(page.getByRole("status")).toContainText(
    `No matching player or team in the ${snapshot.players.length}-player pool`,
  );
  const target = targetForFixedPuzzleDate();
  const firstGuess = nonTargetPlayers(target).find(
    (player) =>
      player.country === "United States" &&
      evaluateGuess(player, target, PUZZLE_DATE_UTC).cells.some((cell) => cell.match === "partial"),
  );
  expect(firstGuess).toBeDefined();
  if (firstGuess === undefined) {
    throw new Error("The bundled roster needs a non-target player for feedback coverage.");
  }

  await submitKeyboardGuess(page, firstGuess);
  const firstRow = page.locator('[data-grid="comparison"] [data-guess-state="filled"]').first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow.locator("[data-feedback]")).toHaveCount(CLUE_DEFINITIONS.length);
  const feedbackBadges = firstRow.locator(".feedback-badge");
  await expect(feedbackBadges).toHaveCount(CLUE_DEFINITIONS.length);
  await expect(feedbackBadges).toHaveText(
    Array(CLUE_DEFINITIONS.length).fill(/Exact|Close|No match/),
  );
  await expect(feedbackBadges.first()).toBeHidden();
  const countryCell = firstRow.locator('[data-clue-label="Country"]');
  await expect(countryCell.locator(".feedback-value")).toHaveText("USA");
  await expect(countryCell).toHaveAttribute("aria-label", /Country: USA\./);
  await expect(firstRow.locator(".feedback-partial").first()).toHaveCSS(
    "background-color",
    "rgb(49, 84, 166)",
  );
  await expect(page.locator(".guess-count")).toHaveText("8 left | 90 pts available");

  await input.fill(firstGuess.displayName);
  await page.getByRole("button", { name: "Guess" }).click();
  await expect(page.getByRole("status")).toContainText("already guessed");
  await expect(input).toHaveValue(firstGuess.displayName);
  await expect(page.locator('[data-grid="comparison"] [data-guess-state="filled"]')).toHaveCount(1);
  await expect(page.locator(".guess-count")).toHaveText("8 left | 90 pts available");

  await page.getByRole("button", { name: "Pick for me" }).click();
  await expect(page.locator('[data-grid="comparison"] [data-guess-state="filled"]')).toHaveCount(1);
  await expect(input).not.toHaveValue("");
  await expect(page.getByRole("status")).toContainText("Press Guess when you are ready");
  await expect(page.locator(".guess-count")).toHaveText("8 left | 90 pts available");
  await page.screenshot({
    path: "test-results/playable_walkthrough/01_feedback_and_recovery.png",
    fullPage: true,
  });

  const matchLabels = page.getByLabel("Match labels");
  await matchLabels.check();
  await expect(feedbackBadges.first()).toBeVisible();
  await page.reload();
  await expect(matchLabels).toBeChecked();
  await expect(page.locator('[data-guess-state="filled"] .feedback-badge').first()).toBeVisible();
  assertNoDiagnostics();
});

test("gameplay: winning opens an explicit result, provides spoiler-free sharing, and survives reload without recounting", async ({
  page,
}) => {
  const assertNoDiagnostics = await openCleanGame(page);
  const target = targetForFixedPuzzleDate();

  await submitKeyboardGuess(page, target);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "You got it!" })).toBeVisible();
  await expect(dialog).toContainText(target.displayName);
  await expect(dialog).toContainText("100 points");
  await dialog.getByRole("button", { name: "Share result" }).click();
  const shareField = dialog.getByLabel("Spoiler-free result text to copy");
  await expect(shareField).toBeVisible();
  const shareText = await shareField.inputValue();
  expect(shareText).not.toContain(target.displayName);
  expect(shareText).not.toContain(target.teamCode);
  await page.screenshot({
    path: "test-results/playable_walkthrough/02_win_share.png",
    fullPage: true,
  });

  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#statistics-summary")).toContainText("1 played");
  await expect(page.locator("#statistics-summary")).toContainText("1 won");
  assertNoDiagnostics();
});

test("gameplay: a selected dark theme persists through reload in the game save", async ({
  page,
}) => {
  const assertNoDiagnostics = await openCleanGame(page);
  const systemTheme = page.locator('input[name="theme"][value="system"]');
  const darkTheme = page.locator('input[name="theme"][value="dark"]');

  await expect(systemTheme).toBeChecked();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page.getByText("Theme", { exact: true }).click();
  await darkTheme.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkTheme).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.localStorage).sort()))
    .toEqual(["wnba-20-questions-save-v1"]);

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('input[name="theme"][value="dark"]')).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.localStorage).sort()))
    .toEqual(["wnba-20-questions-save-v1"]);
  assertNoDiagnostics();
});

test("gameplay: nine distinct visible guesses end in an understandable loss", async ({ page }) => {
  const assertNoDiagnostics = await openCleanGame(page);
  const target = targetForFixedPuzzleDate();
  const lossGuesses = nonTargetPlayers(target).slice(0, 9);
  expect(lossGuesses).toHaveLength(9);

  for (const player of lossGuesses) {
    await submitVisibleGuess(page, player);
  }

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "You didn't solve it." })).toBeVisible();
  await expect(dialog).toContainText(target.displayName);
  await expect(page.locator(".guess-count")).toHaveText("0 left | 0 pts");
  await page.screenshot({ path: "test-results/playable_walkthrough/03_loss.png", fullPage: true });
  assertNoDiagnostics();
});

test("gameplay: practice offers fresh rounds without changing the saved daily game", async ({
  page,
}) => {
  const assertNoDiagnostics = await openCleanGame(page);
  const practiceButton = page.getByRole("button", { name: "Practice", exact: true });
  const dailyButton = page.getByRole("button", { name: "Daily", exact: true });

  await practiceButton.click();
  await expect(practiceButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "New player" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Daily statistics stay unchanged");
  await page.screenshot({
    path: "test-results/playable_walkthrough/05_practice_mode.png",
    fullPage: true,
  });

  const practiceGuess = snapshot.players[0];
  if (practiceGuess === undefined) {
    throw new Error("The bundled roster needs a player for practice coverage.");
  }
  await submitVisibleGuess(page, practiceGuess);
  await expect(page.locator('[data-grid="comparison"] [data-guess-state="filled"]')).toHaveCount(1);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) {
    await dialog.getByRole("button", { name: "Close" }).click();
  }

  await page.getByRole("button", { name: "New player" }).click();
  await expectFreshClueGrid(page);
  await dailyButton.click();
  await expect(dailyButton).toHaveAttribute("aria-pressed", "true");
  await expectFreshClueGrid(page);
  await expect(page.locator("#statistics-summary")).toContainText("0 played");
  assertNoDiagnostics();
});

const responsiveViewports = [{ name: "desktop", width: 1920, height: 1080 }] as const;

for (const viewport of responsiveViewports) {
  test.describe(`responsive ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
    });

    test("gameplay: help, theme, and a first guess remain usable", async ({ page }) => {
      const assertNoDiagnostics = await openCleanGame(page);
      const instructions = page.getByText(
        "Use each row's feedback to narrow the field. You have nine guesses. A first-guess win " +
          "scores 100 points; each extra guess costs 10 points. Practice rounds do not change " +
          "daily statistics.",
      );

      await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
      await expect(instructions).toBeVisible();
      await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
      await expect(page.locator("#statistics-summary")).toBeVisible();

      await page.getByText("Theme", { exact: true }).click();
      const darkTheme = page.locator('input[name="theme"][value="dark"]');
      const lightTheme = page.locator('input[name="theme"][value="light"]');
      await darkTheme.check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await lightTheme.check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      const target = targetForFixedPuzzleDate();
      const firstGuess = nonTargetPlayers(target).find((player) =>
        evaluateGuess(player, target, PUZZLE_DATE_UTC).cells.some(
          (cell) => cell.match === "partial",
        ),
      );
      if (firstGuess === undefined) {
        throw new Error("The bundled roster needs close feedback for responsive coverage.");
      }
      await submitVisibleGuess(page, firstGuess);
      await expect(
        page.locator('[data-grid="comparison"] [data-guess-state="filled"]'),
      ).toHaveCount(1);
      await expectNoHorizontalOverflow(page);

      await darkTheme.check();
      const closeCell = page.locator('[data-guess-state="filled"] .feedback-partial').first();
      await expect(closeCell).toHaveCSS("background-color", "rgb(154, 186, 255)");
      await page.screenshot({
        path: "test-results/playable_walkthrough/07_desktop_dark_feedback.png",
        fullPage: true,
      });

      const input = page.getByLabel("Search by player or team");
      const guessButton = page.getByRole("button", { name: "Guess" });
      await input.scrollIntoViewIfNeeded();
      await expect(input).toBeInViewport();
      await expect(guessButton).toBeInViewport();
      await expect(input).toBeEditable();
      assertNoDiagnostics();
    });
  });
}
