import { useState, useEffect } from 'react';
import { X, Music, Users, Calendar, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchVideos } from '@/lib/api';
import { Video } from '@/types/music';
import { toast } from 'sonner';
import { usePlayerContext } from '@/context/PlayerContext';

interface ChannelInfoProps {
  artistName: string;
  onClose: () => void;
}

export function ChannelInfo({ artistName, onClose }: ChannelInfoProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, addToQueue } = usePlayerContext();

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        setLoading(true);
        // Search for artist's videos
        const searchResults = await searchVideos(artistName);
        const artistVideos = searchResults.filter(video => 
          video.author?.toLowerCase().includes(artistName.toLowerCase())
        );
        setVideos(artistVideos.slice(0, 20)); // Limit to 20 videos
      } catch (error) {
        console.error('Error fetching channel data:', error);
        toast.error('Failed to load channel data');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [artistName]);

  const handlePlayTrack = (video: Video) => {
    playTrack(video);
    onClose();
  };

  const handleAddToQueue = (video: Video) => {
    addToQueue(video);
    toast.success('Added to queue');
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
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{artistName}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  {videos.length} tracks
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Artist Channel
                </span>
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
            <>
              {/* Videos List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {videos.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No tracks found for {artistName}</p>
                    </div>
                  ) : (
                    videos.map((video, index) => (
                      <div
                        key={`${video.videoId}-${index}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
                      >
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={video.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handlePlayTrack(video)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play className="w-6 h-6 text-white" />
                          </button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{video.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {video.duration ? formatDuration(video.duration) : 'N/A'}
                            </span>
                            {video.viewCount && (
                              <span className="text-xs text-muted-foreground">
                                • {video.viewCount.toLocaleString()} views
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddToQueue(video)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Add to queue"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <a
                            href={`https://www.youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Open on YouTube"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-muted/20">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {videos.length} tracks by {artistName}
                  </p>
                  <button
                    onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`, '_blank')}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on YouTube
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper function for duration formatting
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
