# ELORA WOMAN

Website thương mại điện tử + tư vấn phối đồ + quản lý kho cho thương hiệu thời trang công sở ELORA WOMAN.

**Công nghệ:** Next.js 14 (App Router, Server Actions), TypeScript, SQLite (better-sqlite3), JWT cookie (jose) + bcrypt.

## Chạy thử

```bash
npm install
npm run setup      # tạo database data/elora.db và nạp dữ liệu mẫu
npm run dev        # http://localhost:3000
```

Nạp lại dữ liệu mẫu từ đầu: `npm run db:reset`.
Chạy bản production: `npm run build && npm start`.

## Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách hàng | ha.nguyen@example.com | elora123 |
| Quản trị | admin@elora.vn | admin123 |

Đổi `SESSION_SECRET` trong `.env` và mật khẩu admin trước khi triển khai thật.

## Cấu trúc

- `app/(shop)` cửa hàng: trang chủ, danh mục + lọc, chi tiết sản phẩm, giỏ hàng, thanh toán, tài khoản, đăng nhập/đăng ký, tư vấn
- `app/admin` quản trị: tổng quan, đơn hàng, sản phẩm, khách hàng, tư vấn phối đồ và 7 mục kho (`app/admin/kho/*`)
- `app/actions` Server Actions (auth, đặt hàng, toàn bộ nghiệp vụ admin/kho). Mọi action admin kiểm tra quyền.
- `lib/inventory.ts` lõi tồn kho: 3 mức Physical / Reserved / Available, giữ hàng hết hạn tự nhả, nhật ký biến động
- `lib/schema.ts` cấu trúc database, `scripts/seed.ts` dữ liệu mẫu

## Quy tắc kho

- Reserved = hàng giữ cho stylist còn hạn + dòng hàng của đơn chưa xuất kho. Available = Physical - Reserved.
- Khách chỉ đặt được khi Available đủ. Đơn chuyển sang "Đang giao" khi đóng gói ở mục Xuất kho, lúc đó mới trừ Physical.
- Mọi thay đổi tồn kho ghi vào `inventory_logs`.
- Ở Quản trị → Sản phẩm, chọn màu và kích cỡ để tạo SKU; nhập số lượng riêng cho từng tổ hợp tại Kho Online. Khi sửa sản phẩm, số lượng được cập nhật theo giá trị nhập và không được giảm thấp hơn hàng đang Reserved.

## Chưa làm (cần tích hợp ngoài)

- Cổng thanh toán thật, API GHN/GHTK, gửi email/SMS, máy in tem/quét mã vạch. Mã vận đơn và mã vạch hiện là mẫu.
- Ảnh sản phẩm: đang dùng khối màu thay ảnh. Thêm trường ảnh khi có dữ liệu.
- Chuyển sang PostgreSQL khi lên production nhiều người dùng: thay `lib/db.ts` và `lib/schema.ts`.
- Các chỗ giữ chỗ trong nội dung: [SỐ HOTLINE], [TÊN CÔNG TY], [ĐỊA CHỈ], [MÃ SỐ THUẾ], [SỐ TÀI KHOẢN].
