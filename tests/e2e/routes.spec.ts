import { test, expect, type Page } from '@playwright/test';
import { ADMIN_PAGES, HOME, SHOP_PUBLIC, authFile, type RoleKey } from './roles';

const ROLES: RoleKey[] = ['guest', 'customer', 'stylist', 'staff', 'admin'];

async function visit(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} trả mã lỗi`).toBeLessThan(500);
  await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Server Error/);
  return new URL(page.url());
}

for (const role of ROLES) {
  test.describe(`Routing · ${role}`, () => {
    test.use({ storageState: authFile(role) });

    test('trang cửa hàng công khai', async ({ page }) => {
      for (const p of SHOP_PUBLIC) {
        const u = await visit(page, p);
        expect(u.pathname, p).toBe(decodeURI(p.split('?')[0]));
      }
      // chi tiết sản phẩm đầu tiên trong danh mục
      await visit(page, '/san-pham');
      const href = await page.locator('a.pcard').first().getAttribute('href');
      expect(href).toBeTruthy();
      const u = await visit(page, href!);
      expect(u.pathname).toBe(decodeURI(href!));
    });

    test('trang tài khoản và thanh toán', async ({ page }) => {
      const acc = await visit(page, '/tai-khoan');
      const pay = await visit(page, '/thanh-toan');
      if (role === 'guest') { expect(acc.pathname).toBe('/dang-nhap'); expect(pay.pathname).toBe('/dang-nhap'); }
      else if (role === 'customer') { expect(acc.pathname).toBe('/tai-khoan'); expect(pay.pathname).toBe('/thanh-toan'); }
      else { expect(acc.pathname).toBe('/admin'); expect(pay.pathname).toBe('/admin'); }
      for (const t of ['info', 'orders', 'track', 'style', 'password']) {
        if (role !== 'customer') break;
        const u = await visit(page, `/tai-khoan?tab=${t}`);
        expect(u.pathname).toBe('/tai-khoan');
      }
    });

    test('phân quyền trang quản trị', async ({ page }) => {
      for (const { path, roles } of ADMIN_PAGES) {
        const u = await visit(page, path);
        const want = roles.includes(role) ? path : HOME[role];
        expect(u.pathname, `${role} → ${path}`).toBe(want);
      }
    });

    if (role !== 'guest' && role !== 'customer') {
      test('menu quản trị chỉ hiện mục được phép', async ({ page }) => {
        await visit(page, '/admin');
        const links = await page.locator('#admin-nav a').evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
        const want = ADMIN_PAGES.filter((p) => p.roles.includes(role)).map((p) => p.path);
        expect(links.sort()).toEqual(want.sort());
      });
    }
  });
}

test.describe('Liên kết sâu nội bộ (mục 2.4)', () => {
  test.use({ storageState: authFile('admin') });

  test('các query param mở đúng màn hình', async ({ page }) => {
    await visit(page, '/admin/kho');
    const sku = (await page.locator('table.tb tbody tr:not(.grp) td b').first().textContent())!.trim();
    await visit(page, '/admin/khach-hang');
    const custHref = await page.locator('a[aria-label^="Xem hồ sơ"]').first().getAttribute('href');

    const links: [string, RegExp | null][] = [
      ['/admin/don-hang?s=0', null],
      [`/admin/kho?tem=${sku}`, /Tem mác và mã vạch/],
      [`/admin/kho/dat-may?sku=${sku}`, /Tạo phiếu gửi nhà may/],
      [`/admin/kho/dieu-chuyen?sku=${sku}&from=showroom&to=online`, /Tạo phiếu điều chuyển/],
      [`/admin/kho/capsule?add=${sku}`, /Tạo capsule mới/],
      [custHref!, /Hồ sơ phong cách/],
      ['/admin/don-hang/xuat-kho', /Danh sách nhặt hàng|Chưa có đơn nào chờ nhặt hàng/],
      ['/admin/don-hang/doi-tra', /Tạo phiếu đổi trả/],
      ['/admin/don-hang/doi-tra?tab=repair', /Kho sửa chữa/],
      ['/admin/kho/nhat-ky?idle=60', /Báo cáo hàng chậm luân chuyển/],
    ];
    for (const [href, text] of links) {
      const u = await visit(page, href);
      expect(u.pathname).toBe(href.split('?')[0]);
      if (text) await expect(page.locator('main')).toContainText(text);
    }
    // yêu cầu tư vấn đầu tiên mở qua ?id=
    await visit(page, '/admin/tu-van');
    const cid = await page.locator('section[aria-label="Danh sách yêu cầu"] a').first().getAttribute('href');
    if (cid) { const u = await visit(page, cid); expect(u.pathname).toMatch(/^\/admin\/tu-van/); }
  });
});
