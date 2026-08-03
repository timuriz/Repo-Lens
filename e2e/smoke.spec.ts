import { expect, test } from "@playwright/test";

test.describe("RepoPrism smoke", () => {
  test("home renders with brand and repo input", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "RepoPrism" })).toBeVisible();
    await expect(page.getByLabel("GitHub repository URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Analyze" })).toBeVisible();
  });

  test("deep-link loads the file tree and repo header", async ({ page }) => {
    await page.goto("/?repo=expressjs/cors");

    // Repo header shows owner/name once the tree is fetched server-side.
    await expect(page.getByRole("link", { name: /expressjs\/\s*cors/ })).toBeVisible({
      timeout: 30_000,
    });

    // Left column file tree panel renders.
    await expect(page.getByText("File Tree", { exact: false })).toBeVisible();

    // Freshness badge exposes a GitHub tree link.
    const treeLink = page.locator('a[href*="/tree/"]').first();
    await expect(treeLink).toBeVisible();
  });

  test("invalid repo does not crash the app", async ({ page }) => {
    await page.goto("/?repo=this-owner-should/definitely-not-exist-xyz-123");

    // App shell (brand + input) stays interactive; no white screen.
    await expect(page.getByRole("heading", { name: "RepoPrism" })).toBeVisible();
    await expect(page.getByLabel("GitHub repository URL")).toBeVisible({
      timeout: 30_000,
    });
  });
});
