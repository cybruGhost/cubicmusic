import { useState, useCallback, useRef, useEffect } from 'react';
import { Video, PlayerState } from '@/types/music';
import { getRelatedVideos } from '@/lib/api';
import { useCrossfade } from './useCrossfade';
import { getSettings } from '@/lib/storage';

interface ExtendedPlayerState extends PlayerState {
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  history: Video[];
}

const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

export function usePlayer() {
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

  const playTrackInternalRef = useRef<(track: Video, newQueue?: Video[]) => void>(() => {});
  const crossfadePendingRef = useRef(false);

  const handleCrossfadeTransition = useCallback(() => {
    // Called when we're ~15s from end and crossfade is enabled
    if (crossfadePendingRef.current) return;
    const { queue, shuffle, repeat, history } = stateRef.current;

    let nextTrack: Video | null = null;
    let newQueue: Video[] = [];

    if (queue.length > 0) {
      let nextIndex = 0;
      if (shuffle && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      newQueue = [...queue];
      nextTrack = newQueue.splice(nextIndex, 1)[0];
    } else if (repeat === 'all' && history.length > 0) {
      const historyQueue = [...history];
      const [first, ...rest] = historyQueue;
      nextTrack = first;
      newQueue = rest;
    }

    if (nextTrack) {
      crossfadePendingRef.current = true;
      const track = nextTrack;

      // Update state for next track
      setState(s => ({
        ...s,
        currentTrack: track,
        currentTime: 0,
        duration: 0,
        history: s.currentTrack
          ? [...s.history.filter(h => h.videoId !== s.currentTrack!.videoId), s.currentTrack]
          : s.history,
        queue: newQueue,
      }));

      cfPlayer.crossfadeToNext(track.videoId).then(() => {
        crossfadePendingRef.current = false;
      }).catch(() => {
        crossfadePendingRef.current = false;
      });
    }
  }, []);

  const handleTrackEnded = useCallback(() => {
    const { repeat, queue, shuffle, history } = stateRef.current;

    if (repeat === 'one') {
      cfPlayer.seekTo(0);
      cfPlayer.play();
      return;
    }

    if (queue.length > 0) {
      let nextIndex = 0;
      if (shuffle && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const newQueue = [...queue];
      const nextTrack = newQueue.splice(nextIndex, 1)[0];
      playTrackInternalRef.current(nextTrack, newQueue);
    } else if (repeat === 'all' && history.length > 0) {
      const historyQueue = [...history];
      const [first, ...rest] = historyQueue;
      playTrackInternalRef.current(first, rest);
    } else {
      setState(s => ({ ...s, isPlaying: false }));
    }
  }, []);

  const cfPlayer = useCrossfade({
    onTimeUpdate: (time, duration) => {
      setState(s => ({ ...s, currentTime: time, duration }));
    },
    onStateChange: (ytState) => {
      if (ytState === YT_PLAYING) {
        setState(s => ({ ...s, isPlaying: true }));
      } else if (ytState === YT_PAUSED) {
        setState(s => ({ ...s, isPlaying: false }));
      } else if (ytState === YT_ENDED) {
        setState(s => ({ ...s, isPlaying: false }));
        if (!crossfadePendingRef.current) {
          handleTrackEnded();
        }
      }
    },
    onError: (code) => {
      console.error('[Player] YT error code:', code);
      const { queue } = stateRef.current;
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        playTrackInternalRef.current(next, rest);
      } else {
        setState(s => ({ ...s, isPlaying: false }));
      }
    },
    onTrackTransition: handleCrossfadeTransition,
  });

  const playTrackInternal = useCallback((track: Video, newQueue?: Video[]) => {
    crossfadePendingRef.current = false;
    setState(s => ({
      ...s,
      currentTrack: track,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      history: s.currentTrack
        ? [...s.history.filter(h => h.videoId !== s.currentTrack!.videoId), s.currentTrack]
        : s.history,
      ...(newQueue !== undefined ? { queue: newQueue } : {}),
    }));

    cfPlayer.loadVideo(track.videoId).catch((err) => {
      console.error('[Player] Failed to load video:', err);
      setState(s => ({ ...s, isPlaying: false }));
    });
  }, [cfPlayer]);

  playTrackInternalRef.current = playTrackInternal;

  const playTrack = useCallback((track: Video) => {
    playTrackInternal(track);
  }, [playTrackInternal]);

  const playAll = useCallback((tracks: Video[], startIndex: number = 0) => {
    if (tracks.length === 0) return;
    const sliced = tracks.slice(startIndex);
    const [first, ...rest] = sliced;
    playTrackInternal(first, rest);
  }, [playTrackInternal]);

  const togglePlay = useCallback(() => {
    if (!stateRef.current.currentTrack) return;
    if (stateRef.current.isPlaying) {
      cfPlayer.pause();
    } else {
      cfPlayer.play();
    }
  }, [cfPlayer]);

  const seek = useCallback((time: number) => {
    cfPlayer.seekTo(time);
    setState(s => ({ ...s, currentTime: time }));
  }, [cfPlayer]);

  const setVolume = useCallback((volume: number) => {
    const vol = Math.round(volume * 100);
    cfPlayer.setVolume(vol);
    setState(s => ({ ...s, volume: vol }));
  }, [cfPlayer]);

  const addToQueue = useCallback((track: Video) => {
    setState(s => {
      if (s.queue.some(t => t.videoId === track.videoId)) return s;
      if (s.currentTrack?.videoId === track.videoId) return s;
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
      cfPlayer.seekTo(0);
      setState(s => ({ ...s, currentTime: 0 }));
      return;
    }
    if (history.length > 0) {
      const newHistory = [...history];
      const prevTrack = newHistory.pop()!;
      setState(s => ({ ...s, history: newHistory }));
      playTrackInternal(prevTrack);
    }
  }, [playTrackInternal, cfPlayer]);

  const toggleShuffle = useCallback(() => {
    setState(s => ({ ...s, shuffle: !s.shuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
      const currentIndex = modes.indexOf(s.repeat);
      return { ...s, repeat: modes[(currentIndex + 1) % modes.length] };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(s => ({ ...s, queue: [] }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(s => ({
      ...s,
      queue: s.queue.filter((_, i) => i !== index),
    }));
  }, []);

  const fetchRelatedTracks = useCallback(async (videoId: string): Promise<Video[]> => {
    try {
      const related = await getRelatedVideos(videoId);
      const currentId = stateRef.current.currentTrack?.videoId;
      const queueIds = new Set(stateRef.current.queue.map(t => t.videoId));
      const seen = new Set<string>();
      return related
        .filter(v => v.videoId !== currentId && !queueIds.has(v.videoId))
        .filter(v => { if (seen.has(v.videoId)) return false; seen.add(v.videoId); return true; });
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
