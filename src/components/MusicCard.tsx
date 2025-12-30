import { useState, useEffect } from 'react';
import { Play, MoreVertical, Plus, ListPlus, Heart, User, Download, HardDrive } from 'lucide-react';
import { Video, UserPlaylist } from '@/types/music';
import { usePlayerContext } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { getPlaylists, addTrackToPlaylist } from '@/lib/playlists';
import { addFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { cacheAudio, isCached } from '@/lib/audioCache';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface MusicCardProps {
  video: Video;
  variant?: 'default' | 'compact';
  onOpenChannel?: (artistName: string) => void;
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

const API_BASE = 'https://yt.omada.cafe/api/v1';

export function MusicCard({ video, variant = 'default', onOpenChannel }: MusicCardProps) {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayerContext();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [liked, setLiked] = useState(false);
  const [cached, setCached] = useState(false);
  const [caching, setCaching] = useState(false);
  const isCurrentTrack = currentTrack?.videoId === video.videoId;

  useEffect(() => {
    setPlaylists(getPlaylists());
    setLiked(isFavorite(video.videoId));
    isCached(video.videoId).then(setCached);
  }, [video.videoId]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTrack(video);
  };

  const handleAddToPlaylist = (playlist: UserPlaylist) => {
    addTrackToPlaylist(playlist.id, video);
    setPlaylists(getPlaylists());
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

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenChannel) {
      onOpenChannel(video.author);
    }
  };

  const handleCache = async () => {
    if (caching || cached) return;
    
    setCaching(true);
    toast.info('Caching for offline...');
    
    try {
      const response = await fetch(`${API_BASE}/videos/${video.videoId}?local=true`);
      const data = await response.json();
      
      const audioFormat = data.adaptiveFormats?.find((f: any) => 
        f.type?.startsWith('audio/')
      );
      
      if (audioFormat?.url) {
        const success = await cacheAudio(video, audioFormat.url);
        if (success) {
          setCached(true);
          toast.success('Saved for offline listening!');
        } else {
          throw new Error('Cache failed');
        }
      } else {
        throw new Error('No audio found');
      }
    } catch (error) {
      toast.error('Failed to cache audio');
    } finally {
      setCaching(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={handlePlay}
        className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200",
          "hover:bg-accent/80 group border border-transparent hover:border-border/50",
          isCurrentTrack && "bg-accent border-primary/30"
        )}
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary shadow-md">
          <img 
            src={getThumbnail(video)} 
            alt={video.title} 
            className="w-full h-full object-cover" 
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white fill-current" />
          </div>
          {cached && (
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <HardDrive className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", isCurrentTrack ? "text-primary" : "text-foreground")}>{video.title}</p>
          <button
            onClick={handleArtistClick}
            className="text-xs text-muted-foreground truncate hover:text-primary transition-colors block"
          >
            {video.author}
          </button>
        </div>
        <button
          onClick={handleLike}
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(video.lengthSeconds)}</span>
      </div>
    );
  }

  return (
    <div className="group relative" onClick={handlePlay}>
      <div className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
        "bg-card border border-border/30 hover:border-primary/30",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      )}>
        {/* Thumbnail */}
        <div className="relative aspect-square overflow-hidden">
          <img 
            src={getThumbnail(video)} 
            alt={video.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
            }}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-300">
                <Play className="w-6 h-6 fill-current text-primary-foreground ml-0.5" />
              </button>
            </div>
          </div>
          
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded-md text-xs text-white font-medium tabular-nums backdrop-blur-sm">
            {formatDuration(video.lengthSeconds)}
          </div>
          
          {/* Now playing indicator */}
          {isCurrentTrack && isPlaying && (
            <div className="absolute top-2 left-2 px-2.5 py-1 bg-primary rounded-full text-xs text-primary-foreground font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
              </span>
              Playing
            </div>
          )}
          
          {/* Cached indicator */}
          {cached && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm">
              <HardDrive className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          
          {/* Like button */}
          <button
            onClick={handleLike}
            className="absolute top-2 left-2 p-2 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 hover:scale-110"
          >
            <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-white")} />
          </button>
        </div>
        
        {/* Info */}
        <div className="p-3">
          <h3 className={cn(
            "font-semibold text-sm line-clamp-2 leading-tight mb-1.5",
            isCurrentTrack ? "text-primary" : "text-foreground"
          )}>
            {video.title}
          </h3>
          
          <button
            onClick={handleArtistClick}
            className="text-xs text-muted-foreground truncate hover:text-primary transition-colors flex items-center gap-1 group/artist"
          >
            <User className="w-3 h-3 opacity-0 group-hover/artist:opacity-100 transition-opacity" />
            {video.author}
          </button>
          
          {video.viewCount > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1">{formatViews(video.viewCount)}</p>
          )}
        </div>
      </div>
      
      {/* Menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-2 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80">
              <MoreVertical className="w-4 h-4 text-white" />
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleArtistClick}>
              <User className="w-4 h-4 mr-2" /> View Artist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCache} disabled={caching || cached}>
              <Download className={cn("w-4 h-4 mr-2", caching && "animate-pulse")} /> 
              {cached ? 'Already Cached' : caching ? 'Caching...' : 'Save Offline'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
