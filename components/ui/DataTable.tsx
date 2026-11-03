import { EmptyState } from './States';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  /** Nhãn hiển thị trên mobile (dạng thẻ); mặc định lấy header nếu là chữ. */
  label?: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption?: React.ReactNode;
  minWidth?: number;
  /** 'cards': dưới 820px mỗi dòng thành một thẻ; 'scroll': cuộn ngang trong khung. */
  mobile?: 'cards' | 'scroll';
  tall?: boolean;
  rowClassName?: (row: T) => string | undefined;
  empty?: { title: string; description?: React.ReactNode; action?: React.ReactNode };
};

/** Tầng 2 – bảng dữ liệu dùng chung (Server Component). */
export default function DataTable<T>({ columns, rows, rowKey, caption, minWidth = 720, mobile = 'scroll', tall, rowClassName, empty }: Props<T>) {
  if (!rows.length && empty) return <EmptyState {...empty} />;
  return (
    <div className={'scroll' + (tall ? ' tall' : '')}>
      <table className={'tb ui-table' + (mobile === 'cards' ? ' ui-table--cards' : '')} style={{ minWidth }}>
        {caption && <caption>{caption}</caption>}
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.className}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={rowClassName?.(r)}>
              {columns.map((c) => <td key={c.key} className={c.className} data-label={c.label ?? (typeof c.header === 'string' ? c.header : '')}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
