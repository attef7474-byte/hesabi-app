# Hesabi syntax fix - distributed modules

This package fixes JavaScript syntax errors caused by an accidental split across these modules:

- js/modules/40_pages_tables.js
- js/modules/50_auth_order_approval.js
- js/modules/60_payments_returns_policies.js
- js/modules/70_settings_owner_items_bridge.js

The broken fragments were concatenated in their original order, validated, and then redistributed at safe top-level function boundaries so the four files keep real code instead of placeholder stubs.

Validation run:

```powershell
node --check .\js\index_script.js
node --check .\js\modules\40_pages_tables.js
node --check .\js\modules\50_auth_order_approval.js
node --check .\js\modules\60_payments_returns_policies.js
node --check .\js\modules\70_settings_owner_items_bridge.js
```
