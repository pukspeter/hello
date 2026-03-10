import { useAudioPlayer } from 'expo-audio';
import { useState } from 'react';

export function useSpeechPlayback() {
  const player = useAudioPlayer(null, { downloadFirst: true, updateInterval: 250 });
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  const playAudioUrl = async (audioUrl: string) => {
    player.pause();
    player.replace(audioUrl);
    player.play();
    setLastAudioUrl(audioUrl);
  };

  const replayLastAudio = async () => {
    if (!lastAudioUrl) {
      throw new Error('Helifail puudub. Loo koigepealt TTS audio.');
    }

    await player.seekTo(0);
    player.play();
  };

  const clearAudio = () => {
    player.pause();
    setLastAudioUrl(null);
  };

  return {
    clearAudio,
    hasAudio: Boolean(lastAudioUrl),
    playAudioUrl,
    replayLastAudio,
  };
}
