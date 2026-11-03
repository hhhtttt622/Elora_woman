// Dựng URL giữ nguyên các tham số đang có (tìm kiếm, lọc, trang) và chỉ đổi phần cần đổi.
// Dùng được ở cả server và client.
export type Params = Record<string, string | string[] | undefined>;

/** Ghép `base` với params hiện tại + `patch`. Giá trị '' hoặc null trong patch sẽ xóa tham số đó. */
export function hrefWith(base: string, current: Params, patch: Record<string, string | number | null | undefined> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v === undefined || k in patch) continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => x !== '' && sp.append(k, x));
  }
  for (const [k, v] of Object.entries(patch)) if (v !== null && v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** Phân trang ở tầng hiển thị: cắt mảng đã lọc, không đổi truy vấn. */
export function paginate<T>(rows: T[], pageParam: string | undefined, size = 20) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pages, Math.max(1, parseInt(pageParam || '1', 10) || 1));
  return { page, pages, size, total: rows.length, items: rows.slice((page - 1) * size, page * size) };
}
