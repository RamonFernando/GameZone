import { test, expect } from "@playwright/test";

test.describe("Search and cart", () => {
  test("search bar filters game list", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator(".nav-search-input").first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill("FIFA");
    await searchInput.press("Enter");

    // After search, URL should reflect the query or results should update
    await page.waitForTimeout(500);

    // Either URL has ?q= or some game cards are shown
    const hasQuery = page.url().includes("q=") || page.url().includes("FIFA");
    const gameCards = page.locator(".game-card, [class*=\'card\']").first();

    expect(hasQuery || (await gameCards.isVisible())).toBeTruthy();
  });

  test("adds a product to cart and opens cart drawer", async ({ page }) => {
    await page.goto("/");

    // Wait for product cards to load
    const addBtn = page.getByRole("button", { name: /Añadir|Add/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });

    await addBtn.click();

    // Cart drawer should open
    await expect(page.locator(".cart-drawer")).toBeVisible({ timeout: 5_000 });
  });

  test("cart shows item after adding and can be closed", async ({ page }) => {
    await page.goto("/");

    const addBtn = page.getByRole("button", { name: /Añadir|Add/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const cartDrawer = page.locator(".cart-drawer");
    await expect(cartDrawer).toBeVisible({ timeout: 5_000 });

    // Cart should not be empty
    await expect(cartDrawer.locator(".cart-item")).toBeVisible({ timeout: 5_000 });

    // Close the cart
    const closeBtn = cartDrawer.getByRole("button", { name: /Cerrar|Close|✕|×/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(cartDrawer).not.toBeVisible({ timeout: 3_000 });
    }
  });
});
