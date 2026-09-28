import fs from 'node:fs';
import path from 'node:path';

import { themeTokens } from '../tokens';

const css = fs.readFileSync(path.join(__dirname, '../../../global.css'), 'utf8');

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('theme tokens', () => {
  it.each([
    ['light', ':root {'],
    ['dark', '.dark:root {'],
  ] as const)('%s hex values match global.css', (scheme, selector) => {
    const start = css.indexOf(selector);
    const block = css.slice(start, css.indexOf('}', start));
    for (const [key, hex] of Object.entries(themeTokens[scheme])) {
      expect(block).toContain(`--color-${kebab(key)}: ${rgbOf(hex)};`);
    }
  });
});
