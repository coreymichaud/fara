import { CreatorResults } from '@/features/survey/creator-results';
export default async function Management({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreatorResults id={id} />;
}
