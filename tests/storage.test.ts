// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe('fail-closed repository selection', () => {
  it('permits explicitly selected development JSON and keeps one process repository', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STORAGE_ADAPTER', 'json');
    vi.stubEnv('LOCAL_STORE_PATH', '/tmp/not-written.json');
    const { getRepository } = await import('@/lib/storage');
    expect(getRepository()).toBe(getRepository());
    expect(getRepository().constructor.name).toBe('JsonRepository');
  });
  it('uses the development default path only when JSON was explicitly selected', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STORAGE_ADAPTER', 'json');
    delete process.env.LOCAL_STORE_PATH;
    const { getRepository } = await import('@/lib/storage');
    expect(getRepository().constructor.name).toBe('JsonRepository');
  });
  it('forbids both local persistence modes in production and missing project IDs', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STORAGE_ADAPTER', 'json');
    let factory = await import('@/lib/storage');
    expect(() => factory.getRepository()).toThrow('forbidden');
    vi.resetModules();
    vi.stubEnv('STORAGE_ADAPTER', 'firestore');
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', '');
    factory = await import('@/lib/storage');
    expect(() => factory.getRepository()).toThrow('GOOGLE_CLOUD_PROJECT');
    vi.resetModules();
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'demo-food-access');
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
    factory = await import('@/lib/storage');
    expect(() => factory.getRepository()).toThrow('Emulator is forbidden');
  });
});
