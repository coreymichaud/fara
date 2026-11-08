// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { dataset } from './fixtures';
const read = vi.hoisted(() => vi.fn());
vi.mock('node:fs/promises', () => ({ readFile: read }));
it('validates and caches the dataset once per process', async () => {
  read
    .mockResolvedValueOnce(JSON.stringify(dataset.manifest))
    .mockResolvedValueOnce(JSON.stringify(dataset.areas));
  const { loadDataset } = await import('@/lib/data/load');
  expect(await loadDataset()).toEqual(dataset);
  await loadDataset();
  expect(read).toHaveBeenCalledTimes(2);
});
