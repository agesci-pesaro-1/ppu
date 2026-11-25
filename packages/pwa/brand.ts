// Group branding (logo, colours, name) read from configuration at build time.
// No group-specific value lives in the repository: the pipeline passes the
// GitHub variables (docs/installazione/pipeline.md).
//
//   PPU_LOGO        path to a file or https URL of the logo (svg, png, jpg, webp)
//   PPU_COLORS      three hex colours: primary, accent, secondary
//   PPU_GROUP_NAME  group name, for the manifest and the top bar
//
// Without them the PWA uses a generic icon and the default palette.

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Plugin } from 'vite';

export interface BrandColors {
  primary: string;
  accent: string;
  secondary: string;
}

interface BrandFile {
  path: string;
  type: string;
  data: Buffer;
}

export interface Brand {
  groupName: string | null;
  colors: BrandColors;
  logo: BrandFile | null;
  /** Square manifest icon: the logo on a full-bleed white background. */
  icon: BrandFile;
}

/** Default palette: AGESCI purple and yellow, with burgundy as secondary. */
export const DEFAULT_COLORS: BrandColors = {
  primary: '#462679',
  accent: '#fdc500',
  secondary: '#791d42',
};

const TYPES_BY_EXTENSION: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const EXTENSIONS_BY_TYPE: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function parseColors(value: string | undefined): BrandColors {
  if (!value?.trim()) return DEFAULT_COLORS;
  const parts = value.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 3 || !parts.every((c) => /^#[0-9a-f]{6}$/i.test(c))) {
    throw new Error('PPU_COLORS: expected three colours such as "#462679 #fdc500 #791d42".');
  }
  const [primary, accent, secondary] = parts.map((c) => c.toLowerCase()) as [
    string,
    string,
    string,
  ];
  return { primary, accent, secondary };
}

async function readLogo(source: string): Promise<{ type: string; data: Buffer }> {
  if (/^https:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`PPU_LOGO: ${source} returned ${response.status}.`);
    const header = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    const type = EXTENSIONS_BY_TYPE[header]
      ? header
      : TYPES_BY_EXTENSION[extname(new URL(source).pathname).toLowerCase()];
    if (!type) throw new Error(`PPU_LOGO: unsupported format (${header || 'unknown'}).`);
    return { type, data: Buffer.from(await response.arrayBuffer()) };
  }
  const type = TYPES_BY_EXTENSION[extname(source).toLowerCase()];
  if (!type) throw new Error('PPU_LOGO: use an svg, png, jpg or webp file.');
  return { type, data: await readFile(source) };
}

function genericIcon(c: BrandColors): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="PPU">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.primary}"/>
      <stop offset="1" stop-color="${c.secondary}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <path d="M256 88 L356 264 H156 Z" fill="none" stroke="${c.accent}" stroke-width="26" stroke-linejoin="round"/>
  <path d="M256 88 V316" stroke="${c.accent}" stroke-width="26" stroke-linecap="round"/>
  <text x="256" y="420" font-family="system-ui, sans-serif" font-size="84" font-weight="800" fill="#fff" text-anchor="middle">PPU</text>
</svg>
`;
}

/** The logo inside a white square with a margin: also fine as a "maskable" icon. */
function logoIcon(logo: { type: string; data: Buffer }): string {
  const href = `data:${logo.type};base64,${logo.data.toString('base64')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fff"/>
  <image x="72" y="72" width="368" height="368" preserveAspectRatio="xMidYMid meet" href="${href}"/>
</svg>
`;
}

export async function loadBrand(env: NodeJS.ProcessEnv = process.env): Promise<Brand> {
  const colors = parseColors(env.PPU_COLORS);
  const groupName = env.PPU_GROUP_NAME?.trim() || null;
  const source = env.PPU_LOGO?.trim();
  const logo = source ? await readLogo(source) : null;
  return {
    groupName,
    colors,
    logo: logo ? { path: `brand/logo.${EXTENSIONS_BY_TYPE[logo.type]}`, ...logo } : null,
    icon: {
      path: 'brand/icon.svg',
      type: 'image/svg+xml',
      data: Buffer.from(logo ? logoIcon(logo) : genericIcon(colors)),
    },
  };
}

/**
 * Vite plugin: publishes logo and icon under /brand/, sets colours and
 * theme-color in index.html and exposes `__BRAND__` to the app.
 */
export function brandPlugin(b: Brand): Plugin {
  const files = [b.icon, ...(b.logo ? [b.logo] : [])];
  const css = `:root{--brand-primary:${b.colors.primary};--brand-accent:${b.colors.accent};--brand-secondary:${b.colors.secondary}}`;
  return {
    name: 'ppu-brand',
    config() {
      return {
        define: {
          __BRAND__: JSON.stringify({
            groupName: b.groupName,
            logo: b.logo ? `/${b.logo.path}` : null,
            icon: `/${b.icon.path}`,
          }),
        },
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const f = files.find((x) => req.url === `/${x.path}`);
        if (!f) return next();
        res.setHeader('Content-Type', f.type);
        res.end(f.data);
      });
    },
    transformIndexHtml(html) {
      return html
        .replaceAll('%PPU_THEME_COLOR%', b.colors.primary)
        .replace('</head>', `  <style>${css}</style>\n  </head>`);
    },
    generateBundle() {
      for (const f of files) this.emitFile({ type: 'asset', fileName: f.path, source: f.data });
    },
  };
}
