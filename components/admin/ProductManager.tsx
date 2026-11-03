"use client";
import { useRef, useState } from "react";
import { useRun, Act } from "./Flash";
import { saveProduct, toggleProduct } from "@/app/actions/admin";
import { CATEGORIES, fmt } from "@/lib/util";

type P = {
  id: number;
  name: string;
  category: string;
  price: number;
  salePrice: number | null;
  material: string;
  description: string;
  image: string;
  active: number;
  featured: number;
  isNew: number;
  stockText: string;
  warn: boolean;
};
type Form = {
  name: string;
  category: string;
  price: string;
  salePrice: string;
  material: string;
  description: string;
  image: string;
  active: boolean;
  featured: boolean;
  isNew: boolean;
};
const blank: Form = {
  name: "",
  category: "Đầm",
  price: "",
  salePrice: "",
  material: "",
  description: "",
  image: "",
  active: true,
  featured: false,
  isNew: false,
};

export default function ProductManager({ products }: { products: P[] }) {
  const { run, pending } = useRun();
  const [edit, setEdit] = useState<null | number | "new">(null);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const open = (p?: P) => {
    setErr("");
    if (p) {
      setEdit(p.id);
      setF({
        name: p.name,
        category: p.category,
        price: String(p.price),
        salePrice: p.salePrice ? String(p.salePrice) : "",
        material: p.material,
        description: p.description,
        image: p.image,
        active: !!p.active,
        featured: !!p.featured,
        isNew: !!p.isNew,
      });
    } else {
      setEdit("new");
      setF(blank);
    }
  };
  const set =
    (k: "name" | "price" | "salePrice" | "material" | "description") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });
  const setFlag =
    (key: "active" | "featured" | "isNew") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setF({ ...f, [key]: e.target.checked });
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    const body = new FormData();
    body.set("file", file);
    setUploading(true);
    try {
      const response = await fetch("/api/admin/product-image", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không thể tải ảnh lên.");
      setF((current) => ({ ...current, image: result.url }));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(
      saveProduct({
        id: typeof edit === "number" ? edit : undefined,
        name: f.name,
        category: f.category,
        price: parseInt(f.price, 10) || 0,
        salePrice: f.salePrice ? parseInt(f.salePrice, 10) : null,
        material: f.material,
        description: f.description,
        image: f.image,
        active: f.active,
        featured: f.featured,
        isNew: f.isNew,
      }),
    );
    if (r.error) setErr(r.error);
    else setEdit(null);
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, color: "#3F383D" }}>
          {products.length} sản phẩm, {products.filter((p) => p.active).length}{" "}
          đang bán
        </span>
        <button className="btn" onClick={() => open()}>
          Thêm sản phẩm
        </button>
      </div>
      {edit !== null && (
        <form
          onSubmit={save}
          className="card"
          style={{ background: "#F6EEEF", gap: 18 }}
        >
          <h2 className="disp" style={{ fontSize: 30 }}>
            {edit === "new" ? "Thêm sản phẩm mới" : "Sửa sản phẩm"}
          </h2>
          <div className="grid">
            <div className="fl" style={{ gridColumn: "1 / -1" }}>
              <label className="lbl" htmlFor="pe-name">
                Tên sản phẩm
              </label>
              <input
                id="pe-name"
                className="fld"
                value={f.name}
                onChange={set("name")}
              />
            </div>
            <div className="fl" style={{ gridColumn: "1 / -1" }}>
              <span className="lbl">Ảnh sản phẩm</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="ghost"
                  onClick={() => imageInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Đang tải ảnh..." : "Tải ảnh"}
                </button>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadImage}
                  style={{ display: "none" }}
                />
                {f.image && (
                  <img
                    src={f.image}
                    alt="Xem trước ảnh sản phẩm"
                    style={{
                      width: 96,
                      height: 128,
                      objectFit: "cover",
                      border: "1px solid var(--line)",
                    }}
                  />
                )}
                <span className="note">JPG, PNG hoặc WebP, tối đa 5 MB.</span>
              </div>
            </div>
            <div className="fl">
              <label className="lbl" htmlFor="pe-cat">
                Loại
              </label>
              <select
                id="pe-cat"
                className="fld"
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fl">
              <label className="lbl" htmlFor="pe-price">
                Giá bán (đồng)
              </label>
              <input
                id="pe-price"
                type="number"
                className="fld"
                value={f.price}
                onChange={set("price")}
              />
            </div>
            <div className="fl">
              <label className="lbl" htmlFor="pe-sale">
                Giá khuyến mãi (nếu có)
              </label>
              <input
                id="pe-sale"
                type="number"
                className="fld"
                value={f.salePrice}
                onChange={set("salePrice")}
              />
            </div>
            <div className="fl" style={{ gridColumn: "1 / -1" }}>
              <label className="lbl" htmlFor="pe-mat">
                Chất liệu
              </label>
              <input
                id="pe-mat"
                className="fld"
                value={f.material}
                onChange={set("material")}
              />
            </div>
            <div className="fl" style={{ gridColumn: "1 / -1" }}>
              <label className="lbl" htmlFor="pe-desc">
                Mô tả
              </label>
              <textarea
                id="pe-desc"
                className="fld"
                value={f.description}
                onChange={set("description")}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {(
              [
                ["active", "Đang bán trên website"],
                ["featured", "Sản phẩm nổi bật"],
                ["isNew", "Bộ sưu tập mới"],
              ] as const
            ).map(([k, l]) => (
              <label
                key={k}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={f[k]}
                  onChange={setFlag(k)}
                  style={{ width: 22, height: 22, accentColor: "#6B2437" }}
                />
                {l}
              </label>
            ))}
          </div>
          <span className="note">
            Sản phẩm mới chỉ bán được sau khi nhân viên tạo SKU (màu, size, tồn
            đầu kỳ) ở mục Tồn kho và SKU. Sản phẩm bị ẩn không hiện trên
            website.
          </span>
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn" disabled={pending || uploading}>
              Lưu sản phẩm
            </button>
            <button
              type="button"
              className="ghost"
              style={{ minHeight: 48 }}
              onClick={() => setEdit(null)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="scroll">
        <table className="tb" style={{ minWidth: 860 }}>
          <caption>Danh sách sản phẩm</caption>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Loại</th>
              <th>Giá</th>
              <th>Tồn thực tế</th>
              <th>Hiển thị</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={{ minWidth: 220 }}>
                  <b>{p.name}</b>
                </td>
                <td>{p.category}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {p.salePrice ? (
                    <>
                      {fmt(p.salePrice)}{" "}
                      <s style={{ color: "#6A6168" }}>{fmt(p.price)}</s>
                    </>
                  ) : (
                    fmt(p.price)
                  )}
                </td>
                <td
                  style={
                    p.warn
                      ? { color: "var(--err)", fontWeight: 600 }
                      : undefined
                  }
                >
                  {p.stockText}
                </td>
                <td>
                  <span className={"badge" + (p.active ? " dark" : "")}>
                    {p.active ? "Đang bán" : "Đã ẩn"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="ghost"
                    onClick={() => open(p)}
                    aria-label={`Sửa ${p.name}`}
                  >
                    Sửa
                  </button>{" "}
                  <Act
                    action={toggleProduct}
                    args={[p.id]}
                    label={`${p.active ? "Ẩn" : "Hiện"} ${p.name}`}
                  >
                    {p.active ? "Ẩn" : "Hiện"}
                  </Act>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
