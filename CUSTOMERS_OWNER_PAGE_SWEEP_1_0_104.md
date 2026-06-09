# 1.0.104 - Customers + Owner/Subscriptions Page Final Sweep

## Scope
- Customers page.
- Owner console and subscriptions page.

## What changed
- Added `js/modules/44_customers_owner_page_sweep.js`.
- Added safe delegated tab navigation for `customers` and `owner` pages.
- Added local search boxes that do not re-render while typing, so the keyboard stays open.
- Rebound customer actions: credit limit, status changes, manual customer save, and trader sale send.
- Rebound owner actions: reload, send message, warn/suspend/activate/expire shop, and save subscription.
- Added owner subscription shop selection prefill.
- Added mobile-safe table guards to prevent full-page horizontal overflow.
- Added `window.hesabiCustomersOwnerPageSweepSelfCheck()`.

## Not changed
- Firestore rules.
- Customer creation logic.
- Owner write logic.
- Subscription write logic.
- Orders, payments, invoices, or statements logic.

## Checks
- `node --check js/index_script.js`
- `node --check js/modules/44_customers_owner_page_sweep.js`
- JSON validation for `manifest.json` and `android-update.json`

APK was not tested on a real phone in this environment.
