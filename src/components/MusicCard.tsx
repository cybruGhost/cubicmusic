import { useState, useEffect } from 'react';
import { Play, MoreVertical, Plus, ListPlus, Heart } from 'lucide-react';
import { Video, UserPlaylist } from '@/types/music';
import { usePlayerContext } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { getPlaylists, addTrackToPlaylist } from '@/lib/playlists';
import { addFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B plays`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M plays`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K plays`;
  return `${views} plays`;
}

function getThumbnail(video: Video): string {
  // Prioritize direct YouTube thumbnail
  if (video.videoId) {
    return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
  }
  
  const thumbnail = video.videoThumbnails?.find(t => t.width >= 320 && t.width <= 720) 
    || video.videoThumbnails?.find(t => t.width >= 120)
    || video.videoThumbnails?.[0];
  
  if (!thumbnail?.url) return '';
  
  let url = thumbnail.url;
  if (url.startsWith('//')) url = `https:${url}`;
  return url;
}

export function MusicCard({ video, variant = 'default' }: MusicCardProps) {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayerContext();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [liked, setLiked] = useState(false);
  const isCurrentTrack = currentTrack?.videoId === video.videoId;

  useEffect(() => {
    setPlaylists(getPlaylists());
    setLiked(isFavorite(video.videoId));
  }, [video.videoId]);

  const handlePlay = () => playTrack(video);

  const handleAddToPlaylist = (playlist: UserPlaylist) => {
    addTrackToPlaylist(playlist.id, video);
    setPlaylists(getPlaylists()); // Refresh playlists
    toast.success(`Added to "${playlist.name}"`);
  };

  const handleAddToQueue = () => {
    addToQueue(video);
    toast.success('Added to queue');
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      removeFavorite(video.videoId);
      toast.success('Removed from favorites');
    } else {
      addFavorite(video);
      toast.success('Added to favorites');
    }
    setLiked(!liked);
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
              e.currentTarget.src = `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", isCurrentTrack ? "text-primary" : "text-foreground")}>{video.title}</p>
          <p className="text-xs text-muted-foreground truncate">{video.author}</p>
        </div>
        <button
          onClick={handleLike}
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
        <span className="text-xs text-muted-foreground">{formatDuration(video.lengthSeconds)}</span>
      </div>
    );
  }

  return (
    <div className="music-card animate-fade-in group" onClick={handlePlay}>
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-secondary">
        <img 
          src={getThumbnail(video)} 
          alt={video.title} 
          className="w-full h-full object-cover transition-transform duration-300" 
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
          }}
        />
        <div className="music-card-overlay">
          <button className="play-button">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-foreground">{formatDuration(video.lengthSeconds)}</div>
        {isCurrentTrack && isPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-primary rounded-full text-xs text-primary-foreground font-medium">Now Playing</div>
        )}
        <button
          onClick={handleLike}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
        >
          <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-white")} />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-medium text-sm line-clamp-2 leading-tight mb-1", isCurrentTrack ? "text-primary" : "text-foreground")}>{video.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{video.author}</p>
          {video.viewCount > 0 && <p className="text-xs text-muted-foreground mt-0.5">{formatViews(video.viewCount)}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded-full hover:bg-accent opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleAddToQueue}>
              <Plus className="w-4 h-4 mr-2" /> Add to Queue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLike}>
              <Heart className={cn("w-4 h-4 mr-2", liked && "fill-primary text-primary")} /> 
              {liked ? 'Remove from Favorites' : 'Add to Favorites'}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><ListPlus className="w-4 h-4 mr-2" /> Add to Playlist</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {playlists.length === 0 ? (
                  <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
                ) : (
                  playlists.map((pl) => (
                    <DropdownMenuItem key={pl.id} onClick={() => handleAddToPlaylist(pl)}>{pl.name}</DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
