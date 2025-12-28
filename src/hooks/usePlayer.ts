import { useState, useCallback, useRef, useEffect } from 'react';
import { Video, PlayerState } from '@/types/music';

const API_BASE = 'https://yt.omada.cafe/api/v1';

interface AudioFormat {
  url: string;
  itag: number;
  type: string;
  bitrate: string;
  container: string;
  audioQuality?: string;
  audioSampleRate?: number;
}

async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  try {
    // Use local=true to proxy streams through Invidious (bypasses CORS)
    const response = await fetch(`${API_BASE}/videos/${videoId}?local=true`);
    if (!response.ok) throw new Error('Failed to fetch video info');
    
    const data = await response.json();
    
    // Get adaptive formats (audio-only streams)
    const adaptiveFormats: AudioFormat[] = data.adaptiveFormats || [];
    
    // Find audio-only formats
    const audioFormats = adaptiveFormats.filter(f => 
      f.type?.startsWith('audio/')
    );
    
    // Sort by bitrate (highest first)
    audioFormats.sort((a, b) => {
      const bitrateA = parseInt(a.bitrate) || 0;
      const bitrateB = parseInt(b.bitrate) || 0;
      return bitrateB - bitrateA;
    });
    
    // Return the best audio URL (already proxied via local=true)
    if (audioFormats.length > 0) {
      return audioFormats[0].url;
    }
    
    // Fallback: use formatStreams (contains both audio+video)
    const formatStreams = data.formatStreams || [];
    if (formatStreams.length > 0) {
      return formatStreams[0].url;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching audio stream:', error);
    return null;
  }
}

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    volume: 70,
    currentTime: 0,
    duration: 0,
    queue: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = state.volume / 100;
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setState(s => ({ ...s, duration: audioRef.current?.duration || 0 }));
      });
      
      audioRef.current.addEventListener('timeupdate', () => {
        setState(s => ({ 
          ...s, 
          currentTime: audioRef.current?.currentTime || 0,
          duration: audioRef.current?.duration || 0
        }));
      });
      
      audioRef.current.addEventListener('ended', () => {
        const currentQueue = stateRef.current.queue;
        if (currentQueue.length > 0) {
          const [next, ...rest] = currentQueue;
          playTrackInternal(next, rest);
        } else {
          setState(s => ({ ...s, isPlaying: false }));
        }
      });
      
      audioRef.current.addEventListener('play', () => {
        setState(s => ({ ...s, isPlaying: true }));
      });
      
      audioRef.current.addEventListener('pause', () => {
        setState(s => ({ ...s, isPlaying: false }));
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setState(s => ({ ...s, isPlaying: false }));
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const playTrackInternal = useCallback(async (track: Video, newQueue?: Video[]) => {
    setState(s => ({ 
      ...s, 
      currentTrack: track, 
      isPlaying: false, 
      currentTime: 0,
      ...(newQueue !== undefined ? { queue: newQueue } : {})
    }));
    
    const audioUrl = await getAudioStreamUrl(track.videoId);
    
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      console.error('No audio stream found for:', track.videoId);
    }
  }, []);

  const playTrack = useCallback((track: Video) => {
    playTrackInternal(track);
  }, [playTrackInternal]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !stateRef.current.currentTrack) return;

    if (stateRef.current.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(s => ({ ...s, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const vol = Math.round(volume * 100);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const addToQueue = useCallback((track: Video) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
  }, []);

  const playNext = useCallback(() => {
    const currentQueue = stateRef.current.queue;
    if (currentQueue.length > 0) {
      const [next, ...rest] = currentQueue;
      playTrackInternal(next, rest);
    }
  }, [playTrackInternal]);

  const playPrevious = useCallback(() => {
    if (audioRef.current && stateRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setState(s => ({ ...s, currentTime: 0 }));
    }
  }, []);

  return {
    ...state,
    volume: state.volume / 100,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    addToQueue,
    playNext,
    playPrevious,
  };
}
