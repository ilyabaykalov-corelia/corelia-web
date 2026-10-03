import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const webRoot = resolve(process.env.CORELIA_WEB_ROOT ?? resolve(import.meta.dirname, '..'));
const publicRoot = resolve(webRoot, 'public');
const defaults = JSON.parse(await readFile(resolve(webRoot, 'src/branding.default.json'), 'utf8'));
const destination = resolve(publicRoot, 'branding.json');
const runtimeConfig = process.env.CORELIA_RUNTIME_CONFIG;

const isWithin = (parent, child) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
};

const customerBranding = async () => {
  if (!runtimeConfig) return defaults;
  const brandingRoot = resolve(runtimeConfig, 'branding');
  if (!isWithin(resolve(runtimeConfig), brandingRoot)) throw new Error('Некорректный путь к runtime configuration');
  const branding = JSON.parse(await readFile(resolve(brandingRoot, 'branding.json'), 'utf8'));
  const publicAssets = resolve(publicRoot, 'branding');
  await rm(publicAssets, { recursive: true, force: true });
  const sourceAssets = resolve(brandingRoot, 'assets');
  try {
    await cp(sourceAssets, publicAssets, { recursive: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  for (const key of ['logo', 'favicon']) {
    const value = branding.assets?.[key];
    if (typeof value !== 'string' || !value.startsWith('/')) continue;
    const pathname = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
    const assetPath = pathname.startsWith('branding/') ? pathname.slice('branding/'.length) : pathname;
    const asset = resolve(sourceAssets, assetPath);
    if (!assetPath || !isWithin(sourceAssets, asset)) throw new Error(`Некорректный путь branding asset: ${value}`);
    branding.assets[key] = `/branding/${assetPath}`;
  }
  return branding;
};

await mkdir(dirname(destination), { recursive: true });
if (!runtimeConfig) await rm(resolve(publicRoot, 'branding'), { recursive: true, force: true });
await writeFile(destination, JSON.stringify(await customerBranding(), null, 2) + '\n');
