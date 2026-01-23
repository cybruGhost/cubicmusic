import { useState, useEffect, useRef, useCallback } from 'react';
import { Video } from '@/types/music';
import { Play, SkipForward, SkipBack, Volume2, VolumeX, Heart, Loader2 } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { search } from '@/lib/api';
import { cn } from '@/lib/utils';
import { addFavorite, removeFavorite, getFavorites } from '@/lib/storage';

const API_BASE = 'https://yt.omada.cafe/api/v1';

// Filter to get only songs (under 8 minutes, not playlists/mixes)
function filterSongsOnly(videos: Video[]): Video[] {
  return videos.filter(v => {
    const duration = v.lengthSeconds || 0;
    return duration > 60 && duration < 480;
  });
}

// Diverse search queries to get variety
const SAMPLE_QUERIES = [
  'trending music 2024',
  'new songs 2024',
  'viral hits music',
  'popular songs today',
  'top music hits',
  'new releases music',
  'best songs 2024',
  'hit songs playlist',
  'popular music 2024',
  'trending hits',
  'new music releases',
  'viral songs 2024',
  'top 40 music',
  'chart hits songs',
  'best new music',
  'popular artists 2024',
  'new pop music',
  'new hip hop songs',
  'new r&b music',
  'new indie songs',
  'electronic music hits',
  'rock music 2024',
  'latin music hits',
  'k-pop songs 2024'
];

export function SamplesView() {
  const [samples, setSamples] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [usedQueries, setUsedQueries] = useState<Set<string>>(new Set());
  const { playTrack } = usePlayerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const loadMoreLock = useRef(false);

  // Load favorites
  useEffect(() => {
    const favs = getFavorites();
    setFavorites(new Set(favs.map(f => f.videoId)));
  }, []);

  // Fetch initial samples
  useEffect(() => {
    const fetchInitialSamples = async () => {
      setLoading(true);
      try {
        // Pick 4 random queries to start
        const shuffledQueries = [...SAMPLE_QUERIES].sort(() => Math.random() - 0.5);
        const initialQueries = shuffledQueries.slice(0, 4);
        
        const allSamples: Video[] = [];
        const used = new Set<string>();
        
        for (const query of initialQueries) {
          try {
            const results = await search(query);
            const songs = filterSongsOnly(
              results.filter((r): r is Video => r.type === 'video')
            );
            allSamples.push(...songs);
            used.add(query);
          } catch (e) {
            console.error(`Failed to fetch ${query}:`, e);
          }
        }
        
        setUsedQueries(used);
        
        // Deduplicate and shuffle
        const unique = new Map<string, Video>();
        allSamples.forEach(v => {
          if (!unique.has(v.videoId)) {
            unique.set(v.videoId, v);
          }
        });
        
        const shuffled = Array.from(unique.values()).sort(() => Math.random() - 0.5);
        setSamples(shuffled);
      } catch (error) {
        console.error('Failed to fetch samples:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSamples();
  }, []);

  // Load more samples when nearing the end
  const loadMoreSamples = useCallback(async () => {
    if (loadMoreLock.current || loadingMore) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    
    try {
      // Find unused queries
      const unusedQueries = SAMPLE_QUERIES.filter(q => !usedQueries.has(q));
      
      if (unusedQueries.length === 0) {
        // Reset and use queries again with different randomization
        setUsedQueries(new Set());
      }
      
      const shuffled = [...unusedQueries].sort(() => Math.random() - 0.5);
      const queriesToUse = shuffled.slice(0, 3);
      
      const newSamples: Video[] = [];
      const newUsed = new Set(usedQueries);
      
      for (const query of queriesToUse) {
        try {
          const results = await search(query);
          const songs = filterSongsOnly(
            results.filter((r): r is Video => r.type === 'video')
          );
          newSamples.push(...songs);
          newUsed.add(query);
        } catch (e) {
          console.error(`Failed to fetch ${query}:`, e);
        }
      }
      
      setUsedQueries(newUsed);
      
      // Deduplicate against existing samples
      const existingIds = new Set(samples.map(s => s.videoId));
      const unique = newSamples.filter(v => !existingIds.has(v.videoId));
      
      // Shuffle new samples and add
      const shuffledNew = unique.sort(() => Math.random() - 0.5);
      setSamples(prev => [...prev, ...shuffledNew]);
    } catch (error) {
      console.error('Failed to load more samples:', error);
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [loadingMore, samples, usedQueries]);

  // Auto-load more when approaching end
  useEffect(() => {
    if (samples.length === 0) return;
    
    // Load more when 5 samples away from the end
    if (currentIndex >= samples.length - 5 && !loadingMore) {
      loadMoreSamples();
    }
  }, [currentIndex, samples.length, loadingMore, loadMoreSamples]);

  const currentSample = samples[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + 1;
      // If at end and we have more samples coming, just increment
      if (next >= samples.length && !loadingMore) {
        loadMoreSamples();
      }
      return Math.min(next, samples.length - 1);
    });
  }, [samples.length, loadingMore, loadMoreSamples]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handlePlayFull = () => {
    if (currentSample) {
      playTrack(currentSample);
    }
  };

  const toggleFavorite = () => {
    if (!currentSample) return;
    
    if (favorites.has(currentSample.videoId)) {
      removeFavorite(currentSample.videoId);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(currentSample.videoId);
        return next;
      });
    } else {
      addFavorite(currentSample);
      setFavorites(prev => new Set(prev).add(currentSample.videoId));
    }
  };

  // Debounced scroll handler
  const handleScroll = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      if (e.deltaY > 30) {
        handleNext();
      } else if (e.deltaY < -30) {
        handlePrevious();
      }
    }, 100);
  }, [handleNext, handlePrevious]);

  // Touch handling for mobile swipe
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 80) {
      if (deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        handlePrevious();
      } else if (e.key === 'm') {
        setIsMuted(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Discovering samples...</p>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4">
          <Play className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No samples available</p>
        </div>
      </div>
    );
  }

  const isFavorite = currentSample && favorites.has(currentSample.videoId);

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Samples</h1>
          <p className="text-sm text-muted-foreground">Discover new songs • Infinite scroll</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
          <span className="font-medium text-foreground">{currentIndex + 1}</span>
          <span>/</span>
          <span className="text-xs">∞</span>
          {loadingMore && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
        </div>
      </div>

      {/* Main Sample Viewer */}
      <div 
        ref={containerRef}
        className="flex-1 relative rounded-3xl overflow-hidden bg-black min-h-0"
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentSample && (
          <div className="absolute inset-0">
            {/* YouTube Embed - Autoplay */}
            <iframe
              ref={iframeRef}
              key={currentSample.videoId}
              src={`https://www.youtube.com/embed/${currentSample.videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${currentSample.videoId}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ border: 'none' }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

            {/* Top Info */}
            <div className="absolute top-4 left-4 right-16">
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <span className="bg-primary/80 px-2 py-0.5 rounded-full text-white text-[10px] font-medium">
                  SAMPLE
                </span>
                {currentSample.lengthSeconds && (
                  <span>
                    {Math.floor(currentSample.lengthSeconds / 60)}:{(currentSample.lengthSeconds % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            {/* Song Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-20 p-6 pointer-events-auto">
              <h2 className="text-xl font-bold text-white line-clamp-2 mb-1">
                {currentSample.title}
              </h2>
              <p className="text-white/70 text-sm mb-4">
                {currentSample.author}
              </p>

              {/* Play Full Button */}
              <button
                onClick={handlePlayFull}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Full Song
              </button>
            </div>

            {/* Side Actions */}
            <div className="absolute right-3 bottom-24 flex flex-col gap-4 pointer-events-auto">
              <button
                onClick={toggleFavorite}
                className={cn(
                  "p-3 rounded-full transition-all",
                  isFavorite 
                    ? "bg-red-500 text-white" 
                    : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                )}
              >
                <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </button>
              
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              
              <button
                onClick={handleNext}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Progress Indicator - shows relative position */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              {Array.from({ length: Math.min(10, samples.length - Math.max(0, currentIndex - 4)) }).map((_, idx) => {
                const actualIdx = Math.max(0, currentIndex - 4) + idx;
                return (
                  <button
                    key={actualIdx}
                    onClick={() => setCurrentIndex(actualIdx)}
                    className={cn(
                      "w-1 rounded-full transition-all",
                      actualIdx === currentIndex 
                        ? "h-6 bg-primary" 
                        : "h-1 bg-white/30 hover:bg-white/50"
                    )}
                  />
                );
              })}
              {samples.length > currentIndex + 6 && (
                <div className="w-1 h-1 rounded-full bg-white/20" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Swipe Hint */}
      <p className="text-center text-muted-foreground text-xs mt-3 flex-shrink-0">
        Scroll or use ↑↓ keys • More songs load automatically
      </p>
    </div>
  );
}
