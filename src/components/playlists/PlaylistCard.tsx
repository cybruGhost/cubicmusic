import { motion } from 'framer-motion';
import { Play, MoreVertical, Trash2, Music2 } from 'lucide-react';
import { UserPlaylist } from '@/types/music';
import { usePlayerContext } from '@/context/PlayerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { deletePlaylist } from '@/lib/playlists';
import { toast } from 'sonner';

interface PlaylistCardProps {
  playlist: UserPlaylist;
  index: number;
  onSelect?: (playlist: UserPlaylist) => void;
  onDelete?: () => void;
}

export function PlaylistCard({ playlist, index, onSelect, onDelete }: PlaylistCardProps) {
  const { playTrack, addToQueue } = usePlayerContext();

  const handlePlay = () => {
    if (playlist.tracks.length === 0) {
      toast.error('Playlist is empty');
      return;
    }
    
    // Play first track, queue the rest
    playTrack(playlist.tracks[0]);
    playlist.tracks.slice(1).forEach(track => addToQueue(track));
    toast.success(`Playing "${playlist.name}"`);
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    toast.success(`Deleted "${playlist.name}"`);
    onDelete?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-card hover:bg-accent rounded-xl p-4 transition-all duration-300 cursor-pointer"
      onClick={() => onSelect?.(playlist)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-secondary">
        {playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform"
          >
            <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{playlist.name}</h3>
          <p className="text-sm text-muted-foreground">
            {playlist.tracks.length} tracks
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
