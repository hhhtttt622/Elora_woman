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
Database tạo từ bản 2.0 được tự thêm cột mới khi khởi động, nhưng dữ liệu cũ (kho Styling, stylist dạng chữ) không được chuyển đổi. Chạy `npm run db:reset` sau khi cập nhật lên bản 3.0.
Chạy bản production: `npm run build && npm start`.

## Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách hàng | ha.nguyen@example.com | elora123 |
| Stylist | stylist@elora.vn, stylist2@elora.vn | stylist123 |
| Nhân viên | kho@elora.vn | nhanvien123 |
| Admin | admin@elora.vn | admin123 |

Tài khoản nội bộ mới do admin tạo ở Quản trị → Tài khoản người dùng, kèm mật khẩu tạm; người dùng phải đổi mật khẩu ở lần đăng nhập đầu.

Đổi `SESSION_SECRET` trong `.env` và mật khẩu admin trước khi triển khai thật.

## Thanh toán VietQR chuyển khoản

Tạo `.env.local` từ `.env.example`, sau đó cấu hình `VIETQR_BANK_BIN` (BIN ngân hàng 6 chữ số), `VIETQR_ACCOUNT_NO` và `VIETQR_ACCOUNT_NAME`. Không commit `.env.local`.

Khi khách chọn chuyển khoản, máy chủ tạo đơn với trạng thái thanh toán `PENDING_PAYMENT`, khóa tồn trong 15 phút và tạo QR VietQR chứa số tiền cùng mã đơn. Khách bấm “Tôi đã thanh toán” để chuyển sang `WAITING_CONFIRMATION`; thao tác này chỉ báo cho nhân viên, không xác minh tiền đã vào. Nhân viên kiểm tra giao dịch trên tài khoản ngân hàng, rồi vào Quản trị → Đơn hàng để xác nhận `PAID` hoặc hủy. Đơn hết 15 phút sẽ chuyển sang `CANCELLED` và nhả tồn. Trạng thái giao hàng vẫn được quản lý riêng.

Endpoint khách hàng: `POST /api/orders/{orderCode}/payment-confirmation`. Endpoint nhân viên/admin để đối soát thủ công: `POST /api/admin/orders/{orderCode}/payment` với JSON `{ "status": "PAID" }` hoặc `{ "status": "CANCELLED" }`. Cả hai endpoint yêu cầu đăng nhập và kiểm tra quyền ở máy chủ.

## Cấu trúc

- `app/(shop)` cửa hàng: trang chủ, danh mục + lọc, chi tiết sản phẩm, giỏ hàng, thanh toán, tài khoản, đăng nhập/đăng ký, tư vấn
- `app/admin` quản trị: tổng quan theo vai trò, đơn hàng, sản phẩm, khách hàng, tư vấn phối đồ, quản lý kho (`app/admin/kho/*`), tài khoản người dùng, báo cáo doanh thu, đổi mật khẩu
- `app/actions` Server Actions (auth, đặt hàng, toàn bộ nghiệp vụ admin/kho). Mỗi action kiểm tra quyền theo mã use case ở máy chủ.
- `lib/permissions.ts` ma trận phân quyền 5 vai trò (mục 3.2 đặc tả v3.0); `lib/nav.ts` menu quản trị lọc theo quyền
- `lib/auth.ts` phiên đăng nhập 7 ngày lưu trong bảng `sessions`; khóa tài khoản hoặc đổi mật khẩu hủy phiên ngay
- `lib/inventory.ts` lõi tồn kho: 3 mức Physical / Reserved / Available, giữ hàng hết hạn tự nhả, nhật ký biến động
- `lib/schema.ts` cấu trúc database, `scripts/seed.ts` dữ liệu mẫu

## Quy tắc kho

- Kho: Kho Online, Showroom (kho bán) và Kho thanh lý & sửa chữa (hàng đổi trả lỗi, không tính vào tồn Thực tế).
- Physical = Kho Online + Showroom. Reserved = lệnh giữ của stylist còn hạn + dòng hàng của đơn chưa xuất kho. Available = Physical - Reserved.
- Khách chỉ đặt được khi Available đủ. Đơn chuyển sang "Đang giao" khi đóng gói ở mục Xuất kho, lúc đó mới trừ Physical.
- Mọi thay đổi tồn kho ghi vào `inventory_logs`, kèm người thực hiện và mã chứng từ.
- Lệnh giữ không bị xóa mà chuyển trạng thái: Đang giữ, Đã chốt mua, Đã nhả, Hết hạn tự nhả.
- Quản trị → Sản phẩm (admin) chỉ quản lý thông tin chung. SKU và tồn đầu kỳ do nhân viên tạo ở Tồn kho và SKU; tồn chỉ thay đổi qua nhập xưởng, xuất kho, điều chuyển, đổi trả, giữ hàng và bán capsule.
- Luồng nhà cung cấp: nhân viên tạo hồ sơ nhà cung cấp, chọn đối tác khi lập phiếu đặt may, theo dõi tiến độ giao/QC ở Đặt may và nhập kho, và xem lịch sử PO trong hồ sơ nhà cung cấp. Ngừng hợp tác sẽ giữ nguyên lịch sử và không cho chọn đối tác đó cho PO mới.

## Chưa làm (cần tích hợp ngoài)

- Cổng thanh toán thật, API GHN/GHTK, gửi email/SMS, máy in tem/quét mã vạch. Mã vận đơn và mã vạch hiện là mẫu.
- Ảnh sản phẩm: đang dùng khối màu thay ảnh. Thêm trường ảnh khi có dữ liệu.
- Chuyển sang PostgreSQL khi lên production nhiều người dùng: thay `lib/db.ts` và `lib/schema.ts`.
- Các chỗ giữ chỗ trong nội dung: [SỐ HOTLINE], [TÊN CÔNG TY], [ĐỊA CHỈ], [MÃ SỐ THUẾ], [SỐ TÀI KHOẢN].
