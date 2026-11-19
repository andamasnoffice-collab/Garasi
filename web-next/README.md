# GarasiKu Web Next

Modern web client using TypeScript, Vite, and the modular Firebase SDK.

## Current scope
- Responsive fleet monitoring dashboard.
- Server reads from the existing GarasiKu Firestore project and Index1 RTDB master vehicle path.
- Active trips from Firestore `gate_logs`.
- Driver master from Firestore `garasiku_drivers`.
- No production writes. This branch is intentionally read-only while data parity is verified.

## Local setup
1. Install Node.js 22 LTS.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` before publishing a preview.

Firebase client configuration is copied from the currently running production client. It is public client configuration, not an admin credential. Firestore/RTDB Security Rules and Anonymous Auth remain the actual access controls.

## Safety
- Main production app remains untouched.
- No Firebase Rules edits, no writes, no data migration, and no Telegram changes.
- The dashboard reads only the existing source paths; it does not create or modify records.
- Do not add service-account credentials or private signing keys to this project.
