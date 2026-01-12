import { useState, useEffect, useRef } from 'react';
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
  FolderPlus,
  Share2,
  Info
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
  const [isDownloading, setIsDownloading] = useState(false);
  
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
    playAll,
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
    if (showPlaylistMenu) {
      setPlaylists(getPlaylists());
    }
  }, [showPlaylistMenu]);

  useEffect(() => {
    localStorage.setItem('autoFetchEnabled', autoFetchEnabled.toString());
  }, [autoFetchEnabled]);

  const autoFetchLock = useRef(false);
  const lastAutoFetchKey = useRef<string | null>(null);

  // Improved Radio auto-fetch - proactively keeps queue filled
  useEffect(() => {
    if (!autoFetchEnabled || !currentTrack) return;

    // Prefetch when queue is getting low (less than 5 tracks)
    if (queue.length >= 5) return;
    
    const key = `${currentTrack.videoId}:${queue.length}`;
    if (autoFetchLock.current || lastAutoFetchKey.current === key) return;

    autoFetchLock.current = true;
    lastAutoFetchKey.current = key;

    (async () => {
      try {
        const related = await fetchRelatedTracks(currentTrack.videoId);
        if (!related.length) return;

        const existingIds = new Set<string>([
          currentTrack.videoId,
          ...queue.map(q => q.videoId),
        ]);

        // Filter to music only (1-10 min) and add up to 10 tracks
        const toAdd = related
          .filter(v => !existingIds.has(v.videoId))
          .filter(v => v.lengthSeconds > 60 && v.lengthSeconds < 600)
          .slice(0, 10);
        
        if (toAdd.length > 0) {
          toAdd.forEach(t => addToQueue(t));
          console.log(`[Radio] Added ${toAdd.length} related tracks to queue`);
        }
      } finally {
        autoFetchLock.current = false;
      }
    })().catch(() => {
      autoFetchLock.current = false;
    });
  }, [addToQueue, autoFetchEnabled, currentTrack?.videoId, fetchRelatedTracks, queue, currentTrack]);

  useEffect(() => {
    if (!autoFetchEnabled || !currentTrack) return;

    // Auto-continue after a track ends (queue empty AND we're at the end)
    if (isPlaying) return;
    if (queue.length > 0) return;
    if (!duration) return;
    if (currentTime < duration - 0.25) return; // user paused mid-track

    if (autoFetchLock.current) return;
    autoFetchLock.current = true;

    (async () => {
      try {
        const related = await fetchRelatedTracks(currentTrack.videoId);
        if (related.length > 0) {
          playAll(related, 0);
        }
      } finally {
        autoFetchLock.current = false;
      }
    })().catch(() => {
      autoFetchLock.current = false;
    });
  }, [autoFetchEnabled, currentTrack, currentTime, duration, fetchRelatedTracks, isPlaying, playAll, queue.length]);

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

  // Improved download function - fetches and downloads actual audio file
  const handleDownload = async () => {
    if (!currentTrack || isDownloading) return;
    
    setIsDownloading(true);
    toast.info('Preparing download...', { duration: 10000 });
    
    try {
      const apiUrl = `https://yt.omada.cafe/api/v1/videos/${currentTrack.videoId}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // Find best audio format - prioritize m4a/aac for better compatibility
      const audioFormats = (data.adaptiveFormats || []).filter((f: any) => 
        f.type?.startsWith('audio/')
      );
      
      // Sort by bitrate (highest first)
      audioFormats.sort((a: any, b: any) => {
        const bitrateA = parseInt(a.bitrate) || 0;
        const bitrateB = parseInt(b.bitrate) || 0;
        return bitrateB - bitrateA;
      });
      
      // Prefer m4a/mp4 audio for better compatibility
      const audioFormat = audioFormats.find((f: any) => 
        f.type?.includes('mp4') || f.container === 'm4a'
      ) || audioFormats[0];
      
      if (!audioFormat?.url) {
        throw new Error('No audio format found');
      }

      // Fetch the actual audio file
      const audioResponse = await fetch(audioFormat.url);
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio');
      }
      
      const blob = await audioResponse.blob();
      const url = URL.createObjectURL(blob);
      
      // Determine file extension
      const extension = audioFormat.container || (audioFormat.type?.includes('webm') ? 'webm' : 'm4a');
      const fileName = `${currentTrack.title.replace(/[^\w\s-]/gi, '').trim()}.${extension}`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      toast.success('Download complete!');
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      toast.error('Direct download failed. Opening in new tab...');
      window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}`, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAutoFetchToggle = async () => {
    const newState = !autoFetchEnabled;
    setAutoFetchEnabled(newState);
    
    if (newState && currentTrack) {
      toast.info('Fetching related tracks...');
      try {
        if (fetchRelatedTracks) {
          const relatedTracks = await fetchRelatedTracks(currentTrack.videoId);
          if (relatedTracks && relatedTracks.length > 0) {
            relatedTracks.forEach(track => addToQueue(track));
            toast.success(`Added ${relatedTracks.length} related tracks`);
          } else {
            toast.info('No related tracks found');
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error('Failed to fetch related tracks');
      }
    } else if (!newState) {
      toast.info('Auto-fetch disabled');
    }
  };

  const handleShare = () => {
    if (!currentTrack) return;
    
    const shareData = {
      title: currentTrack.title,
      text: `Listen to "${currentTrack.title}" by ${currentTrack.author}`,
      url: `https://www.youtube.com/watch?v=${currentTrack.videoId}`,
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
    
    toast.info(currentTrack.title, {
      description: `Artist: ${currentTrack.author}\nDuration: ${formatTime(duration)}\nViews: ${currentTrack.viewCount?.toLocaleString() || 'N/A'}`,
      duration: 3000,
    });
    setShowMoreMenu(false);
  };

  const handleArtistClick = (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation();
    if (onOpenChannel) {
      onOpenChannel(artistName);
    } else {
      toast.info(`Opening ${artistName}'s channel...`);
      // Fallback to search
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`, '_blank');
    }
  };

  const handleAddToPlaylist = (playlist: UserPlaylist) => {
    if (!currentTrack) return;
    addTrackToPlaylist(playlist.id, currentTrack);
    toast.success(`Added to "${playlist.name}"`);
    setShowPlaylistMenu(false);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim() || !currentTrack) return;
    
    const newPlaylist = createPlaylist(newPlaylistName.trim());
    addTrackToPlaylist(newPlaylist.id, currentTrack);
    setPlaylists(getPlaylists());
    setNewPlaylistName('');
    toast.success(`Created "${newPlaylistName}"`);
  };

  // Wavy progress bar component
  const WavyProgressBar = () => {
    const waveCount = 12;
    const waveElements = Array.from({ length: waveCount });
    
    return (
      <div className="relative w-full h-2 overflow-hidden rounded-full bg-secondary/50">
        {/* Base progress fill */}
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
        
        {/* Wavy overlay */}
        {isPlaying && (
          <div 
            className="absolute left-0 top-0 h-full overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 flex items-center">
              {waveElements.map((_, i) => {
                const delay = i * 0.1;
                const amplitude = 2;
                const frequency = 0.5;
                const y = Math.sin((i / waveCount) * Math.PI * 2 * frequency) * amplitude;
                
                return (
                  <motion.div
                    key={i}
                    className="absolute w-[8.33%] h-full bg-gradient-to-t from-white/30 to-transparent"
                    style={{ left: `${(i / waveCount) * 100}%` }}
                    animate={{ 
                      y: [y, -y, y],
                      opacity: [0.3, 0.7, 0.3]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: delay,
                      ease: "easeInOut"
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
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
                className="w-full flex items-center gap-3 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleTrackInfo}
                className="w-full flex items-center gap-3 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                Track Info
              </button>
              <button
                onClick={() => {
                  setShowPlaylistMenu(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
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
                  className="flex-1 px-3 py-2 text-sm bg-background border rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                />
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
              
              {/* Existing playlists */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {playlists.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No playlists yet. Create one above!
                  </p>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist)}
                      className="w-full flex items-center gap-3 p-2 text-sm hover:bg-accent rounded-lg transition-colors"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span className="flex-1 text-left">{playlist.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {playlist.tracks.length} tracks
                      </span>
                    </button>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setShowPlaylistMenu(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground p-2 hover:bg-accent rounded-lg"
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Up Next</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFetchToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors",
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
            <div className="overflow-y-auto max-h-72 space-y-2 pr-1">
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
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [4, 12, 4] }}
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
              className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
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
            <span className="text-xs text-muted-foreground w-10 text-right font-medium tabular-nums">
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
            <span className="text-xs text-muted-foreground w-10 font-medium tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 w-[280px] justify-end">
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
            disabled={isDownloading}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDownloading 
                ? "text-muted-foreground cursor-not-allowed" 
                : "hover:bg-accent"
            )}
            title="Download"
          >
            <Download className={cn(
              "w-4 h-4",
              isDownloading ? "opacity-50" : "text-muted-foreground hover:text-foreground"
            )} />
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
          
          <div className="flex items-center gap-2 ml-1">
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
