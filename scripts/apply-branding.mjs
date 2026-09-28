import { mkdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const publicRoot = resolve(webRoot, 'public');
const defaults = JSON.parse(await readFile(resolve(webRoot, 'src/branding.default.json'), 'utf8'));
const brandingDirectory = process.env.CORELIA_BRANDING_DIR;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const merge = (base, override) => {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = key in result ? merge(result[key], value) : value;
  return result;
};
const fail = message => { throw new Error(`ERROR: ${message}`); };
let configured = {};
let brandingRoot;

if (brandingDirectory) {
  brandingRoot = resolve(brandingDirectory);
  try {
    if (!(await stat(brandingRoot)).isDirectory()) fail(`Branding directory is not a directory: ${brandingRoot}`);
  } catch (error) {
    if (error.code === 'ENOENT') fail(`Branding directory does not exist: ${brandingRoot}`);
    throw error;
  }
  const brandingFile = resolve(brandingRoot, 'branding.json');
  try {
    configured = JSON.parse(await readFile(brandingFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') fail(`Branding file does not exist: ${brandingFile}`);
    if (error instanceof SyntaxError) fail(`Branding file contains invalid JSON: ${brandingFile}`);
    throw error;
  }
  if (!isObject(configured)) fail(`Branding file must contain a JSON object: ${brandingFile}`);
}

const branding = merge(defaults, configured);

if (typeof branding.title !== 'string' || branding.title.trim() === '') throw new Error('branding.title должен быть непустой строкой');
if (typeof branding.theme.primaryColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(branding.theme.primaryColor))
  throw new Error('branding.theme.primaryColor должен быть цветом формата #RRGGBB');
for (const key of ['logo', 'favicon']) if (typeof branding.assets[key] !== 'string') throw new Error(`branding.assets.${key} должен быть строкой`);

const destination = resolve(publicRoot, 'branding.json');
await mkdir(dirname(destination), { recursive: true });
const publicAssets = resolve(publicRoot, 'branding');
await rm(publicAssets, { recursive: true, force: true });
for (const key of ['logo', 'favicon']) {
  const configuredPath = configured.assets?.[key];
  if (typeof configuredPath !== 'string' || !configuredPath.startsWith('/')) continue;
  const source = resolve(brandingRoot, 'assets', basename(configuredPath));
  try {
    if (!(await stat(source)).isFile()) fail(`Branding asset is not a file: ${source}`);
    await mkdir(publicAssets, { recursive: true });
    await copyFile(source, resolve(publicAssets, basename(configuredPath)));
    branding.assets[key] = `/branding/${basename(configuredPath)}`;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!(await stat(source).catch(() => undefined))) fail(`Branding asset does not exist: ${source}`);
}
await writeFile(destination, JSON.stringify(branding, null, 2) + '\n');
