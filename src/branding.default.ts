export type BrandingConfig = {
  theme: { primaryColor: string; [key: string]: unknown };
  assets: { logo: string; favicon: string; [key: string]: unknown };
  [key: string]: unknown;
};

export const defaultBranding: BrandingConfig = {
  theme: { primaryColor: '#149447' },
  assets: { logo: '/corelia-logo.svg', favicon: '/favicon.ico' },
};
