import { test, expect } from '@playwright/test';
import { authFile } from './roles';

// UC-17 Xử lý đơn hàng – Drawer chi tiết, lưu trạng thái, ngoại lệ 6a, giữ bộ lọc khi đóng.
// Test tự hoàn trạng thái đơn về như cũ để không làm đổi dữ liệu mẫu.
test.use({ storageState: authFile('staff') });

test('UC-17: chọn đơn, lưu trạng thái, server chặn chuyển sai, đóng Drawer giữ bộ lọc', async ({ page }) => {
  await page.goto('/admin/don-hang?s=0');
  const first = page.locator('table.ui-table tbody tr').first().locator('a.ui-rowlink');
  const code = (await first.textContent())!.trim();
  await first.click();
  await expect(page).toHaveURL(new RegExp(`order=${code}`));
  const drawer = page.locator('dialog.ui-drawer[open]');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.ui-dialog-title')).toHaveText(code);
  await expect(drawer).toContainText('Chờ xác nhận (hiện tại)');

  const select = drawer.locator('select');
  const save = drawer.getByRole('button', { name: 'Lưu trạng thái' });
  const confirmDlg = page.locator('dialog.ui-modal[open]');

  // 6a: chọn Đang giao → server từ chối, hướng dẫn dùng Xuất kho
  await select.selectOption('2');
  await save.click();
  await expect(confirmDlg).toContainText('Đang giao');
  await confirmDlg.getByRole('button', { name: 'Lưu trạng thái' }).click();
  await expect(page.locator('.ui-toast.bad')).toContainText('Xuất kho');
  await page.locator('.ui-toast.bad button').click();

  // Hủy ở hộp xác nhận thì không đổi gì
  await select.selectOption('1');
  await save.click();
  await confirmDlg.getByRole('button', { name: 'Hủy' }).click();
  await expect(drawer).toContainText('Chờ xác nhận (hiện tại)');

  // Luồng chính: Chờ xác nhận → Đã xác nhận
  await select.selectOption('1');
  await save.click();
  await confirmDlg.getByRole('button', { name: 'Lưu trạng thái' }).click();
  await expect(page.locator('.ui-toast.good')).toContainText(code);
  await expect(drawer).toContainText('Đã xác nhận (hiện tại)');

  // Hoàn lại dữ liệu mẫu
  await select.selectOption('0');
  await save.click();
  await confirmDlg.getByRole('button', { name: 'Lưu trạng thái' }).click();
  await expect(drawer).toContainText('Chờ xác nhận (hiện tại)');

  // Đóng Drawer: chỉ bỏ ?order, giữ ?s=0
  await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/don-hang\?s=0$/);
  await expect(page.locator('dialog.ui-drawer[open]')).toHaveCount(0);
});

test('UC-17: tìm kiếm giữ bộ lọc trạng thái; Esc đóng Drawer', async ({ page }) => {
  await page.goto('/admin/don-hang?s=3');
  await page.locator('#oq').fill('ELW');
  await page.locator('#oq').press('Enter');
  await expect(page).toHaveURL(/s=3/);
  await expect(page).toHaveURL(/q=ELW/);
  await page.locator('a.ui-rowlink').first().click();
  await expect(page.locator('dialog.ui-drawer[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/order=/);
  await expect(page).toHaveURL(/s=3/);
});

test('UC-20 → UC-17: bấm mã đơn ở Tổng quan mở thẳng chi tiết đơn', async ({ page }) => {
  await page.goto('/admin');
  const link = page.locator('a[href*="/admin/don-hang?s=0&order="]').first();
  test.skip(!(await link.count()), 'Không có đơn chờ xác nhận');
  await link.click();
  await expect(page.locator('dialog.ui-drawer[open]')).toBeVisible();
});
