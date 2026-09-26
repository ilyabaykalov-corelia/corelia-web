import config from './branding.default.json';

/**
 * Контракт branding, сформированный из defaults и необязательного внешнего override.
 * Пути к ресурсам должны быть публичными URL, а не путями файловой системы сборщика.
 */
export type BrandingConfig = {
  title: string;
  theme: { primaryColor: string; [key: string]: unknown };
  assets: { logo: string; favicon: string; [key: string]: unknown };
  [key: string]: unknown;
};

/** Универсальные значения Corelia, используемые при отсутствии customer branding. */
export const defaultBranding: BrandingConfig = config;
