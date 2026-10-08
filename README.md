# Well Ahead

A voice-and-text preventive-health app with a personalised roadmap, fifteen
health areas, interactive 3D anatomy, synthetic blood results and Google Calendar
scheduling. This repository contains the current app from Ahmed's `ahmed` branch
of the shared Future You hackathon project, including the latest working-copy UI.

## Run locally

Use Node.js 24 or newer.

```sh
npm run setup
cp .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:4175**. The frontend runs on 4175 and proxies API requests
to the local Node server on 4178. Stop both with Ctrl+C. To avoid occupied ports,
set `FRONTEND_PORT` and `PORT` when starting; update the OAuth redirect if needed.

The built-in **Emma** button and **Bupa Connect** example work without API keys.
They use a prepared fictional profile after a three-second pause, require review,
and display 77 synthetic blood results. They are not live Bupa account access.
Editing that story or starting a new check-in uses the normal backend instead.
The Apple Health icon is a UI placeholder, not a live integration.

## Server configuration

Keep `.env.local` private; it is ignored by Git. Never put secrets into `frontend/`
or variables prefixed `VITE_`. No original credentials or cloud endpoint addresses
are included in this repository.

- `TEXT_PROVIDER` and `SPEECH_PROVIDER`: independently choose `openai` or `vertex`.
  The existing default is `openai`; the app never silently changes providers.
- `OPENAI_API_KEY`: needed for whichever text/speech adapter uses that provider.
  `OPENAI_TEXT_MODEL` and `OPENAI_TRANSCRIPTION_MODEL` optionally override the
  existing defaults (`gpt-5.6-luna`, `gpt-4o-mini-transcribe`). Use model access
  available to your own account.
- Vertex: supply `MEDGEMMA_ENDPOINT_URL` and/or `MEDASR_ENDPOINT_URL` for your
  deployed prediction endpoints, and run `gcloud auth application-default login`
  with the correct project account. These preserve the existing MedGemma-27B
  chat-prediction and MedASR audio-prediction contracts. `GCLOUD_BIN` and
  `CLOUDSDK_PYTHON` can override local command paths. No cloud resources are created.
- Google Calendar: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
  `GOOGLE_REDIRECT_URI`. Register the exact callback from `.env.example` in your
  OAuth client. Calendar authorisation and an explicit save are required. The
  app reserves calendar time; it does not book a healthcare provider appointment.

## Build and verify

```sh
npm test                         # frontend build, server tests, frontend tests
npm run dev                      # keep running in another terminal for browser tests
npm run test:browser
```

For browser tests, install Playwright's browser with
`cd frontend && npx playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome/Chromium executable.
All automated model and calendar calls use fixtures; no paid endpoint is needed.

To run the built app from one local server:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:4178**. For Google Calendar in this mode, register and set
`GOOGLE_REDIRECT_URI=http://127.0.0.1:4178/api/google/callback`.

## Structure

- `frontend/`: React/TypeScript UI, icons, runtime 3D assets, synthetic example and tests.
- `server/`: Node HTTP API, text/speech adapters, safety routing, evidence catalogue,
  deterministic recommendations, Calendar connection and shared browser helpers.
- `vendor/`: the app's existing Three.js runtime and loaders with their licence.
- `docs/EMMA_BLOOD_RESULTS.md`: synthetic data provenance and display mappings.

Flow: reviewed text or transcribed speech → server safety routing → structured
extraction and validation → existing recommendation/evidence logic → confirmation
→ dashboard. Voice never automatically submits a story. Emergency and out-of-scope
routes retain the existing UK NHS 111/999 guidance. The optimisation percentage
tracks booked/completed plan items; it is not a medical risk score.

## Scope and data

This is a hackathon prototype, not a diagnostic service. Blood values do not
change eligibility or generate diagnoses. Organ models are reference illustrations;
the Whole Person comparison uses supplied example artwork and does not predict
an individual's health outcome. Local sessions are ephemeral; there is no database.
The server binds to loopback and retains its origin/CSRF checks. Public deployment,
production authentication and clinical validation are outside this repository.

Only browser-ready 3D assets used by the current app are included. Blender sources,
unused models, old practice apps/backends, experiments, recordings, screenshots,
build output, dependency folders and credentials are excluded. The shared source
repository and its Git history were not changed by this migration.

## Attribution

Built collaboratively in the Future You hackathon project; this snapshot combines
Ahmed's UI with the team's application/backend logic. Upstream repository:
https://github.com/ealjibury96-ai/future-you . Existing Three.js, Meshopt, reference
anatomy and icon notices are retained alongside their assets. User-supplied Atelier
and avatar assets retain their source notes; no new licence or redistribution
permission is granted. Publishing this repository does not relicense third-party or user-supplied assets.
