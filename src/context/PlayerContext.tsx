import React, { createContext, useContext, ReactNode, useCallback } from 'react';
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
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  // New functions needed
  fetchRelatedTracks: (videoId: string) => Promise<Video[]>;
  addToQueueMultiple: (tracks: Video[]) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  getNextTrack: () => Video | null;
  getPreviousTrack: () => Video | null;
  skipToIndex: (index: number) => void;
  setQueue: (tracks: Video[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  
  // Add related tracks fetching function
  const fetchRelatedTracks = useCallback(async (videoId: string): Promise<Video[]> => {
    try {
      // First get the current track details to use for search
      const currentTrack = player.currentTrack;
      if (!currentTrack) return [];
      
      // Construct search query based on track info
      const searchTerms = [
        currentTrack.title,
        currentTrack.author,
        'music',
        'song'
      ].filter(Boolean);
      
      // Remove common words that might reduce relevance
      const commonWords = ['official', 'video', 'lyrics', 'audio', 'hq', 'hd'];
      const query = searchTerms
        .map(term => term.toLowerCase())
        .filter(term => !commonWords.some(word => term.includes(word)))
        .join(' ')
        .slice(0, 100); // Limit query length
      
      if (!query.trim()) return [];
      
      // Search for similar tracks
      const results = await searchVideos(query);
      
      // Filter out current track and duplicates
      const filteredResults = results.filter(track => 
        track.videoId !== videoId && 
        !player.queue.some(q => q.videoId === track.videoId)
      );
      
      // Sort by relevance (views, duration similarity)
      const sortedResults = filteredResults.sort((a, b) => {
        // Prioritize tracks with similar duration
        const durationDiffA = Math.abs((a.duration || 0) - (currentTrack.duration || 0));
        const durationDiffB = Math.abs((b.duration || 0) - (currentTrack.duration || 0));
        
        if (durationDiffA !== durationDiffB) {
          return durationDiffA - durationDiffB; // Lower difference first
        }
        
        // Then by views
        return (b.viewCount || 0) - (a.viewCount || 0);
      });
      
      return sortedResults.slice(0, 10); // Return top 10
    } catch (error) {
      console.error('Error fetching related tracks:', error);
      return [];
    }
  }, [player.currentTrack, player.queue]);
  
  // Add multiple tracks to queue
  const addToQueueMultiple = useCallback((tracks: Video[]) => {
    tracks.forEach(track => player.addToQueue(track));
  }, [player.addToQueue]);
  
  // Move item in queue
  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    const newQueue = [...player.queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedItem);
    player.setQueue(newQueue);
  }, [player.queue, player.setQueue]);
  
  // Get next track in queue
  const getNextTrack = useCallback(() => {
    if (player.queue.length === 0) return null;
    
    if (player.shuffle) {
      // Get random track from queue
      const availableTracks = player.queue.filter(track => 
        track.videoId !== player.currentTrack?.videoId
      );
      if (availableTracks.length === 0) return player.queue[0];
      return availableTracks[Math.floor(Math.random() * availableTracks.length)];
    }
    
    // Get next track in order
    if (player.currentTrack) {
      const currentIndex = player.queue.findIndex(
        track => track.videoId === player.currentTrack?.videoId
      );
      if (currentIndex !== -1 && currentIndex < player.queue.length - 1) {
        return player.queue[currentIndex + 1];
      }
    }
    
    return player.queue[0] || null;
  }, [player.currentTrack, player.queue, player.shuffle]);
  
  // Get previous track
  const getPreviousTrack = useCallback(() => {
    if (player.history.length === 0) return null;
    return player.history[player.history.length - 1];
  }, [player.history]);
  
  // Skip to specific index in queue
  const skipToIndex = useCallback((index: number) => {
    if (index >= 0 && index < player.queue.length) {
      player.playTrack(player.queue[index]);
    }
  }, [player.queue, player.playTrack]);
  
  // Set entire queue
  const setQueue = useCallback((tracks: Video[]) => {
    // Implementation depends on your usePlayer hook
    // If your usePlayer doesn't have setQueue, you might need to clear and add
    player.clearQueue();
    tracks.forEach(track => player.addToQueue(track));
  }, [player.clearQueue, player.addToQueue]);
  
  // Combine all context values
  const contextValue: PlayerContextType = {
    ...player,
    fetchRelatedTracks,
    addToQueueMultiple,
    moveQueueItem,
    getNextTrack,
    getPreviousTrack,
    skipToIndex,
    setQueue,
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
