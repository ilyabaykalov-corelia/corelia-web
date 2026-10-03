import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workspace = await mkdtemp(join(tmpdir(), 'corelia-branding-'));
after(() => rm(workspace, { recursive: true, force: true }));

test('build publishes customer branding and normalizes legacy root asset paths', async () => {
  const webRoot = join(workspace, 'web');
  const runtimeConfig = join(workspace, 'release', 'corelia');
  await mkdir(join(webRoot, 'src'), { recursive: true });
  await mkdir(join(runtimeConfig, 'branding', 'assets'), { recursive: true });
  await writeFile(join(webRoot, 'src', 'branding.default.json'), JSON.stringify({ title: 'Corelia' }));
  await writeFile(join(runtimeConfig, 'branding', 'branding.json'), JSON.stringify({
    title: 'Customer application',
    assets: { logo: '/logo.png', favicon: '/branding/favicon.ico' },
  }));
  await writeFile(join(runtimeConfig, 'branding', 'assets', 'logo.png'), 'logo');
  await writeFile(join(runtimeConfig, 'branding', 'assets', 'favicon.ico'), 'favicon');

  execFileSync(process.execPath, ['scripts/apply-branding.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, CORELIA_WEB_ROOT: webRoot, CORELIA_RUNTIME_CONFIG: runtimeConfig },
  });

  const branding = JSON.parse(await readFile(join(webRoot, 'public', 'branding.json'), 'utf8'));
  assert.deepEqual(branding.assets, { logo: '/branding/logo.png', favicon: '/branding/favicon.ico' });
  assert.equal(branding.title, 'Customer application');
  assert.equal(await readFile(join(webRoot, 'public', 'branding', 'logo.png'), 'utf8'), 'logo');
});
