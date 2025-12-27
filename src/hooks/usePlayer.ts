import { useState, useCallback, useRef, useEffect } from 'react';
import { Video, PlayerState } from '@/types/music';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function usePlayer() {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isAPIReadyRef = useRef(false);
  const pendingTrackRef = useRef<Video | null>(null);
  
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

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isAPIReadyRef.current = true;
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      isAPIReadyRef.current = true;
      initPlayer();
    };

    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, []);

  // Create hidden container for iframe
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.id = 'youtube-player-container';
      container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(container);
      containerRef.current = container;

      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player';
      container.appendChild(playerDiv);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };
  }, []);

  const initPlayer = useCallback(() => {
    if (playerRef.current || !document.getElementById('youtube-player')) return;

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          playerRef.current.setVolume(stateRef.current.volume);
          // Play pending track if any
          if (pendingTrackRef.current) {
            const track = pendingTrackRef.current;
            pendingTrackRef.current = null;
            playerRef.current.loadVideoById(track.videoId);
            setState(s => ({ ...s, currentTrack: track, isPlaying: true, currentTime: 0 }));
          }
        },
        onStateChange: (event: any) => {
          const playerState = event.data;
          // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3
          if (playerState === 0) {
            // Video ended - play next
            const currentQueue = stateRef.current.queue;
            if (currentQueue.length > 0) {
              const [next, ...rest] = currentQueue;
              playerRef.current.loadVideoById(next.videoId);
              setState(s => ({ ...s, currentTrack: next, queue: rest, isPlaying: true, currentTime: 0 }));
            } else {
              setState(s => ({ ...s, isPlaying: false }));
            }
          } else if (playerState === 1) {
            const duration = playerRef.current?.getDuration?.() || 0;
            setState(s => ({ ...s, isPlaying: true, duration }));
          } else if (playerState === 2) {
            setState(s => ({ ...s, isPlaying: false }));
          }
        },
      },
    });
  }, []);

  // Update current time periodically
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration() || 0;
        setState(s => ({ ...s, currentTime, duration }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  const playTrack = useCallback((track: Video) => {
    if (!playerRef.current?.loadVideoById) {
      // Store pending track to play when ready
      pendingTrackRef.current = track;
      setState(s => ({ ...s, currentTrack: track, isPlaying: false, currentTime: 0 }));
      return;
    }

    playerRef.current.loadVideoById(track.videoId);
    setState(s => ({ ...s, currentTrack: track, isPlaying: true, currentTime: 0 }));
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !stateRef.current.currentTrack) return;

    if (stateRef.current.isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!playerRef.current?.seekTo) return;
    playerRef.current.seekTo(time, true);
    setState(s => ({ ...s, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const vol = Math.round(volume * 100);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(vol);
    }
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const addToQueue = useCallback((track: Video) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
  }, []);

  const playNext = useCallback(() => {
    const currentQueue = stateRef.current.queue;
    if (currentQueue.length > 0 && playerRef.current?.loadVideoById) {
      const [next, ...rest] = currentQueue;
      playerRef.current.loadVideoById(next.videoId);
      setState(s => ({ ...s, currentTrack: next, queue: rest, isPlaying: true, currentTime: 0 }));
    }
  }, []);

  const playPrevious = useCallback(() => {
    if (playerRef.current?.seekTo && stateRef.current.currentTime > 3) {
      playerRef.current.seekTo(0, true);
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
