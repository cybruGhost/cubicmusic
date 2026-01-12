import { useState, useCallback, useRef, useEffect } from 'react';
import { Video, PlayerState } from '@/types/music';
import { getRelatedVideos } from '@/lib/api';

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

async function getAudioStreamUrl(videoId: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/videos/${videoId}?local=true`, { signal });
    if (!response.ok) throw new Error('Failed to fetch video info');
    
    const data = await response.json();
    
    const adaptiveFormats: AudioFormat[] = data.adaptiveFormats || [];
    const audioFormats = adaptiveFormats.filter(f => f.type?.startsWith('audio/'));
    
    // Sort by bitrate (highest first)
    audioFormats.sort((a, b) => {
      const bitrateA = parseInt(a.bitrate) || 0;
      const bitrateB = parseInt(b.bitrate) || 0;
      return bitrateB - bitrateA;
    });
    
    if (audioFormats.length > 0) {
      return audioFormats[0].url;
    }
    
    const formatStreams = data.formatStreams || [];
    if (formatStreams.length > 0) {
      return formatStreams[0].url;
    }
    
    return null;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[Player] Fetch aborted for:', videoId);
      return null;
    }
    console.error('[Player] Error fetching audio stream:', error);
    return null;
  }
}

interface ExtendedPlayerState extends PlayerState {
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  history: Video[];
}

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);
  
  const [state, setState] = useState<ExtendedPlayerState>({
    currentTrack: null,
    isPlaying: false,
    volume: 70,
    currentTime: 0,
    duration: 0,
    queue: [],
    shuffle: false,
    repeat: 'off',
    history: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = state.volume / 100;
      audioRef.current.preload = 'auto';
      
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
        const { repeat, queue, shuffle } = stateRef.current;
        
        if (repeat === 'one') {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          return;
        }
        
        if (queue.length > 0) {
          let nextIndex = 0;
          
          if (shuffle && queue.length > 1) {
            nextIndex = Math.floor(Math.random() * queue.length);
          }
          
          const newQueue = [...queue];
          const nextTrack = newQueue.splice(nextIndex, 1)[0];
          playTrackInternal(nextTrack, newQueue);
        } else if (repeat === 'all' && stateRef.current.history.length > 0) {
          const historyQueue = [...stateRef.current.history];
          const [first, ...rest] = historyQueue;
          playTrackInternal(first, rest);
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
        console.error('[Player] Audio playback error:', e);
        setState(s => ({ ...s, isPlaying: false }));
      });

      audioRef.current.addEventListener('canplay', () => {
        if (audioRef.current && !audioRef.current.paused) return;
        // Auto-play when ready
        if (isLoadingRef.current && audioRef.current) {
          audioRef.current.play().catch(() => {});
          isLoadingRef.current = false;
        }
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const playTrackInternal = useCallback(async (track: Video, newQueue?: Video[]) => {
    // Abort any previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Stop current playback immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    isLoadingRef.current = true;
    
    setState(s => ({ 
      ...s, 
      currentTrack: track, 
      isPlaying: false, 
      currentTime: 0,
      duration: 0,
      history: s.currentTrack ? [...s.history.filter(h => h.videoId !== s.currentTrack!.videoId), s.currentTrack] : s.history,
      ...(newQueue !== undefined ? { queue: newQueue } : {})
    }));
    
    try {
      const audioUrl = await getAudioStreamUrl(track.videoId, abortControllerRef.current.signal);
      
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        
        // Wait for the audio to be ready, then play
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch((err) => {
            // Ignore AbortError - it's expected when switching tracks quickly
            if (err.name !== 'AbortError') {
              console.error('[Player] Playback failed:', err);
            }
          });
        }
      } else if (!audioUrl) {
        console.error('[Player] No audio stream found for:', track.videoId);
        isLoadingRef.current = false;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[Player] Error loading track:', error);
      }
      isLoadingRef.current = false;
    }
  }, []);

  const playTrack = useCallback((track: Video) => {
    playTrackInternal(track);
  }, [playTrackInternal]);

  const playAll = useCallback((tracks: Video[], startIndex: number = 0) => {
    if (tracks.length === 0) return;
    const [first, ...rest] = tracks.slice(startIndex);
    playTrackInternal(first, rest);
  }, [playTrackInternal]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !stateRef.current.currentTrack) return;

    if (stateRef.current.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
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
    setState(s => {
      // Prevent duplicates in queue
      if (s.queue.some(t => t.videoId === track.videoId)) {
        return s;
      }
      // Also prevent adding current track
      if (s.currentTrack?.videoId === track.videoId) {
        return s;
      }
      return { ...s, queue: [...s.queue, track] };
    });
  }, []);

  const playNext = useCallback(() => {
    const { queue, shuffle } = stateRef.current;
    
    if (queue.length > 0) {
      let nextIndex = 0;
      
      if (shuffle && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      
      const newQueue = [...queue];
      const nextTrack = newQueue.splice(nextIndex, 1)[0];
      playTrackInternal(nextTrack, newQueue);
    }
  }, [playTrackInternal]);

  const playPrevious = useCallback(() => {
    const { history, currentTime } = stateRef.current;
    
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setState(s => ({ ...s, currentTime: 0 }));
      }
      return;
    }
    
    if (history.length > 0) {
      const newHistory = [...history];
      const prevTrack = newHistory.pop()!;
      setState(s => ({ ...s, history: newHistory }));
      playTrackInternal(prevTrack);
    }
  }, [playTrackInternal]);

  const toggleShuffle = useCallback(() => {
    setState(s => ({ ...s, shuffle: !s.shuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
      const currentIndex = modes.indexOf(s.repeat);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...s, repeat: modes[nextIndex] };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(s => ({ ...s, queue: [] }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(s => ({
      ...s,
      queue: s.queue.filter((_, i) => i !== index)
    }));
  }, []);

  const fetchRelatedTracks = useCallback(async (videoId: string): Promise<Video[]> => {
    try {
      const related = await getRelatedVideos(videoId);
      // Remove duplicates and current track
      const currentId = stateRef.current.currentTrack?.videoId;
      const queueIds = new Set(stateRef.current.queue.map(t => t.videoId));
      
      const unique = related.filter(v => {
        if (v.videoId === currentId) return false;
        if (queueIds.has(v.videoId)) return false;
        return true;
      });
      
      const seen = new Set<string>();
      return unique.filter(v => {
        if (seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return true;
      });
    } catch (e) {
      console.error('[Player] fetchRelatedTracks failed:', e);
      return [];
    }
  }, []);

  return {
    ...state,
    volume: state.volume / 100,
    playTrack,
    playAll,
    togglePlay,
    seek,
    setVolume,
    addToQueue,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    clearQueue,
    removeFromQueue,
    fetchRelatedTracks,
  };
}
