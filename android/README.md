# Android 0.2.0 — embedded banking

The installed app renders the banking workspace in an Android WebView. It does not launch a browser or use Custom Tabs. Email/password login, first-login password change, accounts, payments, approvals and user administration remain inside the app. This is an embedded web interface, not a fully native rewrite. It requires an internet connection to the existing Sites/D1 backend.

The app restricts navigation to the exact HTTPS banking origin, rejects invalid TLS, disables local file access, mixed content and WebView debugging, and has no JavaScript bridge. Explicit document pickers support CSV uploads and exports. External website links are blocked; banking workflows remain in the app. Passwords are not stored in the APK. Secure, HttpOnly session cookies stay in the app WebView cookie store.

Download the 0.2.0 artifact from the successful GitHub Actions run. If a previous debug APK cannot be updated because runner signing certificates differ, uninstall it first. Server banking records are retained. This is a test APK, not a Play Store release.

Build with JDK 17, Gradle 8.13 and Android SDK 36: `gradle :app:assembleDebug :app:lintDebug`. The CI emulator check installs and launches twice, checks crash logs, verifies the foreground activity belongs to this app and checks the embedded email/password controls. It does not enter production credentials.
