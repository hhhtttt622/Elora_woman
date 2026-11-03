# Kế hoạch tái cấu trúc kiến trúc UI – ELORA WOMAN

> Phiên bản: 1.0 (bản đề xuất, chờ phê duyệt) · Ngày: 03/11/2026
> Phạm vi: toàn bộ frontend trong `app/` và `components/`. Tài liệu này **chỉ phân tích và đề xuất**, chưa có thay đổi code nào.

---

## 0. Tóm tắt

- Ứng dụng nhỏ, gọn: khoảng 2.900 dòng TS/TSX, **24 route** (9 trang cửa hàng, 15 trang quản trị), 26 component, 1 file CSS 110 dòng. Không dùng thư viện UI, không Tailwind.
- Nền tảng tốt hơn kỳ vọng: đã có CSS token (`:root`), sidebar quản trị lọc theo quyền, badge đếm việc chờ, `FlashProvider` (tiền thân của Toast), trạng thái lọc lưu trên URL.
- Vấn đề chính:
  1. **Một trang làm nhiều việc**: biểu mẫu tạo mới, bảng danh sách và khung chi tiết nằm chồng lên nhau trên cùng trang (Tồn kho, Đặt may, Xuất kho, Nhật ký, Tài khoản người dùng, Sản phẩm).
  2. **Xem chi tiết bằng cách render thêm khối ở cuối trang** (`?id=`, `?tem=`, `?qc=`, `?label=`): người dùng phải cuộn xuống mới thấy, dễ bỏ sót.
  3. **Thiếu tầng Feedback/State**: không có `loading.tsx`, `error.tsx`, `not-found.tsx`; xác nhận thao tác dùng `window.confirm` hoặc không có; không phân trang.
  4. **Style rải rác**: phần lớn layout viết bằng `style={{...}}` inline, cùng một mẫu (tiêu đề trang, khối trống, nhóm `dt/dd`) lặp lại ở nhiều nơi.
  5. **Shell quản trị thiếu Header/Breadcrumb**; thông tin người dùng nằm cuối sidebar.
- Đề xuất: xây Design System bằng **React + CSS thuần, không thêm thư viện** (Modal/Drawer dùng phần tử `<dialog>` gốc của trình duyệt), trạng thái Drawer chi tiết lưu trên **URL search params** để giữ nguyên tìm kiếm/lọc/phân trang và có link chia sẻ được.
- Lộ trình 7 giai đoạn, làm từng module, module thí điểm là **Đơn hàng**.

---

## 1. Current UI Assessment (Đánh giá hiện trạng)

### 1.1 Công nghệ

| Hạng mục | Hiện trạng |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Dữ liệu | Server Components đọc SQLite trực tiếp (`lib/db.ts`); ghi qua Server Actions (`app/actions/*`) |
| Kết quả action | Kiểu `R = { ok, error, msg, data }` (admin) và `Res = { ok, error, msg, fields }` (auth/shop) |
| Phân quyền | `lib/permissions.ts` (ma trận UC), `requirePage()` cho trang, `requirePerm()` trong mọi action |
| Style | `app/globals.css` (token màu + class tiện ích `.btn .ghost .fld .card .tb .chip .badge .kpi`), còn lại inline style |
| Font | Be Vietnam Pro (nội dung), Cormorant Garamond (tiêu đề hiển thị) |
| State client | `CartProvider` (localStorage), `FlashProvider` + `useRun()` (chạy action, hiện thông báo, `router.refresh()`) |
| Test tự động | Không có |

### 1.2 Điểm mạnh nên giữ

- Bộ màu thương hiệu rõ ràng (wine `#6B2437`, ink `#1E1B1E`, blush, sand, sage) và đã là CSS variable.
- Lọc/tìm kiếm đều qua query string (`?s=`, `?q=`, `?f=`, `?role=`, `?st=`) → dễ giữ trạng thái khi thêm Drawer.
- `useRun()` gom toàn bộ luồng “gọi action → báo kết quả → refresh”, nên thay Flash bằng Toast chỉ cần sửa một chỗ.
- Có chú ý a11y: `aria-label`, `aria-invalid`, `role="alert"`, `focus-visible`, caption cho bảng.
- Responsive cơ bản đã có (breakpoint 820px, sidebar thu gọn trên mobile).

### 1.3 Điểm yếu tổng quát

| # | Vấn đề | Ví dụ |
|---|---|---|
| W1 | Form tạo mới luôn mở sẵn trên trang danh sách | `SkuForm` trên Tồn kho, `PoForm` trên Đặt may, `TransferForm`, `AccountAdmin`, `CapsuleBuilder` |
| W2 | Chi tiết hiển thị cuối trang, không có lớp ngữ cảnh | Hồ sơ khách (`?id=`), tem SKU (`?tem=`), kiểm hàng PO (`?qc=`), tem vận đơn (`?label=`) |
| W3 | Nhiều nghiệp vụ độc lập trên một trang | Xuất kho + Đổi trả + Kho sửa chữa; Cảnh báo + Hàng chậm + Nhật ký; PO + Phiếu trả xưởng |
| W4 | Thao tác ảnh hưởng dữ liệu không có xác nhận | Đổi trạng thái đơn bằng `<select>` đổi ngay; Nhả hàng, Bán 1 set, Nhập lại kho, Duyệt QC |
| W5 | Xác nhận dùng `window.confirm` | Khóa tài khoản (`AccountRow`) |
| W6 | Không có loading/error/not-found theo route | Trang `force-dynamic` chờ server, màn hình đứng im |
| W7 | Không phân trang | Đơn hàng, khách hàng, tài khoản tải toàn bộ (Nhật ký 80 dòng là đúng UC-37) |
| W8 | Inline style lặp lại | Tiêu đề `.disp` với `fontSize: clamp(...)`, khối trống nền `#F6EEEF`, lưới `dl` |
| W9 | Shell quản trị thiếu Header, Breadcrumb, menu người dùng | Tên/email/đăng xuất ở đáy sidebar |
| W10 | Phản hồi không nhất quán | Admin dùng Flash dính đầu trang; cửa hàng dùng chữ `.ok`/`.err` trong form |
| W11 | Bảng không có chế độ hiển thị mobile | Bảng 7–11 cột chỉ cuộn ngang (`minWidth` 960–1160px) |

---

## 2. Existing Screen Inventory (Danh mục màn hình)

### 2.1 Cửa hàng – `app/(shop)` (layout: `ShopHeader` + `ShopFooter`)

| Route | File | Quyền | Nội dung | Mức độ dày |
|---|---|---|---|---|
| `/` | `app/(shop)/page.tsx` | Công khai | Hero, Mới về, Nổi bật, Outfit, Khuyến mãi, Góc tư vấn, Form tư vấn | Trung bình (trang marketing, chấp nhận dài) |
| `/san-pham` | `san-pham/page.tsx` | Công khai | Form lọc cột trái 6 trường + lưới sản phẩm | Trung bình; form lọc chiếm chỗ trên mobile |
| `/san-pham/[slug]` | `san-pham/[slug]/page.tsx` | Công khai | Ảnh, giá, chọn màu/size, chất liệu, Gợi ý size + bảng size, Gợi ý phối đồ | Trung bình |
| `/gio-hang` | `gio-hang/page.tsx` | Công khai (client) | Bảng giỏ + tóm tắt | Nhẹ |
| `/thanh-toan` | `thanh-toan/page.tsx` → `Checkout` | Khách hàng | Form giao hàng + tóm tắt + trang thành công | Nhẹ |
| `/tai-khoan` | `tai-khoan/page.tsx` | Khách hàng | 5 tab qua `?tab=`: Thông tin, Lịch sử mua, Theo dõi đơn, Hồ sơ phong cách (+ yêu cầu tư vấn), Đổi mật khẩu | Nặng (1 file xử lý 5 màn) |
| `/tu-van` | `tu-van/page.tsx` | Công khai, gửi cần đăng nhập | Form tư vấn | Nhẹ |
| `/dang-nhap` | `dang-nhap/page.tsx` | Khách vãng lai | Form đăng nhập + tài khoản mẫu | Nhẹ |
| `/dang-ky` | `dang-ky/page.tsx` | Khách vãng lai | Form đăng ký | Nhẹ |

### 2.2 Quản trị – `app/admin` (layout: sidebar `NavLinks` + `FlashProvider`)

| Route | File | UC / Vai trò | Khối nội dung trên trang | Mức độ dày |
|---|---|---|---|---|
| `/admin` | `admin/page.tsx` | UC-20 · stylist, staff, admin | KPI theo vai trò + tối đa 7 thẻ “việc cần làm” | Trung bình |
| `/admin/don-hang` | `don-hang/page.tsx` | UC-17 · staff | Chip lọc trạng thái + bảng 7 cột, đổi trạng thái bằng select | Trung bình; thiếu chi tiết đơn (địa chỉ, ghi chú, vận đơn) |
| `/admin/san-pham` | `san-pham/page.tsx` → `ProductManager` | UC-18 · admin | Nút Thêm, form sửa/thêm chèn trên bảng, bảng 6 cột | Trung bình |
| `/admin/khach-hang` | `khach-hang/page.tsx` | UC-19 · staff, stylist | Tìm kiếm + bảng + hồ sơ phong cách cuối trang (`?id=`) | Trung bình |
| `/admin/tu-van` | `tu-van/page.tsx` → `ConsultPanel`, `AssignStylist` | UC-12..14 · stylist | Master-detail: danh sách thẻ trái, chi tiết + phân công + soạn set + gửi bên phải | **Nặng** |
| `/admin/kho/giu-hang` | `kho/giu-hang/page.tsx` | UC-15/16 · stylist | Công cụ giả lập (admin) + bảng giữ hàng + 2 nút thao tác | Trung bình |
| `/admin/kho` | `kho/page.tsx` → `SkuForm`, `Barcode` | UC-21/22 · staff | 4 KPI + form tạo SKU 5 trường + tìm/lọc + bảng nhóm 11 cột + tem cuối trang | **Rất nặng** |
| `/admin/kho/capsule` | `kho/capsule/page.tsx` → `CapsuleBuilder` | UC-24/25 | Bảng capsule + form tạo capsule | Trung bình |
| `/admin/kho/dat-may` | `kho/dat-may/page.tsx` → `PoForm`, `QcPanel` | UC-26..29 · staff | Bảng PO 8 cột + panel kiểm hàng (`?qc=`) + form tạo PO 9+ trường + danh sách phiếu trả xưởng | **Rất nặng** |
| `/admin/kho/dieu-chuyen` | `kho/dieu-chuyen/page.tsx` → `TransferForm` | UC-30/31 · staff | 3 thẻ kho + form điều chuyển + bảng phiếu | Nặng |
| `/admin/kho/xuat-kho` | `kho/xuat-kho/page.tsx` → `PackPanel`, `ReturnForm`, `Barcode` | UC-32..35 · staff | Chọn đơn (chip) + pick-list + checklist đóng gói + tem vận đơn + form đổi trả + bảng phiếu đổi trả + danh sách kho sửa chữa | **Rất nặng** (3 nghiệp vụ) |
| `/admin/kho/nhat-ky` | `kho/nhat-ky/page.tsx` | UC-36/37 · staff, admin | Cảnh báo ngưỡng + báo cáo hàng chậm + nhật ký có tìm kiếm | Nặng (3 báo cáo) |
| `/admin/tai-khoan` | `tai-khoan/page.tsx` → `AccountAdmin`, `AccountRow` | UC-38 · admin | Form tạo tài khoản + chip lọc + bảng có select vai trò và nút khóa | Nặng |
| `/admin/bao-cao` | `bao-cao/page.tsx` | UC-40 · admin | Form khoảng ngày + 3 KPI + 2 bảng | Trung bình |
| `/admin/tai-khoan-cua-toi` | `tai-khoan-cua-toi/page.tsx` | UC-39 | Form đổi mật khẩu | Nhẹ |

### 2.3 Component hiện có

| Nhóm | Component | Ghi chú cho refactor |
|---|---|---|
| Shell | `Shop.tsx` (`ShopHeader`, `ShopFooter`, `ProductCard`, `ProductImage`), `CartLink`, `admin/NavLinks`, `admin/Bits` (`PageHead`) | `PageHead` → `PageHeader`; `NavLinks` → `Sidebar` |
| Phản hồi | `admin/Flash` (`FlashProvider`, `useRun`, `Act`) | Nền cho `ToastProvider` + `ActionButton` |
| Form cửa hàng | `AuthForm`, `ConsultForm`, `PasswordForm`, `ProfileForm`, `Checkout`, `ProductBuy`, `SizeAdvisor` | Dùng `useFormState`; chuyển sang `FormField` dùng chung |
| Form quản trị | `SkuForm`, `PoForm`, `QcPanel`, `TransferForm`, `ReturnForm`, `PackPanel`, `CapsuleBuilder`, `ConsultPanel`, `AssignStylist`, `AccountAdmin`, `AccountRow`, `ProductManager`, `OrderSelect` | Bọc vào Modal/Drawer; giữ nguyên lời gọi action |
| Khác | `Barcode` | Giữ nguyên |

### 2.4 Liên kết sâu đang được dùng nội bộ (phải giữ hoạt động)

| Link | Được gọi từ |
|---|---|
| `/admin/don-hang?s=0` | Tổng quan |
| `/admin/tu-van?id={id}` | Tổng quan (Xem và nhận, Soạn set) |
| `/admin/kho/xuat-kho?o={code}`, `?label={code}` | Tổng quan, `PackPanel` |
| `/admin/kho/dat-may?qc={code}`, `?sku={sku}` | Tổng quan, Nhật ký (Tạo phiếu đặt may) |
| `/admin/kho/dieu-chuyen?sku=&from=&to=` | Xuất kho (thiếu hàng) |
| `/admin/kho/capsule?add={sku}` | Nhật ký (hàng chậm) |
| `/admin/kho?tem={sku}`, `/admin/khach-hang?id=` | Bảng tương ứng |
| `/tai-khoan?tab=track` / `?tab=password` / `?tab=info` | `Checkout`, `requirePage` (đổi mật khẩu bắt buộc), Hồ sơ phong cách |
| `/dang-nhap?next=` | `requirePage`, trang thanh toán, `ConsultForm` |
| `/san-pham?cat=`, `?sale=1` | Header, trang chủ, breadcrumb |

---

## 3. UI Problems and Recommendations (Vấn đề và khuyến nghị theo màn hình)

| Màn hình | Vấn đề | Khuyến nghị |
|---|---|---|
| **Tồn kho và SKU** | Form tạo SKU luôn mở; bảng 11 cột; tem in nằm cuối trang | Nút “Tạo SKU” → **Modal**; “Xem tem” → **Drawer** (`?tem=`); thanh tìm + lọc gom vào `FilterBar`; ẩn 3 cột kho chi tiết vào Drawer chi tiết SKU, bảng chính còn ~7 cột |
| **Đặt may và nhập kho** | 4 khối trên một trang; form PO dài; QC hiển thị lẫn giữa bảng và form | **Tabs**: “Lệnh đặt may” / “Phiếu trả xưởng”; “Tạo phiếu gửi xưởng” → **Modal lớn** (giữ prefill `?sku=`); Kiểm hàng → **trang riêng** `/admin/kho/dat-may/[code]/kiem-hang` (quy trình nhiều dòng nhập liệu, cần không gian) với redirect từ `?qc=`; “Chuyển trạng thái” → **ConfirmDialog** |
| **Xuất kho và đổi trả** | 3 nghiệp vụ trên 1 trang; chọn đơn bằng hàng chip dài | **Tabs có URL**: “Chờ xuất kho” / “Đổi trả” / “Kho sửa chữa”; tab 1 là danh sách đơn chờ, bấm đơn → **trang riêng** `/admin/kho/xuat-kho/[code]` (pick-list + checklist + đóng gói, quy trình nhiều bước); tem vận đơn → **Modal** sau khi đóng gói (giữ `?label=`); “Tiếp nhận đổi trả” → **Modal**; “Nhập lại kho / Chuyển sửa chữa” → **ConfirmDialog** |
| **Cảnh báo và nhật ký** | 3 báo cáo dồn trên một trang | **Tabs**: “Cảnh báo ngưỡng” / “Hàng chậm luân chuyển” (chỉ admin) / “Nhật ký”; nhật ký giữ 80 giao dịch mới nhất theo UC-37 |
| **Kho và điều chuyển** | Form điều chuyển chen giữa thẻ kho và bảng | Thẻ kho giữ làm overview; “Tạo phiếu điều chuyển” → **Modal** (tự mở khi có `?sku=&from=&to=`); “Xác nhận nhận hàng” → **ConfirmDialog** |
| **Combo capsule** | Form tạo capsule luôn hiện dưới bảng | “Tạo capsule” → **Modal** (tự mở khi có `?add=`); “Bán 1 set” → **ConfirmDialog** (thao tác trừ kho) |
| **Yêu cầu tư vấn** | Master-detail chật trên màn nhỏ; chi tiết + phân công + soạn set dồn một cột | Danh sách → **List page** có lọc trạng thái; chi tiết → **trang riêng** `/admin/tu-van/[id]` với **Tabs** “Thông tin khách” / “Soạn set gợi ý” / “Hàng đang giữ”; `?id=` redirect sang route mới; “Gửi gợi ý và giữ hàng” → **ConfirmDialog** |
| **Hàng đang giữ** | Nút chốt mua/nhả không có xác nhận | Giữ **List page**; “Khách chốt mua”, “Nhả hàng” → **ConfirmDialog**; dòng → **Drawer** xem yêu cầu tư vấn liên quan |
| **Đơn hàng** | Đổi trạng thái bằng select đổi ngay; không xem được địa chỉ, ghi chú, vận đơn | `DataTable` + chip lọc + **tìm kiếm** + **phân trang**; bấm dòng → **Drawer chi tiết đơn** (`?order=`) có dòng hàng, người nhận, địa chỉ, thanh toán, vận đơn; đổi trạng thái bằng nút trong Drawer → **ConfirmDialog**. Quy tắc chuyển trạng thái giữ nguyên ở `setOrderStatus` |
| **Sản phẩm** | Form sửa chèn lên đầu bảng, mất vị trí đang xem | “Thêm / Sửa” → **Modal** (form 9 trường, vừa một modal); “Ẩn/Hiện” → **ConfirmDialog** |
| **Khách hàng** | Hồ sơ hiện cuối trang | Bấm dòng → **Drawer** (`?id=`, giữ `?q=`), có Tabs “Hồ sơ phong cách” / “Đơn hàng” (đọc dữ liệu có sẵn) |
| **Tài khoản người dùng** | Form tạo luôn mở; select vai trò đổi ngay; `window.confirm` | “Tạo tài khoản” → **Modal**, hiển thị mật khẩu tạm trong trạng thái thành công của modal (có nút sao chép, cảnh báo chỉ hiện 1 lần); đổi vai trò, khóa/mở khóa → **ConfirmDialog** (giữ nguyên nội dung cảnh báo stylist đang phụ trách) |
| **Báo cáo doanh thu** | Ổn | Đưa form khoảng ngày vào `FilterBar`; dùng `StatCard`, `DataTable`; thêm `EmptyState` chuẩn |
| **Tổng quan** | Thẻ việc dài khi nhiều vai trò | Giữ **Dashboard page**; dùng `StatCard` + `WorkQueueCard` chuẩn; KPI bấm được dẫn tới danh sách đã lọc |
| **Catalog `/san-pham`** | Form lọc chiếm nửa màn hình mobile | Desktop giữ cột lọc; mobile → **Filter Drawer** + chip bộ lọc đang áp dụng |
| **Chi tiết sản phẩm** | Bảng size chiếm nhiều chỗ | “Hướng dẫn chọn size” → **Drawer** (gồm `SizeAdvisor` + bảng); breadcrumb dùng component chung |
| **Giỏ hàng** | Bảng không hợp mobile | Mobile chuyển dạng danh sách thẻ; “Xóa” → không cần confirm (có thể thêm lại), nhưng có **Toast** “Đã xóa” |
| **Tài khoản khách** | 5 màn trong 1 file | Giữ `?tab=` (tránh vỡ link) nhưng tách mỗi tab thành component riêng; dùng `Tabs` chung; giữ riêng tab “Lịch sử” và “Theo dõi” (UC-09); bấm đơn ở Lịch sử mở tab Theo dõi của đơn đó |
| **Header cửa hàng** | Menu cuộn ngang trên mobile | Mobile → nút menu mở **Drawer điều hướng** |

> Nguyên tắc: không dùng Modal/Drawer máy móc. Quy trình nhiều bước hoặc nhiều dòng nhập liệu (đóng gói đơn, kiểm hàng PO, soạn set tư vấn) đi **trang riêng**; xem nhanh đi **Drawer**; tạo/sửa ngắn đi **Modal**; thao tác thay đổi dữ liệu đi **ConfirmDialog**.

---

## 4. Proposed UI Architecture (Kiến trúc 5 tầng)

```
┌────────────────────────────────────────────────────────────────────┐
│ L1  Application Shell                                              │
│     AdminShell: Sidebar · Header (Breadcrumb · UserMenu) · Content │
│     ShopShell : Topbar · ShopHeader (Nav · Account · Cart) · Footer│
├────────────────────────────────────────────────────────────────────┤
│ L2  Page / Content   PageContainer · PageHeader · FilterBar ·      │
│                      DataTable · Pagination · StatCard             │
├────────────────────────────────────────────────────────────────────┤
│ L3  Contextual View  BaseDrawer (URL-driven) · Detail Page · Tabs  │
├────────────────────────────────────────────────────────────────────┤
│ L4  Interaction      BaseModal · ConfirmDialog · FormSection ·     │
│                      FormField · Dropdown/Menu · Popover           │
├────────────────────────────────────────────────────────────────────┤
│ L5  Feedback/State   Toast · LoadingState/Skeleton · EmptyState ·  │
│                      ErrorState · FieldError · SuccessState        │
└────────────────────────────────────────────────────────────────────┘
```

### 4.1 Quy tắc hiển thị (Display Rules)

| Loại | Dùng khi | Trạng thái lưu ở | Ví dụ |
|---|---|---|---|
| Separate Page | Dashboard, danh sách, quy trình nhiều bước | Route | `/admin/don-hang`, `/admin/kho/xuat-kho/[code]` |
| Detail Page + Tabs | Đối tượng phức tạp, cần thao tác dài | Route + `?tab=` | `/admin/tu-van/[id]` |
| Side Drawer | Xem nhanh, giữ ngữ cảnh danh sách | Query param (`?order=`, `?id=`, `?tem=`) | Chi tiết đơn, hồ sơ khách, tem SKU |
| Modal | Tạo mới / sửa nhanh ≤ ~10 trường | State client (tự mở từ query nếu có prefill) | Thêm sản phẩm, tạo SKU, tạo tài khoản |
| Filter Drawer | Bộ lọc nâng cao trên mobile | Query param | Catalog cửa hàng |
| ConfirmDialog | Thao tác thay đổi tồn kho, trạng thái, quyền | State client | Nhả hàng, bán set, khóa tài khoản |
| Toast | Kết quả mọi Server Action | `ToastProvider` | Thay `FlashProvider` |

### 4.2 Cơ chế kỹ thuật chính

- **Drawer theo URL**: Server Component đọc `searchParams.order` và render `<BaseDrawer>` với nội dung chi tiết ở phía server. Đóng Drawer = `router.replace()` xóa riêng param đó, giữ nguyên `q`, `s`, `page`. Có thể bookmark/chia sẻ, nút Back hoạt động.
- **Modal/Drawer dựa trên `<dialog>` gốc**: `showModal()` có sẵn focus trap, phím Esc, lớp nền `::backdrop`, `inert` cho phần còn lại. Không cần thêm thư viện.
- **ConfirmDialog dạng hook**: `const confirm = useConfirm(); if (await confirm({ title, message, tone: 'danger' })) run(action())`. Thay thế `window.confirm` và prop `confirm` của `Act`.
- **Toast**: giữ API `useRun()` hiện tại, bên trong đổi `setFlash` thành `toast.push()`. Mọi component đang dùng `useRun` không phải sửa.
- **Loading/Error**: thêm `loading.tsx` và `error.tsx` cho `app/admin`, `app/(shop)`, và các route nặng; `not-found.tsx` cho chi tiết sản phẩm/đơn.
- **Phân trang**: tham số `?page=` và `?size=`, cắt mảng ở Server Component (không đổi câu SQL hay logic nghiệp vụ). Thêm `LIMIT/OFFSET` vào SQL là tối ưu riêng, chỉ làm khi được duyệt.
- **Route mới vẫn gọi `requirePage()`** với đúng mã UC của trang cha.

---

## 5. Navigation Structure (Cấu trúc điều hướng)

### 5.1 Quản trị

```
AdminShell
├─ Header: [☰ mobile] Breadcrumb ......................... [UserMenu ▾]
│                                                          ├ Tên · email · vai trò
│                                                          ├ Đổi mật khẩu
│                                                          ├ Xem cửa hàng
│                                                          └ Đăng xuất
└─ Sidebar (lọc theo can(role, uc), badge việc chờ — giữ nguyên lib/nav.ts)
   ├─ Bán hàng
   │  ├─ Tổng quan ..................... /admin
   │  ├─ Đơn hàng ...................... /admin/don-hang            [Drawer ?order=]
   │  ├─ Sản phẩm ...................... /admin/san-pham            [Modal]
   │  └─ Khách hàng .................... /admin/khach-hang          [Drawer ?id=]
   ├─ Tư vấn phối đồ
   │  ├─ Yêu cầu tư vấn ................ /admin/tu-van
   │  │   └─ Chi tiết .................. /admin/tu-van/[id]?tab=info|set|holds   (MỚI)
   │  └─ Hàng đang giữ ................. /admin/kho/giu-hang
   ├─ Quản lý kho
   │  ├─ Tồn kho và SKU ................ /admin/kho                 [Modal tạo SKU, Drawer ?tem=]
   │  ├─ Combo capsule ................. /admin/kho/capsule         [Modal ?add=]
   │  ├─ Đặt may và nhập kho ........... /admin/kho/dat-may?tab=po|returns
   │  │   └─ Kiểm hàng ................. /admin/kho/dat-may/[code]/kiem-hang     (MỚI)
   │  ├─ Kho và điều chuyển ............ /admin/kho/dieu-chuyen     [Modal ?sku=&from=&to=]
   │  ├─ Xuất kho và đổi trả ........... /admin/kho/xuat-kho?tab=pack|returns|repair
   │  │   └─ Đóng gói đơn .............. /admin/kho/xuat-kho/[code]               (MỚI)
   │  └─ Cảnh báo và nhật ký ........... /admin/kho/nhat-ky?tab=alerts|slow|logs
   └─ Quản trị hệ thống
      ├─ Tài khoản người dùng .......... /admin/tai-khoan           [Modal tạo, Confirm]
      ├─ Báo cáo doanh thu ............. /admin/bao-cao
      └─ Đổi mật khẩu .................. /admin/tai-khoan-cua-toi   (cũng có trong UserMenu)
```

**Tương thích link cũ** (redirect phía server, không xóa):

| Link cũ | Đích mới |
|---|---|
| `/admin/tu-van?id=X` | `/admin/tu-van/X` |
| `/admin/kho/dat-may?qc=CODE` | `/admin/kho/dat-may/CODE/kiem-hang` |
| `/admin/kho/xuat-kho?o=CODE` | `/admin/kho/xuat-kho/CODE` |
| `/admin/kho/xuat-kho?label=CODE` | giữ nguyên, mở Modal tem vận đơn |
| `?sku=`, `?add=`, `?sku=&from=&to=`, `?tem=`, `?id=` | giữ nguyên, tự mở Modal/Drawer tương ứng |

**Breadcrumb** sinh từ `ADMIN_NAV` + segment động, ví dụ `Quản lý kho / Xuất kho và đổi trả / Đóng gói ELR-251103-001`.

### 5.2 Cửa hàng

```
ShopShell
├─ Topbar khuyến mãi
├─ ShopHeader: Logo · Nav (Sản phẩm, Phụ kiện, Outfit, Tư vấn, Khuyến mãi) · Tài khoản · Giỏ (n)
│   └─ Mobile: [☰] → Drawer điều hướng
├─ /                    Trang chủ
├─ /san-pham            Catalog          [Filter Drawer trên mobile]
├─ /san-pham/[slug]     Chi tiết         [Drawer Hướng dẫn size] · Breadcrumb
├─ /gio-hang            Giỏ hàng
├─ /thanh-toan          Thanh toán → SuccessState
├─ /tai-khoan?tab=      Tabs: info · orders · track (?order=) · style · password
│                       (giữ alias ?tab=track → orders để không vỡ link)
├─ /tu-van              Form tư vấn
└─ /dang-nhap, /dang-ky
```

---

## 6. Component Architecture (Design System)

### 6.1 Cấu trúc thư mục đề xuất

```
app/
  styles/
    tokens.css          # màu, chữ, khoảng cách, bo góc, bóng, breakpoint
    base.css            # reset, typography, focus
    components.css      # class cho component dùng chung (ui-*)
    shop.css            # style riêng cửa hàng (chuyển từ globals.css)
    admin.css           # style riêng quản trị
  globals.css           # chỉ @import 5 file trên
  admin/loading.tsx, admin/error.tsx, (shop)/loading.tsx, (shop)/error.tsx ...
components/
  ui/                   # Design System, không phụ thuộc nghiệp vụ
    Button.tsx  IconButton.tsx  Field.tsx (Input/Select/Textarea/Checkbox/Radio)
    FormSection.tsx  FieldError.tsx
    DataTable.tsx  Pagination.tsx  SearchBar.tsx  FilterBar.tsx  FilterPanel.tsx
    BaseDrawer.tsx  BaseModal.tsx  ConfirmDialog.tsx (useConfirm)
    Tabs.tsx  StatusBadge.tsx  StatCard.tsx  Breadcrumb.tsx  Menu.tsx (Dropdown/Popover)
    Toast.tsx (ToastProvider, useToast)  LoadingState.tsx  Skeleton.tsx
    EmptyState.tsx  ErrorState.tsx  SuccessState.tsx  DescriptionList.tsx
  layout/
    AdminShell.tsx  Sidebar.tsx  AdminHeader.tsx  UserMenu.tsx
    PageContainer.tsx  PageHeader.tsx
    ShopHeader.tsx  ShopFooter.tsx  MobileNavDrawer.tsx
  shop/                 # ProductCard, ProductImage, ProductBuy, SizeAdvisor, Checkout, AuthForm, ...
  admin/
    shared/             # useRun, ActionButton (thay Act), Barcode
    orders/  products/  customers/  consult/  inventory/  accounts/  reports/
lib/
  url.ts                # helper setParam/removeParam giữ trạng thái lọc khi mở/đóng Drawer
  status.ts             # map trạng thái → tone của StatusBadge (đơn, PO, tư vấn, giữ hàng, đổi trả)
```

> Server Actions (`app/actions/*`), `lib/db.ts`, `lib/schema.ts`, `lib/inventory.ts`, `lib/permissions.ts`, `lib/nav.ts` **không đổi** (nav chỉ có thể thêm thông tin hiển thị như icon nếu cần).

### 6.2 Danh mục component

| Component | Tầng | Loại | API chính | Thay cho |
|---|---|---|---|---|
| `AdminShell` | L1 | Server | `user, nav, badges, children` | `app/admin/layout.tsx` markup |
| `Sidebar` | L1 | Client | `nav, badges`, collapsed/mobile open | `NavLinks` |
| `AdminHeader` | L1 | Client | `breadcrumb, user` | (mới) |
| `Breadcrumb` | L1 | Server | `items: {label, href?}[]` | breadcrumb inline ở chi tiết SP |
| `UserMenu` | L1/L4 | Client | `user, logoutAction` | khối cuối sidebar |
| `PageContainer` | L2 | Server | `width: 'default' \| 'narrow' \| 'full'` | `.wrap` + inline padding |
| `PageHeader` | L2 | Server | `eyebrow, title, description, actions` | `PageHead` |
| `DataTable` | L2 | Server-first | `columns, rows, rowHref?, caption, empty, mobile: 'cards' \| 'scroll'` | `.tb` lặp ở 15 trang |
| `Pagination` | L2 | Server | `page, total, size, baseQuery` | (mới) |
| `SearchBar` | L2 | Server (form GET) | `name, defaultValue, placeholder, keep: string[]` | 4 form tìm kiếm |
| `FilterBar` / `FilterPanel` | L2 | Server + Client | chip lọc, filter drawer mobile | chip lọc lặp lại |
| `StatCard` | L2 | Server | `label, value, note, href?, tone` | `.kpi` |
| `BaseDrawer` | L3 | Client | `open, onClose \| closeHref, title, size, footer` | khối chi tiết cuối trang |
| `Tabs` | L3 | Server (link) / Client | `items, param='tab', current` | chip tab ở Tài khoản |
| `DescriptionList` | L3 | Server | `items: [label, value][]` | `dl` inline lặp 5 lần |
| `BaseModal` | L4 | Client | `open, onClose, title, size, footer` | form chèn trang |
| `ConfirmDialog` / `useConfirm` | L4 | Client | `title, message, confirmLabel, tone` | `window.confirm`, `Act confirm` |
| `FormSection`, `Field`, `FieldError` | L4 | Both | `label, hint, error, required` | `.fl` + `label` + `.err` lặp |
| `Menu` (Dropdown/Popover) | L4 | Client | `trigger, items` | (mới, dùng cho UserMenu, thao tác dòng) |
| `ActionButton` | L4 | Client | `action, args, confirm?: ConfirmOptions, variant` | `Act` |
| `ToastProvider` / `useToast` | L5 | Client | `push({tone, text})`, tự ẩn 4s, lỗi giữ đến khi đóng | `FlashProvider` |
| `LoadingState` / `Skeleton` | L5 | Server | `variant: 'page' \| 'table' \| 'card'` | (mới) |
| `EmptyState` | L5 | Server | `title, description, action` | ~12 khối “Chưa có...” |
| `ErrorState` | L5 | Client | `error, reset` | (mới, cho `error.tsx`) |
| `SuccessState` | L5 | Server | `title, description, actions` | trang đặt hàng thành công |
| `StatusBadge` | L5 | Server | `domain: 'order' \| 'po' \| 'consult' \| 'hold' \| 'return' \| 'stock' \| 'account', value` | `badge` + logic chọn màu rải rác |

### 6.3 Chuẩn hóa giao diện (Design Tokens)

Giữ nguyên nhận diện hiện tại, chỉ đặt tên và hệ thống hóa.

**Màu**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--c-brand` / `--c-brand-hover` | `#6B2437` / `#4F1B2A` | Nút chính, trạng thái active |
| `--c-ink` / `--c-text-muted` | `#1E1B1E` / `#4A4247` | Chữ chính / phụ |
| `--c-surface` / `--c-surface-alt` / `--c-surface-admin` | `#FFFFFF` / `#F6EEEF` / `#FCFAFA` | Nền |
| `--c-border` / `--c-border-strong` | `#E2D9DC` / `#8A8186` | Viền |
| `--c-danger` | `#A3162F` | Lỗi, hết hàng, nguy hiểm |
| `--c-success` | `#E3E4DE` nền (sage, giữ màu hiện tại của Flash) / `#1E1B1E` chữ | Toast thành công |
| `--c-warning` | `#F3DCE1` nền / `#4F1B2A` chữ | Sắp hết, chờ xử lý |
| `--c-neutral` | `#E3E4DE` (sage), `#E8DCCB` (sand) | Badge trung tính |

Có thể bổ sung bộ token dark mode sau, không nằm trong phạm vi lần này.

**Typography**: `--font-sans: 'Be Vietnam Pro'`, `--font-display: 'Cormorant Garamond'`. Thang cỡ: 12 / 13 / 14 / 15 (body) / 18 / 22 / 28 / 36 / 48 / `clamp()` cho hero. Tiêu đề trang quản trị dùng 36 thay cho `clamp(34px,4vw,50px)` để đỡ chiếm chỗ.

**Spacing**: thang 4px — `--sp-1: 4px` … `--sp-2: 8`, `--sp-3: 12`, `--sp-4: 16`, `--sp-5: 20`, `--sp-6: 24`, `--sp-8: 32`, `--sp-10: 40`, `--sp-12: 48`, `--sp-18: 72`.

**Border radius**: thương hiệu dùng góc vuông. `--radius-0: 0` (mặc định cho nút, input, card), `--radius-sm: 2px` (badge), `--radius-full` (chấm trạng thái). Giữ góc vuông cho nhất quán.

**Shadow**: `--shadow-1: 0 1px 2px rgba(30,27,30,.06)` (card hover), `--shadow-2: 0 4px 16px rgba(30,27,30,.08)` (toast, menu), `--shadow-3: 0 16px 48px rgba(30,27,30,.18)` (modal, drawer).

**Button variants** (một component `Button`, prop `variant` + `size`):

| Variant | Hiện tại | Dùng cho |
|---|---|---|
| `primary` | `.btn` | Hành động chính, tối đa 1 nút/khu vực |
| `secondary` | `.ghost` | Hành động phụ |
| `link` | `.textbtn` | Hành động trong dòng chữ |
| `danger` | (mới) | Khóa, nhả hàng, chuyển sửa chữa |
| `ghost-inverse` | (inline trong sidebar) | Nút trên nền tối |

Size: `sm` 32px (trong bảng), `md` 40px, `lg` 48px (form, cửa hàng). Có trạng thái `loading` (hiện chữ “Đang xử lý...” như hiện nay).

**Input variants**: `text`, `number`, `select`, `textarea`, `checkbox`, `radio`, `date`; size `sm` 36px / `md` 44px; trạng thái `invalid` (`aria-invalid`), `readonly`, `disabled`; luôn đi kèm `label` và `FieldError` có `aria-describedby`.

**Breakpoints**: `sm 480px`, `md 820px` (giữ mốc hiện tại), `lg 1100px`, `xl 1280px`.
- `< md`: sidebar thành drawer, bảng chuyển dạng thẻ (`DataTable mobile="cards"`), Drawer chiếm 100% chiều rộng, Modal chiếm toàn màn hình.
- `md–lg`: sidebar thu gọn còn icon/chữ ngắn, Drawer rộng 480px.
- `≥ lg`: sidebar đầy đủ 260px, Drawer 560px.

---

## 7. Screen Transformation Mapping (Bảng chuyển đổi)

| # | Màn hình | Hiện tại | Đề xuất | L2 Page | L3 Context | L4 Interaction | L5 Feedback mới |
|---|---|---|---|---|---|---|---|
| 1 | Tổng quan | Dashboard + thẻ | Dashboard | `StatCard` bấm được, `WorkQueueCard` | – | `ActionButton` Xác nhận đơn + Confirm | Skeleton, EmptyState |
| 2 | Đơn hàng | Bảng + select | List + Drawer | `DataTable`, `SearchBar`, chip, `Pagination` | Drawer `?order=` | Nút đổi trạng thái + Confirm | Toast, Empty |
| 3 | Sản phẩm | Form chèn + bảng | List + Modal | `DataTable`, lọc loại/hiển thị | – | Modal Thêm/Sửa, Confirm Ẩn/Hiện | Toast, FieldError |
| 4 | Khách hàng | Bảng + hồ sơ cuối | List + Drawer | `DataTable`, `SearchBar`, `Pagination` | Drawer `?id=` + Tabs | – | Empty |
| 5 | Yêu cầu tư vấn | Master-detail | List + Detail Page | `DataTable`/thẻ, chip trạng thái | `/admin/tu-van/[id]` + Tabs | Phân công, Thêm món, Confirm Gửi | Toast, Empty |
| 6 | Hàng đang giữ | Bảng | List | `DataTable` | Drawer yêu cầu liên quan (tùy chọn) | Confirm Chốt mua/Nhả | Toast |
| 7 | Tồn kho và SKU | KPI + form + bảng + tem | List + Modal + Drawer | `StatCard`, `FilterBar`, `DataTable` nhóm | Drawer `?tem=` (tem + tồn theo kho) | Modal Tạo SKU | Toast, Skeleton |
| 8 | Combo capsule | Bảng + form | List + Modal | `DataTable` | – | Modal Tạo capsule (`?add=`), Confirm Bán set | Toast |
| 9 | Đặt may | 4 khối | Tabs + Modal + Page | Tabs `po`/`returns`, `DataTable` | Page Kiểm hàng | Modal Tạo PO (`?sku=`), Confirm Chuyển tiến độ/Đã trả | Toast |
| 10 | Điều chuyển | Thẻ + form + bảng | Overview + Modal | Thẻ kho, `DataTable` | – | Modal Tạo phiếu (`?sku=&from=&to=`), Confirm Nhận hàng | Toast |
| 11 | Xuất kho và đổi trả | 3 nghiệp vụ | Tabs + Page + Modal | Tabs `pack`/`returns`/`repair` | Page `/xuat-kho/[code]` | Modal Tem vận đơn, Modal Tiếp nhận đổi trả, Confirm Nhập lại/Sửa chữa | Toast, Empty |
| 12 | Cảnh báo và nhật ký | 3 báo cáo | Tabs | Tabs `alerts`/`slow`/`logs`; nhật ký giữ 80 giao dịch mới nhất (UC-37), không phân trang | – | – | Empty |
| 13 | Tài khoản người dùng | Form + bảng | List + Modal | `FilterBar`, `DataTable` | – | Modal Tạo (SuccessState mật khẩu tạm), Confirm đổi vai trò/khóa | Toast |
| 14 | Báo cáo doanh thu | Form + KPI + bảng | Report Page | `FilterBar` ngày, `StatCard`, `DataTable` | – | – | Empty, Skeleton |
| 15 | Đổi mật khẩu (nội bộ) | Form | Page hẹp | `PageContainer narrow` | – | `FormSection` | FieldError, Toast |
| 16 | Trang chủ | Marketing | Giữ, chuẩn hóa `Section` | – | – | – | – |
| 17 | Catalog | Cột lọc | Page + Filter Drawer (mobile) | `FilterPanel`, chip đang lọc | – | – | EmptyState, Skeleton |
| 18 | Chi tiết SP | 1 trang dài | Page + Drawer | `Breadcrumb` | Drawer Hướng dẫn size | – | Toast “Đã thêm vào giỏ”, not-found |
| 19 | Giỏ hàng | Bảng | Page, thẻ trên mobile | `DataTable mobile=cards` | – | – | EmptyState, Toast |
| 20 | Thanh toán | Form + tóm tắt | Page | `FormSection` | – | – | FieldError, SuccessState |
| 21 | Tài khoản khách | 5 tab | Page + Tabs | `Tabs` (`?tab=`), giữ riêng tab Theo dõi (UC-09); bấm đơn ở Lịch sử mở tab Theo dõi của đơn đó (`?tab=track&order=`) | – | `FormSection` | Empty, Toast |
| 22 | Tư vấn | Form | Page hẹp | `FormSection` | – | – | SuccessState |
| 23–24 | Đăng nhập / Đăng ký | Form card | Page hẹp | `PageContainer narrow` | – | `Field` | FieldError |

---

## 8. Implementation Roadmap (Lộ trình)

Mỗi giai đoạn kết thúc bằng một commit/PR riêng, chạy checklist mục 10 cho phần bị ảnh hưởng, rồi mới sang giai đoạn tiếp.

| GĐ | Nội dung | Phạm vi file | Kết quả kiểm chứng | Ước lượng |
|---|---|---|---|---|
| **0** | Đường cơ sở: chụp ảnh màn hình mọi route ở 3 vai trò (desktop + mobile), viết script smoke kiểm tra mã HTTP của toàn bộ route | `scripts/` (mới) | Bộ ảnh “trước” + script chạy xanh | 0,5 ngày |
| **1** | Design tokens + tách CSS; component L5 và L4 nền tảng: `Button`, `Field`, `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorState`, `ToastProvider` (thay ruột `FlashProvider`, giữ `useRun`), `BaseModal`, `BaseDrawer`, `ConfirmDialog`, `Tabs`, `DescriptionList`; thêm `loading.tsx`/`error.tsx`/`not-found.tsx` | `app/styles/*`, `components/ui/*`, `components/admin/Flash.tsx` | Mọi trang trông như cũ; Toast thay Flash hoạt động | 2 ngày |
| **2** | Application Shell quản trị: `AdminShell`, `Sidebar` (desktop thu gọn, mobile drawer), `AdminHeader` + `Breadcrumb` + `UserMenu`, `PageContainer`, `PageHeader` | `app/admin/layout.tsx`, `components/layout/*` | Menu theo quyền đúng 3 vai trò, badge đúng | 1 ngày |
| **3** | **Thí điểm: Đơn hàng** – `DataTable`, `SearchBar`, `Pagination`, `lib/url.ts`, Drawer chi tiết đơn, Confirm đổi trạng thái | `app/admin/don-hang/*`, `components/admin/orders/*` | Mở/đóng Drawer giữ `s`, `q`, `page`; quy tắc trạng thái vẫn do server chặn | 1 ngày |
| — | **Điểm review**: duyệt UI module thí điểm trước khi nhân rộng | | | |
| **4** | Bán hàng & hệ thống: Sản phẩm (Modal), Khách hàng (Drawer), Tài khoản người dùng (Modal + Confirm), Báo cáo, Tổng quan, Đổi mật khẩu | 6 trang + component tương ứng | CRUD sản phẩm, tạo/khóa tài khoản, mật khẩu tạm hiện đúng 1 lần | 2 ngày |
| **5** | Kho (theo thứ tự rủi ro tăng dần): Nhật ký (Tabs) → Điều chuyển → Capsule → Tồn kho (Modal + Drawer tem) → Đặt may (Tabs + trang Kiểm hàng) → Xuất kho (Tabs + trang Đóng gói) | `app/admin/kho/**` | Số tồn Physical/Reserved/Available trước–sau mỗi thao tác khớp bảng cơ sở; `inventory_logs` ghi đúng | 3–4 ngày |
| **6** | Tư vấn phối đồ: List + `/admin/tu-van/[id]` + Tabs; Hàng đang giữ + Confirm; redirect `?id=` | `app/admin/tu-van/**`, `app/admin/kho/giu-hang` | Luồng nhận → soạn → gửi → chốt/nhả chạy trọn | 1,5 ngày |
| **7** | Cửa hàng: Shop shell + mobile nav drawer, Catalog filter drawer, Drawer bảng size, giỏ hàng dạng thẻ mobile, Tài khoản khách (Tabs + Drawer đơn), form chuẩn | `app/(shop)/**`, `components/shop/*` | Mua hàng trọn luồng, giỏ hàng localStorage vẫn giữ | 2 ngày |
| **8** | Testing tổng thể (mục 10), so ảnh trước/sau, dọn CSS/class không còn dùng, cập nhật README | toàn bộ | Checklist xanh | 1 ngày |

Tổng ước lượng: **khoảng 14–15 ngày công**.

---

## 9. Technical Risks (Rủi ro kỹ thuật)

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | **Vỡ liên kết sâu** khi đổi `?id=`, `?qc=`, `?o=` sang route mới (Tổng quan, Nhật ký, PackPanel đang dùng) | Cao | Giữ query cũ và redirect phía server (mục 5.1); script smoke kiểm tra từng link ở mục 2.4 |
| R2 | **Route mới quên kiểm tra quyền** (`/admin/tu-van/[id]`, `/xuat-kho/[code]`, `/dat-may/[code]/kiem-hang`) | Cao | Bắt buộc gọi `requirePage(<UC của trang cha>)` ở đầu mỗi page; checklist quyền theo 4 vai trò; Server Actions vẫn tự kiểm tra bằng `requirePerm` nên dữ liệu không bị ghi sai kể cả khi UI lọt |
| R3 | **Luồng bắt buộc đổi mật khẩu tạm** bị bỏ qua nếu UserMenu/route mới không qua `requirePage` | Trung bình | Không đổi `requirePage`; test đăng nhập bằng tài khoản mới tạo |
| R4 | **Mất mật khẩu tạm** nếu Modal tạo tài khoản đóng ngay sau khi tạo | Trung bình | Modal chuyển sang SuccessState, chỉ đóng khi người dùng bấm “Đã lưu mật khẩu”; có nút sao chép |
| R5 | **Ranh giới Server/Client Component**: Drawer là client, nội dung chi tiết đọc DB ở server | Trung bình | Mẫu “client shell nhận `children` render từ server”; không import `lib/db` vào file `'use client'` |
| R6 | **Modal/Drawer không đóng hoặc dữ liệu cũ** sau khi action chạy (do `router.refresh()` bất đồng bộ) | Trung bình | Đóng Modal khi `r.ok`; giữ `key` theo dữ liệu như code hiện tại (`ConsultPanel`, `QcPanel` đã làm vậy) |
| R7 | **Thêm ConfirmDialog làm chậm thao tác lặp** (nhân viên kho xác nhận nhiều phiếu) | Thấp | Chỉ confirm thao tác trừ/cộng kho, đổi quyền, đổi trạng thái; không confirm thao tác vô hại (thêm món vào set nháp, bỏ lọc) |
| R8 | **Phân trang làm sai số đếm** ở chip lọc và caption “Hiển thị x / y” | Thấp | Đếm trên mảng đầy đủ, chỉ cắt khi render; không đổi SQL |
| R9 | **Hồi quy giao diện** do bỏ inline style trên nhiều file | Trung bình | Refactor theo module; so ảnh trước/sau ở GĐ 0 và GĐ 8 |
| R10 | **Không có test tự động** → khó phát hiện mất chức năng | Cao | Script smoke route (GĐ 0) + checklist thủ công; đề xuất thêm Playwright làm `devDependency` **nếu được duyệt** (không ảnh hưởng runtime) |
| R11 | **`<dialog>` và `:has()`**: trình duyệt cũ (Safari < 15.4) | Thấp | Đối tượng là trình duyệt hiện đại; có fallback CSS cho `:has()` như hiện tại |
| R12 | Link `?tab=track` trong `Checkout` | Thấp | Giữ nguyên tab `track` theo UC-09 |
| R13 | **Hydration giỏ hàng** (localStorage) khi đổi header thành drawer trên mobile | Thấp | Giữ `CartProvider` và cờ `ready` như cũ |
| R15 | **`loading.tsx` ở route có kiểm tra quyền** làm `redirect()` của `requirePage` chạy sau khi đã stream (chuyển hướng chậm, nháy khung chờ) | Trung bình | *Phát hiện ở GĐ 1 nhờ test routing.* Chỉ đặt `loading.tsx` ở route không redirect (`/san-pham`); trạng thái tải chung dùng thanh tiến trình `NavProgress` |
| R16 | **Toast nằm ngoài Modal/Drawer bị inert** (không bấm được, trình đọc màn hình không đọc) | Trung bình | *Phát hiện ở GĐ 3.* Toast được portal vào dialog đang mở trên cùng |
| R14 | **Vô tình đổi logic** khi di chuyển code tính toán đang nằm trong page (ví dụ lọc `cands` trong Tư vấn, `pick` sắp theo kệ trong Xuất kho) | Trung bình | Di chuyển nguyên khối, không viết lại; review diff riêng cho các đoạn tính toán |

**Ngoài phạm vi** (chỉ ghi nhận, không làm nếu chưa duyệt): truy vấn N+1 ở Đơn hàng/Tài khoản khách, `LIMIT/OFFSET` trong SQL, dark mode, ảnh sản phẩm thật, đa ngôn ngữ.

---

## 10. Testing Checklist

### 10.1 Routing
- [ ] 24 route hiện có trả 200 (hoặc 307 đúng đích khi chưa đăng nhập/không đủ quyền)
- [ ] 3 route mới trả 200 với đúng vai trò, 404 với mã không tồn tại
- [ ] Mọi link ở mục 2.4 dẫn tới đúng màn hình/Drawer/Modal
- [ ] Nút Back của trình duyệt đóng Drawer và quay lại danh sách với lọc cũ
- [ ] Mở Drawer từ URL trực tiếp (dán link) hiển thị đúng
- [ ] Breadcrumb đúng cho mọi trang quản trị

### 10.2 Trạng thái danh sách
- [ ] Mở/đóng Drawer giữ nguyên `q`, bộ lọc, `page`
- [ ] Đóng Modal không mất bộ lọc
- [ ] Sau action thành công, danh sách và badge sidebar cập nhật

### 10.3 CRUD và nghiệp vụ (đối chiếu với ảnh/ số liệu GĐ 0)
- [ ] Sản phẩm: thêm, sửa, ẩn/hiện
- [ ] SKU: tạo, mã sinh đúng quy tắc, tem hiển thị
- [ ] Đơn hàng: Chờ xác nhận → Đã xác nhận; chặn chuyển thẳng sang Đang giao; Đang giao → Đã giao
- [ ] Xuất kho: pick-list sắp theo kệ, checklist bắt buộc, đóng gói trừ Physical, tem vận đơn hiện
- [ ] Đổi trả: tiếp nhận, nhập lại kho, chuyển sửa chữa
- [ ] Đặt may: tạo PO (cả prefill từ cảnh báo), chuyển tiến độ, kiểm hàng QC, phiếu trả xưởng
- [ ] Điều chuyển: tạo phiếu (cả prefill từ Xuất kho), xác nhận nhận hàng
- [ ] Capsule: tạo (cả prefill từ hàng chậm), bán 1 set, chặn khi thiếu món
- [ ] Tư vấn: nhận phụ trách, admin phân công, soạn set, lọc màu, gửi + giữ hàng 24/48h
- [ ] Giữ hàng: chốt mua, nhả, giả lập 12 giờ (admin)
- [ ] Tài khoản: tạo nội bộ + mật khẩu tạm, đổi vai trò, khóa/mở khóa, không tự khóa mình
- [ ] Báo cáo: lọc ngày, nhóm ngày/tháng, số liệu khớp
- [ ] Cửa hàng: lọc catalog, chọn màu/size, thêm giỏ, sửa số lượng, đặt hàng, gửi tư vấn, cập nhật hồ sơ, đổi mật khẩu

### 10.4 Server Actions (API contract)
- [ ] Không có thay đổi chữ ký hàm trong `app/actions/*` (kiểm bằng `git diff app/actions`)
- [ ] Lỗi từ action hiện trong Toast hoặc FieldError đúng chỗ
- [ ] `npm run build` không lỗi kiểu

### 10.5 Phân quyền (4 vai trò + khách vãng lai)
- [ ] Sidebar chỉ hiện mục được phép với customer/stylist/staff/admin
- [ ] Truy cập trực tiếp route không được phép → chuyển về trang của vai trò
- [ ] Stylist chỉ thấy yêu cầu chưa nhận hoặc của mình; chỉ thấy lệnh giữ của mình
- [ ] Tab “Hàng chậm luân chuyển” chỉ hiện với admin (UC-36); nút tạo capsule chỉ admin (UC-24)
- [ ] Tài khoản mật khẩu tạm bị ép đổi mật khẩu trước mọi trang khác

### 10.6 Responsive (375px, 820px, 1280px, 1440px)
- [ ] Không có cuộn ngang toàn trang
- [ ] Sidebar mobile mở/đóng, tự đóng khi chuyển trang
- [ ] Drawer full-width, Modal full-screen trên mobile
- [ ] Bảng chuyển dạng thẻ hoặc cuộn ngang trong khung riêng
- [ ] Filter Drawer catalog hoạt động trên mobile

### 10.7 Feedback và a11y
- [ ] Loading hiển thị khi chuyển trang quản trị
- [ ] `error.tsx` bắt lỗi, có nút thử lại
- [ ] EmptyState ở mọi danh sách rỗng
- [ ] Modal/Drawer: focus vào phần tử đầu, Esc để đóng, trả focus về nút mở
- [ ] Toast có `role="status"`/`role="alert"`; lỗi không tự biến mất
- [ ] Tương phản màu đạt WCAG AA cho token mới

---

## 11. Đối chiếu với Đặc tả use case v3.0

Mọi thay đổi UI phải giữ đúng luồng chính, luồng thay thế, ngoại lệ và tên nút trong `Dac_ta_use_case_ELORA_WOMAN_v3.md`. Các điều chỉnh rút ra khi đối chiếu:

| Use case | Đặc tả nói | Ảnh hưởng tới kế hoạch |
|---|---|---|
| UC-03 | Đăng xuất ở **đầu trang, mọi màn hình** | Trang quản trị hiện để Đăng xuất ở đáy sidebar → chuyển lên `UserMenu` trên Header (GĐ 2) |
| UC-17 bước 3–5 | Chọn một đơn → xem sản phẩm, tổng tiền, thanh toán, trạng thái → **chọn trạng thái mới và lưu** | Drawer chi tiết đơn có ô chọn trạng thái + nút **Lưu trạng thái** (thay select đổi ngay). Ngoại lệ 6a–6c vẫn do server từ chối, hiện bằng Toast lỗi |
| UC-17 1a, UC-20 3a | Bấm **Xác nhận** ngay trên tổng quan | Lối tắt giữ một cú bấm, không thêm hộp xác nhận |
| UC-37 bước 2 | Hiển thị **80 giao dịch mới nhất** | Nhật ký **không** phân trang, giữ 80 dòng |
| UC-09 bước 3 | Chọn một đơn ở **tab Theo dõi** | Không gộp tab Lịch sử và Theo dõi; giữ 2 tab như đặc tả |
| UC-23 bước 3 | Nhân viên **in tem** | Drawer tem có nút In (chỉ in phần tem) |
| UC-21 bước 3–4 | Hệ thống sinh mã SKU để **xem trước**, nhân viên **xác nhận tạo** | Modal Tạo SKU giữ khung xem trước mã |
| UC-21, 24, 26, 30, 33, 38 | “Chọn **Tạo SKU / Tạo capsule / Tạo phiếu / Tạo tài khoản**” | Khớp với nút mở Modal |
| UC-24 1a, UC-26 1a, UC-30 1a | Mở từ màn khác thì **điền sẵn** | Modal tự mở khi URL có `?add=`, `?sku=`, `?sku=&from=&to=` |
| UC-29, UC-34 | Nút **Đã trả xưởng**, **Nhập lại kho**, **Chuyển sửa chữa** | Dùng đúng nhãn đặc tả |
| UC-15 bước 2 | Lệnh giữ còn ≤ 6 giờ **tô đỏ** | `StatusBadge` domain `hold` giữ quy tắc này |
| UC-07 bước 2 | Hệ thống **báo đã thêm** | Dùng Toast |
| UC-06 5a | **Mở** bảng hướng dẫn chọn size | Drawer hướng dẫn size |
| Cột “Màn hình” | `/admin/tu-van`, `/admin/kho/xuat-kho`, `/admin/kho/dat-may` | Ba route con mới nằm dưới đúng route đặc tả; đề xuất nhóm đặc tả cập nhật cột Màn hình sau khi triển khai |
| BR-05 | Máy chủ kiểm tra quyền ở **mọi màn hình** | Route con mới gọi `requirePage` với UC tương ứng (UC-12, UC-28, UC-32) |

ConfirmDialog là lớp giao diện thêm vào; người dùng vẫn bấm đúng nút đặc tả nêu, sau đó xác nhận. Không thêm, bớt hay đổi thứ tự bước nghiệp vụ.

## 12. Quyết định đã phê duyệt (03/11/2026)

1. **Route mới** cho 3 quy trình phức tạp (`/admin/tu-van/[id]`, `/admin/kho/xuat-kho/[code]`, `/admin/kho/dat-may/[code]/kiem-hang`) kèm redirect từ link cũ: **Đồng ý**.
2. **Phân trang** chỉ cắt ở tầng hiển thị, không đổi SQL: **Đồng ý**.
3. **Playwright** làm devDependency cho test tự động: **Đồng ý**.
4. **Màu Toast thành công**: **Không dùng màu mới**. Giữ màu hiện tại (nền sage `#E3E4DE`, chữ ink `#1E1B1E`), không thêm màu nào ngoài bảng màu đang có.
5. **Module thí điểm**: **Đơn hàng**.

## 13. Tiến độ

| GĐ | Trạng thái | Ghi chú |
|---|---|---|
| 0 | Xong | Playwright, 24 test routing/phân quyền, 90 ảnh `tests/baseline/before` |
| 1 | Xong | `app/styles/{tokens,base,shop,admin,ui}.css`; `components/ui/*` (Button, StatusBadge, DataTable, Tabs, FilterChips, SearchBar, Pagination, DescriptionList, StatCard, Section, Field, Steps, BaseModal, BaseDrawer, UrlDrawer, ConfirmDialog, Toast, Menu, Empty/Loading/Error/Success, NavProgress); `error.tsx`, `not-found.tsx`; `useRun`/`Act` dùng Toast + ConfirmDialog |
| 2 | Xong | `AdminChrome`: sidebar lọc quyền + badge, off-canvas trên mobile, Header có Breadcrumb và menu người dùng (Đăng xuất ở đầu trang – UC-03) |
| 3 | Xong, **chờ review** | Đơn hàng: chip lọc + tìm kiếm + phân trang + Drawer `?order=` + Lưu trạng thái có xác nhận (UC-17); Tổng quan mở thẳng Drawer đơn (UC-20); 3 test `tests/e2e/orders.spec.ts` |
| 4 | Xong | Sản phẩm (Modal Thêm/Sửa, xác nhận Ẩn/Hiện, lọc loại/hiển thị, tìm kiếm – UC-18); Khách hàng (tìm kiếm, phân trang, Drawer `?id=` hồ sơ phong cách + lịch sử mua – UC-19); Tài khoản người dùng (Modal tạo + mật khẩu tạm có Sao chép, xác nhận đổi vai trò/khóa kèm cảnh báo 3e, tìm kiếm, phân trang – UC-38); Báo cáo (UC-40); Tổng quan (chỉ số bấm được, Xem tất cả – UC-20); Đổi mật khẩu (UC-39). 8 test `tests/e2e/admin-sales.spec.ts` |
| 5–8 | Chưa làm | |
