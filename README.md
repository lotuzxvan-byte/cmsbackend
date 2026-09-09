# Sampoerna Corporate Banking

Corporate banking sandbox with a persistent Cloudflare D1 backend, ChatGPT sign-in, administrator-managed users, accounts, payments, payroll CSV uploads, collections and reporting.

This is an unofficial prototype. No real money moves and no bank payment networks are connected.

## Hosted application

https://sampoerna-corporate-workspace.lotuzxvan.chatgpt.site

The public URL shows a login screen. Business records and APIs require a signed-in identity and an active database membership. This application uses the Sites authentication gateway, not application passwords.

## Initial administrator

Set `BANK_ADMIN_EMAIL` as a server-side runtime secret to the initial administrator's ChatGPT email. On that person's first sign-in, an Administrator membership is created only if the company has no users. The email is not stored in source control. It is configured on the hosted deployment.

The administrator can:

- Create a user with the exact email of their ChatGPT account.
- Assign Maker, Approver or Administrator permissions.
- Change display names and roles, suspend or reactivate users.
- Copy the login URL to share manually. No invitation email is sent automatically.
- Create fictional demo ledger accounts with opening balances.

A newly registered user signs in with ChatGPT using the same email. Their platform identity is bound to their membership at first sign-in. Suspended users are denied on subsequent requests. Administrators cannot demote or suspend themselves. Login credentials and MFA are handled by the identity provider.

## Roles

| Role | Permissions |
| --- | --- |
| Maker | Submit payments and payroll, create collections and service requests, simulate receipts |
| Approver | Approve or reject another user's payment instructions |
| Administrator | Manage users, add demo accounts, configure liquidity and save service requests |

The server reads permissions from D1 for each request. `X-Demo-Role` and the old anonymous sandbox cookie no longer grant access. Stable member IDs enforce separation of duties even after name or role changes. The company shares one persistent dataset across approved users and browsers. Previous anonymous demonstration datasets are not automatically imported into the protected company workspace.

## Local setup

Requires Node 22.13+, npm and Python 3 for the integration test.

1. Run `npm ci`.
2. Create an ignored `.env` containing `BANK_ADMIN_EMAIL=seedy@sites.test` for the local Sites test identity.
3. Apply the schema to a new local database:
   - `npx wrangler d1 execute DB --local --config wrangler.local.json --file drizzle/0000_motionless_fallen_one.sql`
   - `npx wrangler d1 execute DB --local --config wrangler.local.json --file drizzle/0001_milky_marvel_zombies.sql`
4. Run `npm run dev` and open its local URL.
5. Select Sign in with ChatGPT. The local Sites development gateway supplies the Seedy test identity.

For an existing database, apply only migrations not already applied. Do not rerun table-creation migrations. Hosted Sites applies and records migrations during deployment.

`npm run build` builds the Worker. `npx tsc --noEmit` checks types. `python tests/backend.integration.py` runs the local integration checks while the development server is running. The test temporarily changes the local Seedy fixture's roles, restores its original role/status in `finally`, and never connects to production.

## Backend

- `GET /api/banking`: authorized company's accounts, payments, records, audit events and current user.
- `POST /api/banking`: validated account, payment, batch, approval/rejection, virtual-account receipt and service-record operations.
- `GET /api/users`: administrator-only user list.
- `POST /api/users`: administrator-only create/update operations with optimistic concurrency.
- `db/schema.ts` and `drizzle/`: D1 schema and incremental migrations.
- `lib/access.ts`: membership authorization and initial administrator onboarding.

Writes require a same-origin JSON request. Database queries are parameterized and scoped to the authorized company. Payment approval and virtual-account receipt posting use atomic conditional batches to prevent repeated processing. Permissions, data and audit events persist in D1; browser storage is not the source of truth.

## Hosting trust boundary

Deploy through Sites behind its authenticated dispatcher. The dispatcher authenticates the user and strips caller-supplied identity headers before injecting verified identity. The backend must not be exposed directly on a generic public Worker endpoint that accepts arbitrary identity headers. Moving to another hosting platform requires replacing this adapter with verified OAuth/session middleware. Never ship the local development auth gateway to production.

## Validation

- TypeScript and production build passed.
- 28 local backend integration checks passed: anonymous denial, spoofed headers, membership, duplicate email handling, user management, self-access protection, stale updates, role enforcement, self-approval prevention, single debit, suspension, audit and persistence.
- Browser visual/interaction testing was not requested. The external provider's full sign-in journey requires the user's own account.
- Optional WebMCP read/navigation tools are feature-detected; runtime registration has not been verified.

## Limits

All balances and transactions remain fictional. Liquidity configurations do not run a scheduler, service requests are saved drafts and future-dated instructions are reviewed on their execution date. Bank-core integration, bank-grade MFA/transaction signing, immutable independent audit retention, ledger reconciliation and formal security/compliance acceptance remain production work. See IMPLEMENTATION.md for the source-product mapping.
