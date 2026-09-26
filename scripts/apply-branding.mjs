import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const brandingRoot = resolve(webRoot, '../../sber-npf-corelia-config/branding');
const publicRoot = resolve(webRoot, 'public');
const defaults = JSON.parse(await readFile(resolve(webRoot, 'src/branding.default.json'), 'utf8'));
const configured = JSON.parse(await readFile(resolve(brandingRoot, 'branding.json'), 'utf8'));

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const merge = (base, override) => {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = key in result ? merge(result[key], value) : value;
  return result;
};
const branding = merge(defaults, configured);

if (typeof branding.title !== 'string' || branding.title.trim() === '') throw new Error('branding.title должен быть непустой строкой');
if (typeof branding.theme.primaryColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(branding.theme.primaryColor))
  throw new Error('branding.theme.primaryColor должен быть цветом формата #RRGGBB');
for (const key of ['logo', 'favicon']) if (typeof branding.assets[key] !== 'string') throw new Error(`branding.assets.${key} должен быть строкой`);

const destination = resolve(publicRoot, 'branding.json');
await mkdir(dirname(destination), { recursive: true });
const assets = resolve(brandingRoot, 'assets');
const publicAssets = resolve(publicRoot, 'branding');
await rm(publicAssets, { recursive: true, force: true });
try { await cp(assets, publicAssets, { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const key of ['logo', 'favicon']) {
  const configuredPath = configured.assets?.[key];
  if (typeof configuredPath !== 'string' || !configuredPath.startsWith('/')) continue;
  const source = resolve(assets, basename(configuredPath));
  try {
    if ((await stat(source)).isFile()) branding.assets[key] = `/branding/${basename(configuredPath)}`;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await writeFile(destination, JSON.stringify(branding, null, 2) + '\n');
