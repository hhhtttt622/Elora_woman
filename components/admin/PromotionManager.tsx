'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, fmt } from '@/lib/util';
import { savePromotion, pausePromotion, deletePromotion } from '@/app/actions/promotions';
import { PageHeader } from '@/components/layout/Page';
import { BaseDrawer } from '@/components/ui/Dialog';
import { Act } from '@/components/admin/Flash';

type Rule = { ruleType: 'include'|'exclude'; entityType: 'product'|'category'|'collection'; entityId: string };
const localInput = (iso: string) => { try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)).replace(' ', 'T'); } catch { return ''; } };
const dt = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).replace(' ', 'T');
export default function PromotionManager({ promotions, catalog }: { promotions: any[]; catalog: any[] }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState(''); const [message, setMessage] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listQuery, setListQuery] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const [occasionFilter, setOccasionFilter] = useState('all'); const [audienceFilter, setAudienceFilter] = useState('all');
  const initial = () => ({ id: 0, name: '', code: '', description: '', kind: 'percent', value: '10', maxDiscount: '', minOrder: '0', startsAt: dt(new Date()), endsAt: dt(new Date(Date.now()+30*86400000)), maxUses: '', maxPerCustomer: '', combinable: false, status: 'draft', occasion: 'general', birthdayWindow: 'month', audience: 'all', showHome: false });
  const [f, setF] = useState<any>(initial); const [rules, setRules] = useState<Rule[]>([]); const [rule, setRule] = useState<Rule>({ ruleType:'include', entityType:'product', entityId:'' });
  const [selectorOpen, setSelectorOpen] = useState(false); const [entitySearch, setEntitySearch] = useState(''); const [entityCategory, setEntityCategory] = useState(''); const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const entityOptions = useMemo(() => {
    if (rule.entityType === 'category') return CATEGORIES.map((name) => ({ id: name, name, detail: 'Danh mục' }));
    if (rule.entityType === 'collection') return [...new Set(catalog.map((p) => p.collection).filter(Boolean))].map((name: any) => ({ id: String(name), name: String(name), detail: 'Bộ sưu tập' }));
    return catalog.filter((p) => !entityCategory || p.category === entityCategory).map((p) => ({ id: String(p.id), name: p.name, detail: p.category }));
  }, [catalog, rule.entityType, entityCategory]);
  const visibleEntityOptions = entityOptions.filter((item) => `${item.name} ${item.detail}`.toLocaleLowerCase('vi').includes(entitySearch.toLocaleLowerCase('vi')));
  const addRules = (items: { entityType: Rule['entityType']; entityId: string }[]) => {
    setRules((previous) => {
      const keys = new Set(previous.map((item) => `${item.ruleType}:${item.entityType}:${item.entityId}`));
      const additions = items.map((item) => ({ ...item, ruleType: rule.ruleType })).filter((item) => {
        const key = `${item.ruleType}:${item.entityType}:${item.entityId}`;
        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      });
      return [...previous, ...additions];
    });
    setSelectedEntities([]);
    setSelectorOpen(false);
  };
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const edit = (p: any) => {
    setF({ id: p.id, name: p.name, code: p.code, description: p.description, kind: p.kind, value: String(p.value), maxDiscount: p.max_discount || '', minOrder: String(p.min_order), startsAt: localInput(p.starts_at), endsAt: localInput(p.ends_at), maxUses: p.max_uses || '', maxPerCustomer: p.max_uses_per_customer || '', combinable: !!p.combinable, status: p.status, occasion: p.occasion, birthdayWindow: p.birthday_window, audience: p.audience, showHome: !!p.show_home });
    setRules(p.rules.map((r: any) => ({ ruleType: r.rule_type, entityType: r.entity_type, entityId: r.entity_id })));
    setRule({ ruleType: 'include', entityType: 'product', entityId: '' }); setSelectedEntities([]); setSelectorOpen(false); setEntitySearch(''); setEntityCategory('');
    setErr('');
    setMessage('');
    setDrawerOpen(true);
  };
  const create = () => {
    setF(initial()); setRules([]); setRule({ ruleType: 'include', entityType: 'product', entityId: '' });
    setSelectedEntities([]); setSelectorOpen(false); setEntitySearch(''); setEntityCategory(''); setErr(''); setMessage(''); setDrawerOpen(true);
  };
  const cancel = () => { setDrawerOpen(false); setErr(''); setSelectedEntities([]); setSelectorOpen(false); };
  const persist = (statusOverride?: string) => {
    setErr('');
    setMessage('');
    start(async () => {
      const r = await savePromotion({ ...f, status: statusOverride || f.status, rules });
      if (r.error) setErr(r.error);
      else { setMessage(r.msg || 'Đã lưu.'); setDrawerOpen(false); setF(initial()); setRules([]); setSelectedEntities([]); router.refresh(); }
    });
  };
  const save = (e: React.FormEvent) => { e.preventDefault(); persist(); };
  const query = listQuery.trim().toLocaleLowerCase('vi');
  const filteredPromotions = promotions.filter((p) =>
    (!query || `${p.name} ${p.code}`.toLocaleLowerCase('vi').includes(query)) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (occasionFilter === 'all' || p.occasion === occasionFilter) &&
    (audienceFilter === 'all' || p.audience === audienceFilter));
  const statusCounts = { all: promotions.length, active: promotions.filter((p) => p.status === 'active').length, draft: promotions.filter((p) => p.status === 'draft').length, paused: promotions.filter((p) => p.status === 'paused').length };
  const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  return <>
    <PageHeader eyebrow="Bán hàng" title="Quản lý Khuyến mãi" description="Tạo mã ưu đãi, chương trình theo dịp và quy tắc sử dụng." actions={<button className="btn promo-create-button" type="button" onClick={create}><span aria-hidden="true">＋</span>Tạo chương trình mới</button>} />
    {message && <p className="promo-list-message" role="status">{message}</p>}
    <section className="promo-list-toolbar" aria-label="Tìm kiếm và lọc khuyến mãi">
      <div className="promo-list-topline"><label className="promo-list-search"><span className="sr">Tìm chương trình</span><svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none"><circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><input type="search" value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Tìm tên chương trình hoặc mã ưu đãi..." /></label>
        <label className="promo-list-select"><span className="sr">Lọc theo dịp</span><select value={occasionFilter} onChange={(e) => setOccasionFilter(e.target.value)}><option value="all">Mọi dịp</option><option value="general">Thường / ngày lễ</option><option value="birthday">Sinh nhật</option></select></label>
        <label className="promo-list-select"><span className="sr">Lọc theo nhóm khách hàng</span><select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}><option value="all">Tất cả khách hàng</option><option value="birthday">Khách sinh nhật</option></select></label>
      </div>
      <div className="promo-status-filters" role="group" aria-label="Lọc theo trạng thái">
        {([['all', 'Tất cả'], ['active', 'Đang hoạt động'], ['draft', 'Bản nháp'], ['paused', 'Tạm dừng']] as const).map(([key, label]) => <button key={key} type="button" className="promo-status-filter" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>{label}<span>{statusCounts[key]}</span></button>)}
      </div>
    </section>
    <div className="promo-list-caption"><h2>Các chương trình</h2><span>{filteredPromotions.length} / {promotions.length}</span></div>
    {filteredPromotions.length > 0 ? <div className="promo-list-card"><div className="promo-table-scroll"><table className="tb promo-table">
      <thead><tr><th>Tên chương trình & mã</th><th>Loại & mức giảm</th><th className="num">Đơn tối thiểu</th><th>Thời gian áp dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{filteredPromotions.map((p: any) => {
        const expired = p.ends_at < new Date().toISOString();
        const statusClass = expired ? 'expired' : p.status === 'active' ? 'active' : p.status === 'paused' ? 'paused' : 'draft';
        const statusLabel = expired ? 'Hết hạn' : p.status === 'active' ? 'Đang hoạt động' : p.status === 'paused' ? 'Tạm dừng' : 'Bản nháp';
        return <tr key={p.id}>
          <td><div className="promo-table-name"><b>{p.name}</b><span className="promo-code-label">{p.code}</span><small>{p.occasion === 'birthday' ? 'Sinh nhật' : 'Thường / ngày lễ'} · {p.audience === 'birthday' ? 'Khách sinh nhật' : 'Tất cả khách hàng'}</small></div></td>
          <td><div className="promo-discount-cell"><b>{p.kind === 'percent' ? `Giảm ${p.value}%` : `Giảm ${fmt(p.value)}`}</b>{p.max_discount ? <small>Tối đa {fmt(p.max_discount)}</small> : <small>Không giới hạn mức giảm</small>}</div></td>
          <td className="num">{fmt(p.min_order)}</td>
          <td><div className="promo-date-cell"><span>{formatDate(p.starts_at)}</span><small>đến {formatDate(p.ends_at)}</small></div></td>
          <td><span className={`promo-status-badge ${statusClass}`}><i />{statusLabel}</span></td>
          <td><div className="promo-row-actions"><button className="promo-row-action" type="button" onClick={() => edit(p)}><span aria-hidden="true">✎</span>Sửa</button><Act action={pausePromotion} args={[p.id]} label={`${p.status === 'paused' ? 'Kích hoạt' : 'Tạm dừng'} chương trình ${p.name}`} variant="secondary" size="sm">{p.status === 'paused' ? 'Kích hoạt' : 'Tạm dừng'}</Act><Act action={deletePromotion} args={[p.id]} label={`Xóa chương trình ${p.name}`} variant="danger-outline" size="sm" confirm={{ title: `Xóa “${p.name}”?`, message: 'Chỉ chương trình chưa phát sinh lượt sử dụng mới có thể bị xóa.', confirmLabel: 'Xóa chương trình', tone: 'danger' }}><span aria-hidden="true">⌫</span>Xóa</Act></div></td>
        </tr>;
      })}</tbody>
    </table></div></div> : <div className="promo-list-empty"><b>{promotions.length ? 'Không tìm thấy chương trình phù hợp' : 'Chưa có chương trình ưu đãi nào'}</b><span>{promotions.length ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Tạo chương trình mới để bắt đầu.'}</span></div>}

    <BaseDrawer open={drawerOpen} onClose={cancel} eyebrow="Quản lý khuyến mãi" title={f.id ? `Sửa: ${f.name}` : 'Tạo chương trình ưu đãi mới'} size="lg" className="promo-config-drawer" footer={<><button className="ghost" type="button" onClick={cancel}>Hủy</button><button className="promo-draft-button" type="button" disabled={pending} onClick={() => { const form = document.getElementById('promotion-form') as HTMLFormElement | null; if (form?.reportValidity()) persist('draft'); }}>Lưu bản nháp</button><button className="btn" type="submit" form="promotion-form" disabled={pending}>{pending ? 'Đang lưu…' : f.id ? 'Lưu thay đổi' : 'Tạo chương trình'}</button></>}>
    <form id="promotion-form" className="promo-drawer-form" onSubmit={save}>

      <section className="promo-form-section">
        <div className="promo-section-heading"><span>01</span><div><h3>Thông tin cơ bản & giá trị</h3><p>Tên, mã và mức ưu đãi áp dụng.</p></div></div>
        <div className="promo-basic-grid">
          <label className="fl promo-field-wide"><span className="lbl">Tên chương trình</span><input className="fld" value={f.name} onChange={set('name')} required /></label>
          <label className="fl"><span className="lbl">Mã ưu đãi</span><input className="fld promo-code-input" value={f.code} onChange={set('code')} required /></label>
          <label className="fl"><span className="lbl">Loại giảm</span><select className="fld" value={f.kind} onChange={set('kind')}><option value="percent">Phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
          <label className="fl"><span className="lbl">Giá trị {f.kind === 'percent' ? '(%)' : '(đồng)'}</span><input className="fld" type="number" min="1" value={f.value} onChange={set('value')} required /></label>
          <label className="fl"><span className="lbl">Đơn tối thiểu (đồng)</span><input className="fld" type="number" min="0" value={f.minOrder} onChange={set('minOrder')} /></label>
          <label className="fl"><span className="lbl">Giảm tối đa (đồng, tùy chọn)</span><input className="fld" type="number" min="0" value={f.maxDiscount} onChange={set('maxDiscount')} /></label>
          <label className="fl promo-field-wide"><span className="lbl">Mô tả và điều kiện</span><textarea className="fld promo-description" value={f.description} onChange={set('description')} /></label>
        </div>
      </section>

      <section className="promo-form-section">
        <div className="promo-section-heading"><span>02</span><div><h3>Thời gian & giới hạn</h3><p>Thiết lập thời hạn và số lần sử dụng.</p></div></div>
        <div className="promo-limit-grid">
          <label className="fl"><span className="lbl">Bắt đầu (giờ Việt Nam)</span><input className="fld" type="datetime-local" value={f.startsAt} onChange={set('startsAt')} required /></label>
          <label className="fl"><span className="lbl">Kết thúc (giờ Việt Nam)</span><input className="fld" type="datetime-local" value={f.endsAt} onChange={set('endsAt')} required /></label>
          <label className="fl"><span className="lbl">Tổng lượt (để trống nếu không giới hạn)</span><input className="fld" type="number" min="1" value={f.maxUses} onChange={set('maxUses')} placeholder="Không giới hạn" /></label>
          <label className="fl"><span className="lbl">Lượt mỗi khách</span><input className="fld" type="number" min="1" value={f.maxPerCustomer} onChange={set('maxPerCustomer')} placeholder="Không giới hạn" /></label>
          <label className="fl"><span className="lbl">Dịp áp dụng</span><select className="fld" value={f.occasion} onChange={set('occasion')}><option value="general">Chương trình thường / ngày lễ</option><option value="birthday">Sinh nhật khách hàng</option></select></label>
          {f.occasion === 'birthday' && <label className="fl"><span className="lbl">Thời gian sinh nhật</span><select className="fld" value={f.birthdayWindow} onChange={set('birthdayWindow')}><option value="day">Đúng ngày</option><option value="week">Trong 3 ngày trước/sau</option><option value="month">Trong tháng sinh nhật</option></select></label>}
          <label className="fl"><span className="lbl">Nhóm khách hàng</span><select className="fld" value={f.audience} onChange={set('audience')}><option value="all">Tất cả khách hàng</option><option value="birthday">Khách trong kỳ sinh nhật</option></select></label>
          <label className="fl"><span className="lbl">Trạng thái</span><select className="fld" value={f.status} onChange={set('status')}><option value="draft">Bản nháp</option><option value="active">Đang hoạt động</option><option value="paused">Tạm dừng</option></select></label>
        </div>
      </section>

      <section className="promo-form-section promo-rules-section">
        <div className="promo-section-heading"><span>03</span><div><h3>Sản phẩm áp dụng / loại trừ</h3><p>Không thêm điều kiện nghĩa là ưu đãi áp dụng cho toàn đơn.</p></div></div>
        <div className="promo-rule-controls">
          <label className="fl"><span className="lbl">Quy tắc</span><select className="fld" value={rule.ruleType} onChange={(e) => setRule({ ...rule, ruleType: e.target.value as Rule['ruleType'] })}><option value="include">Áp dụng cho</option><option value="exclude">Loại trừ</option></select></label>
          <label className="fl"><span className="lbl">Loại đối tượng</span><select className="fld" value={rule.entityType} onChange={(e) => { setRule({ ...rule, entityType: e.target.value as Rule['entityType'], entityId: '' }); setSelectedEntities([]); setEntitySearch(''); }}><option value="product">Sản phẩm</option><option value="category">Danh mục</option><option value="collection">Bộ sưu tập</option></select></label>
          {rule.entityType === 'product' && <label className="fl"><span className="lbl">Lọc danh mục</span><select className="fld" value={entityCategory} onChange={(e) => setEntityCategory(e.target.value)}><option value="">Tất cả danh mục</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>}
          <button className="promo-picker-trigger" type="button" aria-expanded={selectorOpen} onClick={() => setSelectorOpen((value) => !value)}><span>{selectedEntities.length ? `${selectedEntities.length} mục đã chọn` : 'Chọn sản phẩm hoặc danh mục'}</span><b aria-hidden="true">{selectorOpen ? '⌃' : '⌄'}</b></button>
        </div>
        {selectorOpen && <div className="promo-picker-panel">
          <div className="promo-picker-toolbar"><input className="fld" type="search" value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} placeholder="Tìm tên sản phẩm, danh mục..." aria-label="Tìm đối tượng khuyến mãi" /><button className="textbtn" type="button" onClick={() => setSelectedEntities(visibleEntityOptions.map((item) => item.id))}>Chọn kết quả</button><button className="textbtn" type="button" onClick={() => setSelectedEntities([])}>Bỏ chọn</button></div>
          <div className="promo-picker-options">{visibleEntityOptions.map((item) => <label key={item.id} className="promo-picker-option"><input type="checkbox" checked={selectedEntities.includes(item.id)} onChange={(e) => setSelectedEntities((values) => e.target.checked ? [...values, item.id] : values.filter((value) => value !== item.id))} /><span><b>{item.name}</b><small>{item.detail}{rule.entityType === 'product' ? ` · ${fmt(catalog.find((p) => String(p.id) === item.id)?.price || 0)}` : ''}</small></span></label>)}{visibleEntityOptions.length === 0 && <p className="note">Không tìm thấy đối tượng phù hợp.</p>}</div>
          <div className="promo-picker-footer"><span className="note">Đã chọn {selectedEntities.length} mục</span><button className="btn ui-sm" type="button" disabled={!selectedEntities.length} onClick={() => addRules(selectedEntities.map((entityId) => ({ entityType: rule.entityType, entityId })))}>Thêm điều kiện</button></div>
        </div>}
        {rule.entityType === 'product' && entityCategory && <button className="promo-category-shortcut" type="button" onClick={() => addRules([{ entityType: 'category', entityId: entityCategory }])}>{rule.ruleType === 'include' ? 'Áp dụng cả danh mục' : 'Loại trừ cả danh mục'} “{entityCategory}”</button>}
        <div className="promo-rule-list">{rules.map((r, i) => <span key={`${r.ruleType}-${r.entityType}-${r.entityId}-${i}`} className={`promo-rule-chip ${r.ruleType === 'exclude' ? 'exclude' : ''}`}><b>{r.ruleType === 'include' ? 'Áp dụng' : 'Loại trừ'}</b><span>{r.entityType === 'product' ? catalog.find((p) => String(p.id) === r.entityId)?.name || r.entityId : r.entityId}</span><button type="button" aria-label="Xóa điều kiện" onClick={() => setRules((items) => items.filter((_, index) => index !== i))}>×</button></span>)}</div>
      </section>

      <section className="promo-form-section promo-options-section">
        <div className="promo-section-heading"><span>04</span><div><h3>Tùy chọn hiển thị</h3><p>Điều chỉnh cách kết hợp và quảng bá ưu đãi.</p></div></div>
        <div className="promo-checkboxes"><label><input type="checkbox" checked={f.combinable} onChange={set('combinable')} /> Cho phép kết hợp ưu đãi khác</label><label><input type="checkbox" checked={f.showHome} onChange={set('showHome')} /> Hiển thị chương trình trên trang chủ</label></div>
      </section>

      {(err || message) && <div className={`promo-form-feedback ${err ? 'error' : 'success'}`} role={err ? 'alert' : 'status'}>{err || message}</div>}
    </form>
    </BaseDrawer>
  </>;
}
