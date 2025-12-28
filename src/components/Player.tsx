import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  ListMusic,
  Mic2,
  Maximize2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerContext } from '@/context/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { addFavorite, removeFavorite, isFavorite, addToHistory } from '@/lib/storage';
import { toast } from 'sonner';

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

interface PlayerProps {
  onLyricsOpen?: () => void;
}

export function Player({ onLyricsOpen }: PlayerProps) {
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    shuffle,
    repeat,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    playTrack,
  } = usePlayerContext();

  useEffect(() => {
    if (currentTrack) {
      setLiked(isFavorite(currentTrack.videoId));
      addToHistory(currentTrack);
    }
  }, [currentTrack?.videoId]);

  const handleLike = () => {
    if (!currentTrack) return;
    
    if (liked) {
      removeFavorite(currentTrack.videoId);
      toast.success('Removed from favorites');
    } else {
      addFavorite(currentTrack);
      toast.success('Added to favorites');
    }
    setLiked(!liked);
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    toast.info('Preparing download...');
    const url = `https://yt.omada.cafe/api/v1/videos/${currentTrack.videoId}?local=true`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      const audioFormat = data.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio/'));
      if (audioFormat?.url) {
        const a = document.createElement('a');
        a.href = audioFormat.url;
        a.download = `${currentTrack.title}.mp3`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download started');
      } else {
        toast.error('Download not available');
      }
    } catch {
      toast.error('Download failed');
    }
  };

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
      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 right-4 z-40 w-80 max-h-96 glass rounded-2xl p-4 shadow-2xl border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Up Next</h3>
              <span className="text-xs text-muted-foreground">{queue.length} tracks</span>
            </div>
            <div className="overflow-y-auto max-h-72 space-y-2">
              {queue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
              ) : (
                queue.map((track, index) => (
                  <div
                    key={`${track.videoId}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer group"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={getThumbnail(track)}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-all"
                    >
                      <span className="text-xs text-muted-foreground">✕</span>
                    </button>
                  </div>
                ))
              )}
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
            onClick={handleLike}
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
            <button 
              onClick={toggleShuffle}
              className={cn(
                "p-2 rounded-full transition-colors",
                shuffle ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Shuffle className="w-4 h-4" />
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
            <button 
              onClick={toggleRepeat}
              className={cn(
                "p-2 rounded-full transition-colors",
                repeat !== 'off' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {repeat === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
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

        {/* Right Controls */}
        <div className="flex items-center gap-2 w-[240px] justify-end">
          <button 
            onClick={onLyricsOpen}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            title="Full-screen lyrics"
          >
            <Maximize2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button 
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              "p-2 rounded-full transition-colors",
              showQueue ? "bg-accent text-primary" : "hover:bg-accent"
            )}
          >
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
