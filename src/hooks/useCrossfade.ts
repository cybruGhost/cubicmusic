/**
 * Crossfade manager for dual YouTube IFrame players.
 * Creates two hidden YT players and smoothly transitions volume between them.
 * Includes retry logic for reliability.
 */
import { useCallback, useRef, useEffect } from 'react';
import { getSettings } from '@/lib/storage';

interface CrossfadeOptions {
  onTimeUpdate: (time: number, duration: number) => void;
  onStateChange: (state: number) => void;
  onError: (code: number) => void;
  onTrackTransition?: () => void;
}

const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiLoadPromise) return ytApiLoadPromise;
  ytApiLoadPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).YT?.Player) { ytApiLoaded = true; resolve(); return; }
    const existing = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => { ytApiLoaded = true; existing?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        ytApiLoadPromise = null;
        reject(new Error('Failed to load YT API'));
      };
      document.head.appendChild(tag);
    }
    // Timeout fallback
    setTimeout(() => {
      if (!ytApiLoaded) {
        ytApiLoadPromise = null;
        reject(new Error('YT API load timeout'));
      }
    }, 20000);
  });
  return ytApiLoadPromise;
}

interface PlayerSlot {
  player: any;
  container: HTMLDivElement;
  innerId: string;
  videoId: string | null;
  volume: number;
}

export function useCrossfade(options: CrossfadeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const activeSlotRef = useRef<'A' | 'B'>('A');
  const slotsRef = useRef<{ A: PlayerSlot | null; B: PlayerSlot | null }>({ A: null, B: null });
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCrossfadingRef = useRef(false);
  const crossfadeTriggeredRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const createSlot = (id: string): PlayerSlot => {
      const div = document.createElement('div');
      div.id = `yt-cf-${id}-container`;
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
      const inner = document.createElement('div');
      inner.id = `yt-cf-${id}`;
      div.appendChild(inner);
      document.body.appendChild(div);
      return { player: null, container: div, innerId: `yt-cf-${id}`, videoId: null, volume: 80 };
    };

    slotsRef.current.A = createSlot('A');
    slotsRef.current.B = createSlot('B');

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
      try { slotsRef.current.A?.player?.destroy(); } catch {}
      try { slotsRef.current.B?.player?.destroy(); } catch {}
      slotsRef.current.A?.container.remove();
      slotsRef.current.B?.container.remove();
    };
  }, []);

  const getActiveSlot = () => slotsRef.current[activeSlotRef.current];
  const getInactiveSlot = () => slotsRef.current[activeSlotRef.current === 'A' ? 'B' : 'A'];

  const startTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      const slot = getActiveSlot();
      if (slot?.player?.getCurrentTime) {
        try {
          const time = slot.player.getCurrentTime();
          const dur = slot.player.getDuration();
          if (typeof time === 'number' && typeof dur === 'number') {
            optionsRef.current.onTimeUpdate(time, dur);

            const settings = getSettings();
            if (settings.crossfade && dur > 0 && !isCrossfadingRef.current && !crossfadeTriggeredRef.current) {
              const crossfadeDuration = 15;
              const timeLeft = dur - time;
              if (timeLeft <= crossfadeDuration && timeLeft > 0.5) {
                crossfadeTriggeredRef.current = true;
                optionsRef.current.onTrackTransition?.();
              }
            }
          }
        } catch {}
      }
    }, 250);
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) { clearInterval(timeIntervalRef.current); timeIntervalRef.current = null; }
  }, []);

  const createPlayerInSlot = useCallback(async (slot: PlayerSlot, videoId: string, startVolume: number, autoplay: boolean): Promise<void> => {
    await loadYTApi();
    const YT = (window as any).YT;

    try { slot.player?.destroy(); } catch {}

    const old = slot.container.querySelector(`#${slot.innerId}`);
    if (old) old.remove();
    const newDiv = document.createElement('div');
    newDiv.id = slot.innerId;
    slot.container.appendChild(newDiv);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('YT player timeout')), 20000);

      try {
        slot.player = new YT.Player(slot.innerId, {
          videoId,
          width: 1,
          height: 1,
          playerVars: { autoplay: autoplay ? 1 : 0, controls: 0, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3, playsinline: 1 },
          events: {
            onReady: () => {
              clearTimeout(timeout);
              slot.player.setVolume(startVolume);
              slot.volume = startVolume;
              slot.videoId = videoId;
              if (autoplay) {
                try { slot.player.playVideo(); } catch {}
              }
              retryCountRef.current = 0;
              resolve();
            },
            onStateChange: (event: any) => {
              const state = event.data;
              if (slot === getActiveSlot() && !isCrossfadingRef.current) {
                optionsRef.current.onStateChange(state);
                if (state === YT_PLAYING) startTimeUpdates();
                else if (state === YT_ENDED) stopTimeUpdates();
              }
            },
            onError: (event: any) => {
              clearTimeout(timeout);
              console.warn(`[Crossfade] YT error ${event.data} for ${videoId}`);
              if (slot === getActiveSlot()) {
                optionsRef.current.onError(event.data);
              }
              reject(new Error(`YT error: ${event.data}`));
            },
          },
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }, [startTimeUpdates, stopTimeUpdates]);

  const loadVideo = useCallback(async (videoId: string) => {
    const slot = getActiveSlot();
    if (!slot) return;

    isCrossfadingRef.current = false;
    crossfadeTriggeredRef.current = false;
    if (crossfadeIntervalRef.current) { clearInterval(crossfadeIntervalRef.current); crossfadeIntervalRef.current = null; }

    // Retry logic for reliability
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await createPlayerInSlot(slot, videoId, 80, true);
        startTimeUpdates();
        return;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Crossfade] Load attempt ${attempt + 1} failed for ${videoId}:`, err.message);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Failed to load video');
  }, [createPlayerInSlot, startTimeUpdates]);

  const crossfadeToNext = useCallback(async (nextVideoId: string): Promise<void> => {
    if (isCrossfadingRef.current) return;
    isCrossfadingRef.current = true;

    const currentSlot = getActiveSlot();
    const nextSlot = getInactiveSlot();
    if (!currentSlot || !nextSlot) return;

    const crossfadeDuration = 15;
    const steps = crossfadeDuration * 10;
    const stepMs = 100;

    try {
      await createPlayerInSlot(nextSlot, nextVideoId, 0, true);

      let step = 0;
      const currentStartVol = currentSlot.player?.getVolume?.() || 80;

      return new Promise<void>((resolve) => {
        crossfadeIntervalRef.current = setInterval(() => {
          step++;
          const progress = Math.min(step / steps, 1);
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const fadeOutVol = Math.round(currentStartVol * (1 - eased));
          const fadeInVol = Math.round(80 * eased);

          try { currentSlot.player?.setVolume?.(fadeOutVol); } catch {}
          try { nextSlot.player?.setVolume?.(fadeInVol); } catch {}

          if (step >= steps) {
            if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
            crossfadeIntervalRef.current = null;

            try { currentSlot.player?.stopVideo?.(); } catch {}

            activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
            isCrossfadingRef.current = false;
            crossfadeTriggeredRef.current = false;

            optionsRef.current.onStateChange(YT_PLAYING);
            startTimeUpdates();
            resolve();
          }
        }, stepMs);
      });
    } catch (err) {
      isCrossfadingRef.current = false;
      crossfadeTriggeredRef.current = false;
      throw err;
    }
  }, [createPlayerInSlot, startTimeUpdates]);

  const play = useCallback(() => { try { getActiveSlot()?.player?.playVideo?.(); } catch {} }, []);
  const pause = useCallback(() => { try { getActiveSlot()?.player?.pauseVideo?.(); } catch {} }, []);
  const seekTo = useCallback((s: number) => { try { getActiveSlot()?.player?.seekTo?.(s, true); } catch {} }, []);
  const setVolume = useCallback((v: number) => { try { getActiveSlot()?.player?.setVolume?.(v); } catch {} }, []);
  const getVolume = useCallback(() => { try { return getActiveSlot()?.player?.getVolume?.() ?? 80; } catch { return 80; } }, []);
  const getCurrentTime = useCallback(() => { try { return getActiveSlot()?.player?.getCurrentTime?.() ?? 0; } catch { return 0; } }, []);
  const getDuration = useCallback(() => { try { return getActiveSlot()?.player?.getDuration?.() ?? 0; } catch { return 0; } }, []);
  const destroy = useCallback(() => {
    stopTimeUpdates();
    if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
    try { slotsRef.current.A?.player?.destroy(); } catch {}
    try { slotsRef.current.B?.player?.destroy(); } catch {}
  }, [stopTimeUpdates]);

  return {
    loadVideo,
    crossfadeToNext,
    play, pause, seekTo, setVolume, getVolume, getCurrentTime, getDuration, destroy,
    isCrossfading: () => isCrossfadingRef.current,
  };
}
