import { useState, useEffect } from 'react';
import { X, Music, Users, Play, ExternalLink, Plus, UserPlus, UserCheck, Heart, ListPlus, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchVideos } from '@/lib/api';
import { Video } from '@/types/music';
import { toast } from 'sonner';
import { usePlayerContext } from '@/context/PlayerContext';
import { isFollowingArtist, followArtist, unfollowArtist } from '@/lib/followedArtists';
import { addFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { Button } from '@/components/ui/button';

interface ChannelInfoProps {
  artistName: string;
  onClose: () => void;
}

export function ChannelInfo({ artistName, onClose }: ChannelInfoProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const { playTrack, playAll, addToQueue } = usePlayerContext();

  useEffect(() => {
    setFollowing(isFollowingArtist(artistName));
  }, [artistName]);

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        setLoading(true);
        const searchResults = await searchVideos(artistName);
        const artistVideos = searchResults.filter(video => 
          video.author?.toLowerCase().includes(artistName.toLowerCase())
        );
        setVideos(artistVideos.slice(0, 20));
      } catch (error) {
        console.error('Error fetching channel data:', error);
        toast.error('Failed to load channel data');
      } finally {
        setLoading(false);
      }
    };
    fetchChannelData();
  }, [artistName]);

  const handleToggleFollow = () => {
    if (following) {
      unfollowArtist(artistName);
      setFollowing(false);
      toast.success(`Unfollowed ${artistName}`);
    } else {
      followArtist({
        name: artistName,
        thumbnail: videos[0] ? `https://i.ytimg.com/vi/${videos[0].videoId}/mqdefault.jpg` : undefined,
        followedAt: Date.now(),
      });
      setFollowing(true);
      toast.success(`Following ${artistName}`);
    }
  };

  const handlePlayTrack = (video: Video) => {
    playTrack(video);
  };

  const handleAddToQueue = (video: Video) => {
    addToQueue(video);
    toast.success('Added to queue');
  };

  const handleToggleFav = (video: Video) => {
    if (isFavorite(video.videoId)) {
      removeFavorite(video.videoId);
      toast.success('Removed from favorites');
    } else {
      addFavorite(video);
      toast.success('Added to favorites');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl max-h-[85vh] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{artistName}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  {videos.length} tracks
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Artist
                </span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={handleToggleFollow}
                  variant={following ? 'secondary' : 'default'}
                  size="sm"
                  className="gap-2"
                >
                  {following ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>
                {videos.length > 0 && (
                  <Button
                    onClick={() => playAll(videos)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Play All
                  </Button>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading {artistName}'s tracks...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {videos.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No tracks found for {artistName}</p>
                  </div>
                ) : (
                  videos.map((video, index) => (
                    <div
                      key={`${video.videoId}-${index}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <span className="text-xs text-muted-foreground w-5 text-right">{index + 1}</span>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handlePlayTrack(video)}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-5 h-5 text-white fill-current" />
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(video)}>
                        <p className="font-medium text-sm truncate text-foreground">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDuration(video.lengthSeconds)}</span>
                          {video.viewCount > 0 && (
                            <span>• {formatViews(video.viewCount)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleFav(video)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          title="Favorite"
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(video.videoId) ? 'fill-primary text-primary' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleAddToQueue(video)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          title="Add to queue"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}
