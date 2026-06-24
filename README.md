# Odoo–Shopify Order Comparator — Website

Landing page, pricing, user guide, changelog and privacy policy for the **Odoo–Shopify order comparator** Chrome extension (read-only field-by-field order comparison between Odoo and Shopify).

Sibling site of [Odoo Integration for Gmail](https://integrationnode.com/gmail-odoo) — same design system, fonts, icons and i18n machinery so both read as one brand.

## 🌐 Live Site

Target: `https://integrationnode.com/shopify-odoo`

## 🛠 Build

Static multilingual site built with [`static-i18n`](https://www.npmjs.com/package/static-i18n) (8 languages: en, es, fr, de, it, nl, pl, pt).

```sh
npm install
npm run build      # static-i18n + patch-schemas + generate-sitemap + copy dist/* to root
npm run watch      # live rebuild while editing
```

Source of truth: `src/*.html` (English) + `locales/<lang>.json`. The build emits one variant per language into `dist/` and copies it to the repo root for publishing.

## 👤 Developer

**OdooIntegrations Team** — odoointegrations.team@gmail.com

## 📜 License

Copyright © 2026 IntegrationNode. All rights reserved.

Not affiliated with Odoo S.A. or Shopify Inc.
