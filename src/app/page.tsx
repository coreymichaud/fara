import { loadDataset } from '@/lib/data/load';
import { Workspace } from '@/features/planner/workspace';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const data = await loadDataset();
  return <Workspace data={data} />;
}
