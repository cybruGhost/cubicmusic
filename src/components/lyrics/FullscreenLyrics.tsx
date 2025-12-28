import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListMusic, Zap, Music, RotateCcw, ChevronRight, Play } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { LyricsData, Video } from '@/types/music';
import { fetchLyrics } from '@/lib/lyrics';
import { SyncedLyrics } from './SyncedLyrics';
import { PlainLyrics } from './PlainLyrics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullscreenLyricsProps {
  isOpen: boolean;
  onClose: () => void;
}

function getThumbnail(video: Video): string {
  if (video.videoId) {
    return `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;
  }
  const thumbnail = video.videoThumbnails?.find(t => t.width >= 480) || video.videoThumbnails?.[0];
  if (!thumbnail?.url) return '';
  return thumbnail.url.startsWith('//') ? `https:${thumbnail.url}` : thumbnail.url;
}

export function FullscreenLyrics({ isOpen, onClose }: FullscreenLyricsProps) {
  const {
    currentTrack,
    currentTime,
    queue,
    playTrack,
  } = usePlayerContext();

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncMode, setSyncMode] = useState(true);
  const [lyricsSource, setLyricsSource] = useState<'simpmusic' | 'lrclib'>('simpmusic');

  useEffect(() => {
    if (!currentTrack?.videoId || !isOpen) return;
    
    setIsLoading(true);
    setLyrics(null);
    
    fetchLyrics(currentTrack.videoId)
      .then(data => {
        setLyrics(data);
      })
      .catch(() => setLyrics(null))
      .finally(() => setIsLoading(false));
  }, [currentTrack?.videoId, isOpen, lyricsSource]);

  const hasSyncedLyrics = !!lyrics?.syncedLyrics;
  const displayPlainLyrics = lyrics?.plainLyrics || 
    lyrics?.syncedLyrics?.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();

  if (!isOpen || !currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl scale-110"
          style={{ backgroundImage: `url(${getThumbnail(currentTrack)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />

        {/* Content */}
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold">Now Playing</h2>
            </div>
            
            {/* Lyrics Source Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Source:</span>
              <div className="flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setLyricsSource('simpmusic')}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    lyricsSource === 'simpmusic' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  SimpMusic
                </button>
                <button
                  onClick={() => setLyricsSource('lrclib')}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    lyricsSource === 'lrclib' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  LrcLib
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
            {/* Left - Album Art */}
            <div className="flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                <img
                  src={getThumbnail(currentTrack)}
                  alt={currentTrack.title}
                  className="w-64 h-64 lg:w-80 lg:h-80 rounded-2xl object-cover shadow-2xl"
                />
                <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_60px_rgba(0,0,0,0.3)]" />
              </motion.div>
              
              <div className="mt-6 text-center max-w-sm">
                <h1 className="text-xl font-bold text-foreground line-clamp-2">
                  {currentTrack.title}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {currentTrack.author}
                </p>
              </div>
            </div>

            {/* Center - Lyrics */}
            <div className="flex flex-col h-full overflow-hidden">
              {/* Lyrics Mode Toggle */}
              {hasSyncedLyrics && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant={syncMode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSyncMode(true)}
                    className="gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Synced
                  </Button>
                  <Button
                    variant={!syncMode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSyncMode(false)}
                    className="gap-1"
                  >
                    <Music className="w-3 h-3" />
                    Plain
                  </Button>
                </div>
              )}

              {/* Lyrics Content */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <RotateCcw className="w-8 h-8 animate-spin" />
                      <p className="text-sm">Loading lyrics...</p>
                    </div>
                  </div>
                ) : !lyrics ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No lyrics available</p>
                    </div>
                  </div>
                ) : syncMode && hasSyncedLyrics && lyrics.syncedLyrics ? (
                  <SyncedLyrics syncedLyrics={lyrics.syncedLyrics} currentTime={currentTime} />
                ) : displayPlainLyrics ? (
                  <PlainLyrics lyrics={displayPlainLyrics} />
                ) : null}
              </div>
            </div>

            {/* Right - Up Next */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <ListMusic className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Up Next</h3>
                <span className="text-xs text-muted-foreground">({queue.length})</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {queue.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Queue is empty</p>
                  </div>
                ) : (
                  queue.slice(0, 10).map((track, index) => (
                    <motion.div
                      key={`${track.videoId}-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 cursor-pointer group transition-colors"
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-primary" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
