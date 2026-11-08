import type { Metadata } from 'next';
import { loadDataset } from '@/lib/data/load';
import { Workspace } from '@/features/planner/workspace';
import { product } from '@/config/product';

export const metadata: Metadata = {
  title: `Pantry planner | ${product.name}`,
  description:
    'Compare Central Florida locations and prepare a mobile pantry proposal using public food-access data.',
};
export const dynamic = 'force-dynamic';

export default async function Planner() {
  const data = await loadDataset();
  return <Workspace data={data} />;
}
