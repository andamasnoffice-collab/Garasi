# GarasiKu Android

The Android companion app for GarasiKu is built as a WebView wrapper that loads the existing production site:

`https://andamasnoffice-collab.github.io/Garasi/`

It preserves the existing Firebase/web backend and does not migrate data. The full Android project is available in the downloadable project ZIP supplied in the conversation.

Build workflow: `.github/workflows/android-apk.yml` in the supplied project scaffold. To build in GitHub Actions, add the scaffold files to the repository root (including `app/`, `build.gradle`, `settings.gradle`, `gradle.properties`, and `.github/workflows/android-apk.yml`) and run **Build GarasiKu Android APK**.

Package: `id.uns.garasiku`; minimum Android API 23; initial output is an unsigned debug APK.