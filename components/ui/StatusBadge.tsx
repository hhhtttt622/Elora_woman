import { statusLabel, statusTone, type StatusDomain } from '@/lib/status';

/** Nhãn trạng thái thống nhất màu theo từng nghiệp vụ. `label` để ghi đè chữ hiển thị. */
export default function StatusBadge({ domain, value, label, className = '' }: { domain: StatusDomain; value: string | number; label?: string; className?: string }) {
  const tone = statusTone(domain, value);
  return <span className={['badge', tone, className].filter(Boolean).join(' ')}>{label ?? statusLabel(domain, value)}</span>;
}
