# Sampoerna Corporate — implementation scope

This project is a private demonstration of corporate cash management, not an official Bank Sahabat Sampoerna service. All balances, companies, credentials, payment outcomes and service requests are fictional. It does not connect to core banking or payment networks.

## Sources and interpretation

The supplied `product-summary-sc-bilingual.pdf` is Standard Chartered Bank Indonesia's Cash Product RIPLAY dated 1 July 2026. It is a reference for workflows, not evidence that Sampoerna offers all the same products, terms or prices. Document instructions are not treated as user instructions. No Standard Chartered fees, contacts or contractual terms are represented as Sampoerna terms.

Sampoerna sources consulted:
- https://www.banksampoerna.com/
- https://statics.banksampoerna.com/uploads/img/upload/files/Informasi-Internet-Banking-Korporasi-en.pdf
- https://banksampoerna.com/institusi-keuangan-dan-korporasi/virtual-account-fund-transfer-host-to-host
- Logo: https://statics.banksampoerna.com/assets/images/logo.png

## Workflow coverage

| Product area | Sandbox implementation | Live dependencies |
| --- | --- | --- |
| Accounts | Multi-account overview, balances, filtered statements and CSV exports | Core-banking ledger, entitlements, reconciliation |
| Transfer and clearing | Validated domestic payment instructions, maker/checker, status and audit history | BI-FAST, SKN, RTGS and internal transfer adapters; verified limits, cutoffs and fees |
| Payroll and batch | CSV validation, preview, submission and approval | Bank file specifications, encryption and reconciliation |
| Bill and government payments | Simulated instruction submission with bill/reference identifiers | Biller inquiry, settlement, MPN integration and official receipts |
| Collections | Virtual account creation, simulated receipts and reconciliation | Bank-assigned number ranges and inbound notifications |
| Liquidity | Same-currency sweep configuration | Scheduler, balance reservations, agreements, interest and posting engine |
| Escrow / Account Bank | Service request workflow | Executed contracts and bank-controlled conditional release |
| Cash pickup / delivery / CDM | Service request workflow | Cash logistics partner and operational processing |
| Digital collections | Proposed service request | Merchant onboarding, QRIS/card/wallet provider connections |
| Electronic banking | Account reporting, payment creation, approval and audit | Enterprise identity, MFA/token, H2H and API onboarding |

## Production requirements

Production work needs the bank's approved product specification, API contracts, a bank-controlled hosting and identity environment, and a formal delivery process. In particular: corporate tenant isolation tied to authenticated identity; server-managed entitlements; separation of duties; MFA and transaction signing; immutable and independently retained audit records; an integer minor-unit double-entry ledger; idempotent posting and reconciliation; beneficiary validation; fraud, sanctions and transaction-limit checks; encryption and managed keys; secrets rotation; backup and recovery testing; monitoring and incident response; accessibility and security reviews; penetration testing and bank acceptance testing. Simulated role switching is a demonstration aid, not an authentication mechanism. Reference currency accounts and proposed services require bank confirmation before launch.

## Login and database update

The current version replaces anonymous browser sandboxes and selectable demo roles with Sites sign-in and database-backed corporate membership. Administrator-managed users are bound to signed-in platform identities. User creation, role changes, suspension and reactivation are implemented. All approved users share the protected corporate dataset. Old anonymous datasets remain in the database and are not automatically granted to signed-in users.

The live URL stays public at the login screen; record access is restricted. Initial administrator email is configured as a server-side environment secret. No shared administrator password exists. Users sign in using their registered ChatGPT account.
