'use client';

type Props = { categories: string[]; selected: string; query: string; status: string };

export default function ProductCategoryFilter({ categories, selected, query, status }: Props) {
  return <form method="get" action="/admin/san-pham" className="product-category-filter">
    {query && <input type="hidden" name="q" value={query} />}
    {status && <input type="hidden" name="st" value={status} />}
    <label htmlFor="product-category">Loại sản phẩm</label>
    <span className="product-select-wrap">
      <select id="product-category" name="cat" value={selected} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <option value="">Tất cả loại</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  </form>;
}
