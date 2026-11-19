# GarasiKu Next — Parallel Modernization

## Safety boundary
- Production remains the existing GitHub Pages app on `main`. This branch does not modify the production `index.html`, Firebase data, or Security Rules.
- The new web and Android clients are parallel implementations. No cutover, migration, bulk write, or deletion is performed by this scaffold.
- Keep Telegram Bot behavior and its existing configuration untouched.

## Existing Firebase topology (observed in current main/index.html)
- GarasiKu primary Firebase project: `garasiku-9580a`; Firestore is the operational source of truth.
- Main shared document: `garasiku_fleet/shared_state`.
- Gate log documents: `garasiku_fleet/shared_state/gate_logs/{logId}`.
- Device registry: `garasiku_fleet/shared_state/device_registry/{deviceId}`.
- E-Toll log documents: `garasiku_fleet/shared_state/etoll_logs/{logId}`.
- The current app also connects to separate Index1 (`uns-fleet-service`) and RekapToll (`rekaptoll-production`) Firebase projects as external master-data sources. They are integrations, not to be silently consolidated or rewritten.
- Existing sign-in includes Firebase Anonymous Auth. New clients must use the same approved authentication model and be validated against existing Rules before any production use.

## Target architecture
1. Web: TypeScript + Vite + modular Firebase JS SDK. Build static assets for a separate preview deployment.
2. Android: native Java + AndroidX + Firebase Android SDK. Both clients use the same GarasiKu Firestore project and documented document paths.
3. Shared contracts: define DTOs and validation rules before porting each workflow. Keep Firestore transaction semantics for gate checkout/checkin and active-trip locks.
4. Java backend: defer Spring Boot until there is a concrete server-only responsibility. Never put Admin SDK credentials or service-account keys in web/mobile clients.
5. Existing Index1, RekapToll, and Telegram integrations stay isolated behind adapters. Do not change their database ownership.

## Migration sequence
- Phase A: scaffold and build-check the parallel clients (this branch).
- Phase B: port read-only dashboard and status views; compare against production data.
- Phase C: port write workflows one by one with transaction/locking parity; test with dedicated test accounts and test data.
- Phase D: test offline/reconnect, simultaneous admins, authorization, quotas, and Telegram regression.
- Phase E: deploy preview only. Production cutover requires explicit approval and rollback plan.

## Non-goals for this scaffold
- No Firebase Rules changes.
- No production data writes, imports, or migrations.
- No Telegram changes.
- No modification of `index.html` or the `main` branch.
