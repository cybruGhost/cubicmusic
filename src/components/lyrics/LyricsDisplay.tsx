import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music2, AlertCircle, Loader2, Zap, Music } from 'lucide-react';
import { LyricsData } from '@/types/music';
import { SyncedLyrics } from './SyncedLyrics';
import { PlainLyrics } from './PlainLyrics';
import { Button } from '@/components/ui/button';
import { fetchLyrics } from '@/lib/lyrics';

interface LyricsDisplayProps {
  videoId: string;
  currentTime: number;
}

export function LyricsDisplay({ videoId, currentTime }: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [syncMode, setSyncMode] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    
    setIsLoading(true);
    setError(undefined);
    setLyrics(null);
    
    fetchLyrics(videoId)
      .then(data => {
        setLyrics(data);
        if (!data) {
          setError('No lyrics found for this track');
        }
      })
      .catch(() => setError('Failed to load lyrics'))
      .finally(() => setIsLoading(false));
  }, [videoId]);

  const hasSyncedLyrics = !!lyrics?.syncedLyrics;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
        </div>
        <p className="mt-4 text-sm">Loading lyrics...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <AlertCircle className="w-10 h-10 mb-3 text-muted-foreground/50" />
        <p className="text-sm">{error}</p>
      </motion.div>
    );
  }

  if (!lyrics) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <Music2 className="w-10 h-10 mb-3 text-muted-foreground/50" />
        <p className="text-sm">No lyrics available</p>
      </motion.div>
    );
  }

  const displayPlainLyrics = lyrics.plainLyrics || 
    lyrics.syncedLyrics?.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Lyrics</span>
        </div>
        
        <div className="flex items-center gap-2">
          {hasSyncedLyrics && (
            <div className="flex bg-secondary rounded-lg p-1">
              <Button
                variant={syncMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSyncMode(true)}
                className="h-7 px-3 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Synced
              </Button>
              <Button
                variant={!syncMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSyncMode(false)}
                className="h-7 px-3 text-xs"
              >
                <Music className="w-3 h-3 mr-1" />
                Plain
              </Button>
            </div>
          )}
          {lyrics.source && (
            <span className="text-xs text-muted-foreground">
              via {lyrics.source}
            </span>
          )}
        </div>
      </div>
      
      {/* Lyrics Content */}
      {syncMode && hasSyncedLyrics && lyrics.syncedLyrics ? (
        <SyncedLyrics syncedLyrics={lyrics.syncedLyrics} currentTime={currentTime} />
      ) : (
        displayPlainLyrics && <PlainLyrics lyrics={displayPlainLyrics} />
      )}
    </div>
  );
}
