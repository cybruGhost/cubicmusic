import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

interface SyncedLyricsProps {
  syncedLyrics: string;
  currentTime: number;
}

const parseSyncedLyrics = (lyrics: string): LyricLine[] => {
  const lines = lyrics.split('\n');
  const parsed: LyricLine[] = [];
  
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        parsed.push({ time, text });
      }
    }
  }
  
  return parsed;
};

export function SyncedLyrics({ syncedLyrics, currentTime }: SyncedLyricsProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLyrics(parseSyncedLyrics(syncedLyrics));
  }, [syncedLyrics]);

  const currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No synced lyrics available</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[300px] md:h-[400px] overflow-hidden relative"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {lyrics.map((line, index) => {
          const isActive = index === currentLineIndex;
          const isPast = index < currentLineIndex;
          const distance = index - currentLineIndex;
          
          if (Math.abs(distance) > 4) return null;
          
          return (
            <motion.div
              key={index}
              ref={isActive ? activeLineRef : null}
              initial={false}
              animate={{ 
                opacity: isActive ? 1 : Math.abs(distance) === 1 ? 0.6 : 0.3,
                scale: isActive ? 1.05 : 1,
                y: distance * 48,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`
                absolute text-center w-full px-4 py-2
                ${isActive 
                  ? 'text-primary font-bold text-lg md:text-xl' 
                  : isPast 
                    ? 'text-muted-foreground text-sm md:text-base' 
                    : 'text-foreground/70 text-sm md:text-base'
                }
              `}
            >
              {line.text}
            </motion.div>
          );
        })}
      </div>
      
      {/* Fade edges */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-card to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}
