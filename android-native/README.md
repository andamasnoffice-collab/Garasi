# GarasiKu Android (Java)

Native Android client built separately from the production web app.

## Safety
- Uses the same GarasiKu Firebase project: `garasiku-9580a`.
- Do not add a service-account JSON or Admin SDK credentials to this app.
- Add the Firebase Android app in Firebase Console and place its generated `google-services.json` in `app/`. Do not commit private signing keys.
- Initially implement read-only dashboard and logbook views. Do not enable checkout/checkin writes until transaction locks and Firestore Rules have been parity-tested.

## Build
Open `android-native/` in Android Studio, install Android SDK 35, add the Firebase-generated `app/google-services.json`, then sync Gradle and build.

The application currently contains a connection-safe placeholder screen. Workflow porting is the next phase.
