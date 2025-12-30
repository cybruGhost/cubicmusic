import React, { createContext, useContext, ReactNode } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { Video } from '@/types/music';

interface PlayerContextType {
  currentTrack: Video | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Video[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  history: Video[];
  playTrack: (track: Video) => void;
  playAll: (tracks: Video[], startIndex?: number) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: Video) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  fetchRelatedTracks: (videoId: string) => Promise<Video[]>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();

  return (
    <PlayerContext.Provider value={player}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayerContext must be used within a PlayerProvider');
  }
  return context;
}
