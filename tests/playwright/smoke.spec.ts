import { expect, test, type Page } from "@playwright/test";

/*
 * Selector contract:
 * - src/index.html: player-search, guess-button, pick-player, and game-status.
 * - src/ui_grid.ts: [data-grid="comparison"] and [data-feedback] identify rendered game state.
 * - src/result_dialog.ts: role dialog and its named controls expose the completed-round path.
 */

test.use({ viewport: { width: 800, height: 1280 }, colorScheme: "light" });

async function expectCleanBoot(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WNBA Mystery Player Hunt" })).toBeVisible();
  await expect(page.getByLabel("Search by player or team")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Guess" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Pick for me" })).toBeEnabled();
  await expect(page.locator("#player-pool-summary")).toHaveText(/Player pool: \d+\./);
  await expect(page.getByRole("status")).toContainText("Choose a player");
  expect(errors).toEqual([]);
}

test("smoke: boot exposes a clear next action without introductory UI clutter", async ({
  page,
}) => {
  await expectCleanBoot(page);
  await page.screenshot({
    path: "test-results/playable_walkthrough/00_desktop_light_boot.png",
    fullPage: true,
  });
});
