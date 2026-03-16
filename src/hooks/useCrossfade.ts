/**
 * Crossfade manager for dual YouTube IFrame players.
 * Creates two hidden YT players and smoothly transitions volume between them.
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { getSettings } from '@/lib/storage';

interface CrossfadeOptions {
  onTimeUpdate: (time: number, duration: number) => void;
  onStateChange: (state: number) => void;
  onError: (code: number) => void;
  onTrackTransition?: () => void;
}

// YT states
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiLoadPromise) return ytApiLoadPromise;
  ytApiLoadPromise = new Promise<void>((resolve) => {
    if ((window as any).YT?.Player) { ytApiLoaded = true; resolve(); return; }
    const existing = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => { ytApiLoaded = true; existing?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
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
  const pendingNextRef = useRef<{ videoId: string; resolve: () => void; reject: (e: Error) => void } | null>(null);

  // Create two hidden containers
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
        const time = slot.player.getCurrentTime();
        const dur = slot.player.getDuration();
        optionsRef.current.onTimeUpdate(time, dur);

        // Check if crossfade should trigger
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
    }, 250);
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) { clearInterval(timeIntervalRef.current); timeIntervalRef.current = null; }
  }, []);

  const createPlayerInSlot = useCallback(async (slot: PlayerSlot, videoId: string, startVolume: number, autoplay: boolean): Promise<void> => {
    await loadYTApi();
    const YT = (window as any).YT;

    try { slot.player?.destroy(); } catch {}

    // Recreate inner div
    const old = slot.container.querySelector(`#${slot.innerId}`);
    if (old) old.remove();
    const newDiv = document.createElement('div');
    newDiv.id = slot.innerId;
    slot.container.appendChild(newDiv);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('YT player timeout')), 15000);

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
            if (autoplay) slot.player.playVideo();
            resolve();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            // Only fire state changes for the active slot
            if (slot === getActiveSlot() && !isCrossfadingRef.current) {
              optionsRef.current.onStateChange(state);
              if (state === YT_PLAYING) startTimeUpdates();
              else if (state === YT_PAUSED || state === YT_ENDED) {
                if (state === YT_ENDED) stopTimeUpdates();
              }
            }
          },
          onError: (event: any) => {
            clearTimeout(timeout);
            if (slot === getActiveSlot()) {
              optionsRef.current.onError(event.data);
            }
            reject(new Error(`YT error: ${event.data}`));
          },
        },
      });
    });
  }, [startTimeUpdates, stopTimeUpdates]);

  const loadVideo = useCallback(async (videoId: string) => {
    const slot = getActiveSlot();
    if (!slot) return;

    isCrossfadingRef.current = false;
    crossfadeTriggeredRef.current = false;
    if (crossfadeIntervalRef.current) { clearInterval(crossfadeIntervalRef.current); crossfadeIntervalRef.current = null; }

    await createPlayerInSlot(slot, videoId, 80, true);
    startTimeUpdates();
  }, [createPlayerInSlot, startTimeUpdates]);

  // Crossfade to next track - called by usePlayer when crossfade transition triggers
  const crossfadeToNext = useCallback(async (nextVideoId: string): Promise<void> => {
    if (isCrossfadingRef.current) return;
    isCrossfadingRef.current = true;

    const currentSlot = getActiveSlot();
    const nextSlot = getInactiveSlot();
    if (!currentSlot || !nextSlot) return;

    const crossfadeDuration = 15; // seconds
    const steps = crossfadeDuration * 10; // 100ms steps
    const stepMs = 100;

    try {
      // Load next track in inactive slot at volume 0
      await createPlayerInSlot(nextSlot, nextVideoId, 0, true);

      let step = 0;
      const currentStartVol = currentSlot.player?.getVolume?.() || 80;

      return new Promise<void>((resolve) => {
        crossfadeIntervalRef.current = setInterval(() => {
          step++;
          const progress = Math.min(step / steps, 1);
          // Smooth curve: use easeInOut
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

            // Stop old player
            try { currentSlot.player?.stopVideo?.(); } catch {}

            // Swap active slot
            activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
            isCrossfadingRef.current = false;
            crossfadeTriggeredRef.current = false;

            // Fire playing state for new active
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

  const play = useCallback(() => { getActiveSlot()?.player?.playVideo?.(); }, []);
  const pause = useCallback(() => { getActiveSlot()?.player?.pauseVideo?.(); }, []);
  const seekTo = useCallback((s: number) => { getActiveSlot()?.player?.seekTo?.(s, true); }, []);
  const setVolume = useCallback((v: number) => { getActiveSlot()?.player?.setVolume?.(v); }, []);
  const getVolume = useCallback(() => getActiveSlot()?.player?.getVolume?.() ?? 80, []);
  const getCurrentTime = useCallback(() => getActiveSlot()?.player?.getCurrentTime?.() ?? 0, []);
  const getDuration = useCallback(() => getActiveSlot()?.player?.getDuration?.() ?? 0, []);
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
