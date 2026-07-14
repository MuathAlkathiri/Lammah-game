import { expect, test } from "@playwright/test";

test("protects the admin area from anonymous users", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("تسجيل الدخول")).toBeVisible();
});

test("logs in, survives refresh, and logs out", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Requires isolated E2E fixture credentials");

  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email!);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin/);
  await page.getByRole("button", { name: /تسجيل الخروج|خروج/ }).click();
  await expect(page).toHaveURL(/\/login/);
});
