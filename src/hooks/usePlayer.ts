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

async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/videos/${videoId}?local=true`);
    if (!response.ok) throw new Error('Failed to fetch video info');
    
    const data = await response.json();
    
    const adaptiveFormats: AudioFormat[] = data.adaptiveFormats || [];
    const audioFormats = adaptiveFormats.filter(f => f.type?.startsWith('audio/'));
    
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
    console.error('Error fetching audio stream:', error);
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
  const queueIndexRef = useRef<number>(-1);
  
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
            audioRef.current.play().catch(console.error);
          }
          return;
        }
        
        if (queue.length > 0) {
          let nextIndex: number;
          
          if (shuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
          } else {
            nextIndex = 0;
          }
          
          const [next, ...rest] = queue;
          if (shuffle && queue.length > 1) {
            const shuffledQueue = [...queue];
            const selectedTrack = shuffledQueue.splice(nextIndex, 1)[0];
            playTrackInternal(selectedTrack, shuffledQueue);
          } else {
            playTrackInternal(next, rest);
          }
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
      history: s.currentTrack ? [...s.history.filter(h => h.videoId !== s.currentTrack!.videoId), s.currentTrack] : s.history,
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
      const unique = related.filter(v => v.videoId !== currentId);
      const seen = new Set<string>();
      return unique.filter(v => {
        if (seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return true;
      });
    } catch (e) {
      console.error('fetchRelatedTracks failed:', e);
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
