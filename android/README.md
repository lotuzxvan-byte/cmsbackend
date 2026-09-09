# Android banking sandbox

Android Trusted Web Activity package for the existing authenticated Sites application. The mobile UI is implemented in the shared web source, with Home, Accounts, Payments, Approvals and More navigation. All nine services and the existing database authorization remain available. This is an unofficial sandbox, not a bank-issued app.

## Build and install

Open this `android` directory in Android Studio with JDK 17, Android SDK 36 and Gradle 8.13. With Gradle installed, run `gradle :app:assembleDebug :app:lintDebug`. Install `app/build/outputs/apk/debug/app-debug.apk` on a test Android phone (Android 6 or later). The repository Android workflow performs these commands and uploads a debug APK when Actions is enabled. No Android SDK or JDK is available in the authoring workspace, so a local APK build and device test have not been performed.

## Authentication and database

The app opens the HTTPS website in the browser's Trusted Web Activity. It uses the existing browser-managed sign-in session and server-side membership checks; it does not read cookies, embed passwords or trust a local role. Sign-in remains ChatGPT; Google sign-in is not configured. External authentication origins retain visible browser security controls. Network connectivity is required; no financial responses are cached for offline use. User administration, uploads and CSV downloads use the existing website capabilities.

## Fullscreen verification and release

Until Digital Asset Links are configured, Chrome safely falls back to a Custom Tab with its toolbar. To enable verified fullscreen, create your release signing key in Android Studio (keep it outside Git), get its SHA-256 certificate fingerprint and configure `ANDROID_CERT_SHA256` in Sites runtime environment. Deploy the web branch. The included `/.well-known/assetlinks.json` route serves the association for package `com.lotuzxvan.sampoerna.sandbox` only when that fingerprint is valid. For Play App Signing use the Play app-signing certificate, not the upload certificate. No fingerprint is invented or debug certificate trusted in production.

Create a signed release APK/AAB using Android Studio. Debug artifacts are for testing only. Verify login/logout, back navigation, rotation, large text, keyboard, CSV upload/download and maker/approver/admin journeys on a physical phone before release. This branch has not been submitted to Google Play. Target SDK and store requirements must be reviewed at release time.

References: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities and https://github.com/GoogleChrome/android-browser-helper
