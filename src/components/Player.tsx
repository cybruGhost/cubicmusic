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
  Download,
  MoreVertical,
  Radio,
  Plus,
  FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerContext } from '@/context/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { addFavorite, removeFavorite, isFavorite, addToHistory } from '@/lib/storage';
import { getPlaylists, addTrackToPlaylist, createPlaylist } from '@/lib/playlists';
import { Video, UserPlaylist } from '@/types/music';
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
  onOpenChannel?: (artist: string) => void;
}

export function Player({ onLyricsOpen, onOpenChannel }: PlayerProps) {
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(() => {
    return localStorage.getItem('autoFetchEnabled') === 'true';
  });
  
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
    addToQueue,
    fetchRelatedTracks,
  } = usePlayerContext();

  useEffect(() => {
    if (currentTrack) {
      setLiked(isFavorite(currentTrack.videoId));
      addToHistory(currentTrack);
    }
  }, [currentTrack?.videoId]);

  useEffect(() => {
    setPlaylists(getPlaylists());
  }, [showPlaylistMenu]);

  useEffect(() => {
    localStorage.setItem('autoFetchEnabled', autoFetchEnabled.toString());
  }, [autoFetchEnabled]);

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
    
    try {
      // First get the download URL from API
      const apiUrl = `https://yt.omada.cafe/api/v1/videos/${currentTrack.videoId}?local=true`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      const audioFormat = data.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio/'));
      if (!audioFormat?.url) {
        toast.error('Download not available');
        return;
      }

      // Download using fetch with credentials
      const audioResponse = await fetch(audioFormat.url, {
        credentials: 'include' // Important for cookies/auth
      });
      
      if (!audioResponse.ok) throw new Error('Failed to fetch audio');
      
      const blob = await audioResponse.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${currentTrack.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    }
  };

  const handleAutoFetchToggle = async () => {
    const newState = !autoFetchEnabled;
    setAutoFetchEnabled(newState);
    
    if (newState && currentTrack) {
      // Fetch related tracks and add to queue
      toast.info('Fetching related tracks...');
      try {
        const relatedTracks = await fetchRelatedTracks(currentTrack.videoId);
        if (relatedTracks && relatedTracks.length > 0) {
          relatedTracks.forEach(track => addToQueue(track));
          toast.success(`Added ${relatedTracks.length} related tracks to queue`);
        }
      } catch (error) {
        toast.error('Failed to fetch related tracks');
      }
    }
  };

  const handleShare = () => {
    if (!currentTrack) return;
    
    const shareData = {
      title: currentTrack.title,
      text: `Listen to "${currentTrack.title}" by ${currentTrack.author}`,
      url: `${window.location.origin}/track/${currentTrack.videoId}`,
    };
    
    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast.success('Link copied to clipboard');
    }
    setShowMoreMenu(false);
  };

  const handleTrackInfo = () => {
    if (!currentTrack) return;
    
    const info = `
Title: ${currentTrack.title}
Artist: ${currentTrack.author}
Duration: ${formatTime(duration)}
Views: ${currentTrack.viewCount?.toLocaleString() || 'N/A'}
Uploaded: ${currentTrack.publishedText || 'N/A'}
    `.trim();
    
    toast.info('Track Information', {
      description: info,
      duration: 5000,
    });
    setShowMoreMenu(false);
  };

  const handleArtistClick = (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation();
    if (onOpenChannel) {
      onOpenChannel(artistName);
    } else {
      // Fallback to opening channel info component
      // You'll need to implement this modal/component
      toast.info(`Opening ${artistName}'s channel`);
    }
  };

  const handleAddToPlaylist = (playlist: UserPlaylist) => {
    if (!currentTrack) return;
    addTrackToPlaylist(playlist.id, currentTrack);
    toast.success(`Added to "${playlist.name}"`);
    setShowPlaylistMenu(false);
    setShowMoreMenu(false);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim() || !currentTrack) return;
    
    const newPlaylist = createPlaylist(newPlaylistName.trim());
    addTrackToPlaylist(newPlaylist.id, currentTrack);
    setPlaylists(getPlaylists());
    setNewPlaylistName('');
    toast.success(`Created "${newPlaylistName}" and added track`);
  };

  if (!currentTrack) {
    return (
      <div className="h-20 flex items-center justify-center text-muted-foreground text-sm bg-background/95 border-t">
        <Mic2 className="w-5 h-5 mr-2 opacity-50" />
        Select a track to start playing
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Wavy progress bar effect
  const WavyProgressBar = () => {
    return (
      <div className="relative w-full h-2 overflow-hidden rounded-full bg-secondary">
        {/* Background wave effect when playing */}
        {isPlaying && (
          <div className="absolute inset-0 wavy-progress-bg" />
        )}
        
        {/* Progress fill with wave effect */}
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          {isPlaying && (
            <div className="absolute inset-0 wavy-progress-fill" />
          )}
        </div>
        
        {/* Wave animation overlay */}
        {isPlaying && (
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 h-full wavy-overlay" 
                 style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-28 right-4 z-50 w-56 bg-popover rounded-xl p-2 shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center">↗</span>
                Share
              </button>
              <button
                onClick={handleTrackInfo}
                className="w-full flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center">ⓘ</span>
                Track Info
              </button>
              <button
                onClick={() => {
                  setShowPlaylistMenu(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add to Playlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Selection Menu */}
      <AnimatePresence>
        {showPlaylistMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-28 right-4 z-50 w-64 bg-popover rounded-xl p-3 shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Add to Playlist</h4>
              
              {/* Create new playlist */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name"
                  className="flex-1 px-3 py-1.5 text-sm bg-background border rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                />
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  Create
                </button>
              </div>
              
              {/* Existing playlists */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {playlists.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No playlists yet
                  </p>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist)}
                      className="w-full flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
                    >
                      <FolderPlus className="w-4 h-4" />
                      {playlist.name}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {playlist.tracks.length}
                      </span>
                    </button>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setShowPlaylistMenu(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground p-2"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 right-4 z-40 w-80 max-h-96 bg-popover rounded-2xl p-4 shadow-2xl border overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Up Next</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFetchToggle}
                  className={cn(
                    "flex items-center gap-1 p-1.5 text-xs rounded-lg transition-colors",
                    autoFetchEnabled
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  title="Auto-fetch similar songs"
                >
                  <Radio className="w-3 h-3" />
                  Auto
                </button>
                <span className="text-xs text-muted-foreground">{queue.length} tracks</span>
              </div>
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
                      <button
                        onClick={(e) => handleArtistClick(e, track.author)}
                        className="text-xs text-muted-foreground truncate hover:text-primary transition-colors text-left"
                      >
                        {track.author}
                      </button>
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
      <div className="h-20 px-6 flex items-center gap-6 relative z-50 bg-background/95 border-t backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-[300px] min-w-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
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
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
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
            <button
              onClick={(e) => handleArtistClick(e, currentTrack.author)}
              className="text-xs text-muted-foreground truncate hover:text-primary transition-colors text-left"
            >
              {currentTrack.author}
            </button>
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
          <div className="flex items-center gap-4">
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
              <SkipBack className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-background" />
              ) : (
                <Play className="w-5 h-5 text-background ml-0.5" />
              )}
            </button>
            <button 
              onClick={playNext}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <SkipForward className="w-5 h-5 text-foreground" />
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

          {/* Wavy Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 text-right font-medium">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1">
              <div 
                className="cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seek(percent * duration);
                }}
              >
                <WavyProgressBar />
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-10 font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 w-[280px] justify-end">
          {/* Auto-fetch Toggle */}
          <button
            onClick={handleAutoFetchToggle}
            className={cn(
              "p-2 rounded-full transition-colors",
              autoFetchEnabled
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            title="Auto-fetch similar songs"
          >
            <Radio className="w-4 h-4" />
          </button>
          
          <button 
            onClick={onLyricsOpen}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            title="Lyrics"
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
          {/* More Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "p-2 rounded-full transition-colors",
                showMoreMenu ? "bg-accent text-primary" : "hover:bg-accent"
              )}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="p-1 hover:bg-accent rounded-full"
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
