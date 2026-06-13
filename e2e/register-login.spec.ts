import { test, expect } from "@playwright/test";

const UNIQUE_EMAIL = `e2e-test-${Date.now()}@gamezone.dev`;

test.describe("Register + Login flow", () => {
  test("shows register form and validates required fields", async ({ page }) => {
    await page.goto("/auth");

    // Switch to register mode
    const registerTab = page.getByRole("button", { name: /Crear cuenta|Registro|Register/i });
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }

    // Submit empty form — should stay on page with validation
    const submitBtn = page.getByRole("button", { name: /Crear cuenta|Registrar|Sign up/i }).last();
    await submitBtn.click();

    // Page should not navigate away (validation blocks)
    await expect(page).toHaveURL(/\/auth/);
  });

  test("shows login form with email and password fields", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // Mock the login API to return 401
    await page.route("/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Credenciales incorrectas.", code: "INVALID_CREDENTIALS" }),
      })
    );

    await page.goto("/auth");

    await page.locator('input[name="identifier"]').fill("noexiste@test.com");
    await page.locator('input[name="password"]').fill("wrongpassword");

    const submitBtn = page.getByRole("button", { name: /Entrar|Login|Iniciar sesión/i }).first();
    await submitBtn.click();

    // Should show an error message
    await expect(page.getByText(/Credenciales|incorrecto|inválido/i)).toBeVisible({ timeout: 8_000 });
  });

  test("redirects to account after successful login", async ({ page }) => {
    // Mock successful login
    await page.route("/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Bienvenido.", role: "USER" }),
        headers: {
          "Set-Cookie": "session=mocktoken; Path=/; HttpOnly; SameSite=Lax",
        },
      })
    );

    await page.goto("/auth");

    await page.locator('input[name="identifier"]').fill("user@gamezone.dev");
    await page.locator('input[name="password"]').fill("Password123!");

    const submitBtn = page.getByRole("button", { name: /Entrar|Login|Iniciar sesión/i }).first();
    await submitBtn.click();

    // After mock success, app should navigate away from /auth
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 8_000 });
  });
});
