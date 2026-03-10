# HELLO AGENTS Guidelines

## Scope
This repository is for the HELLO AAC MVP using Expo + React Native + TypeScript.

## Current architecture
- `App.tsx` - temporary MVP entry screen
- `lib/supabase.ts` - shared Supabase client
- `supabase/schema.sql` - initial schema and seed data

## Build order (do not skip)
1. Keep Expo app booting on web, iOS, Android from one codebase.
2. Add auth and child profile flow.
3. Add pictogram grid + sentence strip.
4. Add server-side sentence generation endpoint (OpenAI).
5. Add server-side Estonian TTS endpoint (Azure Speech).

## Security constraints
- Never put OpenAI or Azure secret keys in Expo client code.
- Only use `EXPO_PUBLIC_*` for non-secret client values.
- Keep secret API calls in server/edge functions.

## Code style
- Strict TypeScript.
- Reusable typed API clients.
- Avoid throwaway code and one-off hacks.
