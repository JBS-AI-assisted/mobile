# AI Fitness Assistant — mobile

React Native + Expo (SDK 57), TypeScript strict, Expo Router.

## Setup
1. Node 22 LTS (see `.nvmrc`). Expo 57 needs Node >= 20.19.4; we pin 22.
   - Windows: install `nvm-windows`, then `nvm install 22` and `nvm use 22`. Or download the LTS installer from nodejs.org.
2. `npm install`
3. `npm start`, then press `i` (iOS Simulator, macOS only) or `a` (Android Emulator).

No store accounts yet: develop on simulators/emulators. An Android dev build on a physical device needs no Play account.

## Backend URL
Set `EXPO_PUBLIC_API_URL` (one setting; the default is a placeholder, `http://localhost:8080`). On the Android emulator `localhost` is the emulator itself, so use `http://10.0.2.2:<port>` to reach the host machine. On a physical phone use the computer's LAN address.

## Scripts
- `npm run lint` / `npm run typecheck` / `npm test`
- `npm run sync:api` / `npm run gen:api`: see Rules below.
- `npm run e2e` runs Maestro flows in `e2e/` (needs Maestro, see below).

## Maestro (e2e)
Install: macOS/Linux `curl -Ls "https://get.maestro.mobile.dev" | bash`. Windows: use WSL2 or follow https://docs.maestro.dev/getting-started/installing-maestro.
Needs a running emulator/simulator with the dev build installed. Flows live in `e2e/*.yaml`.
`appId` in `e2e/smoke.yaml` is a placeholder until the bundle id is decided (CEO/Cristiano).

## Rules
- Colors, spacing, type only from `src/theme/tokens.ts` (Leo owns it).
- Tests go in `src/__tests__/`, never in `src/app/` (routes).
- The API contract master is `../backend/api/` (CEO/Cristiano). `mobile/api/` is a synced copy: never edit it by hand, run `npm run sync:api` after the master changes. CI fails if they differ.
- Types are generated from `api/openapi.yaml` with `npm run gen:api` into `src/api/schema.d.ts` (checked in; CI fails if stale). Do not hand-write requests.
