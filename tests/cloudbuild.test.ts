// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { areas, dataset } from './fixtures';

interface BuildStep {
  id: string;
  name: string;
  entrypoint?: string;
  env?: string[];
  args: string[];
  waitFor?: string[];
  allowFailure?: boolean;
  allowExitCodes?: number[];
}
interface BuildConfig {
  serviceAccount: string;
  options: { logging: string };
  substitutions: Record<string, string>;
  steps: BuildStep[];
  images: string[];
}
const config: BuildConfig = parse(readFileSync('cloudbuild.yaml', 'utf8'));
const assetNames = [
  'manifest.json',
  'areas.json',
  'tracts.geojson',
  'counties.geojson',
  'retailers.geojson',
];
const image = 'us-central1-docker.pkg.dev/fara-test/registry-test/fara-test';
const digest = `sha256:${'a'.repeat(64)}`;
let directory: string;

// These executables only record arguments/copy synthetic fixtures. No installed
// Docker engine or Google CLI is invoked by these tests.
const commandStub = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TRACE_PATH, JSON.stringify({ command, args }) + '\n');
if (command === 'docker') {
  if (process.env.STUB_FAIL === args[0]) process.exit(1);
  if (!['build', 'push'].includes(args[0])) process.exit(2);
} else if (args[0] === 'storage' && args[1] === 'cp') {
  if (process.env.STUB_FAIL === 'storage') process.exit(1);
  fs.copyFileSync(path.join(process.env.FIXTURE_PATH, path.basename(args[2])),
    path.join(args[3], path.basename(args[2])));
} else if (args.slice(0, 4).join(' ') === 'artifacts docker images describe') {
  if (process.env.STUB_FAIL === 'describe') process.exit(1);
  console.log(process.env.STUB_DIGEST);
} else if (args[0] === 'run' && args[1] === 'deploy') {
  if (process.env.STUB_FAIL === 'deploy') process.exit(1);
} else {
  process.exit(2);
}
`;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'fara-cloudbuild-'));
  for (const folder of ['bin', 'fixtures', 'scripts']) mkdirSync(join(directory, folder));
  copyFileSync('scripts/validate-data.mjs', join(directory, 'scripts/validate-data.mjs'));
  for (const command of ['gcloud', 'docker']) {
    writeFileSync(join(directory, 'bin', command), `#!${process.execPath}\n${commandStub}`, {
      mode: 0o700,
    });
  }
  const payloads = {
    'areas.json': areas,
    'tracts.geojson': {
      type: 'FeatureCollection',
      features: areas.map((area) => ({
        type: 'Feature',
        properties: { id: area.id },
        geometry: { type: 'Polygon', coordinates: [] },
      })),
    },
    'counties.geojson': { type: 'FeatureCollection', features: [] },
    'retailers.geojson': { type: 'FeatureCollection', features: [] },
  };
  const assetHashes: Record<string, string> = {};
  for (const [name, value] of Object.entries(payloads)) {
    const content = JSON.stringify(value);
    writeFileSync(join(directory, 'fixtures', name), content);
    assetHashes[name] = createHash('sha256').update(content).digest('hex');
  }
  writeFileSync(
    join(directory, 'fixtures/manifest.json'),
    JSON.stringify({
      ...dataset.manifest,
      mode: 'observed',
      generatedAt: new Date().toISOString(),
      assetHashes,
    }),
  );
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

function runBuild(
  substitutions: Record<string, string> = {},
  stubEnv: Record<string, string> = {},
) {
  const variables: Record<string, string> = {
    ...config.substitutions,
    PROJECT_ID: 'fara-test',
    BUILD_ID: 'build-test',
    _DATA_BUCKET: 'fixture-bucket',
    _AR_REPOSITORY: 'registry-test',
    _SERVICE_NAME: 'fara-test',
    ...substitutions,
  };
  // Cloud Build expands its variables once and turns $$ into a literal $ for Bash.
  const expand = (value: string) =>
    value.replace(/\$\$|\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, braced, bare) => {
      if (match === '$$') return '$';
      const key = braced ?? bare;
      if (!(key in variables)) throw new Error(`Undeclared Cloud Build substitution: ${key}`);
      return variables[key];
    });
  let output = '';
  const attempted: string[] = [];
  for (const step of config.steps) {
    const env = Object.fromEntries(
      (step.env ?? []).map((value) => {
        const expanded = expand(value),
          separator = expanded.indexOf('=');
        return [expanded.slice(0, separator), expanded.slice(separator + 1)];
      }),
    );
    attempted.push(step.id);
    const executable =
      step.entrypoint === 'node'
        ? process.execPath
        : step.entrypoint === 'bash'
          ? '/bin/bash'
          : join(directory, 'bin/docker');
    const result = spawnSync(executable, step.args.map(expand), {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
        TRACE_PATH: join(directory, 'trace.jsonl'),
        FIXTURE_PATH: join(directory, 'fixtures'),
        STUB_DIGEST: digest,
        ...env,
        ...stubEnv,
      },
    });
    if (result.error) throw result.error;
    output += result.stdout + result.stderr;
    if (result.status !== 0) return { failed: step.id, attempted, output };
  }
  return { failed: undefined, attempted, output };
}
function trace(): { command: string; args: string[] }[] {
  const path = join(directory, 'trace.jsonl');
  return existsSync(path)
    ? readFileSync(path, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    : [];
}

describe('Cloud Build release configuration', () => {
  it('uses a dedicated account, Cloud Logging, and serial failure-stopping steps', () => {
    expect(config.serviceAccount).toBe(
      'projects/$PROJECT_ID/serviceAccounts/food-access-build@$PROJECT_ID.iam.gserviceaccount.com',
    );
    expect(config.options.logging).toBe('CLOUD_LOGGING_ONLY');
    expect(config.steps.map((step) => step.id)).toEqual([
      'fetch-processed-data',
      'validate-data',
      'build-image',
      'push-image',
      'deploy-cloud-run',
    ]);
    for (const step of config.steps) {
      expect(step.waitFor).toBeUndefined();
      expect(step.allowFailure).toBeUndefined();
      expect(step.allowExitCodes).toBeUndefined();
    }
    expect(config.substitutions._DATA_BUCKET).toBe('REPLACE_WITH_PRIVATE_BUCKET_NAME');
    expect(config.images).toEqual([
      'us-central1-docker.pkg.dev/$PROJECT_ID/${_AR_REPOSITORY}/${_SERVICE_NAME}:$BUILD_ID',
    ]);
  });

  it('downloads only permitted assets, validates them, then builds, pushes and deploys the digest', () => {
    const result = runBuild();
    expect(result.failed, result.output).toBeUndefined();
    expect(result.output).toContain('Validated 3 observed tracts');
    const commands = trace();
    expect(commands.slice(0, 5)).toEqual(
      assetNames.map((asset) => ({
        command: 'gcloud',
        args: [
          'storage',
          'cp',
          `gs://fixture-bucket/public-data/${asset}`,
          'public/data/',
          '--quiet',
        ],
      })),
    );
    expect(commands[5]).toEqual({
      command: 'docker',
      args: ['build', '--platform=linux/amd64', `--tag=${image}:build-test`, '.'],
    });
    expect(commands[6]).toEqual({ command: 'docker', args: ['push', `${image}:build-test`] });
    expect(commands[7].args).toEqual([
      'artifacts',
      'docker',
      'images',
      'describe',
      `${image}:build-test`,
      '--project=fara-test',
      '--format=value(image_summary.digest)',
    ]);
    expect(commands[8]).toEqual({
      command: 'gcloud',
      args: [
        'run',
        'deploy',
        'fara-test',
        '--project=fara-test',
        '--region=us-central1',
        '--platform=managed',
        `--image=${image}@${digest}`,
        '--service-account=food-access-runtime@fara-test.iam.gserviceaccount.com',
        '--set-env-vars=GOOGLE_CLOUD_PROJECT=fara-test,STORAGE_ADAPTER=firestore',
        '--port=8080',
        '--memory=1Gi',
        '--cpu=1',
        '--concurrency=40',
        '--timeout=60s',
        '--min=0',
        '--max=3',
        '--min-instances=default',
        '--max-instances=default',
        '--quiet',
      ],
    });
    expect(commands).toHaveLength(9);
  });

  it.each([
    ['_DATA_BUCKET', ''],
    ['_DATA_BUCKET', 'REPLACE_WITH_PRIVATE_BUCKET_NAME'],
    ['_AR_REPOSITORY', ''],
    ['_SERVICE_NAME', ''],
  ])('rejects an incomplete %s substitution before downloading', (name, value) => {
    const result = runBuild({ [name]: value });
    expect(result.failed).toBe('fetch-processed-data');
    expect(result.output).toContain('Set _');
    expect(trace()).toEqual([]);
  });

  it('stops on missing bucket objects', () => {
    rmSync(join(directory, 'fixtures/areas.json'));
    expect(runBuild().failed).toBe('fetch-processed-data');
    expect(trace().map((call) => call.command)).toEqual(['gcloud', 'gcloud']);
  });

  it.each(['hash mismatch', 'stale manifest', 'incompatible manifest'])(
    'blocks Docker on %s',
    (failure) => {
      const path = join(directory, 'fixtures/manifest.json');
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      if (failure === 'hash mismatch') writeFileSync(join(directory, 'fixtures/areas.json'), '[]');
      if (failure === 'stale manifest') manifest.generatedAt = '2020-01-01T00:00:00Z';
      if (failure === 'incompatible manifest') manifest.schemaVersion = 'bad';
      writeFileSync(path, JSON.stringify(manifest));
      expect(runBuild().failed).toBe('validate-data');
      expect(trace()).toHaveLength(5);
      expect(trace().every((call) => call.args[0] === 'storage')).toBe(true);
    },
  );

  it.each([
    ['storage', 'fetch-processed-data'],
    ['build', 'build-image'],
    ['push', 'push-image'],
    ['describe', 'deploy-cloud-run'],
  ])('stops after a failed %s command', (command, failedStep) => {
    expect(runBuild({}, { STUB_FAIL: command }).failed).toBe(failedStep);
    expect(trace().some((call) => call.args[0] === 'run')).toBe(false);
  });

  it.each(['', 'not-a-digest', `sha256:${'a'.repeat(63)}`])(
    'refuses an invalid digest: %s',
    (value) => {
      const result = runBuild({}, { STUB_DIGEST: value });
      expect(result.failed).toBe('deploy-cloud-run');
      expect(result.output).toContain('refusing deployment');
      expect(trace().some((call) => call.args[0] === 'run')).toBe(false);
    },
  );

  it('reports a failed deployment instead of completing successfully', () => {
    expect(runBuild({}, { STUB_FAIL: 'deploy' }).failed).toBe('deploy-cloud-run');
    expect(trace().at(-1)?.args.slice(0, 2)).toEqual(['run', 'deploy']);
  });

  it('passes substitution contents as literal arguments without executing shell expressions', () => {
    const literal = 'fara-$(touch injected)';
    expect(runBuild({ _SERVICE_NAME: literal }).failed).toBeUndefined();
    expect(trace().at(-1)?.args[2]).toBe(literal);
    expect(existsSync(join(directory, 'injected'))).toBe(false);
  });

  it('keeps Git data exclusions separate from the five-file Docker allowlist', () => {
    const dockerignore = readFileSync('.dockerignore', 'utf8').split('\n');
    expect(dockerignore).toContain('**');
    expect(dockerignore).toContain('!public/');
    expect(dockerignore).toContain('!public/data/');
    expect(dockerignore.filter((line) => line.startsWith('!public/data/')).sort()).toEqual(
      ['!public/data/', ...assetNames.map((asset) => `!public/data/${asset}`)].sort(),
    );
    for (const pattern of [
      'data/raw/',
      'data/processed/',
      '**/*.csv',
      '**/.env*',
      '**/*credentials*.json',
    ]) {
      expect(dockerignore).toContain(pattern);
    }
    const gitignore = readFileSync(resolve('.gitignore'), 'utf8').split('\n');
    for (const pattern of ['/data/', '/public/data/', '.env*', '*service-account*.json']) {
      expect(gitignore).toContain(pattern);
    }
  });
});
