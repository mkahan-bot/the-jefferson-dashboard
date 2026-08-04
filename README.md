# The Jefferson Weekly Operations Dashboard

Responsive, public-safe operating dashboard for The Jefferson at 3001 East Jefferson Boulevard in South Bend, Indiana.

## Dashboard views

- Executive overview
- Occupancy and 90-day renewals/moveouts
- Leads, tours, applications, approvals, and executed leases
- NOI, collections, revenue-per-lease, and delinquency aging
- Violations, with a clear missing-source-data state and separate work-order proxy

The default metrics are derived from `The Jefferson_Weekly_07_31_26(1).xlsx`, dated July 31, 2026. Resident-level, unit-level, and other sensitive source records are excluded.

## Functionality

- Desktop and mobile navigation with hash-addressable tabs
- Browser-local data updates
- Approved JSON import/export
- Print/PDF view
- No embedded API keys or secrets

The site is a single static `index.html`. Pushes to `main` deploy through `.github/workflows/deploy-pages.yml`.
