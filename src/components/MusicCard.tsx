import { Play, MoreVertical } from 'lucide-react';
import { Video } from '@/types/music';
import { usePlayerContext } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';

interface MusicCardProps {
  video: Video;
  variant?: 'default' | 'compact';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (!views) return '';
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B plays`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M plays`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K plays`;
  }
  return `${views} plays`;
}

function getThumbnail(video: Video): string {
  // Try to find a good quality thumbnail
  const thumbnail = video.videoThumbnails?.find(t => t.width >= 320 && t.width <= 720) 
    || video.videoThumbnails?.find(t => t.width >= 120)
    || video.videoThumbnails?.[0];
  
  if (!thumbnail?.url) {
    return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
  }
  
  let url = thumbnail.url;
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }
  return url;
}

export function MusicCard({ video, variant = 'default' }: MusicCardProps) {
  const { playTrack, currentTrack, isPlaying } = usePlayerContext();
  const isCurrentTrack = currentTrack?.videoId === video.videoId;

  const handlePlay = () => {
    playTrack(video);
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={handlePlay}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200",
          "hover:bg-accent group",
          isCurrentTrack && "bg-accent"
        )}
      >
        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-secondary">
          <img
            src={getThumbnail(video)}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          {isCurrentTrack && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex gap-0.5">
                <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-3 bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isCurrentTrack ? "text-primary" : "text-foreground"
          )}>
            {video.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{video.author}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDuration(video.lengthSeconds)}
        </span>
      </div>
    );
  }

  return (
    <div className="music-card animate-fade-in" onClick={handlePlay}>
      <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-secondary">
        <img
          src={getThumbnail(video)}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
          }}
        />
        <div className="music-card-overlay">
          <button className="play-button">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-foreground">
          {formatDuration(video.lengthSeconds)}
        </div>
        {isCurrentTrack && isPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-primary rounded-full text-xs text-primary-foreground font-medium">
            Now Playing
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-medium text-sm line-clamp-2 leading-tight mb-1",
            isCurrentTrack ? "text-primary" : "text-foreground"
          )}>
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{video.author}</p>
          {video.viewCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatViews(video.viewCount)}</p>
          )}
        </div>
        <button className="p-1.5 rounded-full hover:bg-accent opacity-0 group-hover:opacity-100 transition-all">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
