/**
 * YouTube IFrame Player-based audio streaming hook.
 * Uses YouTube's own embed player for reliable audio playback,
 * hidden off-screen. Falls back to direct audio stream if YT fails.
 */

import { useCallback, useRef, useEffect } from 'react';

// Load YouTube IFrame API once
let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise<void>((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }

    const existingCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      existingCallback?.();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return ytApiLoadPromise;
}

export interface YTPlayerControls {
  loadVideo: (videoId: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void; // 0-100
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YTPlayerOptions {
  onStateChange?: (state: number) => void;
  onReady?: () => void;
  onError?: (errorCode: number) => void;
  onTimeUpdate?: (time: number, duration: number) => void;
}

export function useYTPlayer(options: YTPlayerOptions = {}): YTPlayerControls {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Create hidden container for the YT player
  useEffect(() => {
    const div = document.createElement('div');
    div.id = 'yt-audio-player-container';
    div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    const inner = document.createElement('div');
    inner.id = 'yt-audio-player';
    div.appendChild(inner);
    document.body.appendChild(div);
    containerRef.current = div;

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      try { playerRef.current?.destroy(); } catch {}
      div.remove();
    };
  }, []);

  // Start time update interval
  const startTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        optionsRef.current.onTimeUpdate?.(time, dur);
      }
    }, 250);
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  }, []);

  const loadVideo = useCallback(async (videoId: string) => {
    await loadYTApi();

    const YT = (window as any).YT;

    // Destroy existing player
    try { playerRef.current?.destroy(); } catch {}
    stopTimeUpdates();

    // Recreate the inner div
    const container = containerRef.current;
    if (container) {
      const old = container.querySelector('#yt-audio-player');
      if (old) old.remove();
      const newDiv = document.createElement('div');
      newDiv.id = 'yt-audio-player';
      container.appendChild(newDiv);
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('YT player timeout')), 15000);

      playerRef.current = new YT.Player('yt-audio-player', {
        videoId,
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            clearTimeout(timeout);
            playerRef.current.setVolume(80);
            playerRef.current.playVideo();
            startTimeUpdates();
            optionsRef.current.onReady?.();
            resolve();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            optionsRef.current.onStateChange?.(state);

            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
            if (state === 1) {
              startTimeUpdates();
            } else if (state === 2 || state === 0) {
              stopTimeUpdates();
            }
          },
          onError: (event: any) => {
            clearTimeout(timeout);
            console.error('[YTPlayer] Error code:', event.data);
            optionsRef.current.onError?.(event.data);
            reject(new Error(`YT error: ${event.data}`));
          },
        },
      });
    });
  }, [startTimeUpdates, stopTimeUpdates]);

  const play = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo?.(seconds, true);
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume?.(vol);
  }, []);

  const getVolume = useCallback(() => {
    return playerRef.current?.getVolume?.() ?? 80;
  }, []);

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() ?? 0;
  }, []);

  const getDuration = useCallback(() => {
    return playerRef.current?.getDuration?.() ?? 0;
  }, []);

  const destroy = useCallback(() => {
    stopTimeUpdates();
    try { playerRef.current?.destroy(); } catch {}
    playerRef.current = null;
  }, [stopTimeUpdates]);

  return {
    loadVideo,
    play,
    pause,
    seekTo,
    setVolume,
    getVolume,
    getCurrentTime,
    getDuration,
    destroy,
  };
}
