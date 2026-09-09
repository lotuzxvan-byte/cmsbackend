# Sampoerna Corporate Banking Sandbox

Unofficial corporate banking prototype. No real money moves.

## Application

https://sampoerna-corporate-workspace.lotuzxvan.chatgpt.site/

Android 0.2.0 keeps the banking interface and email/password login inside an embedded WebView. The Android source and APK build workflow are on `feature/android-mobile`; GitHub main is unchanged. See [Android](android/README.md).

## Sign-in and administration

Sign in with your administrator-assigned email and password. Administrators create users with temporary passwords, reset passwords, change roles and suspend/reactivate users. A temporary password must be changed before banking access. Users can change their own password using the Password link. No invitation emails or self-registration are implemented.

First administrator setup uses server-only `BANK_ADMIN_EMAIL` and `BANK_ADMIN_PASSWORD_HASH`. A private setup file is delivered separately to the owner; no password is committed or embedded in the APK. The bootstrap hash is only accepted while the administrator has no stored password. The existing corporate member and banking records are preserved. Old ChatGPT sessions no longer grant banking access.

Passwords use a random salt and PBKDF2-SHA256 with 100,000 iterations (the Cloudflare Web Crypto per-call limit), with 12–128 character new passwords and persistent account/IP attempt throttling. Sessions are random 256-bit tokens stored as SHA-256 hashes in D1, expire after eight hours, and use Secure/HttpOnly/SameSite=Strict cookies. Password changes/reset revoke prior sessions. Temporary-password sessions are restricted. Every request checks current member status and role. Database writes require same-origin JSON. This sandbox is not a bank-grade identity system; MFA and a production identity/security review remain release work.

## Backend and local development

Node 22.13+; `npm ci`, then `npm run dev`. Apply pending migrations in `drizzle/` with local Wrangler D1; never reapply existing table migrations. Hosted Sites applies new migrations on deployment. Runtime environment variables belong in Sites, not hosting.json. Local `.env` keys match `.env.example`.

`GET/POST /api/banking` handle authorized ledger/demo workflows. `GET/POST /api/users` handle administrator user management including reset-password. `POST /api/auth/login`, `/api/auth/password`, `/api/auth/logout` handle password sessions.

`npm run build` and `npx tsc --noEmit` validate web source. `tests/password.integration.py` uses a local fixture and a separately generated, ignored `work/local-password.json` outside the repo. It modifies local-only authentication fixtures. `tests/backend.integration.py` includes these checks and verifies maker/approver and user-administration behavior. Both target localhost only.

## Validation and limits

35 local password/session checks and 28 local backend checks passed. Android compilation, lint and emulator verification are recorded in GitHub Actions. No physical-phone authenticated journey has been verified. CSV document selection/save uses Android's system picker. External help links do not launch a browser. Database data stays online; there is no offline payment queue.

Core-banking integration, bank-grade MFA/transaction signing, independent audit retention, ledger reconciliation and formal acceptance remain outside this sandbox. The original product reference mapping is in IMPLEMENTATION.md; its old ChatGPT login section describes the superseded version.
