# 1.0.97 - Settings and Invoices Page Final Sweep

## Scope
This stage starts the requested page-by-page final review with the Settings page and Invoices page.

## Changed
- Added `js/modules/36_settings_invoices_page_sweep.js`.
- Added delegated click handling for Settings and Invoices top icon tabs.
- Rebound Settings key buttons with safe fallbacks.
- Rebound Invoice filters, clear button, share button, and details toggle.
- Added mobile CSS guards for Settings and Invoices.
- Updated version to `1.0.97` / build `97`.

## Not changed
- No Firestore logic changed.
- No invoice creation logic changed.
- No payment, order, catalog, or customer data logic changed.

## Checks
Run in Console:

```js
window.hesabiSettingsInvoicesPageSweepSelfCheck()
window.hesabiSettingsHelpersSelfCheck()
window.hesabiInvoicesHelpersSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```

## Manual checks
Settings:
- Switch all top icons.
- Refresh UI.
- Clean cache.
- APK check.
- Open Notifications and Messages shortcuts.

Invoices:
- Switch all top icons.
- Filter by customer.
- Filter by cash/credit.
- Clear filters.
- Open details.
- Share invoice.
