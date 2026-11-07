import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const root = process.cwd();
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const page = new DOMParser().parseFromString(html, 'text/html');
const siteUrl = 'https://alex-just.github.io/world-clock/';
const imageUrl = `${siteUrl}og-image.png`;

function meta(selector: string): string {
  const element = page.querySelector<HTMLMetaElement>(selector);
  expect(element, selector).not.toBeNull();
  return element?.content ?? '';
}

it('exposes crawl and social metadata', () => {
  expect(page.title).toBe('World Clock — Compare Time Zones at a Glance');
  expect(meta('meta[name="description"]').length).toBeGreaterThan(80);
  expect(meta('meta[name="robots"]')).toContain('index');
  expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(siteUrl);

  expect(meta('meta[property="og:type"]')).toBe('website');
  expect(meta('meta[property="og:title"]')).toBe(page.title);
  expect(meta('meta[property="og:url"]')).toBe(siteUrl);
  expect(meta('meta[property="og:image"]')).toBe(imageUrl);
  expect(meta('meta[property="og:image:width"]')).toBe('1200');
  expect(meta('meta[property="og:image:height"]')).toBe('630');

  expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  expect(meta('meta[name="twitter:title"]')).toBe(page.title);
  expect(meta('meta[name="twitter:image"]')).toBe(imageUrl);
});

it('publishes valid WebApplication structured data', () => {
  const script = page.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();

  const data = JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe(siteUrl);
  expect(data.image).toBe(imageUrl);
  expect(data.isAccessibleForFree).toBe(true);
  expect(data.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
});

it('ships the social image and crawler files', () => {
  expect(existsSync(resolve(root, 'public/og-image.png'))).toBe(true);
  expect(readFileSync(resolve(root, 'public/robots.txt'), 'utf8')).toContain(
    `Sitemap: ${siteUrl}sitemap.xml`,
  );
  expect(readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8')).toContain(
    `<loc>${siteUrl}</loc>`,
  );
});
