# 1.0.105 - Reports + Policies Page Final Sweep

## Scope
This phase stabilizes the Reports and Policies pages only.

## Included
- Stable reports tab rebinding.
- Stable policy tab rebinding.
- Local search inside Reports without rerendering while typing.
- Local search inside Policies without rerendering while typing.
- Report export/share buttons rebinding:
  - Share business report.
  - Export invoices CSV.
  - Export payments CSV.
  - Export customers CSV.
- Policy save button rebinding through the existing `saveShopPoliciesPhase8` function.
- Read-only guard for Policies when the current user is not a trader.
- Mobile table containment to avoid horizontal page overflow.
- New self-check: `window.hesabiReportsPoliciesPageSweepSelfCheck()`.

## Not changed
- Firestore rules.
- Firestore write paths.
- Report totals logic.
- Policy persistence logic.
- Orders, payments, invoices, inventory, or statements logic.

## Checks performed
- `node --check js/index_script.js`
- `node --check js/modules/45_reports_policies_page_sweep.js`
- JSON validation for `js/modules/manifest.json`
- JSON validation for `android-update.json`

## Manual checks required after APK build
- Open Reports page.
- Switch all Reports tabs.
- Search inside Reports and confirm the keyboard does not close while typing.
- Share business report.
- Export invoices, payments and customers CSV.
- Open Policies page as trader.
- Switch all Policies tabs.
- Modify a safe policy and save.
- Open Policies page as customer and confirm fields are read-only.
