import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const brandingRoot = resolve(webRoot, '../../sber-npf-corelia-config/branding');
const publicRoot = resolve(webRoot, 'public');
const branding = JSON.parse(await readFile(resolve(brandingRoot, 'branding.json'), 'utf8'));

if (typeof branding.theme?.primaryColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(branding.theme.primaryColor))
  throw new Error('branding.theme.primaryColor должен быть цветом формата #RRGGBB');
for (const key of ['logo', 'favicon']) if (typeof branding.assets?.[key] !== 'string' || !branding.assets[key].startsWith('/'))
  throw new Error(`branding.assets.${key} должен быть путём от корня клиента`);

const destination = resolve(publicRoot, 'branding.json');
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(branding, null, 2) + '\n');
const assets = resolve(brandingRoot, 'assets');
const publicAssets = resolve(publicRoot, 'branding');
await rm(publicAssets, { recursive: true, force: true });
try { await cp(assets, publicAssets, { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
