import { defaultBranding, type BrandingConfig } from './branding.default';

let currentBranding: BrandingConfig = defaultBranding;

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const merge = (base: unknown, override: unknown): unknown => {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = key in result ? merge(result[key], value) : value;
  return result;
};

export const getClientBranding = () => currentBranding;

export async function loadClientBranding(): Promise<BrandingConfig> {
  try {
    const response = await fetch('/branding.json', { cache: 'no-store' });
    if (response.ok) currentBranding = merge(defaultBranding, await response.json()) as BrandingConfig;
  } catch {
    currentBranding = defaultBranding;
  }
  return currentBranding;
}
