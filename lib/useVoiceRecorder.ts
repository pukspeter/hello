import * as FileSystem from 'expo-file-system/legacy';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
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

// Speech-to-text does not need music-grade quality. Smaller mono recordings
// reduce upload and transcription latency, especially against the hosted API.
const SPEECH_RECORDING_PRESET = {
  ...RecordingPresets.LOW_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    ...RecordingPresets.LOW_QUALITY.android,
    maxFileSize: 512 * 1024,
  },
  ios: {
    ...RecordingPresets.LOW_QUALITY.ios,
    sampleRate: 16000,
  },
  web: {
    ...RecordingPresets.LOW_QUALITY.web,
    bitsPerSecond: 32000,
  },
};

export type RecordedVoicePayload = {
  audioBase64: string;
  mimeType: string;
};

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(SPEECH_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [isStopping, setIsStopping] = useState(false);
  const [isRecordingIntent, setIsRecordingIntent] = useState(false);
  const [webIsRecording, setWebIsRecording] = useState(false);
  const [webDurationMillis, setWebDurationMillis] = useState(0);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webMediaStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webMimeTypeRef = useRef('audio/webm');
  const webRecordingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !webIsRecording) {
      return undefined;
    }

    const updateDuration = () => {
      const startedAt = webRecordingStartedAtRef.current;
      setWebDurationMillis(startedAt ? Date.now() - startedAt : 0);
    };

    updateDuration();
    const interval = window.setInterval(updateDuration, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [webIsRecording]);

  useEffect(() => {
    return () => {
      cleanupWebRecorder();
    };
  }, []);

  const startRecording = async () => {
    if (isRecordingIntent || recorderState.isRecording || webIsRecording || isStopping) {
      return;
    }

    if (Platform.OS === 'web') {
      await startWebRecording();
      return;
    }

    const permission = await requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Luba mikrofoni ligipaas, et saaksid voice inputi kasutada.');
    }

    setIsRecordingIntent(true);

    try {
      await setAudioModeAsync(RECORDING_AUDIO_MODE);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      setIsRecordingIntent(false);
      throw error;
    }
  };

  const stopRecording = async (): Promise<RecordedVoicePayload> => {
    if (isStopping) {
      throw new Error('Voice salvestus on juba peatumas.');
    }

    setIsStopping(true);
    setIsRecordingIntent(false);

    try {
      if (Platform.OS === 'web') {
        return await stopWebRecording();
      }

      await recorder.stop();
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);

      const uri = recorder.uri ?? recorderState.url;

      if (!uri) {
        throw new Error('Salvestatud heli faili ei leitud.');
      }

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        audioBase64,
        mimeType: getRecordingMimeType(uri),
      };
    } finally {
      setIsStopping(false);
    }
  };

  const startWebRecording = async () => {
    setIsRecordingIntent(true);
    setWebDurationMillis(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedWebRecordingMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      webMediaStreamRef.current = stream;
      webMediaRecorderRef.current = mediaRecorder;
      webChunksRef.current = [];
      webMimeTypeRef.current = mediaRecorder.mimeType || mimeType || 'audio/webm';
      webRecordingStartedAtRef.current = Date.now();

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          webChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.start();
      setWebIsRecording(true);
    } catch (error) {
      cleanupWebRecorder();
      setIsRecordingIntent(false);
      throw error instanceof Error
        ? error
        : new Error('Luba mikrofoni ligipaas, et saaksid voice inputi kasutada.');
    }
  };

  const stopWebRecording = async (): Promise<RecordedVoicePayload> => {
    const mediaRecorder = webMediaRecorderRef.current;

    if (!mediaRecorder || !webIsRecording) {
      throw new Error('Voice salvestust ei saa peatada, sest see pole aktiivne.');
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Voice salvestuse peatamine vottis liiga kaua aega.'));
      }, 5000);

      const handleStop = () => {
        window.clearTimeout(timeout);
        mediaRecorder.removeEventListener('stop', handleStop);
        const data = new Blob(webChunksRef.current, {
          type: webMimeTypeRef.current || mediaRecorder.mimeType || 'audio/webm',
        });
        resolve(data);
      };

      mediaRecorder.addEventListener('stop', handleStop, { once: true });
      mediaRecorder.stop();
    });

    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);

    if (blob.size === 0) {
      cleanupWebRecorder();
      throw new Error('Salvestatud heli faili ei leitud.');
    }

    const audioBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    const mimeType = blob.type || webMimeTypeRef.current || 'audio/webm';

    cleanupWebRecorder();

    return {
      audioBase64,
      mimeType,
    };
  };

  const cleanupWebRecorder = () => {
    webMediaRecorderRef.current = null;
    webChunksRef.current = [];
    webRecordingStartedAtRef.current = null;
    setWebIsRecording(false);
    setWebDurationMillis(0);

    webMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    webMediaStreamRef.current = null;
  };

  return {
    durationSeconds: Math.max(
      0,
      Math.round((Platform.OS === 'web' ? webDurationMillis : recorderState.durationMillis) / 1000)
    ),
    isRecording: !isStopping && (isRecordingIntent || recorderState.isRecording || webIsRecording),
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

function getSupportedWebRecordingMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}
