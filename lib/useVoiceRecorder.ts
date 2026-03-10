import * as FileSystem from 'expo-file-system/legacy';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Platform } from 'react-native';

const RECORDING_AUDIO_MODE = {
  allowsBackgroundRecording: false,
  allowsRecording: true,
  interruptionMode: 'mixWithOthers' as const,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
};

const PLAYBACK_AUDIO_MODE = {
  allowsBackgroundRecording: false,
  allowsRecording: false,
  interruptionMode: 'mixWithOthers' as const,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
};

export type RecordedVoicePayload = {
  audioBase64: string;
  mimeType: string;
};

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Luba mikrofoni ligipaas, et saaksid voice inputi kasutada.');
    }

    await setAudioModeAsync(RECORDING_AUDIO_MODE);
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async (): Promise<RecordedVoicePayload> => {
    await recorder.stop();
    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);

    const uri = recorder.uri ?? recorderState.url;

    if (!uri) {
      throw new Error('Salvestatud heli faili ei leitud.');
    }

    const audioBase64 =
      Platform.OS === 'web'
        ? await readWebRecordingAsBase64(uri)
        : await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

    return {
      audioBase64,
      mimeType: getRecordingMimeType(uri),
    };
  };

  return {
    durationSeconds: Math.max(0, Math.round(recorderState.durationMillis / 1000)),
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
  };
}

async function readWebRecordingAsBase64(uri: string) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Veebisalvestist ei saanud lugeda.');
  }

  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getRecordingMimeType(uri: string) {
  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.endsWith('.webm')) {
    return 'audio/webm';
  }

  if (normalizedUri.endsWith('.wav')) {
    return 'audio/wav';
  }

  if (normalizedUri.endsWith('.caf')) {
    return 'audio/x-caf';
  }

  if (normalizedUri.endsWith('.3gp')) {
    return 'audio/3gpp';
  }

  return 'audio/mp4';
}
