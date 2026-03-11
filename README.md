# HELLO MVP

Expo + React Native AAC MVP with Supabase, server-side Google Gemini sentence generation, and Google Cloud Text-to-Speech playback.

## Supabase setup

Before testing the app:
- enable Email auth in Supabase Authentication
- run `supabase/schema.sql` in Supabase SQL Editor
- if Email confirmation is enabled in Supabase, new caregivers must confirm their email before signing in

## Required environment variables

Client:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

Server:
- `PORT` (optional, default `8787`)
- `HOST` (optional, default `0.0.0.0`)
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_VERTEX_LOCATION` (optional, default `europe-west4`)
- `GOOGLE_GEMINI_MODEL` (optional, default `gemini-2.5-flash-lite`)
- `GOOGLE_STT_LOCATION` (optional, default `global`)
- `GOOGLE_STT_LANGUAGE_CODE` (optional, default `et-EE`)
- `GOOGLE_STT_MODEL` (optional, default `short`)
- `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_PATH`
- `GOOGLE_TTS_CREDENTIALS_PATH` or `GOOGLE_TTS_CREDENTIALS_JSON`
- `GOOGLE_TTS_LANGUAGE_CODE` (optional, default `et-EE`)
- `GOOGLE_TTS_VOICE_NAME` (optional, default `et-EE-Chirp3-HD-Autonoe`)
- `GOOGLE_TTS_AUDIO_ENCODING` (optional, default `MP3`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional, default `pictograms`)
- `PICTOGRAM_IMPORT_DIR` (optional, default `~/Documents/pictograms`)

## Local MVP test

1. Fill `.env` using `.env.example`.
2. Re-run `supabase/schema.sql` in Supabase SQL Editor so the current tables, auth trigger, RLS policies, and the public `pictograms` storage bucket exist.
3. Start the local AI server:
   - `npm run server`
4. In another terminal, start Expo web:
   - `npm run web`
5. Open the app and sign in as a caregiver with email and password, or create a new caregiver account.
6. If this caregiver has no child profiles yet, open the `Profile` tab and create the first child profile.
7. In `Profile`, verify that the signed-in caregiver email is shown and `Sign out` works.
8. In `Speak`, use the caregiver text box to enter a short Estonian instruction and verify that the selected sentence bar is auto-filled with matched pictograms.
9. In `Speak`, test `Push to talk`, speak one short sentence, stop recording, and verify that the transcript appears and the selected sentence bar is auto-filled.
10. In `Caregiver`, create a custom pictogram with a label and category.
11. In the same `Caregiver` tab, press `Upload image` or `Update image` on that pictogram row, choose an image from the device library, and wait for the thumbnail to update.
12. Open `Speak` and verify that the same pictogram card now shows the uploaded image.
13. Mark a few pictograms as child favorites in `Caregiver`.
14. Go back to `Speak` and verify that a `Lemmikpildid` quick row appears above the category section.
15. Tap favorite pictograms from that quick row and verify they are added to the sentence strip.
16. In `Caregiver`, use `Edit text` on a pictogram row to save a child-specific wording override.
17. Go back to `Speak` and verify the same pictogram now shows that custom text for the active child.
18. Generate a Gemini sentence and verify that it is saved to `sentence_history` under the active child.
19. Save it as favorite and verify it appears in the `Favorites` tab for the same child.
20. Press `Play sentence` to generate Google Cloud TTS audio and hear playback.
21. Press `Play again` to replay the same cached audio without synthesizing again.
22. Open `History` and verify each sentence card now shows the actual pictograms used in that sentence instead of raw UUID strings.
23. Open `Favorites` and verify each favorite sentence card also shows the same visual pictogram strip with labels.

## Saved boards / routine packs

The saved boards data model is still in the codebase, but the UI is currently hidden.
Reason:
- the current board UX is not stable enough for live testing
- it will be brought back later behind a cleaner caregiver flow

## Google Cloud TTS setup

1. Create or open a Google Cloud project.
2. Enable the `Cloud Text-to-Speech API`.
3. Choose one local auth path:
   - Service account JSON key
   - or local ADC login with `gcloud auth application-default login`
4. If service account keys are allowed in your project:
   - create a service account
   - create a JSON key
   - store it outside client code, for example `./secrets/google-tts-service-account.json`
5. Add these `.env` values:
   - `GOOGLE_CLOUD_PROJECT_ID=your-project-id`
   - `GOOGLE_TTS_CREDENTIALS_PATH=./secrets/google-tts-service-account.json`
   - `GOOGLE_TTS_LANGUAGE_CODE=et-EE`
   - `GOOGLE_TTS_VOICE_NAME=et-EE-Chirp3-HD-Autonoe`
   - `GOOGLE_TTS_AUDIO_ENCODING=MP3`
6. If service account key creation is blocked by organization policy, use local ADC instead:
   - install Google Cloud CLI
   - run `gcloud auth application-default login`
   - run `gcloud auth application-default set-quota-project your-project-id`
   - in this mode, `GOOGLE_TTS_CREDENTIALS_PATH` is optional because the server reads `~/.config/gcloud/application_default_credentials.json`
7. Restart the local backend:
   - `npm run server`

Notes:
- The app uses the Google Cloud REST API from the local Node server.
- Audio is not streamed. The server requests synthesized audio, keeps it briefly in memory, and returns a playback URL to the app.
- `GOOGLE_TTS_CREDENTIALS_JSON` is also supported if you prefer storing the raw JSON in an env var, but `GOOGLE_TTS_CREDENTIALS_PATH` is simpler locally.
- For production deploys like Render, prefer `GOOGLE_SERVICE_ACCOUNT_JSON` so you do not depend on local ADC or a mounted credentials file.

## Google Gemini setup

Use Vertex AI Gemini with the same Google Cloud project and the same local ADC login you already use for Google TTS.

1. Open your Google Cloud project.
2. Enable the `Vertex AI API`.
3. Keep `gcloud auth application-default login` active on your machine.
4. Set the quota project once:
   - `gcloud auth application-default set-quota-project your-project-id`
5. Add these `.env` values:
   - `GOOGLE_CLOUD_PROJECT_ID=your-project-id`
   - `GOOGLE_VERTEX_LOCATION=europe-west4`
   - `GOOGLE_GEMINI_MODEL=gemini-2.5-flash-lite`
6. Restart the local backend:
   - `npm run server`

Notes:
- Sentence generation now uses the Vertex AI `generateContent` REST API.
- The server uses the same local Google ADC credentials for both Gemini and TTS.
- No OpenAI key is needed anymore.
- If you want a stronger model later, change `GOOGLE_GEMINI_MODEL`, for example to `gemini-2.5-flash`.
- The caregiver text-to-pictograms flow also uses Gemini and the same Google ADC setup.
- In production, the same `GOOGLE_SERVICE_ACCOUNT_JSON` credential works for Gemini, Speech-to-Text, and Text-to-Speech.

## Google Speech-to-Text setup

Use Google Cloud Speech-to-Text for the push-to-talk caregiver flow.

1. Open the same Google Cloud project.
2. Enable the `Cloud Speech-to-Text API`.
3. Keep `gcloud auth application-default login` active on your machine.
4. Ensure the quota project is set:
   - `gcloud auth application-default set-quota-project your-project-id`
5. Optional `.env` values:
   - `GOOGLE_STT_LOCATION=global`
   - `GOOGLE_STT_LANGUAGE_CODE=et-EE`
   - `GOOGLE_STT_MODEL=short`
6. Restart the local backend:
   - `npm run server`

Notes:
- The current MVP uses push-to-talk, not streaming transcription.
- On web, microphone capture works on `localhost` and on HTTPS origins.
- On iOS/Android, rebuild the native app after changing `app.json` so the microphone permission string is included.

## Render deployment for the Node API

This repository's Node API lives in the repo root and starts from `server/index.mjs`.

Before you deploy:
- push the actual project files to GitHub first
- the screenshots show a public GitHub repo that is still empty, which blocks Render deploys
- if you already created a Render service with the wrong runtime, recreate it as a `Node` web service

Render settings for the API service:
- Runtime / Language: `Node`
- Root Directory: leave empty
- Build Command: `npm install`
- Start Command: `npm start`

Why this works:
- the API entrypoint is already plain JavaScript at `server/index.mjs`
- Render does not need `tsx`
- Render does not need a separate build output folder for the API
- `npm start` now points directly to the Node API instead of Expo

Required Render environment variables:
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_VERTEX_LOCATION`
- `GOOGLE_GEMINI_MODEL`
- `GOOGLE_STT_LOCATION`
- `GOOGLE_STT_LANGUAGE_CODE`
- `GOOGLE_STT_MODEL`
- `GOOGLE_SERVICE_ACCOUNT_PATH` or `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_TTS_LANGUAGE_CODE`
- `GOOGLE_TTS_VOICE_NAME`
- `GOOGLE_TTS_AUDIO_ENCODING`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET`

Recommended optional Render environment variables:
- `HOST=0.0.0.0`
- `NODE_ENV=production`

Example production credential setup:
- create one Google Cloud service account with access to Vertex AI, Cloud Speech-to-Text, and Cloud Text-to-Speech
- add the JSON file as a Render `Secret File`
- set `GOOGLE_SERVICE_ACCOUNT_PATH=/etc/secrets/google-service-account.json`
- do not use local ADC on Render

Exact Render steps:
1. Push this repo to GitHub.
2. In Render, create a new `Web Service`.
3. Connect the GitHub repo.
4. Choose runtime `Node`.
5. Leave `Root Directory` empty.
6. Set `Build Command` to `npm install`.
7. Set `Start Command` to `npm start`.
8. Add the environment variables listed above.
9. Deploy.
10. After deploy, open `https://your-service.onrender.com/` and verify that the API returns plain text `HELLO API is running`.
11. Open `https://your-service.onrender.com/health` and verify that the API returns `{"ok":true}`.

Local development stays the same:
- API: `npm run server`
- Expo web: `npm run web`
- Optional Expo dev root command: `npm run start:expo`

What to test after the Render API deploy:
- `GET /` returns `200` with plain text `HELLO API is running`
- `GET /health` returns `200` with `{"ok":true}`
- `POST /api/pictograms/match-text` works through the web app
- `POST /api/pictograms/transcribe-and-match` works through push-to-talk
- `POST /api/sentences/generate` returns a Gemini sentence
- `POST /api/tts/synthesize` returns playable audio
- `POST /api/pictograms/upload-image` still uploads to Supabase Storage

What startup logs to look for in Render:
- `[startup] HELLO API server started`
- `[startup] host=0.0.0.0`
- `[startup] port=<Render assigned port>`
- `[startup] google_production_credentials_detected=true`
- `[startup] google_credentials_source=GOOGLE_SERVICE_ACCOUNT_PATH`

If startup fails because env vars are missing or broken:
- Render logs now print `Startup configuration error:`
- each missing or invalid requirement is listed on its own line

Likely deploy blockers:
- empty GitHub repo
- wrong Render runtime, like the Elixir service shown in the screenshot
- missing `GOOGLE_SERVICE_ACCOUNT_PATH` or missing secret file
- missing `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL` in the web app still pointing at `localhost`
- Google APIs not enabled in the selected Google project

## Frontend web deployment

The Render `hello-api` service is backend only. To give other people a usable app URL, deploy the Expo web frontend separately as a static site.

### Local production web build

Run:
- `npm run build:web`

Result:
- Expo exports a static web build into `dist/`

### Render static site settings

Use a separate Render static site named for example `hello-web`.

Render settings:
- Runtime: `Static Site`
- Root Directory: leave empty
- Build Command: `npm install && npm run build:web`
- Publish Directory: `dist`

Frontend environment variables on the static site:
- `EXPO_PUBLIC_SUPABASE_URL=https://nsldpyixflidwpgrkqwm.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your Supabase publishable key>`
- `EXPO_PUBLIC_API_BASE_URL=https://hello-api-vkm8.onrender.com`

Important:
- only `EXPO_PUBLIC_*` variables belong in the frontend deploy
- do not add `SUPABASE_SERVICE_ROLE_KEY`
- do not add Google service account credentials
- after changing `EXPO_PUBLIC_*` variables, redeploy the static site, because Expo bakes them into the build output

### Exact Render flow

1. In Render, click `New`.
2. Choose `Static Site`.
3. Connect the same GitHub repo.
4. Set `Root Directory` empty.
5. Set `Build Command` to `npm install && npm run build:web`.
6. Set `Publish Directory` to `dist`.
7. Add the three `EXPO_PUBLIC_*` variables listed above.
8. Deploy.

### What to test after frontend deploy

Open the frontend URL and verify:
1. Login page loads.
2. Sign in works.
3. `Speak` loads pictograms from Supabase.
4. Text to pictograms uses the Render API.
5. Push-to-talk uses the Render API.
6. Sentence generation works.
7. `Play sentence` works.
8. History and Favorites still load and update.

## Batch pictogram import

Use the local import script when you want to upload many pictogram files at once.

Default folder:
- `~/Documents/pictograms`

Optional override:
- set `PICTOGRAM_IMPORT_DIR` in `.env`
- or pass a folder path directly: `node scripts/import-pictograms.mjs /full/path/to/folder`

Supported file types:
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Filename convention:
- the file name without extension must match the pictogram `label_et`, or its slug form
- spaces, punctuation, and Estonian diacritics are normalized automatically

Examples:
- `ei taha.png`
- `ei-taha.png`
- `opetaja.png`
- `õpetaja.png`
- `valjasoit.webp`
- `väljasõit.jpg`

Run:
- `npm run import:pictograms`

Create missing pictogram records too:
- `npm run import:pictograms -- --create-missing`

Optional category for newly created missing pictograms:
- `npm run import:pictograms -- --create-missing --default-category=Imporditud`

What it does:
- reads files from the local folder
- matches each file to a pictogram by a derived slug from `label_et`
- uploads the file to the public `pictograms` storage bucket with `upsert: true`
- updates `pictograms.image_url`
- prints `[OK]`, `[SKIP]`, and `[FAIL]` lines plus a final summary

When `--create-missing` is used:
- files that do not match an existing pictogram create a new default pictogram record
- the new pictogram gets `label_et` from the file name
- the new pictogram is placed into the `Imporditud` category by default, or the category passed with `--default-category`

What still breaks:
- if multiple pictograms normalize to the same slug, the file is marked ambiguous and skipped
- if a file name does not match any pictogram label, it is skipped
- if the local folder does not exist, the script exits with an error
- if `SUPABASE_SERVICE_ROLE_KEY` is missing or invalid, uploads fail

## Notes

- Keep Google TTS service account credentials server-side only.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- For web testing, use `EXPO_PUBLIC_API_BASE_URL=http://localhost:8787`.
- For a phone or emulator, `EXPO_PUBLIC_API_BASE_URL` may need to point to your machine IP instead of `localhost`.
- Audio is not streamed. The server synthesizes audio through Google Cloud TTS, stores it briefly in an in-memory cache, and returns a playback URL that the app plays.
- Caregiver image uploads are not direct client uploads. The app picks an image with `expo-image-picker`, sends it to the local backend as base64, the backend uploads it to Supabase Storage, then updates `pictograms.image_url`.
- Custom pictograms are stored in the existing `pictograms` table with `is_custom = true` and the signed-in caregiver as `created_by_user_id`.
- Default pictograms remain shared. Custom pictograms are visible only to the caregiver who created them.
- Child-specific wording overrides are stored in `child_pictogram_settings.custom_label_et`, so caregivers can rename a pictogram for one child without changing the global base label.
- Web does not need a media-library permission prompt. iOS and Android will ask for photo library access when the caregiver uploads the first image.
- If you test on a native build after changing `app.json` plugin permissions, rebuild the app so the new image-picker permission strings are included.

## RLS assumptions

Minimal MVP ownership model:
- a caregiver owns a child profile through `child_profiles.user_id = auth.users.id`
- `sentence_history`, `favorite_sentences`, and `child_pictogram_settings` are accessible only through an owned `child_profile_id`
- `pictograms` are readable by authenticated caregivers when they are default pictograms, or when they are custom pictograms created by that caregiver

Important:
- after enabling the RLS policies in `supabase/schema.sql`, protected tables are intended for authenticated caregivers only
- existing seed child profiles like `Kevin` and `Maria` have `user_id = null` until you create or update rows under an authenticated caregiver
- unauthenticated access to protected tables will no longer work once these policies are enabled

Recommended SQL after a caregiver account exists:
```sql
update child_profiles
set user_id = '<AUTH_USER_ID>'
where name in ('Kevin', 'Maria');
```
