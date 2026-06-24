#!/usr/bin/env node
/**
 * Post-build script: regenerates sitemap.xml with per-URL lastmod.
 *
 * lastmod = last commit date touching src/<page>. All language variants
 * share the same template, so they share lastmod. Locale-only edits are
 * intentionally ignored to avoid noisy sitewide lastmod churn from small
 * translation tweaks or changelog-entry commits that touch every locale.
 *
 * Usage: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_URL = 'https://integrationnode.com/shopify-odoo';

const LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl'];

const PAGES = [
    { src: 'index.html',                            urlPath: '',                                          priority: '1.0', changefreq: 'weekly' },
    { src: 'pricing.html',                          urlPath: 'pricing.html',                              priority: '0.9', changefreq: 'monthly' },
    { src: 'user-guide.html',                       urlPath: 'user-guide.html',                           priority: '0.8', changefreq: 'monthly' },
    { src: 'changelog.html',                        urlPath: 'changelog.html',                            priority: '0.5', changefreq: 'weekly' },
    { src: 'privacy.html',                          urlPath: 'privacy.html',                              priority: '0.3', changefreq: 'yearly' },
];

const TODAY = new Date().toISOString().split('T')[0];

function gitLastModDate(relPath) {
    try {
        const iso = execSync(
            `git log -1 --format=%cI -- "${relPath}"`,
            { cwd: ROOT, encoding: 'utf8' }
        ).trim();
        return iso ? iso.split('T')[0] : TODAY;
    } catch {
        return TODAY;
    }
}

function buildUrl(lang, urlPath) {
    const langPrefix = lang === 'en' ? '' : `${lang}/`;
    return `${BASE_URL}/${langPrefix}${urlPath}`;
}

function hreflangBlock(page) {
    const lines = LANGS.map(l =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${buildUrl(l, page.urlPath)}" />`
    );
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl('en', page.urlPath)}" />`);
    return lines.join('\n');
}

function urlEntry(lang, page) {
    const loc = buildUrl(lang, page.urlPath);
    const lastmod = gitLastModDate(`src/${page.src}`);
    return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        hreflangBlock(page),
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority}</priority>`,
        '  </url>',
    ].join('\n');
}

function build() {
    const parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ];
    for (const lang of LANGS) {
        parts.push(`  <!-- ${lang === 'en' ? 'English' : lang.toUpperCase()} pages -->`);
        for (const page of PAGES) {
            parts.push(urlEntry(lang, page));
        }
    }
    parts.push('</urlset>', '');
    return parts.join('\n');
}

const out = build();
const outPath = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(outPath, out);
const urlCount = (out.match(/<loc>/g) || []).length;
console.log(`Wrote ${outPath} (${urlCount} URLs)`);
