# GarasiKu Web Next

TypeScript + Vite + Firebase modular SDK.

## Local setup
1. Install Node.js LTS.
2. Copy `.env.example` to `.env.local`.
3. Fill the existing GarasiKu Web Firebase app values from Firebase Console. Keep `VITE_FIREBASE_PROJECT_ID=garasiku-9580a`.
4. Run `npm install`, then `npm run dev`.
5. Run `npm run build` before publishing a preview.

The first screen only performs Anonymous Auth and a server-confirmed read of `garasiku_fleet/shared_state`. It does not write production data.

Never commit `.env.local`, service-account credentials, or private signing keys. Firebase web config is not a substitute for Firestore Security Rules.
