# Android startup fix — 0.1.1

The launcher retains a visible recovery screen and uses Custom Tabs with a normal-browser fallback. Missing or disabled browsers produce an actionable message instead of an unhandled launch failure. Explicit package visibility declarations allow browser discovery. Back navigation returns to the launcher; rotation and activity restoration do not automatically relaunch the browser. This replaces the earlier self-finishing Trusted Web Activity launcher. The browser toolbar remains visible.

The GitHub workflow builds, lints and runs cold/repeated-launch crash checks on an Android 35 emulator. Smoke checks do not verify an authenticated banking journey on a physical device. The reported device failure has no device crash log, so the exact original exception is unconfirmed.

Version 0.1.1 uses the same application ID and hosted database as 0.1.0. GitHub runner debug keys can differ between builds. If Android rejects the update with a signature conflict, uninstall the previous test APK before installing this one. Banking records remain on the server; this wrapper stores no banking data.

Open this directory in Android Studio with JDK 17, Gradle 8.13 and Android SDK 36. Run `gradle :app:assembleDebug :app:lintDebug`. Use the successful workflow artifact for installation. Authentication still uses ChatGPT and active corporate membership. Google OAuth is not configured.
