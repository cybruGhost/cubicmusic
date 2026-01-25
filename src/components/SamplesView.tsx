import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Video } from '@/types/music';
import { Play, SkipForward, SkipBack, Volume2, VolumeX, Heart, Loader2, Shuffle, RefreshCw, TrendingUp, Clock, Zap, Sparkles } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { search } from '@/lib/api';
import { cn } from '@/lib/utils';
import { addFavorite, removeFavorite, getFavorites } from '@/lib/storage';

// Enhanced query system with categories and weights (no time/year references)
const SAMPLE_QUERIES = [
  // Trending & Viral (High Priority)
  { query: 'trending music', category: 'trending', weight: 5 },
  { query: 'viral hits', category: 'trending', weight: 4 },
  { query: 'popular songs', category: 'trending', weight: 5 },
  { query: 'top hits', category: 'trending', weight: 4 },
  
  // New Releases (Medium Priority)
  { query: 'new music releases', category: 'new', weight: 3 },
  { query: 'fresh tracks', category: 'new', weight: 3 },
  { query: 'just released songs', category: 'new', weight: 3 },
  
  // Genre Specific (Diversified)
  { query: 'indie rock', category: 'rock', weight: 2 },
  { query: 'hip hop new releases', category: 'hiphop', weight: 2 },
  { query: 'pop hits', category: 'pop', weight: 2 },
  { query: 'electronic dance music', category: 'electronic', weight: 2 },
  { query: 'R&B soul', category: 'rnb', weight: 2 },
  { query: 'alternative music', category: 'alternative', weight: 2 },
  { query: 'latin hits', category: 'latin', weight: 2 },
  { query: 'k-pop music', category: 'kpop', weight: 2 },
  
  // Mood & Theme (Low Priority)
  { query: 'chill vibes music', category: 'mood', weight: 1 },
  { query: 'workout motivation songs', category: 'mood', weight: 1 },
  { query: 'focus music', category: 'mood', weight: 1 },
];

// Cache for fetched samples
const sampleCache = new Map<string, { videos: Video[]; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Filter to get only songs (under 8 minutes, not playlists/mixes)
function filterSongsOnly(videos: Video[]): Video[] {
  return videos.filter(v => {
    const duration = v.lengthSeconds || 0;
    return duration > 60 && duration < 480; // 1-8 minute songs only
  });
}

// Smart query selection algorithm
function selectQueries(
  usedQueries: Set<string>,
  count: number = 4,
  avoidRecent: boolean = true
): string[] {
  // Calculate available queries with weights
  const availableQueries = SAMPLE_QUERIES
    .filter(q => !usedQueries.has(q.query))
    .map(q => ({
      ...q,
      adjustedWeight: Math.random() * q.weight // Randomize within weight range
    }))
    .sort((a, b) => b.adjustedWeight - a.adjustedWeight);

  // If we don't have enough unused queries, reset used queries and add some variety
  if (availableQueries.length < count) {
    const allQueries = [...SAMPLE_QUERIES]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(q => q.query);
    
    return allQueries;
  }

  // Select queries ensuring category diversity
  const selected: string[] = [];
  const selectedCategories = new Set<string>();
  
  // First pass: ensure category diversity
  for (const q of availableQueries) {
    if (selected.length >= count) break;
    if (!selectedCategories.has(q.category)) {
      selected.push(q.query);
      selectedCategories.add(q.category);
    }
  }
  
  // Second pass: fill remaining slots with highest weight
  for (const q of availableQueries) {
    if (selected.length >= count) break;
    if (!selected.includes(q.query)) {
      selected.push(q.query);
    }
  }
  
  return selected;
}

// Enhanced fetch with caching
async function fetchSamplesWithCache(query: string): Promise<Video[]> {
  const cached = sampleCache.get(query);
  const now = Date.now();
  
  // Return cached results if valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.videos;
  }
  
  try {
    const results = await search(query);
    const videos = filterSongsOnly(
      results.filter((r): r is Video => r.type === 'video')
    );
    
    // Cache the results
    sampleCache.set(query, {
      videos,
      timestamp: now
    });
    
    return videos;
  } catch (error) {
    console.error(`Failed to fetch ${query}:`, error);
    return [];
  }
}

// Deduplicate and shuffle with better algorithm
function processSamples(
  samples: Video[],
  existingIds: Set<string> = new Set()
): Video[] {
  // Deduplicate
  const uniqueMap = new Map<string, Video>();
  samples.forEach(v => {
    if (!existingIds.has(v.videoId) && !uniqueMap.has(v.videoId)) {
      uniqueMap.set(v.videoId, v);
    }
  });
  
  // Shuffle using Fisher-Yates algorithm
  const uniqueSamples = Array.from(uniqueMap.values());
  for (let i = uniqueSamples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueSamples[i], uniqueSamples[j]] = [uniqueSamples[j], uniqueSamples[i]];
  }
  
  return uniqueSamples;
}

export function SamplesView() {
  const [samples, setSamples] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [usedQueries, setUsedQueries] = useState<Set<string>>(new Set());
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [fetchStats, setFetchStats] = useState({ fetched: 0, unique: 0 });
  
  const { playTrack } = usePlayerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const loadMoreLock = useRef(false);
  const sampleBuffer = useRef<Video[]>([]);

  // Load favorites
  useEffect(() => {
    const favs = getFavorites();
    setFavorites(new Set(favs.map(f => f.videoId)));
  }, []);

  // Fetch initial samples with enhanced algorithm
  useEffect(() => {
    const fetchInitialSamples = async () => {
      setLoading(true);
      try {
        const initialQueries = selectQueries(new Set(), 4);
        const allSamples: Video[] = [];
        const used = new Set<string>();
        
        // Parallel fetching with rate limiting
        const fetchPromises = initialQueries.map(async (query) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500)); // Stagger requests
          return fetchSamplesWithCache(query);
        });
        
        const results = await Promise.allSettled(fetchPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allSamples.push(...result.value);
            used.add(initialQueries[index]);
          }
        });
        
        setUsedQueries(used);
        setLastFetchTime(Date.now());
        
        const processedSamples = processSamples(allSamples);
        setSamples(processedSamples);
        setFetchStats({
          fetched: allSamples.length,
          unique: processedSamples.length
        });
        
        // Pre-fetch next batch
        preloadNextBatch(processedSamples);
      } catch (error) {
        console.error('Failed to fetch samples:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSamples();
  }, []);

  // Preload next batch for smoother experience
  const preloadNextBatch = useCallback(async (currentSamples: Video[]) => {
    if (sampleBuffer.current.length > 10) return;
    
    const nextQueries = selectQueries(usedQueries, 2);
    const existingIds = new Set(currentSamples.map(s => s.videoId));
    
    try {
      const newSamples: Video[] = [];
      for (const query of nextQueries) {
        const results = await fetchSamplesWithCache(query);
        newSamples.push(...results);
      }
      
      const processed = processSamples(newSamples, existingIds);
      sampleBuffer.current = [...sampleBuffer.current, ...processed];
      
      // Update stats
      setFetchStats(prev => ({
        fetched: prev.fetched + newSamples.length,
        unique: prev.unique + processed.length
      }));
    } catch (error) {
      console.error('Preload failed:', error);
    }
  }, [usedQueries]);

  // Enhanced load more samples
  const loadMoreSamples = useCallback(async () => {
    if (loadMoreLock.current || loadingMore) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    
    try {
      let newSamples: Video[] = [];
      
      // Try to use buffer first
      if (sampleBuffer.current.length > 0) {
        newSamples = sampleBuffer.current.splice(0, 10);
      } else {
        // Fetch new samples
        const nextQueries = selectQueries(usedQueries, 3);
        const existingIds = new Set(samples.map(s => s.videoId));
        const newUsed = new Set(usedQueries);
        
        for (const query of nextQueries) {
          const results = await fetchSamplesWithCache(query);
          newSamples.push(...results);
          newUsed.add(query);
        }
        
        setUsedQueries(newUsed);
        newSamples = processSamples(newSamples, existingIds);
      }
      
      if (newSamples.length > 0) {
        setSamples(prev => [...prev, ...newSamples]);
        setLastFetchTime(Date.now());
        
        // Pre-fetch next batch
        preloadNextBatch([...samples, ...newSamples]);
      }
    } catch (error) {
      console.error('Failed to load more samples:', error);
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [loadingMore, samples, usedQueries, preloadNextBatch]);

  // Auto-load more with smarter threshold
  useEffect(() => {
    if (samples.length === 0) return;
    
    // Calculate buffer size based on sample count
    const bufferSize = Math.min(5, Math.floor(samples.length * 0.2));
    
    if (currentIndex >= samples.length - bufferSize && !loadingMore) {
      loadMoreSamples();
    }
  }, [currentIndex, samples.length, loadingMore, loadMoreSamples]);

  // Refresh samples algorithm
  const refreshSamples = useCallback(async () => {
    setLoading(true);
    try {
      // Clear cache for variety
      sampleCache.clear();
      sampleBuffer.current = [];
      
      const newQueries = selectQueries(new Set(), 4, false);
      const allSamples: Video[] = [];
      const used = new Set<string>();
      
      for (const query of newQueries) {
        const results = await fetchSamplesWithCache(query);
        allSamples.push(...results);
        used.add(query);
      }
      
      setUsedQueries(used);
      setCurrentIndex(0);
      
      const processedSamples = processSamples(allSamples);
      setSamples(processedSamples);
      setLastFetchTime(Date.now());
      
      // Pre-fetch next batch
      preloadNextBatch(processedSamples);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [preloadNextBatch]);

  const currentSample = samples[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= samples.length && !loadingMore) {
        loadMoreSamples();
        return prev; // Stay on current while loading
      }
      return Math.min(next, samples.length - 1);
    });
  }, [samples.length, loadingMore, loadMoreSamples]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleShuffle = useCallback(() => {
    if (samples.length < 2) return;
    
    const newIndex = Math.floor(Math.random() * samples.length);
    setCurrentIndex(newIndex);
  }, [samples.length]);

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

  // Optimized scroll handler
  const handleScroll = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      const delta = e.deltaY;
      const threshold = 40;
      
      if (delta > threshold) {
        handleNext();
      } else if (delta < -threshold) {
        handlePrevious();
      }
    }, 80);
  }, [handleNext, handlePrevious]);

  // Touch handling with improved gesture detection
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isVerticalSwipe = useRef(true);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isVerticalSwipe.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    // Determine if swipe is primarily vertical
    if (deltaX > deltaY * 1.5) {
      isVerticalSwipe.current = false;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isVerticalSwipe.current) return;
    
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const threshold = 60;
    
    if (deltaY > threshold) {
      handleNext();
    } else if (deltaY < -threshold) {
      handlePrevious();
    }
  };

  // Keyboard navigation with more shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch(e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          handlePrevious();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          handlePlayFull();
          break;
        case 's':
          e.preventDefault();
          handleShuffle();
          break;
        case 'r':
          e.preventDefault();
          refreshSamples();
          break;
        case 'f':
          e.preventDefault();
          toggleFavorite();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleShuffle, refreshSamples]);

  // Calculate progress indicator
  const progressIndicators = useMemo(() => {
    const visibleCount = 7;
    const startIndex = Math.max(0, currentIndex - Math.floor(visibleCount / 2));
    return Array.from({ length: Math.min(visibleCount, samples.length) }).map((_, idx) => {
      const actualIdx = startIndex + idx;
      return {
        index: actualIdx,
        isCurrent: actualIdx === currentIndex,
        isInView: actualIdx >= startIndex && actualIdx < startIndex + visibleCount
      };
    });
  }, [currentIndex, samples.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Discovering new music...</p>
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
          <button
            onClick={refreshSamples}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isFavorite = currentSample && favorites.has(currentSample.videoId);

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Music Discovery
            </h1>
            <p className="text-sm text-muted-foreground">
              Infinite streaming • {fetchStats.unique} unique songs
            </p>
          </div>
          <button
            onClick={refreshSamples}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Refresh samples"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
            <span className="font-medium text-foreground">{currentIndex + 1}</span>
            <span>/</span>
            <span className="text-xs">∞</span>
            {loadingMore && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
          </div>
          
          <button
            onClick={handleShuffle}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Sample Viewer */}
      <div 
        ref={containerRef}
        className="flex-1 relative rounded-3xl overflow-hidden bg-black min-h-0"
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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
              title={`YouTube video: ${currentSample.title}`}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

            {/* Top Info */}
            <div className="absolute top-4 left-4 right-20 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-primary/80 px-2 py-0.5 rounded-full text-white text-[10px] font-medium">
                  SAMPLE
                </span>
                {currentSample.lengthSeconds && (
                  <span className="text-white/60 text-xs">
                    {Math.floor(currentSample.lengthSeconds / 60)}:{(currentSample.lengthSeconds % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-white/40 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>{currentSample.viewCount?.toLocaleString() || 'N/A'} views</span>
              </div>
            </div>

            {/* Song Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-20 p-6 pointer-events-auto">
              <div className="mb-3">
                <h2 className="text-2xl font-bold text-white line-clamp-2 mb-1">
                  {currentSample.title}
                </h2>
                <p className="text-white/70 text-sm">
                  {currentSample.author}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayFull}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Full Song
                </button>
                
                <button
                  onClick={toggleFavorite}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    isFavorite 
                      ? "bg-red-500 text-white" 
                      : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                  )}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                </button>
              </div>
            </div>

            {/* Side Actions */}
            <div className="absolute right-3 bottom-24 flex flex-col gap-3 pointer-events-auto">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
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
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              
              <button
                onClick={handleNext}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                title="Next"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
              {progressIndicators.map((indicator) => (
                <button
                  key={indicator.index}
                  onClick={() => setCurrentIndex(indicator.index)}
                  className={cn(
                    "w-1.5 rounded-full transition-all",
                    indicator.isCurrent 
                      ? "h-8 bg-primary" 
                      : "h-2 bg-white/30 hover:bg-white/50",
                    !indicator.isInView && "opacity-0"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Controls */}
      <div className="flex items-center justify-between mt-3 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          Scroll or use ↑↓ keys • Space to play • S to shuffle • F to favorite
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Updated {Math.floor((Date.now() - lastFetchTime) / 60000)}m ago</span>
        </div>
      </div>
    </div>
  );
}
