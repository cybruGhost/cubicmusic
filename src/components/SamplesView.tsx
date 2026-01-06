import { useState, useEffect, useRef } from 'react';
import { Video } from '@/types/music';
import { Play, Pause, SkipForward, Music2, Volume2, VolumeX } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { search } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Sample {
  video: Video;
  previewUrl: string;
}

export function SamplesView() {
  const [samples, setSamples] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying: playerPlaying } = usePlayerContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch trending music samples
  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      try {
        const queries = [
          'new music 2024',
          'trending songs',
          'viral music',
          'top hits today',
          'popular songs'
        ];
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        const results = await search(`${randomQuery} music`);
        const musicVideos = results
          .filter((r): r is Video => r.type === 'video')
          .slice(0, 20);
        setSamples(musicVideos);
      } catch (error) {
        console.error('Failed to fetch samples:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();
  }, []);

  const currentSample = samples[currentIndex];

  const handleNext = () => {
    if (currentIndex < samples.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(samples.length - 1);
    }
  };

  const handlePlayFull = () => {
    if (currentSample) {
      playTrack(currentSample);
    }
  };

  // Handle swipe/scroll
  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      handleNext();
    } else {
      handlePrevious();
    }
  };

  // Touch handling for mobile swipe
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading samples...</p>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <Music2 className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No samples available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Samples</h1>
          <p className="text-sm text-muted-foreground">Discover new music like short clips</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{currentIndex + 1}</span>
          <span>/</span>
          <span>{samples.length}</span>
        </div>
      </div>

      {/* Sample Viewer - Vertical Scroll */}
      <div 
        ref={containerRef}
        className="relative h-[65vh] rounded-3xl overflow-hidden bg-black"
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          {currentSample && (
            <motion.div
              key={currentSample.videoId}
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(https://i.ytimg.com/vi/${currentSample.videoId}/maxresdefault.jpg)` 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                {/* Song Info */}
                <div className="space-y-3 mb-6">
                  <h2 className="text-2xl font-bold text-white line-clamp-2">
                    {currentSample.title}
                  </h2>
                  <p className="text-white/70 text-sm">
                    {currentSample.author}
                  </p>
                  {currentSample.lengthSeconds && (
                    <p className="text-white/50 text-xs">
                      {Math.floor(currentSample.lengthSeconds / 60)}:{(currentSample.lengthSeconds % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayFull}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Play Full Song
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
                </div>
              </div>

              {/* Side Actions (like TikTok/Reels) */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-6">
                <button
                  onClick={handleNext}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                >
                  <SkipForward className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Progress Dots */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {samples.slice(0, 10).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-1.5 rounded-full transition-all",
                      idx === currentIndex 
                        ? "h-8 bg-primary" 
                        : "h-1.5 bg-white/40 hover:bg-white/60"
                    )}
                  />
                ))}
                {samples.length > 10 && (
                  <span className="text-white/40 text-xs text-center">+{samples.length - 10}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs flex items-center gap-2 pointer-events-none">
          <span>Scroll or swipe for next</span>
        </div>
      </div>

      {/* Upcoming Samples Preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Up Next</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {samples.slice(currentIndex + 1, currentIndex + 6).map((sample, idx) => (
            <button
              key={sample.videoId}
              onClick={() => setCurrentIndex(currentIndex + idx + 1)}
              className="flex-shrink-0 w-24 group"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                <img
                  src={`https://i.ytimg.com/vi/${sample.videoId}/mqdefault.jpg`}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                {sample.title}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
