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
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    volume: 70,
    currentTime: 0,
    duration: 0,
    queue: [],
  });

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsAPIReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
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
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
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

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!isAPIReady || playerRef.current) return;

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
          playerRef.current.setVolume(state.volume);
        },
        onStateChange: (event: any) => {
          const playerState = event.data;
          // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3
          if (playerState === 0) {
            // Video ended
            setState(prev => ({ ...prev, isPlaying: false }));
            playNextTrack();
          } else if (playerState === 1) {
            // Playing
            setState(prev => ({ 
              ...prev, 
              isPlaying: true,
              duration: playerRef.current.getDuration() || 0
            }));
          } else if (playerState === 2) {
            // Paused
            setState(prev => ({ ...prev, isPlaying: false }));
          }
        },
      },
    });
  }, [isAPIReady]);

  // Update current time periodically
  useEffect(() => {
    if (!state.isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration() || 0;
        setState(prev => ({ ...prev, currentTime, duration }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  const playNextTrack = useCallback(() => {
    setState(prev => {
      if (prev.queue.length > 0) {
        const [next, ...rest] = prev.queue;
        // Schedule the play for next tick to avoid state issues
        setTimeout(() => {
          if (playerRef.current && playerRef.current.loadVideoById) {
            playerRef.current.loadVideoById(next.videoId);
          }
        }, 0);
        return { ...prev, currentTrack: next, queue: rest, isPlaying: true };
      }
      return { ...prev, isPlaying: false };
    });
  }, []);

  const playTrack = useCallback((track: Video) => {
    if (!playerRef.current || !playerRef.current.loadVideoById) {
      console.log('Player not ready yet, waiting...');
      // Retry after a short delay if player isn't ready
      setTimeout(() => playTrack(track), 500);
      return;
    }

    playerRef.current.loadVideoById(track.videoId);
    setState(prev => ({ 
      ...prev, 
      currentTrack: track, 
      isPlaying: true,
      currentTime: 0 
    }));
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !state.currentTrack) return;

    if (state.isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [state.isPlaying, state.currentTrack]);

  const seek = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time, true);
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume * 100);
    }
    setState(prev => ({ ...prev, volume: volume * 100 }));
  }, []);

  const addToQueue = useCallback((track: Video) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const playNext = useCallback(() => {
    playNextTrack();
  }, [playNextTrack]);

  const playPrevious = useCallback(() => {
    if (playerRef.current && state.currentTime > 3) {
      playerRef.current.seekTo(0, true);
    }
  }, [state.currentTime]);

  return {
    ...state,
    volume: state.volume / 100, // Normalize to 0-1 for UI
    playTrack,
    togglePlay,
    seek,
    setVolume,
    addToQueue,
    playNext,
    playPrevious,
  };
}
