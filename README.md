# Home Grocery — Private Admin ERP (मालक प्रशासक डॅशबोर्ड)

Private, owner-authorized Enterprise Resource Planning (ERP) and account management web console for Home Grocery (घरगुती किराणा यादी).

## Security & Access Control

- **Authorized Owner Account:** Mobile `9356755100` (Verified on authoritative backend).
- **Server-Side Enforcement:** Every API request requires a cryptographically validated bearer token where `role === 'admin'`. Ordinary users are strictly forbidden (`403 Forbidden`).
- **Privacy Protections:**
  - PINs, PIN hashes, salts, and personal grocery items are never returned in admin API responses.
  - Plaintext credentials and tokens are strictly excluded from audit logs and client bundles.
- **Strict Network Isolation:** This Admin ERP is completely isolated from the public consumer website and Android application.

## Key Modules

1. **Dashboard & Metrics:** Overview of system health, registered accounts, and pending recovery requests.
2. **All Accounts:** Metadata-level account directory (ID, mobile, registration date, status).
3. **Recovery Requests:** Review and approval/rejection of emergency user PIN recovery requests.
4. **Delete Account:** Permanent user account deletion with confirmation safeguards (owner account protected from deletion).
5. **Profile Settings:** Owner profile editing and secure Admin PIN change.
6. **Security & Audit Logs:** Immutable record of all administrative actions with timestamp and IP address.

## Development & Build

```bash
# Install dependencies
npm install

# Start local Admin ERP server on port 3002
npm run dev

# Run automated test suite (11 tests)
npm test

# Build for production
npm run build
```
