import { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  ListMusic,
  ChevronUp,
  X,
  Mic2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerContext } from '@/context/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { LyricsDisplay } from './lyrics/LyricsDisplay';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getThumbnail(video: { videoThumbnails?: { url: string; width: number }[] }): string {
  const thumbnail = video.videoThumbnails?.find(t => t.width >= 120) || video.videoThumbnails?.[0];
  if (!thumbnail) return '';
  return thumbnail.url.startsWith('//') ? `https:${thumbnail.url}` : thumbnail.url;
}

export function Player() {
  const [showLyrics, setShowLyrics] = useState(false);
  const [liked, setLiked] = useState(false);
  
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
  } = usePlayerContext();

  if (!currentTrack) {
    return (
      <div className="player-glass h-20 flex items-center justify-center text-muted-foreground text-sm">
        <Mic2 className="w-5 h-5 mr-2 opacity-50" />
        Select a track to start playing
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Lyrics Panel */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-2xl px-4"
          >
            <div className="glass rounded-2xl p-6 shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    <img
                      src={getThumbnail(currentTrack)}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{currentTrack.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentTrack.author}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLyrics(false)}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <LyricsDisplay videoId={currentTrack.videoId} currentTime={currentTime} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Bar */}
      <div className="player-glass h-24 px-4 flex items-center gap-4 relative z-50">
        {/* Track Info */}
        <div className="flex items-center gap-3 w-[280px] min-w-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg group">
            <img
              src={getThumbnail(currentTrack)}
              alt={currentTrack.title}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300",
                isPlaying && "group-hover:scale-110"
              )}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-primary rounded-full"
                      animate={{ height: [8, 16, 8] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.author}
            </p>
          </div>
          <button 
            onClick={() => setLiked(!liked)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <Heart className={cn(
              "w-4 h-4 transition-colors",
              liked ? "text-primary fill-primary" : "text-muted-foreground hover:text-primary"
            )} />
          </button>
        </div>

        {/* Player Controls */}
        <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-accent rounded-full transition-colors">
              <Shuffle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button 
              onClick={playPrevious}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <SkipBack className="w-5 h-5 text-foreground fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-background fill-current" />
              ) : (
                <Play className="w-5 h-5 text-background fill-current ml-0.5" />
              )}
            </button>
            <button 
              onClick={playNext}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <SkipForward className="w-5 h-5 text-foreground fill-current" />
            </button>
            <button className="p-2 hover:bg-accent rounded-full transition-colors">
              <Repeat className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right font-medium">
              {formatTime(currentTime)}
            </span>
            <div 
              className="progress-track flex-1"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seek(percent * duration);
              }}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume, Lyrics & Queue */}
        <div className="flex items-center gap-2 w-[200px] justify-end">
          <button 
            onClick={() => setShowLyrics(!showLyrics)}
            className={cn(
              "p-2 hover:bg-accent rounded-full transition-colors",
              showLyrics && "bg-accent text-primary"
            )}
          >
            <Mic2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <ListMusic className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="p-1"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              className="w-24"
              onValueChange={([value]) => setVolume(value / 100)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
