"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction, type Res } from "@/app/actions/auth";
import { COLORS } from "@/lib/util";
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" disabled={pending}>
      {pending ? "Đang lưu..." : "Lưu thông tin"}
    </button>
  );
}
export default function ProfileForm({ u }: { u: any }) {
  const [st, action] = useFormState<Res, FormData>(updateProfileAction, {});
  const liked = String(u.liked_colors || "").split(", ");
  return (
    <form action={action} className="card" style={{ gap: 18, maxWidth: 720 }}>
      <div className="grid">
        <div className="fl">
          <label className="lbl" htmlFor="p-name">
            Họ tên
          </label>
          <input
            id="p-name"
            name="name"
            className="fld"
            defaultValue={u.name}
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-email">
            Email
          </label>
          <input
            id="p-email"
            className="fld"
            value={u.email}
            readOnly
            aria-readonly
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-phone">
            Số điện thoại
          </label>
          <input
            id="p-phone"
            name="phone"
            className="fld"
            defaultValue={u.phone}
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-work">
            Môi trường làm việc
          </label>
          <input
            id="p-work"
            name="workEnv"
            className="fld"
            defaultValue={u.work_env}
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-h">
            Chiều cao (cm)
          </label>
          <input
            id="p-h"
            name="height"
            type="number"
            className="fld"
            defaultValue={u.height_cm ?? ""}
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-w">
            Cân nặng (kg)
          </label>
          <input
            id="p-w"
            name="weight"
            type="number"
            className="fld"
            defaultValue={u.weight_kg ?? ""}
          />
        </div>
        <div className="fl">
          <label className="lbl" htmlFor="p-size">
            Size thường mặc
          </label>
          <select id="p-size" name="size" className="fld" defaultValue={u.size}>
            {["S", "M", "L", "XL"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lbl" style={{ marginBottom: 8 }}>
          Màu ưa thích
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {COLORS.map((c) => (
            <label
              key={c}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="colors"
                value={c}
                defaultChecked={liked.includes(c)}
                style={{ width: 20, height: 20, accentColor: "#6B2437" }}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      {st.error && (
        <p className="err" role="alert">
          {st.error}
        </p>
      )}
      {st.ok && (
        <p className="ok" role="status">
          {st.msg}
        </p>
      )}
      <Submit />
    </form>
  );
}
