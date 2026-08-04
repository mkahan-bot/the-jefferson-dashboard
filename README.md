# Jefferson Property Performance Dashboard

Standalone, public-safe executive dashboard for Jefferson at 3001 East Jefferson Boulevard, South Bend, Indiana.

## Included

- Aggregated compliance metrics from the April 20, 2026 status workbook
- Asset, operating-target, and market-demand scorecards
- Browser-local editing and management updates
- Approved JSON import/export and print/PDF output
- Responsive mobile and desktop layouts

Sensitive case-level information, resident data, addresses, and source attachments are intentionally excluded. No API key or secret is stored in the site.

## Deployment

The dashboard is a single static `index.html`. Pushes to `main` trigger `.github/workflows/deploy-pages.yml`.
