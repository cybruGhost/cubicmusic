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
  ListMusic
} from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

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
        Select a track to start playing
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-glass h-24 px-4 flex items-center gap-4">
      {/* Track Info */}
      <div className="flex items-center gap-3 w-[280px] min-w-0">
        <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 shadow-lg">
          <img
            src={getThumbnail(currentTrack)}
            alt={currentTrack.title}
            className={cn(
              "w-full h-full object-cover",
              isPlaying && "animate-pulse-glow"
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.author}
          </p>
        </div>
        <button className="p-2 hover:bg-accent rounded-full transition-colors">
          <Heart className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Shuffle className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            onClick={playPrevious}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <SkipBack className="w-5 h-5 text-foreground fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
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
            <Repeat className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
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
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Queue */}
      <div className="flex items-center gap-3 w-[200px] justify-end">
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
  );
}
