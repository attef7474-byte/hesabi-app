# Hesabi 1.0.103 - Messages + Notifications Page Final Sweep

## Scope
- Stabilize the messages page and notifications page interactions.
- Keep existing Firestore send/read/open/counter logic unchanged.

## Changed
- Added `js/modules/43_messages_notifications_page_sweep.js`.
- Added `window.hesabiMessagesNotificationsPageSweepSelfCheck()`.
- Added local search to messages and notifications without rerendering on every keystroke.
- Re-bound send message, customer selector, notification open, enable notifications, clear counter and test badge buttons.
- Added mobile table/card overflow guards.
- Updated app version to `1.0.103` and build code `103`.

## Not changed
- Firestore writes.
- `sendMessage` persistence.
- Notification counter source logic.
- Authentication, orders, invoices, payments, statements or items logic.

## Checks
- `node --check js/index_script.js`
- `node --check js/modules/43_messages_notifications_page_sweep.js`
- JSON validation for `manifest.json` and `android-update.json`.
