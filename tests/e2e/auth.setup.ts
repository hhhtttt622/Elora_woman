import { test as setup, expect } from '@playwright/test';
import { ACCOUNTS, authFile } from './roles';

// Đăng nhập một lần cho mỗi vai trò, lưu cookie để các test sau dùng lại.
for (const [role, acc] of Object.entries(ACCOUNTS)) {
  setup(`đăng nhập ${role}`, async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.locator('#a-email').fill(acc.email);
    await page.locator('#a-pass').fill(acc.password);
    await page.locator('form button.btn').click();
    await expect(page).not.toHaveURL(/\/dang-nhap/, { timeout: 60_000 });
    await page.context().storageState({ path: authFile(role as any) });
  });
}

setup('khách vãng lai', async ({ page }) => {
  await page.context().storageState({ path: authFile('guest') });
});
