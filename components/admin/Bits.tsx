import { PageHeader } from '@/components/layout/Page';

/** @deprecated Dùng PageHeader. Giữ lại để các trang chưa refactor vẫn chạy. */
export function PageHead({ group, title, note, actions }: { group: string; title: string; note?: string; actions?: React.ReactNode }) {
  return <PageHeader eyebrow={group} title={title} description={note} actions={actions} />;
}
