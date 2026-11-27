# GarasiKu Android + FCM

Android WebView companion for the existing GarasiKu website. The app uses package id.uns.garasiku and Firebase project garasiku-9580a.

## Required Firebase Console step
1. In Firebase Console, open project garasiku-9580a.
2. Add an Android app with package name exactly id.uns.garasiku.
3. Download google-services.json and place it at android/app/google-services.json.
4. Ensure Firebase Cloud Messaging is enabled.
5. Run GitHub Actions workflow "Build GarasiKu Android APK".

The google-services.json client config is required for the Android SDK build. Never put service-account JSON or legacy server keys in the APK or repository.

## Included
- Android 13+ notification permission prompt and notification channel.
- Native Firebase Messaging receiver.
- FCM token generation and local storage.
- Notification display for notification and data payloads.
- Tap notification to open GarasiKu (supports a same-site url data field).

## Important backend requirement
This implements the Android receiving client. For real event notifications (vehicle checkout/checkin, E-Toll borrow/return), a trusted server-side sender is still required. It must register FCM tokens securely and send messages when the corresponding Firestore event is committed. No FCM server credentials are embedded in the app. Token-to-user/device registration and Firestore event triggers are not deployed yet; review Firestore rules and intended recipients before enabling them.

Example data payload: {"title":"Kendaraan Keluar","body":"B 1234 ABC keluar garasi","url":"https://andamasnoffice-collab.github.io/Garasi/"}
