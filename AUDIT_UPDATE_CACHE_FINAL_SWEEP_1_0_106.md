# Hesabi App 1.0.106 - Audit + Final Update/Cache Sweep

## Scope
- سجل العمليات.
- التحديث والكاش النهائي.

## Changes
- Added `js/modules/46_audit_update_cache_final_sweep.js`.
- Stabilized audit page after render:
  - audit tabs binding.
  - local search without page rerender.
  - refresh action.
  - CSV export for audit logs.
  - mobile table containment.
- Stabilized update/cache controls inside settings:
  - refresh web UI.
  - clean cache.
  - APK update button guard.
  - final update/cache check.
- Aligned runtime/update diagnostics to `1.0.106 / build 106`:
  - `APP_VERSION` / `APP_BUILD_CODE`.
  - update-cache self-check.
  - full runtime smoke expected modules and checks.
  - APK version final target.
  - production release candidate target.
  - final release validation target.
- Updated `android-update.json`, `app/build.gradle`, `js/index_script.js`, `index.html`, and module manifest.

## Safety
- No Firestore write logic changed.
- No order, payment, invoice, item, customer, return, schedule, or subscription business logic changed.
- Changes are limited to UI binding, diagnostics, cache/update helpers, and version alignment.

## Console Checks
```javascript
window.hesabiAuditUpdateCacheFinalSweepSelfCheck()
window.hesabiUpdateCacheStabilitySelfCheck()
window.hesabiApkVersionFinalCheckSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```
