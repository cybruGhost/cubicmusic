import React, { createContext, useContext, ReactNode } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { Video } from '@/types/music';
import { searchVideos } from '@/lib/api';

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
  addToQueueMultiple: (tracks: Video[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  getNextTrack: () => Video | null;
  getPreviousTrack: () => Video | null;
  skipToIndex: (index: number) => void;
  setQueue: (tracks: Video[]) => void;
  fetchRelatedTracks: (videoId: string) => Promise<Video[]>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();

  // Add related tracks fetching function (keep this separate)
  const fetchRelatedTracks = async (videoId: string): Promise<Video[]> => {
    try {
      const currentTrack = player.currentTrack;
      if (!currentTrack) return [];
      
      // Construct search query
      const searchTerms = [
        currentTrack.title,
        currentTrack.author,
        'music',
        'song'
      ].filter(Boolean);
      
      const commonWords = ['official', 'video', 'lyrics', 'audio', 'hq', 'hd'];
      const query = searchTerms
        .map(term => term.toLowerCase())
        .filter(term => !commonWords.some(word => term.includes(word)))
        .join(' ')
        .slice(0, 100);
      
      if (!query.trim()) return [];
      
      const results = await searchVideos(query);
      
      const filteredResults = results.filter(track => 
        track.videoId !== videoId && 
        !player.queue.some(q => q.videoId === track.videoId)
      );
      
      const sortedResults = filteredResults.sort((a, b) => {
        const durationDiffA = Math.abs((a.duration || 0) - (currentTrack.duration || 0));
        const durationDiffB = Math.abs((b.duration || 0) - (currentTrack.duration || 0));
        
        if (durationDiffA !== durationDiffB) {
          return durationDiffA - durationDiffB;
        }
        
        return (b.viewCount || 0) - (a.viewCount || 0);
      });
      
      return sortedResults.slice(0, 10);
    } catch (error) {
      console.error('Error fetching related tracks:', error);
      return [];
    }
  };

  const contextValue: PlayerContextType = {
    ...player,
    fetchRelatedTracks,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
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
