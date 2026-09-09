# Sampoerna Corporate Banking Sandbox

Unofficial prototype. No real money moves.

## Sign-in

Use Sign in with ChatGPT at https://sampoerna-corporate-workspace.lotuzxvan.chatgpt.site/ with the email registered by your administrator. The platform authenticates identity; each server request checks the active corporate membership and current role. Existing member IDs and banking records are retained. Previously linked ChatGPT identities must match their original stable identity. Password sign-in and password changes are retired; old password cookies do not grant banking access.

Administrators create users by ChatGPT email, assign roles and suspend/reactivate access. BANK_ADMIN_EMAIL only permits initial administrator creation in an empty tenant. Existing membership is never elevated or reactivated by bootstrap.

## Android limitation

The existing Android 0.2.0 WebView APK blocks external identity-provider pages and cannot complete ChatGPT sign-in. Use the website for this authentication flow. An Android authentication redesign is required before issuing a compatible APK.

## Development

Node 22.13+, npm ci, npm run dev. Apply pending local D1 migrations; hosted Sites applies new migrations during deployment. Do not change previously applied migrations. Authentication tables remain in the database for migration compatibility but password sessions are no longer accepted by banking APIs.

Run npm run build and npx tsc --noEmit. tests/backend.integration.py checks the local Sites sign-in persona, authorization, persistence and user management; localhost only. tests/password.integration.py documents the retired password implementation and is no longer the current regression suite.

Bank integration, production MFA, transaction signing and formal security review remain outside this sandbox.
