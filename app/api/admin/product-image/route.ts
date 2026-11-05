import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requirePerm } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requirePerm("UC-18");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File))
      return Response.json(
        { error: "Chọn ảnh sản phẩm trước." },
        { status: 400 },
      );
    if (file.size === 0 || file.size > MAX_SIZE)
      return Response.json(
        { error: "Ảnh phải có dung lượng từ 1 byte đến 5 MB." },
        { status: 400 },
      );

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext =
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? "jpg"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "png"
          : bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            ? "webp"
            : null;
    if (!ext)
      return Response.json(
        { error: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP hợp lệ." },
        { status: 400 },
      );

    const filename = `${randomUUID()}.${ext}`;
    const directory = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
    return Response.json({ url: `/uploads/products/${filename}` });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải ảnh lên.";
    const status =
      message.includes("Phiên đăng nhập") || message.includes("quyền")
        ? 403
        : 500;
    return Response.json({ error: message }, { status });
  }
}
