import { useState, useCallback, useRef, useEffect } from 'react';
import { Video, PlayerState } from '@/types/music';

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    queue: [],
  });

  // Create audio element on mount
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const playTrack = useCallback(async (track: Video) => {
    if (!audioRef.current) return;

    // Use a proxy audio stream URL based on videoId
    const audioUrl = `https://yt.omada.cafe/api/v1/streams/audio/${track.videoId}`;
    
    audioRef.current.src = audioUrl;
    setState(prev => ({ 
      ...prev, 
      currentTrack: track, 
      isPlaying: true,
      currentTime: 0 
    }));
    
    try {
      await audioRef.current.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !state.currentTrack) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [state.isPlaying, state.currentTrack]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    setState(prev => ({ ...prev, volume }));
  }, []);

  const addToQueue = useCallback((track: Video) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const playNext = useCallback(() => {
    setState(prev => {
      if (prev.queue.length > 0) {
        const [next, ...rest] = prev.queue;
        playTrack(next);
        return { ...prev, queue: rest };
      }
      return prev;
    });
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    if (audioRef.current && state.currentTime > 3) {
      audioRef.current.currentTime = 0;
    }
  }, [state.currentTime]);

  return {
    ...state,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    addToQueue,
    playNext,
    playPrevious,
  };
}
