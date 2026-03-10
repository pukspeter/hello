import type {
  PictogramImageUploadInput,
  PictogramImageUploadResult,
  SentenceGenerationInput,
  SentenceGenerationResult,
  SpeechSynthesisResult,
  TextToPictogramsInput,
  TextToPictogramsResult,
  VoiceToPictogramsInput,
  VoiceToPictogramsResult,
} from '../types/pictograms';
import { getAccessToken } from './auth';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const isSentenceApiConfigured = Boolean(apiBaseUrl);

export async function generateSentence(
  input: SentenceGenerationInput
): Promise<SentenceGenerationResult> {
  if (!apiBaseUrl) {
    throw new Error(
      'Lause API ei ole seadistatud. Lisa EXPO_PUBLIC_API_BASE_URL .env faili.'
    );
  }

  const response = await fetch(`${apiBaseUrl}/api/sentences/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as
    | SentenceGenerationResult
    | { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Lause genereerimine ebaonnestus.';

    throw new Error(errorMessage);
  }

  return data as SentenceGenerationResult;
}

export async function matchTextToPictograms(
  input: TextToPictogramsInput
): Promise<TextToPictogramsResult> {
  if (!apiBaseUrl) {
    throw new Error(
      'Lause API ei ole seadistatud. Lisa EXPO_PUBLIC_API_BASE_URL .env faili.'
    );
  }

  const response = await fetch(`${apiBaseUrl}/api/pictograms/match-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as TextToPictogramsResult | { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Teksti piktogrammideks teisendamine ebaonnestus.';

    throw new Error(errorMessage);
  }

  return data as TextToPictogramsResult;
}

export async function transcribeAndMatchVoiceToPictograms(
  input: VoiceToPictogramsInput
): Promise<VoiceToPictogramsResult> {
  if (!apiBaseUrl) {
    throw new Error(
      'Lause API ei ole seadistatud. Lisa EXPO_PUBLIC_API_BASE_URL .env faili.'
    );
  }

  const response = await fetch(`${apiBaseUrl}/api/pictograms/transcribe-and-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as VoiceToPictogramsResult | { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Heli piktogrammideks teisendamine ebaonnestus.';

    throw new Error(errorMessage);
  }

  return data as VoiceToPictogramsResult;
}

export async function synthesizeSpeech(text: string): Promise<SpeechSynthesisResult> {
  if (!apiBaseUrl) {
    throw new Error('Lause API ei ole seadistatud. Lisa EXPO_PUBLIC_API_BASE_URL .env faili.');
  }

  const response = await fetch(`${apiBaseUrl}/api/tts/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = (await response.json()) as SpeechSynthesisResult | { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'TTS heli loomine ebaonnestus.';

    throw new Error(errorMessage);
  }

  return data as SpeechSynthesisResult;
}

export async function uploadPictogramImage(
  input: PictogramImageUploadInput
): Promise<PictogramImageUploadResult> {
  if (!apiBaseUrl) {
    throw new Error('Lause API ei ole seadistatud. Lisa EXPO_PUBLIC_API_BASE_URL .env faili.');
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${apiBaseUrl}/api/pictograms/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as PictogramImageUploadResult | { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Piktogrammi pildi upload ebaonnestus.';

    throw new Error(errorMessage);
  }

  return data as PictogramImageUploadResult;
}
