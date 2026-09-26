import config from './branding.default.json';

export type BrandingConfig = {
  title: string;
  theme: { primaryColor: string; [key: string]: unknown };
  assets: { logo: string; favicon: string; [key: string]: unknown };
  [key: string]: unknown;
};

export const defaultBranding: BrandingConfig = config;
