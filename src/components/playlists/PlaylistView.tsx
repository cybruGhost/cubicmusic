import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Shuffle, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { UserPlaylist, Video } from '@/types/music';
import { usePlayerContext } from '@/context/PlayerContext';
import { removeTrackFromPlaylist, savePlaylist } from '@/lib/playlists';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface PlaylistViewProps {
  playlist: UserPlaylist;
  onBack: () => void;
  onUpdate: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getThumbnail(video: Video): string {
  const thumb = video.videoThumbnails?.find(t => t.width >= 120) || video.videoThumbnails?.[0];
  if (!thumb) return '';
  return thumb.url.startsWith('//') ? `https:${thumb.url}` : thumb.url;
}

export function PlaylistView({ playlist, onBack, onUpdate }: PlaylistViewProps) {
  const { playTrack, addToQueue } = usePlayerContext();
  const [tracks, setTracks] = useState(playlist.tracks);

  useEffect(() => {
    setTracks(playlist.tracks);
  }, [playlist]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    playTrack(tracks[0]);
    tracks.slice(1).forEach(track => addToQueue(track));
    toast.success(`Playing "${playlist.name}"`);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
    shuffled.slice(1).forEach(track => addToQueue(track));
    toast.success(`Shuffling "${playlist.name}"`);
  };

  const handleRemoveTrack = (videoId: string) => {
    removeTrackFromPlaylist(playlist.id, videoId);
    setTracks(tracks.filter(t => t.videoId !== videoId));
    onUpdate();
    toast.success('Track removed');
  };

  const totalDuration = tracks.reduce((sum, t) => sum + (t.lengthSeconds || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-48 h-48 rounded-xl overflow-hidden bg-secondary flex-shrink-0 shadow-xl">
          {playlist.thumbnail ? (
            <img
              src={playlist.thumbnail}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 py-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Playlist</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-muted-foreground mt-2">{playlist.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            {tracks.length} tracks • {Math.floor(totalDuration / 60)} min
          </p>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={handlePlayAll} className="gap-2" disabled={tracks.length === 0}>
              <Play className="w-4 h-4 fill-current" />
              Play All
            </Button>
            <Button variant="outline" onClick={handleShuffle} className="gap-2" disabled={tracks.length === 0}>
              <Shuffle className="w-4 h-4" />
              Shuffle
            </Button>
          </div>
        </div>
      </div>
      
      {/* Track List */}
      <div className="space-y-1">
        {tracks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>This playlist is empty</p>
            <p className="text-sm mt-1">Add tracks from search results</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <motion.div
              key={track.videoId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              onClick={() => playTrack(track)}
            >
              <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">
                {index + 1}
              </span>
              <Play className="w-4 h-4 hidden group-hover:block text-foreground" />
              
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                <img
                  src={getThumbnail(track)}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.author}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {track.lengthSeconds ? formatDuration(track.lengthSeconds) : '--:--'}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTrack(track.videoId);
                    }} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
