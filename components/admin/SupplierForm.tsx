'use client';
import { useState } from 'react';
import { saveSupplier } from '@/app/actions/admin';
import { useRun } from './Flash';

type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const { run, pending } = useRun();
  const [values, setValues] = useState({
    name: supplier?.name || '',
    contactName: supplier?.contact_name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    notes: supplier?.notes || '',
  });
  const [error, setError] = useState('');
  const update = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: e.target.value }));
  const field = (key: keyof typeof values, label: string, type = 'text') => (
    <div className="fl">
      <label className="lbl" htmlFor={`supplier-${supplier?.id || 'new'}-${key}`}>{label}</label>
      <input id={`supplier-${supplier?.id || 'new'}-${key}`} className="fld" type={type} value={values[key]} onChange={update(key)} />
    </div>
  );
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const result = await run(saveSupplier({ ...values, id: supplier?.id }));
      setError(result.error || '');
      if (result.ok && !supplier) setValues({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
    }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid">
        {field('name', 'Tên nhà cung cấp *')}
        {field('contactName', 'Người liên hệ')}
        {field('phone', 'Số điện thoại', 'tel')}
        {field('email', 'Email', 'email')}
        {field('address', 'Địa chỉ')}
        <div className="fl">
          <label className="lbl" htmlFor={`supplier-${supplier?.id || 'new'}-notes`}>Ghi chú / điều khoản</label>
          <textarea id={`supplier-${supplier?.id || 'new'}-notes`} className="fld" rows={2} value={values.notes} onChange={update('notes')} />
        </div>
      </div>
      <div className="row">
        <button className="btn" disabled={pending}>{supplier ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}</button>
        {error && <span className="err" role="alert">{error}</span>}
      </div>
    </form>
  );
}
