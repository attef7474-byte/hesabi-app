# 1.0.102 - Returns + Schedules Page Final Sweep

## Scope
- Page-level interaction hardening for returns and schedules/installments.
- No Firestore rule changes.
- No changes to invoice creation, stock updates, ledger mutations, payment approval logic, or schedule write logic.

## Fixed / Hardened
- Returns tabs.
- Send return request button.
- Approve/reject return buttons.
- Return invoice selector rebinding.
- Schedules tabs.
- Create schedule button.
- Invoice autofill in schedule form.
- Pay schedule button.
- Cancel schedule button.
- Mobile table containment for both pages.

## Self-check
Run in Console:

```javascript
window.hesabiReturnsSchedulesPageSweepSelfCheck()
window.hesabiReturnsHelpersSelfCheck()
window.hesabiSchedulesHelpersSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```

## Manual APK checks
- Customer: open returns, send return request.
- Trader: approve and reject returns.
- Trader: create installment schedule from credit invoice.
- Customer: pay a schedule installment.
- Trader: cancel a pending schedule.
- Verify no page-wide horizontal overflow on mobile.
