import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createSign, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

loadDotEnv();

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const GOOGLE_VERTEX_LOCATION = process.env.GOOGLE_VERTEX_LOCATION ?? 'europe-west4';
const GOOGLE_GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
const GOOGLE_STT_LOCATION = process.env.GOOGLE_STT_LOCATION ?? 'global';
const GOOGLE_STT_LANGUAGE_CODE = process.env.GOOGLE_STT_LANGUAGE_CODE ?? 'et-EE';
const GOOGLE_STT_MODEL = process.env.GOOGLE_STT_MODEL ?? 'short';
const GOOGLE_SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
const GOOGLE_SERVICE_ACCOUNT_JSON =
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const GOOGLE_TTS_CREDENTIALS_PATH =
  process.env.GOOGLE_TTS_CREDENTIALS_PATH;
const GOOGLE_TTS_CREDENTIALS_JSON = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
const GOOGLE_TTS_LANGUAGE_CODE = process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'et-EE';
const GOOGLE_TTS_VOICE_NAME = process.env.GOOGLE_TTS_VOICE_NAME ?? 'et-EE-Standard-A';
const GOOGLE_TTS_AUDIO_ENCODING = process.env.GOOGLE_TTS_AUDIO_ENCODING ?? 'MP3';
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pictograms';
const AUDIO_CACHE_TTL_MS = 1000 * 60 * 30;
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const audioCache = new Map();
let supabaseAdminClient = null;
let supabaseAuthClient = null;
let googleServiceAccount = null;
let googleAccessTokenCache = null;

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
};

const sentenceSchema = {
  type: 'OBJECT',
  additionalProperties: false,
  properties: {
    sentence: {
      type: 'STRING',
      description: 'One grammatically correct Estonian AAC sentence.',
    },
    plainText: {
      type: 'STRING',
      description: 'The same sentence as plain text for TTS playback.',
    },
  },
  required: ['sentence', 'plainText'],
  propertyOrdering: ['sentence', 'plainText'],
};

const pictogramMatchSchema = {
  type: 'OBJECT',
  additionalProperties: false,
  properties: {
    plainText: {
      type: 'STRING',
      description: 'The caregiver text as clear plain text.',
    },
    normalizedSentence: {
      type: 'STRING',
      description: 'A normalized Estonian version of the caregiver sentence.',
    },
    matchedPictogramSlugs: {
      type: 'ARRAY',
      items: {
        type: 'STRING',
      },
      description: 'Ordered pictogram slugs chosen only from the allowed input list.',
    },
  },
  required: ['plainText', 'normalizedSentence', 'matchedPictogramSlugs'],
  propertyOrdering: ['plainText', 'normalizedSentence', 'matchedPictogramSlugs'],
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/sentences/generate') {
    await handleSentenceGeneration(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/pictograms/match-text') {
    await handleTextToPictograms(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/pictograms/transcribe-and-match') {
    await handleTranscribeAndMatch(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/tts/synthesize') {
    await handleTextToSpeech(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/pictograms/upload-image') {
    await handlePictogramImageUpload(request, response);
    return;
  }

  if (request.method === 'GET' && request.url.startsWith('/api/tts/audio/')) {
    handleAudioFetch(request, response);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}).listen(PORT, HOST, () => {
  console.log(`HELLO AI server listening on http://${HOST}:${PORT}`);
});

async function handleSentenceGeneration(request, response) {
  if (!GOOGLE_CLOUD_PROJECT_ID) {
    sendJson(response, 500, {
      error: 'GOOGLE_CLOUD_PROJECT_ID puudub serveri keskkonnamuutujates.',
    });
    return;
  }

  try {
    getGoogleCredentials();
    const body = await readJson(request);
    const pictograms = Array.isArray(body?.pictograms) ? body.pictograms : [];

    if (pictograms.length === 0) {
      sendJson(response, 400, {
        error: 'Vali enne lause genereerimist vahemalt üks piktogramm.',
      });
      return;
    }

    const normalizedPictograms = pictograms
      .map((item) => ({
        id: typeof item?.id === 'string' ? item.id : '',
        label: typeof item?.label === 'string' ? item.label : '',
        categoryId: typeof item?.categoryId === 'string' ? item.categoryId : null,
        order: typeof item?.order === 'number' ? item.order : 0,
      }))
      .filter((item) => item.id && item.label)
      .sort((left, right) => left.order - right.order);

    if (normalizedPictograms.length === 0) {
      sendJson(response, 400, {
        error: 'Piktogrammiandmed on vigased.',
      });
      return;
    }

    const accessToken = await getGoogleAccessToken();
    const modelPath = getVertexModelPath();

    const aiResponse = await fetch(`https://aiplatform.googleapis.com/v1/${modelPath}:generateContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
        'x-goog-user-project': GOOGLE_CLOUD_PROJECT_ID,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                'You create short, grammatically correct AAC support sentences in Estonian. ' +
                'Use only the intent that is strongly supported by the pictogram labels. ' +
                'Keep wording natural, child-friendly, and stable across repeated requests. ' +
                'Return only valid JSON that matches the provided response schema.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Create one Estonian sentence from these pictograms in the given order: ' +
                  JSON.stringify(normalizedPictograms) +
                  '. If needed, add minimal helper words for correct Estonian grammar. ' +
                  'Do not add information that is not implied by the pictograms.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: sentenceSchema,
        },
      }),
    });

    const payload = await aiResponse.json();

    if (!aiResponse.ok) {
      sendJson(response, 502, {
        error: payload?.error?.message ?? 'Gemini lausegenereerimine ebaonnestus.',
      });
      return;
    }

    const rawText = extractGeminiText(payload);

    if (!rawText) {
      sendJson(response, 502, {
        error: 'Gemini ei tagastanud loetavat vastust.',
      });
      return;
    }

    const result = JSON.parse(rawText);

    if (
      typeof result?.sentence !== 'string' ||
      typeof result?.plainText !== 'string'
    ) {
      sendJson(response, 502, {
        error: 'Gemini vastuse vorming oli vigane.',
      });
      return;
    }

    sendJson(response, 200, {
      sentence: result.sentence,
      plainText: result.plainText,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Tundmatu serveriviga.',
    });
  }
}

async function handleTextToPictograms(request, response) {
  if (!GOOGLE_CLOUD_PROJECT_ID) {
    sendJson(response, 500, {
      error: 'GOOGLE_CLOUD_PROJECT_ID puudub serveri keskkonnamuutujates.',
    });
    return;
  }

  try {
    getGoogleCredentials();
    const body = await readJson(request);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const availablePictograms = Array.isArray(body?.availablePictograms)
      ? body.availablePictograms
      : [];

    if (!text) {
      sendJson(response, 400, {
        error: 'Kirjuta enne lause, mida soovid piktogrammideks teisendada.',
      });
      return;
    }

    const normalizedCandidates = normalizePictogramCandidates(availablePictograms);

    if (normalizedCandidates.length === 0) {
      sendJson(response, 400, {
        error: 'Piktogrammikataloog puudub voi on vigane.',
      });
      return;
    }

    const result = await matchTextToPictogramsWithGemini(text, normalizedCandidates);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Tundmatu serveriviga.',
    });
  }
}

async function handleTranscribeAndMatch(request, response) {
  if (!GOOGLE_CLOUD_PROJECT_ID) {
    sendJson(response, 500, {
      error: 'GOOGLE_CLOUD_PROJECT_ID puudub serveri keskkonnamuutujates.',
    });
    return;
  }

  try {
    getGoogleCredentials();
    const body = await readJson(request);
    const audioBase64 = typeof body?.audioBase64 === 'string' ? body.audioBase64.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim() : '';
    const availablePictograms = Array.isArray(body?.availablePictograms)
      ? body.availablePictograms
      : [];

    if (!audioBase64) {
      sendJson(response, 400, {
        error: 'Voice inputi audio puudub.',
      });
      return;
    }

    if (mimeType && !mimeType.startsWith('audio/')) {
      sendJson(response, 400, {
        error: 'Voice input peab olema audiofail.',
      });
      return;
    }

    const normalizedCandidates = normalizePictogramCandidates(availablePictograms);

    if (normalizedCandidates.length === 0) {
      sendJson(response, 400, {
        error: 'Piktogrammikataloog puudub voi on vigane.',
      });
      return;
    }

    const transcript = await transcribeAudioWithGoogle(audioBase64);
    const result = await matchTextToPictogramsWithGemini(transcript, normalizedCandidates);

    sendJson(response, 200, {
      transcript,
      ...result,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Tundmatu serveriviga.',
    });
  }
}

async function handleTextToSpeech(request, response) {
  try {
    getGoogleCredentials();
    const body = await readJson(request);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      sendJson(response, 400, {
        error: 'TTS jaoks puudub loodud lause tekst.',
      });
      return;
    }

    const accessToken = await getGoogleAccessToken();
    const projectId = GOOGLE_CLOUD_PROJECT_ID ?? getGoogleServiceAccount().project_id ?? null;
    const googleResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
        ...(projectId ? { 'x-goog-user-project': projectId } : {}),
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: GOOGLE_TTS_LANGUAGE_CODE,
          name: GOOGLE_TTS_VOICE_NAME,
        },
        audioConfig: {
          audioEncoding: GOOGLE_TTS_AUDIO_ENCODING,
        },
      }),
    });

    const googlePayload = await googleResponse.json();

    if (!googleResponse.ok) {
      sendJson(response, 502, {
        error:
          googlePayload?.error?.message ??
          'Google Cloud TTS ebaonnestus.',
      });
      return;
    }

    if (typeof googlePayload?.audioContent !== 'string' || googlePayload.audioContent.length === 0) {
      sendJson(response, 502, {
        error: 'Google Cloud TTS ei tagastanud audioContent valja.',
      });
      return;
    }

    const buffer = Buffer.from(googlePayload.audioContent, 'base64');
    const audioId = randomUUID();
    const contentType = getAudioContentTypeForEncoding(GOOGLE_TTS_AUDIO_ENCODING);

    audioCache.set(audioId, {
      buffer,
      contentType,
      expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
    });

    pruneExpiredAudio();

    sendJson(response, 200, {
      audioUrl: `${getBaseUrl(request)}/api/tts/audio/${audioId}`,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'TTS serveriviga.',
    });
  }
}

async function matchTextToPictogramsWithGemini(text, availablePictograms) {
  const accessToken = await getGoogleAccessToken();
  const modelPath = getVertexModelPath();
  const aiResponse = await fetch(`https://aiplatform.googleapis.com/v1/${modelPath}:generateContent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      'x-goog-user-project': GOOGLE_CLOUD_PROJECT_ID,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              'You map caregiver sentences to AAC pictograms. ' +
              'Choose only pictogram slugs from the allowed list. ' +
              'Return a short normalized Estonian sentence and an ordered slug array. ' +
              'Do not explain your reasoning. Return only valid JSON that matches the response schema.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Caregiver sentence: ' +
                JSON.stringify(text) +
                '\nAllowed pictograms: ' +
                JSON.stringify(availablePictograms) +
                '\nChoose the smallest useful ordered set of pictogram slugs that preserves the meaning. ' +
                'Only use slugs from the allowed list.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: pictogramMatchSchema,
      },
    }),
  });

  const payload = await aiResponse.json();

  if (!aiResponse.ok) {
    throw new Error(payload?.error?.message ?? 'Gemini piktogrammide mapping ebaonnestus.');
  }

  const rawText = extractGeminiText(payload);

  if (!rawText) {
    throw new Error('Gemini ei tagastanud loetavat mapping vastust.');
  }

  const result = JSON.parse(rawText);

  if (
    typeof result?.plainText !== 'string' ||
    typeof result?.normalizedSentence !== 'string' ||
    !Array.isArray(result?.matchedPictogramSlugs)
  ) {
    throw new Error('Gemini mapping vastuse vorming oli vigane.');
  }

  const allowedSlugs = new Set(availablePictograms.map((item) => item.slug));
  const geminiMatchedPictogramSlugs = result.matchedPictogramSlugs
    .filter((slug) => typeof slug === 'string')
    .map((slug) => toPictogramSlug(slug))
    .filter((slug) => slug && allowedSlugs.has(slug));
  const fallbackMatchedPictogramSlugs = buildDeterministicFallbackMatches(text, availablePictograms);
  const matchedPictogramSlugs =
    geminiMatchedPictogramSlugs.length > 0 ? geminiMatchedPictogramSlugs : fallbackMatchedPictogramSlugs;

  return {
    plainText: result.plainText.trim() || text,
    normalizedSentence: result.normalizedSentence.trim() || text,
    matchedPictogramSlugs,
  };
}

async function transcribeAudioWithGoogle(audioBase64) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://speech.googleapis.com/v2/projects/${GOOGLE_CLOUD_PROJECT_ID}/locations/${GOOGLE_STT_LOCATION}/recognizers/_:recognize`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
        'x-goog-user-project': GOOGLE_CLOUD_PROJECT_ID,
      },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {},
          features: {
            enableAutomaticPunctuation: true,
          },
          languageCodes: [GOOGLE_STT_LANGUAGE_CODE],
          model: GOOGLE_STT_MODEL,
        },
        content: audioBase64,
      }),
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? 'Google Speech-to-Text transkriptsioon ebaonnestus.'
    );
  }

  const transcript = (payload?.results ?? [])
    .map((result) => result?.alternatives?.[0]?.transcript?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!transcript) {
    throw new Error('Google Speech-to-Text ei tagastanud transkriptsiooni.');
  }

  return transcript;
}

async function handlePictogramImageUpload(request, response) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);
    const body = await readJson(request, 8 * 1024 * 1024);
    const pictogramId = typeof body?.pictogramId === 'string' ? body.pictogramId.trim() : '';
    const base64Data = typeof body?.base64Data === 'string' ? body.base64Data.trim() : '';
    const mimeType = normalizeImageMimeType(
      typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg'
    );
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';

    if (!pictogramId || !base64Data) {
      sendJson(response, 400, {
        error: 'Piktogrammi ID voi pildiandmed puuduvad.',
      });
      return;
    }

    if (!mimeType) {
      sendJson(response, 400, {
        error: 'Valitud fail peab olema pilt.',
      });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      sendJson(response, 400, {
        error: 'Valitud pildi andmeid ei saadud lugeda.',
      });
      return;
    }

    if (buffer.length > MAX_IMAGE_UPLOAD_BYTES) {
      sendJson(response, 400, {
        error: 'Pilt on liiga suur. Kasuta faili, mis on kuni 5 MB.',
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: pictogramData, error: pictogramLookupError } = await supabaseAdmin
      .from('pictograms')
      .select('id, is_custom, created_by_user_id')
      .eq('id', pictogramId)
      .single();

    if (pictogramLookupError || !pictogramData) {
      sendJson(response, 404, {
        error: 'Piktogrammi ei leitud.',
      });
      return;
    }

    if (pictogramData.is_custom && pictogramData.created_by_user_id !== authenticatedUser.id) {
      sendJson(response, 403, {
        error: 'Saad muuta ainult enda custom piktogrammide pilte.',
      });
      return;
    }

    const extension = getFileExtensionForMimeType(mimeType);
    const objectPath = [
      pictogramId,
      `${Date.now()}-${sanitizeFileName(fileName || 'pictogram')}.${extension}`,
    ].join('/');

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(objectPath, buffer, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      sendJson(response, 502, {
        error: `Supabase Storage upload ebaonnestus: ${uploadError.message}`,
      });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(objectPath);
    const imageUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('pictograms')
      .update({ image_url: imageUrl })
      .eq('id', pictogramId)
      .select('id')
      .single();

    if (updateError) {
      await supabaseAdmin.storage.from(SUPABASE_STORAGE_BUCKET).remove([objectPath]);

      sendJson(response, 502, {
        error: `Piktogrammi pildi salvestamine ebaonnestus: ${updateError.message}`,
      });
      return;
    }

    sendJson(response, 200, {
      imageUrl,
      pictogramId,
    });
  } catch (error) {
    sendJson(response, error instanceof HttpError ? error.statusCode : 500, {
      error: error instanceof Error ? error.message : 'Pildi upload ebaonnestus.',
    });
  }
}

function handleAudioFetch(request, response) {
  pruneExpiredAudio();

  const audioId = request.url.split('/').pop();
  const audioEntry = audioId ? audioCache.get(audioId) : null;

  if (!audioEntry) {
    response.writeHead(404, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ error: 'Helifaili ei leitud voi see aegus.' }));
    return;
  }

  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Length': String(audioEntry.buffer.length),
    'Content-Type': audioEntry.contentType,
  });
  response.end(audioEntry.buffer);
}

function extractGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];

    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.length > 0) {
        return part.text;
      }
    }
  }

  return null;
}

function buildDeterministicFallbackMatches(text, availablePictograms) {
  const normalizedText = normalizeSearchText(text);

  if (!normalizedText) {
    return [];
  }

  const indexedMatches = [];

  for (const candidate of availablePictograms) {
    const normalizedLabel = normalizeSearchText(candidate.label);

    if (!normalizedLabel) {
      continue;
    }

    const haystack = ` ${normalizedText} `;
    const needle = ` ${normalizedLabel} `;
    const matchIndex = haystack.indexOf(needle);

    if (matchIndex === -1) {
      continue;
    }

    indexedMatches.push({
      matchIndex,
      slug: candidate.slug,
      wordCount: normalizedLabel.split(' ').length,
    });
  }

  indexedMatches.sort((left, right) => {
    if (left.matchIndex !== right.matchIndex) {
      return left.matchIndex - right.matchIndex;
    }

    return right.wordCount - left.wordCount;
  });

  return Array.from(new Set(indexedMatches.map((item) => item.slug)));
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function readJson(request, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let settled = false;

    request.on('data', (chunk) => {
      if (settled) {
        return;
      }

      raw += chunk;

      if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
        settled = true;
        reject(new Error('JSON body on liiga suur.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (settled) {
        return;
      }

      try {
        settled = true;
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('JSON body on vigane.'));
      }
    });

    request.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, corsHeaders);
  response.end(JSON.stringify(body));
}

function getBaseUrl(request) {
  const protocol = request.headers['x-forwarded-proto'] ?? 'http';
  const host = request.headers.host ?? `${HOST}:${PORT}`;

  return `${protocol}://${host}`;
}

function pruneExpiredAudio() {
  const now = Date.now();

  for (const [audioId, entry] of audioCache.entries()) {
    if (entry.expiresAt <= now) {
      audioCache.delete(audioId);
    }
  }
}

function getSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY puudub voi server ei tea Supabase URL-i.'
    );
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

function getSupabaseAuthClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL voi anon key puudub serveri keskkonnamuutujates.');
  }

  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAuthClient;
}

async function getAuthenticatedUser(request) {
  const authorization = request.headers.authorization ?? '';

  if (!authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'Caregiver peab enne pildi uploadi sisse logima.');
  }

  const accessToken = authorization.slice('Bearer '.length).trim();

  if (!accessToken) {
    throw new HttpError(401, 'Caregiver peab enne pildi uploadi sisse logima.');
  }

  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new HttpError(401, 'Caregiver seanssi ei saanud kinnitada.');
  }

  return data.user;
}

function normalizeImageMimeType(value) {
  const normalized = value.trim().toLowerCase();

  if (!normalized.startsWith('image/')) {
    return null;
  }

  return normalized.split(';')[0];
}

function normalizePictogramCandidates(availablePictograms) {
  return availablePictograms
    .map((item) => ({
      categoryName: typeof item?.categoryName === 'string' ? item.categoryName.trim() || null : null,
      id: typeof item?.id === 'string' ? item.id : '',
      label: typeof item?.label === 'string' ? item.label.trim() : '',
      slug:
        typeof item?.slug === 'string'
          ? toPictogramSlug(item.slug)
          : toPictogramSlug(typeof item?.label === 'string' ? item.label : ''),
    }))
    .filter((item) => item.id && item.label && item.slug);
}

function toPictogramSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .normalize('NFC');
}

function getFileExtensionForMimeType(mimeType) {
  const subtype = mimeType.split('/')[1] ?? 'jpg';
  const normalizedSubtype = subtype.replace(/[^a-z0-9]/g, '');

  if (!normalizedSubtype) {
    return 'jpg';
  }

  if (normalizedSubtype === 'jpeg') {
    return 'jpg';
  }

  return normalizedSubtype;
}

function sanitizeFileName(value) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pictogram';
}

function getAudioContentTypeForEncoding(encoding) {
  switch (encoding.toUpperCase()) {
    case 'LINEAR16':
      return 'audio/wav';
    case 'OGG_OPUS':
      return 'audio/ogg';
    case 'MP3':
    default:
      return 'audio/mpeg';
  }
}

function getVertexModelPath() {
  return [
    'projects',
    GOOGLE_CLOUD_PROJECT_ID,
    'locations',
    GOOGLE_VERTEX_LOCATION,
    'publishers',
    'google',
    'models',
    GOOGLE_GEMINI_MODEL,
  ].join('/');
}

function getGoogleServiceAccount() {
  if (googleServiceAccount?.type === 'service_account') {
    return googleServiceAccount;
  }

  const credentials = getGoogleCredentials();

  if (credentials.type !== 'service_account') {
    throw new Error('Google service account credentials puuduvad.');
  }

  googleServiceAccount = credentials;
  return googleServiceAccount;
}

async function getGoogleAccessToken() {
  if (googleAccessTokenCache && googleAccessTokenCache.expiresAt > Date.now()) {
    return googleAccessTokenCache.accessToken;
  }

  const credentials = getGoogleCredentials();
  let tokenPayload = null;

  if (credentials.type === 'service_account') {
    const tokenUri = credentials.token_uri ?? 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const assertion = signJwt(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      },
      credentials.private_key
    );

    const tokenResponse = await fetch(tokenUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok || typeof tokenPayload?.access_token !== 'string') {
      throw new Error(
        tokenPayload?.error_description ??
          tokenPayload?.error ??
          'Google OAuth access tokeni hankimine ebaonnestus.'
      );
    }
  } else if (credentials.type === 'authorized_user') {
    const tokenUri = credentials.token_uri ?? 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok || typeof tokenPayload?.access_token !== 'string') {
      throw new Error(
        tokenPayload?.error_description ??
          tokenPayload?.error ??
          'Google user ADC access tokeni hankimine ebaonnestus.'
      );
    }
  } else {
    throw new Error('Toetamata Google credentials type.');
  }

  googleAccessTokenCache = {
    accessToken: tokenPayload.access_token,
    expiresAt: Date.now() + Math.max((Number(tokenPayload.expires_in) || 3600) - 60, 60) * 1000,
  };

  return googleAccessTokenCache.accessToken;
}

function signJwt(header, payload, privateKey) {
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign('RSA-SHA256');

  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${signer.sign(privateKey, 'base64url')}`;
}

function resolveCredentialPath(filePath) {
  if (filePath.startsWith('~/')) {
    return resolve(homedir(), filePath.slice(2));
  }

  return resolve(process.cwd(), filePath);
}

function getGoogleCredentials() {
  if (googleServiceAccount) {
    return googleServiceAccount;
  }

  const rawJson = loadGoogleCredentialsJson();

  if (!rawJson) {
    throw new Error(
      'Google credentials puuduvad. Kasuta GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_PATH, GOOGLE_TTS_CREDENTIALS_JSON, GOOGLE_TTS_CREDENTIALS_PATH voi gcloud auth application-default login.'
    );
  }

  const parsed = JSON.parse(rawJson);

  if (
    parsed.type === 'service_account' &&
    parsed.client_email &&
    parsed.private_key
  ) {
    googleServiceAccount = parsed;
    return googleServiceAccount;
  }

  if (
    parsed.type === 'authorized_user' &&
    parsed.client_id &&
    parsed.client_secret &&
    parsed.refresh_token
  ) {
    googleServiceAccount = parsed;
    return googleServiceAccount;
  }

  throw new Error('Google ADC credentials faili vorming ei ole toetatud.');
}

function loadGoogleCredentialsJson() {
  if (GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    return GOOGLE_SERVICE_ACCOUNT_JSON.trim();
  }

  if (GOOGLE_TTS_CREDENTIALS_JSON?.trim()) {
    return GOOGLE_TTS_CREDENTIALS_JSON.trim();
  }

  const candidatePaths = [];

  if (GOOGLE_SERVICE_ACCOUNT_PATH) {
    candidatePaths.push(resolveCredentialPath(GOOGLE_SERVICE_ACCOUNT_PATH));
  }

  if (GOOGLE_TTS_CREDENTIALS_PATH) {
    candidatePaths.push(resolveCredentialPath(GOOGLE_TTS_CREDENTIALS_PATH));
  }

  candidatePaths.push(resolve(homedir(), '.config/gcloud/application_default_credentials.json'));

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return readFileSync(candidatePath, 'utf8');
    }
  }

  return '';
}

function loadDotEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf8');

    for (const rawLine of envFile.split('\n')) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Missing .env is allowed; validation happens later when env vars are read.
  }
}
