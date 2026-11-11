'use client';

type Option = { value: string; label: string };
export default function StockFilters({ products, colors, sizes, selected, query, status }: {
  products: Option[];
  colors: Option[];
  sizes: Option[];
  selected: { product: string; color: string; size: string };
  query: string;
  status: string;
}) {
  return <form method="get" action="/admin/kho" className="stock-select-filters" aria-label="Lọc SKU">
    {query && <input type="hidden" name="q" value={query} />}
    {status !== 'all' && <input type="hidden" name="f" value={status} />}
    <FilterSelect name="product" label="Sản phẩm cha" placeholder="Chọn sản phẩm" options={products} value={selected.product} />
    <FilterSelect name="color" label="Màu sắc" placeholder="Tất cả màu" options={colors} value={selected.color} />
    <FilterSelect name="size" label="Kích cỡ" placeholder="Tất cả kích cỡ" options={sizes} value={selected.size} />
  </form>;
}

function FilterSelect({ name, label, placeholder, options, value }: { name: string; label: string; placeholder: string; options: Option[]; value: string }) {
  return <label className="stock-filter-field">
    <span>{label}</span>
    <span className="stock-select-wrap">
      <select name={name} value={value} onChange={(e) => e.currentTarget.form?.requestSubmit()} aria-label={label}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  </label>;
}
