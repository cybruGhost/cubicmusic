import { useState, useEffect } from 'react';
import { X, Music, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getChannelVideos } from '@/lib/api';
import { Video } from '@/types/music';
import { toast } from 'sonner';

interface ChannelInfoProps {
  artistName: string;
  onClose: () => void;
}

export function ChannelInfo({ artistName, onClose }: ChannelInfoProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const data = await getChannelVideos(artistName);
        setVideos(data);
      } catch (error) {
        toast.error('Failed to load channel data');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [artistName]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-2xl max-h-[80vh] bg-background rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{artistName}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  {videos.length} tracks
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Channel
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Channel content goes here */}
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              videos.map((video) => (
                <div key={video.videoId} className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg">
                  <img 
                    src={video.videoThumbnails?.[0]?.url} 
                    alt={video.title}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <p className="font-medium">{video.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {video.publishedText}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
