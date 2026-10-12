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

## Architecture (Feature-Sliced Design, ADR 0003)
Layers, top to bottom: `app` > `pages` > `widgets` > `features` > `entities` > `shared`. A layer imports only from layers below it; slices never import each other; import a slice only through its `index.ts`. ESLint enforces this.
- `app/` (project root): Expo Router route files, one line each, re-exporting a page. `app.json` sets `extra.router.root = "app"` so the router does not pick `src/app`.
- `src/app/`: FSD app layer (providers, wiring).
- `src/pages/<name>/`: a screen, composed from features. `src/features/<name>/`: one user action (`ui/`, `api/`, `model/`). `src/entities/<name>/`: a business thing (session).
- `src/shared/`: `ui` (design-system components), `lib` (hooks, validation), `api` (typed client, error copy), `config`, `theme` (tokens). Shared hooks live in `shared/lib/hooks`.
- Tests sit next to the code (`*.test.ts(x)`), never in `app/`. All tooling is TypeScript (`eslint.config.ts`, `scripts/*.ts` run with jiti).

## Rules
- Colors, spacing, type only from `src/shared/theme/tokens.ts` (Leo owns it).
- The API contract master is `../backend/api/` (CEO/Cristiano). `mobile/api/` is a synced copy: never edit it by hand, run `npm run sync:api` after the master changes. CI fails if they differ.
- Types are generated from `api/openapi.yaml` with `npm run gen:api` into `src/shared/api/schema.d.ts` (checked in; CI fails if stale). Do not hand-write requests.
