import { test } from '@playwright/test';
import { ADMIN_PAGES, SHOP_PUBLIC, authFile, type RoleKey } from './roles';

// Chụp ảnh toàn trang để so sánh trước/sau refactor. Không so pixel tự động
// (dữ liệu có thời gian thực như "còn x giờ"), chỉ lưu ảnh để review bằng mắt.
// SNAP=after npm run test:baseline  → lưu vào tests/baseline/after
const DIR = `tests/baseline/${process.env.SNAP || 'before'}`;
const VIEWPORTS = { desktop: { width: 1280, height: 800 }, mobile: { width: 375, height: 812 } };
const slug = (p: string) => (p === '/' ? 'home' : decodeURI(p).replace(/^\//, '').replace(/[/?=&]+/g, '_').replace(/\s+/g, '-'));

const PAGES: Record<RoleKey, string[]> = {
  guest: [...SHOP_PUBLIC, '/dang-nhap', '/dang-ky'],
  customer: ['/tai-khoan?tab=info', '/tai-khoan?tab=orders', '/tai-khoan?tab=track', '/tai-khoan?tab=style', '/tai-khoan?tab=password', '/thanh-toan'],
  stylist: ADMIN_PAGES.filter((p) => p.roles.includes('stylist')).map((p) => p.path),
  staff: ADMIN_PAGES.filter((p) => p.roles.includes('staff')).map((p) => p.path),
  admin: ADMIN_PAGES.filter((p) => p.roles.includes('admin')).map((p) => p.path),
};

for (const [role, pages] of Object.entries(PAGES) as [RoleKey, string[]][]) {
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    test(`ảnh ${role} · ${vp}`, async ({ browser }) => {
      test.setTimeout(pages.length * 30_000 + 30_000);
      const ctx = await browser.newContext({ storageState: authFile(role), viewport: size });
      const page = await ctx.newPage();
      const list = [...pages];
      if (role === 'guest') {
        await page.goto('/san-pham');
        const href = await page.locator('a.pcard').first().getAttribute('href');
        if (href) list.push(href);
      }
      for (const p of list) {
        await page.goto(p, { waitUntil: 'networkidle' });
        await page.screenshot({ path: `${DIR}/${role}/${vp}/${slug(p)}.png`, fullPage: true });
      }
      await ctx.close();
    });
  }
}
