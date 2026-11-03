import { test, expect } from '@playwright/test';
import { authFile } from './roles';

// Giai đoạn 4: Sản phẩm, Khách hàng, Tài khoản, Báo cáo, Tổng quan.
// Chỉ thử ngoại lệ và nút Hủy trên hộp xác nhận để không làm đổi dữ liệu mẫu.

test.describe('admin', () => {
  test.use({ storageState: authFile('admin') });

  test('UC-18: Modal Thêm/Sửa sản phẩm, ngoại lệ 5a, xác nhận Ẩn', async ({ page }) => {
    await page.goto('/admin/san-pham');
    await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
    const modal = page.locator('dialog.ui-modal[open]');
    await expect(modal.locator('.ui-dialog-title')).toHaveText('Thêm sản phẩm mới');
    await modal.getByRole('button', { name: 'Lưu sản phẩm' }).click();
    await expect(modal.locator('.err')).toBeVisible(); // tên trống → server từ chối, giữ Modal
    await modal.getByRole('button', { name: 'Hủy' }).click();
    await expect(page.locator('dialog.ui-modal[open]')).toHaveCount(0);

    const firstName = (await page.locator('table.ui-table tbody tr').first().locator('td').first().textContent())!.trim();
    await page.getByRole('button', { name: `Sửa ${firstName}` }).click();
    await expect(modal.locator('#pe-name')).toHaveValue(firstName);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.ui-modal[open]')).toHaveCount(0);

    await page.getByRole('button', { name: `Ẩn ${firstName}` }).click();
    await expect(modal).toContainText('không xuất hiện trên website');
    await modal.getByRole('button', { name: 'Hủy' }).click();
    await expect(page.locator('table.ui-table tbody tr').first()).toContainText('Đang bán');
  });

  test('UC-18: lọc theo loại và tìm kiếm giữ nhau trên URL', async ({ page }) => {
    await page.goto('/admin/san-pham');
    await page.getByRole('link', { name: 'Phụ kiện' }).click();
    await expect(page).toHaveURL(/cat=/);
    await page.locator('#pq').fill('khăn');
    await page.locator('#pq').press('Enter');
    await expect(page).toHaveURL(/cat=.*q=|q=.*cat=/);
    await expect(page.locator('table.ui-table tbody tr').first()).toContainText('Phụ kiện');
  });

  test('UC-38: Modal tạo tài khoản báo trùng email (5a); xác nhận khóa có cảnh báo; Hủy đổi vai trò', async ({ page }) => {
    await page.goto('/admin/tai-khoan');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const modal = page.locator('dialog.ui-modal[open]');
    await modal.locator('#ac-name').fill('Thử Trùng Email');
    await modal.locator('#ac-email').fill('admin@elora.vn');
    await modal.locator('#ac-phone').fill('0900000999');
    await modal.getByRole('button', { name: 'Lưu' }).click();
    await expect(modal.locator('.err')).toBeVisible();
    await expect(modal.locator('.ui-dialog-title')).toHaveText('Tạo tài khoản');
    await modal.getByRole('button', { name: 'Hủy' }).click();

    await page.getByRole('link', { name: 'Stylist' }).click();
    await expect(page).toHaveURL(/role=stylist/);
    const row = page.locator('table.ui-table tbody tr').first();
    await row.getByRole('button', { name: 'Khóa' }).click();
    await expect(modal).toContainText('mất phiên đang mở');
    await modal.getByRole('button', { name: 'Hủy' }).click();
    await expect(row).toContainText('Hoạt động');

    const sel = row.locator('select');
    await sel.selectOption('staff');
    await expect(modal).toContainText('Từ Stylist sang Nhân viên');
    await modal.getByRole('button', { name: 'Hủy' }).click();
    await expect(sel).toHaveValue('stylist');
  });

  test('UC-40: khoảng ngày không có đơn → số liệu 0 kèm thông báo (3a)', async ({ page }) => {
    await page.goto('/admin/bao-cao?from=2000-01-01&to=2000-01-02');
    await expect(page.locator('.ui-empty')).toContainText('Không có đơn đã giao');
    await expect(page.locator('.kpi').nth(1)).toContainText('0');
  });

  test('UC-20: chỉ số trên tổng quan dẫn tới màn xử lý', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('a.kpi', { hasText: 'Đơn chờ xác nhận' }).click();
    await expect(page).toHaveURL(/\/admin\/don-hang\?s=0/);
  });
});

test.describe('UC-19 Tra cứu khách hàng', () => {
  test('nhân viên: tìm, mở Drawer hồ sơ, có link đơn; đóng giữ từ khóa', async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: authFile('staff') })).newPage();
    await page.goto('/admin/khach-hang');
    await page.locator('#cq').fill('thao');
    await page.locator('#cq').press('Enter');
    await expect(page.locator('table.ui-table tbody tr')).toHaveCount(1);
    await page.locator('a.ui-rowlink').first().click();
    const drawer = page.locator('dialog.ui-drawer[open]');
    await expect(drawer).toContainText('Hồ sơ phong cách');
    await expect(drawer).toContainText('Size thường mặc');
    await expect(drawer.locator('a[href^="/admin/don-hang?order="]').first()).toBeVisible();
    await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(page).toHaveURL(/q=thao/);
    await expect(page).not.toHaveURL(/id=/);
  });

  test('không có kết quả → thông báo (3a)', async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: authFile('staff') })).newPage();
    await page.goto('/admin/khach-hang?q=khongcoaiten');
    await expect(page.locator('.ui-empty')).toContainText('Không tìm thấy khách hàng');
  });

  test('stylist: xem hồ sơ nhưng không có link sang Đơn hàng (không có UC-17)', async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: authFile('stylist') })).newPage();
    await page.goto('/admin/khach-hang');
    await page.locator('a.ui-rowlink').first().click();
    const drawer = page.locator('dialog.ui-drawer[open]');
    await expect(drawer).toContainText('Lịch sử mua');
    await expect(drawer.locator('a[href^="/admin/don-hang"]')).toHaveCount(0);
  });
});
