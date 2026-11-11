import { requirePage } from '@/lib/auth';
import { all } from '@/lib/db';
import { PageContainer } from '@/components/layout/Page';
import PromotionManager from '@/components/admin/PromotionManager';
export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePage('UC-40', '/admin/khuyen-mai');
  const promotions = all<any>('SELECT * FROM promotions ORDER BY id DESC');
  const rules = all<any>('SELECT * FROM promotion_rules ORDER BY id');
  const catalog = all<any>('SELECT id,name,category,collection FROM products ORDER BY name');
  return <PageContainer><PromotionManager promotions={promotions.map((p) => ({ ...p, rules: rules.filter((r) => r.promotion_id === p.id) }))} catalog={catalog} /></PageContainer>;
}
