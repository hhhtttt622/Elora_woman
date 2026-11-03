import { redirect } from "next/navigation";

export default function LegacyOutbound({
  searchParams,
}: {
  searchParams: { o?: string; label?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.o) query.set("o", searchParams.o);
  if (searchParams.label) query.set("label", searchParams.label);
  const suffix = query.toString();
  redirect(`/admin/don-hang/xuat-kho${suffix ? `?${suffix}` : ""}`);
}
