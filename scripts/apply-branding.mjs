import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const webRoot = resolve(import.meta.dirname, '..');
const publicRoot = resolve(webRoot, 'public');
const defaults = JSON.parse(await readFile(resolve(webRoot, 'src/branding.default.json'), 'utf8'));
const destination = resolve(publicRoot, 'branding.json');
await mkdir(dirname(destination), { recursive: true });
const publicAssets = resolve(publicRoot, 'branding');
await rm(publicAssets, { recursive: true, force: true });
await writeFile(destination, JSON.stringify(defaults, null, 2) + '\n');
